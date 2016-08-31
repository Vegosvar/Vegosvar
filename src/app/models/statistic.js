/** statistic.js
 * @file: /src/app/models/statistic.js
 * @description: Model logic for statistic specific operations
 * @parameters: None
 * @exports: Object with model logic
 */

var Promise = require('promise')
var ObjectID = require('mongodb').ObjectID
var moment = require('moment');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

module.exports = function(resources, models) {
  var config = resources.config.google;

  var model = {};

  model.aggregate = function(query) {
    return resources.queries.aggregate('statistics', query)
  };

  model.get = function(query, fields, sort, limit) {
    return resources.queries.find('statistics', query, fields, sort, limit)
  };

  model.insert = function(query) {
    return resources.queries.insert('statistics', query);
  };

  model.update = function(query, update, options) {
    return resources.queries.update('statistics', query, update, options)
  };

  model.getPageViews = function(url, startDate, endDate) {
    startDate = moment(startDate)
    endDate = (endDate) ? moment(endDate) : moment();

    //First look in the local database
    return resources.queries.find('statistics', {
        url: url,
        'statistics.metric': 'ga:pageviews',
        'dateRange.startDate': {
          $eq: startDate.toISOString()
        },
        'dateRange.endDate': {
          $exists: true,
          $eq: endDate.toISOString()
        }
      })
      .then(function(result) {
        //Did we get anything?
        if (result.length > 0) {
          //TODO: Maybe handle result better before returning
          return result;
        } else {
          //We got nothing, query Google API

          model.query({
              reportRequests: [{
                viewId: '112999863',
                metrics: [{
                  expression: 'ga:pageviews'
                }],
                dimensionFilterClauses: {
                  filters: [{
                    dimensionName: 'ga:pagePath',
                    expressions: [
                      url
                    ]
                  }]
                },
                dateRanges: [{
                  startDate: startDate.format('YYYY-MM-DD'),
                  endDate: endDate.format('YYYY-MM-DD')
                }]
              }]
            })
            .then(function(result) {
              var parsed = model.parse(result);
              //Save it to the database

              if (parsed.length > 0) {
                parsed.forEach(function(statistic) {
                  model.insert({
                    url: url,
                    statistics: statistic,
                    dateRange: {
                      startDate: startDate.toISOString(),
                      endDate: endDate.toISOString()
                    }
                  });
                });
              }
              //TODO: Maybe handle result better before returning
              return result;
            })
        }
      });
  };

  model.parse = function(response, query) {
    if (response && 'reports' in response) {
      var parsed = response.reports.reduce(function(array, report) {
        if (report && 'data' in report) {
          if (report.data.rowCount > 0) {
            report.data.rows.forEach(function(row) {
              row.metrics.forEach(function(metric, index) {
                var metricName = report.columnHeader.metricHeader.metricHeaderEntries[index].name

                array.push({
                  metric: metricName,
                  values: metric.values,
                  query: query
                });
              });
            });
          }
        }

        return array;
      }, []);

      return parsed;
    }
  };

  model.query = function(options) {
    return model.getTokens()
      .then(function(tokens) {
        var oauth2Client = new OAuth2(config.client_id, config.client_secret, config.callback)

        oauth2Client.setCredentials({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token
        });

        return oauth2Client;
      })
      .then(function(oauth2Client) {
        var report = new Promise(function(resolve, reject) {
            var analyticsreporting = google.analyticsreporting('v4');

            analyticsreporting.reports.batchGet({
              auth: oauth2Client,
              resource: options
            }, function(error, result) {
              if (error) {
                reject(error);
              }
              resolve(result);
            });
          })
          .catch(function(error) {
            if (error && 'code' in error) {
              switch (error.code) {
                case 401:
                  //Access code has expired, refresh it and try again
                  console.log('401');
                  var tokens = oauth2Client.credentials;
                  return model.refreshTokens(tokens)
                    .then(function(tokens) {
                      console.log('tokens refreshed');
                      return model.query(options);
                    })
                  break;
                default:
                  break;
              }
            }
          })

        return report;
      });
  };

  model.getTokens = function() {
    return resources.queries.find('settings', {
        google: {
          $exists: true
        }
      })
      .then(function(result) {
        if (result && result.length > 0) {
          return result[0];
        } else {
          throw new Error('Token query did not return anything');
        }
      })
      .then(function(result) {
        var timestamp = new Date(result.timestamp);
        var date = (new Date()).getTime();
        var date_expires = timestamp.getTime() + (parseInt(result.google.expires_in) * 1000);
        var expires_in = (date_expires - date) / 1000;

        var tokens = {
          access_token: result.google.access_token,
          refresh_token: result.google.refresh_token
        };

        // If token expires in less than 5 min then refresh them
        if (expires_in <= 300) {
          return model.refreshTokens(tokens)
            .then(function() {
              return model.getTokens()
            })
        } else {
          return tokens;
        }
      })
  };

  model.refreshTokens = function(tokens) {
    var oauth2Client = new OAuth2(config.client_id, config.client_secret, config.callback)
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token
    });

    return new Promise(function(resolve, reject) {
        oauth2Client.refreshAccessToken(function(err, tokens) {
          if (err) {
            if ('Error' in err) {
              console.log(err.Error);
              switch (err.Error) {
                case 'invalid_grant':
                  console.log('Should fire off an email to the admin right about now');
                  break;
                default:
                  break;
              }
            }

            reject(err)
          } else {
            resolve(tokens)
          }
        });
      })
      .then(function(tokens) {
        var timestamp = (new Date(tokens.expiry_date)).getTime();
        var date = (new Date()).getTime()
        var expires_in = parseInt((timestamp - date) / 1000);

        return resources.models.setting.update({
            'google': {
              $exists: true
            }
          }, {
            $set: {
              'google.access_token': tokens.access_token,
              'google.refresh_token': tokens.refresh_token,
              'google.expires_in': expires_in,
              timestamp: resources.utils.getISOdate()
            }
          }, {
            upsert: true
          })
          .then(function() {
            return tokens;
          })
      });
  };

  return model;
};