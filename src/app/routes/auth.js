/** auth.js
 * @file: /src/app/routes/auth.js
 * @description: Handles express routing for authentication routes
 * @parameters: Object(app), Object(resources)
 * @returns: Express routes
 */

var passport = require('passport')

module.exports = function(app, resources) {
  app.get('/auth/facebook', passport.authenticate('facebook'))

  app.get('/auth/facebook/callback', passport.authenticate('facebook', {
    failureRedirect: '/logga-in'
  }), function(req, res) {
    res.redirect(req.session.returnTo);
  })

  /*
  app.get('/admin/auth/instagram', passport.authenticate('instagram'));

  app.get('/admin/auth/instagram/callback', passport.authenticate('instagram', {
    failureRedirect: '/admin/installningar?instagram_access_token_updated=false'
  }), function(req, res) {
    // Successful authentication, notify that the access token has been updated
    res.redirect('/admin/installningar?instagram_access_token_updated=true');
  });
  */

  app.get('/admin/auth/google', function(req, res, next) {
    var oauth_config = {
      url: 'https://accounts.google.com/o/oauth2/v2/auth',
      response_type: 'code',
      access_type: 'offline',
      redirect_uri: resources.config.google.callback,
      client_id: resources.config.google.client_id,
      scope: resources.config.google.scope.join(' ')
    };

    var oauth_url = Object.keys(oauth_config).reduce((parts, property) => {
      if (property === 'url') {
        parts.push(oauth_config[property]);
      } else {
        var prefix;
        if (parts.length > 1) {
          prefix = '&'
        } else {
          prefix = '?'
        }

        var param = prefix + property + '=' + oauth_config[property];
        parts.push(param);
      }

      return parts;
    }, []).join('');

    res.redirect(oauth_url);
  });

  //TODO: Make a passport module of this code, or just move it somewhere else, it shouldn't be in the route
  app.get('/admin/auth/google/callback', function(req, res, next) {
    var request = require('request');
    var code = req.query.code;

    //Send new request
    var oauth_url = 'https://www.googleapis.com/oauth2/v4/token';
    var oauth_config = {
      code: code,
      grant_type: 'authorization_code',
      client_id: resources.config.google.client_id,
      client_secret: resources.config.google.client_secret,
      redirect_uri: resources.config.google.callback
    };

    //TODO: Use googleapis and oauth2Client here instead of doing the request on our own

    return new Promise((resolve, reject) => {
      request({
        method: 'POST',
        form: oauth_config,
        url: oauth_url,
        timeout: 5000
      }, (error, response, body) => {
        if (!error && response.statusCode == 200) {
          var params = JSON.parse(body)
          var access_token = params.access_token;
          var refresh_token = params.refresh_token;
          var expires_in = params.expires_in;

          return resources.models.setting.update({
              google: {
                $exists: true
              }
            }, {
              $set: {
                'google.access_token': access_token,
                'google.refresh_token': refresh_token,
                'google.expires_in': expires_in,
                timestamp: resources.utils.getISOdate()
              }
            }, {
              upsert: true
            })
            .then((result) => {
              resolve();
            })
        } else if(error) {
          throw new Error(error)
        } else {
          throw new Error('Unknown error while refreshing token.')
        }
      });
    })
    .then(() => {
      res.redirect('/admin/installningar?google_access_token_updated=true');
    })
    .catch((err) => {
      res.redirect('/admin/installningar?google_access_token_updated=false')
    })
  });

  app.get('/admin/auth/google/revoke', function(req, res, next) {
    var request = require('request')

    return resources.models.setting.get({
        google: {
          $exists: true
        }
      })
      .then(function(result) {
        if(result.length > 0) {
          var access_token = result[0].google.access_token;
          var revoke_uri = 'https://accounts.google.com/o/oauth2/revoke?token=' + access_token;

          return new Promise((resolve, reject) => {
            request({
              method: 'GET',
              url: revoke_uri
            }, function(err, response, body) {
              if (response.statusCode === 200) {
                resolve();
              } else {
                try {
                  var errorMessage = JSON.parse(body);

                  if(errorMessage.error !== undefined) {
                    switch (errorMessage.error) {
                      case 'invalid_token': //If we receive this then the token has already expired at Google so no need to keep a useless token around
                          resolve();
                        break;
                      default:
                        reject('Unknown error. Unknown error received from server: ' + errorMessage.error);
                    }
                  }
                } catch(err) {
                  reject(err)
                }
              }
            })
          })
          .then(() => {
            return resources.models.setting.remove({
              google: {
                $exists: true
              }
            })
          })
        } else {
          throw new Error('No token was found in database');
        }
      })
      .then(() => {
        res.redirect('/admin/installningar?google_access_token_revoked=true');
      })
      .catch(function(err) {
        console.error(err);
        res.redirect('/admin/installningar?google_access_token_revoked=false')
      })
  });
}