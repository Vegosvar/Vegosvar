/** unauthenticated.js
 * @file: /src/app/routes/pages/unauthenticated.js
 * @description: Handles express routing for the unauthenticated page routes
 * @parameters: Object(app), Object(resources)
 * @returns: Express routes
 */

var ObjectID = require('mongodb').ObjectID
var striptags = require('striptags')
var extend = require('util')._extend
var Promise = require('promise')
var moment = require('moment');

module.exports = function(app, resources) {
  var utils = resources.utils

  app.get('/', function(req, res, next) {
    var renderObj = extend({
      loadGeoLocation: true,
      loadMapResources: {
        map: true,
        mapCluster: true
      },
      startpage: false,
      searchString: req.query.s,
      establishments: [],
      pages: [],
      recipes: []
    }, res.vegosvar)

    new Promise.all([
        //Get page stats for the footer
        resources.models.page.stats()
        .then(function(pages) {
          renderObj.pageStats = pages
        }),
        //Get the pages for 'Hett just nu'
        resources.models.page.hot_ranked()
        .then(function(pages) {
          if(pages.length > 0) {
            renderObj.pages = pages
          } else {
            //Fall back to old mode
            return resources.models.page.hot()
            .then(function(pages) {
              renderObj.pages = pages;
            })
          }
        }),
        //Get the new restaurants, cafees and shops for the 'Goda nyheter' sidebar
        resources.models.page.newPlaces()
        .then(function(establishments) {
          renderObj.establishments = establishments
        }),
        //Get the recipes to showcase
        resources.models.page.newRecipes()
        .then(function(recipes) {
          renderObj.recipes = recipes
        })
      ])
      .then(function() {
        res.render('index', renderObj)
      })
      .catch(function(err) {
        console.log(req.route.path, err)
        return next()
      })
  })

  app.get('/logga-in', function(req, res, next) {
    res.render('login')
  })

  app.get('/om', function(req, res, next) {
    var renderObj = extend({}, res.vegosvar)
    res.render('about', renderObj)
  })

  app.get('/licens', function(req, res, next) {
    var renderObj = extend({}, res.vegosvar)
    res.render('license', renderObj)
  })

  app.get('/profil', function(req, res) {
    res.render('profile', {
      user: req.user
    })
  })

  app.get('/riktlinjer', function(req, res, next) {
    var renderObj = extend({
      hidelink: true
    }, res.vegosvar)

    res.render('guidelines', renderObj)
  })

  app.get('/villkor', function(req, res, next) {
    var renderObj = extend({
      hidelink: true
    }, res.vegosvar)

    res.render('terms-of-use', renderObj)
  })

  app.get('/vanliga-fragor', function(req, res, next) {
    var renderObj = extend({}, res.vegosvar)
    res.render('faq', renderObj)
  })

  app.get('/press', function(req, res, next) {
    var renderObj = extend({}, res.vegosvar)
    res.render('press', renderObj)
  })

  app.get('/500', function(req, res, next) {
    var renderObj = extend({}, res.vegosvar)
    res.render('500', renderObj)
  })

  /* Commented out as of 2016-03-27, since isAuthenticated just redirects to /logga-in anyway
    app.get('/recensera', utils.isAuthenticated, function (req, res, next) {
      res.render('vote-login', { user: req.user })
    })
  */

  app.get('/rapportera', function(req, res, next) {
    res.render('report', renderObj)
  })

  app.get('/sekretesspolicy', function(req, res, next) {
    var renderObj = extend({}, res.vegosvar)
    res.render('privacy-policy', renderObj)
  })

  app.get('/logga-ut', function(req, res, next) {
    req.logout()
    res.redirect('/')
  })

  app.get('/sitemap.xml', function(req, res, next) {
    var sitemap = resources.sitemap
    var hostname = resources.config.hostname

    //Add static pages
    var staticPages = ['logga-in', 'om', 'licens', 'riktlinjer', 'villkor', 'vanliga-fragor', 'press', 'mina-sidor']

    staticPages.map(function(staticPage) {
      sitemap.add({
        url: hostname + '/' + staticPage,
        priority: 0.8
      })
    })

    //Add pages from database
    resources.queries.getPages({
        accepted: true
      })
      .then(function(pages) {
        return new Promise.all(pages.map(function(page) {
          var obj = {
            url: hostname + '/' + page.url
          }

          //Check if there's an image for this page
          if ('post' in page) {
            if ('cover' in page.post) {
              if ('filename' in page.post.cover) {
                if (page.post.cover.filename !== null && page.post.cover.filename !== "") {
                  obj.img = hostname + '/uploads/' + page.post.cover.filename + '.jpg'
                }
              }
            }
          }

          //Add page to sitemap
          sitemap.add(obj)
        }))
      })
      .then(function() {
        sitemap.toXML(function(err, xml) {
          if (err) {
            //TODO, redirect to next and handle error in error.js
            return res.status(500).end()
          }

          res.header('Content-Type', 'application/xml')
          res.send(xml)
        })
      })
      .catch(function(err) {
        console.log(req.route.path, err)
        return next()
      })
  })

  app.get('/:url', function(req, res, next) {
    var renderObj = extend({
      loadGeoLocation: true,
      loadMapResources: {
        map: true
      },
      loadPageResources: {
        public_page: true
      },
      striptags: striptags,
      post: null,
      establishments: [],
      statistics: []
    }, res.vegosvar)

    var today = moment();
    var startDate = moment(today.startOf('month')).format('YYYY-MM-DD');
    var endDate = moment().format('YYYY-MM-DD');

    var query = {
      url: req.params.url
    }

    if (typeof(req.user) !== 'undefined') {
      if (!utils.userCheckPrivileged(req.user)) { //If user is not privileged
        query['$or'] = [{
          accepted: true //Either page must be published..
        }, {
          'user_info.id': req.user._id //..or the current user is the user that created the page
        }]
      }
    } else {
      query.accepted = true //If anonymous user then the page must be published
    }

    //TODO: Make a Promise.all function instead of adding .then to the page query

    //TODO, merge the 2 queries to get page and user into a function in models/page.js,
    //also, remove dependency on renderObj.user_info, extend the object in renderObj.post.user_info instead
    resources.models.page.get(query)
      .then(function(pages) {
        if (pages.length <= 0) {
          throw new Error(404)
        } else {
          return pages[0]
        }
      })
      .then(function(page) {
        renderObj.post = page

        //Get the user whom created the page
        return resources.models.user.get({
            _id: page.user_info.id
          })
          .then(function(users) {
            if (users.length > 0) {
              renderObj.post.user_info = extend(renderObj.post.user_info, users[0])
            } else {
              renderObj.post.user_info.hidden = true //Show user as anonymous
            }

            return page
          })
      })
      .then(function(page) {
        //Check which browser assets are needed
        var isPlace = (page.type === '3' || page.type === '5' || page.type === '6')
        renderObj.loadMapResources.mapCluster = !isPlace
        renderObj.loadPageResources.youtube = (page.type === '2')

        //Get places in the same city for the sidebar, if this page is for a restaurant, cafe or shop
        if (isPlace) {
          return resources.models.page.nearbyEstablishments(page)
            .then(function(establishments) {
              renderObj.establishments = establishments
            })
        }
      })
      .then(function() {
        return resources.models.statistic.getPageViews(req.params.url, startDate, endDate)
          .then(function(results) {
            if(results.length > 0) {
              var result = results[0];
              if('statistics' in result && result.statistics.length > 0) {
                var statistic = result.statistics[0];

                if('values' in statistic && statistic.values.length > 0 ) {
                  renderObj.statistics.views = {
                    timestamp: startDate,
                    value: parseInt(statistic.values[0])
                  };
                }
              }
            }
          })
          .catch(function(err) {
            console.error(err);
          })
      })
      .then(function() {
        res.render('page', renderObj)
      })
      .catch(function(err) {
        console.log(req.route.path, err)
        return next() // 404
      })
  })


}