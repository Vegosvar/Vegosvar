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

module.exports = function (app, resources) {
  var functions = resources.functions

  app.get('/', function (req, res) {
    var renderObj = {
      user: req.user,
      loadGeoLocation: true,
      loadMapResources: {
        map: true,
        mapCluster: true
      },
      startpage: false,
      searchString: req.query.s,
      pages: [],
      recipes: []
    }

    new Promise.all([
      //Get page stats for the footer
      resources.queries.getPagesStats()
      .then(function(pages) {
        renderObj.pageStats = pages
      }),
      //Get the pages for 'Hett just nu'
      resources.queries.getPages(
        {},
        {}, {
          'rating.likes': -1
        },
        9
      )
      .then(function(pages) {
        return pages.filter(function(page) {
          if('post' in page && 'content' in page.post) {
            page.post.content = striptags(page.post.content, ['br','p'])
            page.post.content = (page.post.content.length > 115) ? page.post.content.substr(0, 115) + '...' : page.post.content
            return page
          }
        })
      })
      .then(function(pages) {
        renderObj.pages = pages
      }),
      //Get the new restaurants, cafees and shops for the 'Goda nyheter' sidebar
      resources.queries.getPages({
        accepted: true,
        $or: [
          { type: '3' },
          { type: '5' },
          { type: '6' }
        ],
      },
      {},
      { _id: -1 },
      12
      )
      .then(function(establishments) {
        renderObj.establishments = establishments
      }),
      //Get the recipes to showcase
      resources.queries.getPages({
        accepted: true,
        type: '2',
      },
      {},
      { _id: -1 },
      12
      )
      .then(function(recipes) {
        //Get the user whom created each recipe
        return new Promise.all(recipes.map(function(recipe) {
          //Make sure we don't show anyone that opted to be anonymous
          if ( ! (recipe.user_info.hidden) ) {
            //Get the associated users's info
            return resources.queries.getUsers({
              _id: recipe.user_info.id
            })
            .then(function(users) {
              if(users.length > 0) {
                return extend(recipe.user_info, users[0])
              } else {
                //User account was not found, set user_info to hidden to show user as anonymous 
                recipe.user_info.hidden = true
                return recipe
              }
            })
          } else {
            return recipe
          }
        }))
      })
      .then(function(recipes) {
        renderObj.recipes = recipes
      })
    ])
    .done(function() {
      res.render('index', renderObj)
    })
  })

  app.get('/logga-in', function (req, res) {
    res.render('login')
  })

  app.get('/om', function(req, res) {
    res.render('about', { user: req.user })
  })

  app.get('/licens', function(req, res) {
    res.render('license', { user: req.user })
  })

  app.get('/riktlinjer', function (req, res) {
    res.render('guidelines', { user: req.user, hidelink: true })
  })

  app.get('/villkor', function (req, res) {
    res.render('terms-of-use', { user: req.user, hidelink: true })
  })

  app.get('/vanliga-fragor', function (req, res) {
    res.render('faq', { user: req.user })
  })

  app.get('/press', function (req, res) {
    res.render('press', { user: req.user })
  })

  app.get('/505', function (req, res) {
    res.render('505', { user: req.user })
  })

  app.get('/recensera', functions.isAuthenticated, function (req, res) {
    res.render('vote-login', { user: req.user })
  })

  app.get('/rapportera', function (req, res) {
    res.render('report', { user: req.user })
  })

  app.get('/sekretesspolicy', function (req, res) {
    res.render('privacypolicy', { user: req.user })
  })

  app.get('/logga-ut', function (req, res) {
    req.logout()
    res.redirect('/')
  })

  //What is this used for?
  app.get('/handle/votes', function (req, res) {
    resources.queries.getVotes()
    .then(function(votes) {
      res.json(votes)
    })
  })

  app.get('/:url', function (req, res, next) {
    var renderObj = {
      user: req.user,
      loadGeoLocation: true,
      loadMapResources: {
        map: true
      },
      loadPageResources: {
        public_page: true
      },
      striptags: striptags
    }

    var query = {
      url: req.params.url
    }

    if(typeof(req.user) !== 'undefined') {
      if( ! functions.userCheckPrivileged(req.user) ) { //If user is not privileged
        query['$or'] = [{
          accepted: true //Either page must be published
        }, {
          "user_info.id": req.user._id //Or the current user is the user that created the page
        }]
      }
    } else {
      query.accepted = true //If anonymous user then the page must be published
    }

    resources.queries.getPages(query)
    .then(function(pages) {
      if( pages.length <= 0) {
        throw new Error('Page with url ' + req.params.url + ' was not found')
      } else {
        return pages[0]
      }
    })
    .then(function(page) {
      renderObj.post = page

      //Get the user whom created the page
      return resources.queries.getUsers({
        _id: page.user_info.id
      })
      .then(function(users) {
        if(users.length > 0) {
          renderObj.user_info = users[0]
        } else {
          page.user_info.hidden = true //Show user as anonymous
          renderObj.user_info = null
        }

        return page
      })
    })
    .then(function(page) {
      //Check which browser dependencies are needed
      var isPlace = (page.type === '3' || page.type === '5' || page.type === '6')
      renderObj.loadMapResources.mapCluster = !isPlace
      renderObj.loadPageResources.youtube = (page.type === '2')

      //Get places in the same city, if this page is for a restaurant, cafe or shop
      if(isPlace) {
        return resources.queries.getPages({
          $and: [
            {
              $or:[
                {type:'3'},
                {type:'5'},
                {type:'6'}
              ]
            },
            {
              "post.city": page.post.city
            },
            {
              "_id": {
                $ne: page._id
              }
            }
          ]
        },
        {}, //Include all fields
        { _id: -1 }, //Sort descendingly, a.k.a. newest first
        10 //Limit to 10 pages
        )
        .then(function(establishments) {
          renderObj.establishments = establishments
        })
      }
    })
    .then(function() {
      res.render('page', renderObj)
    })
    .catch(function (err) {
      return next() // 404
    })
  })

  app.get('/sitemap.xml', function(req, res) {
    var sitemap = resources.sitemap
    var hostname = resources.config.hostname

    //Add static pages
    var staticPages = ['logga-in', 'om','licens','riktlinjer', 'villkor','vanliga-fragor','press','mina-sidor']

    staticPages.map(function(staticPage) {
      sitemap.add({
        url: hostname + '/' + staticPage,
        priority: 0.8
      })
    })

    //Add dynamic pages
    resources.queries.getPages({
      accepted: true
    })
    .then(function(pages) {
      return new Promise.all(pages.map(function(page) {
        var obj = {
          url: hostname + '/' + page.url
        }

        //Check if there's an image for this page
        if('post' in page) {
          if('cover' in page.post) {
            if('filename' in page.post.cover) {
              if(page.post.cover.filename !== null && page.post.cover.filename !== "") {
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
          return res.status(500).end()
        }

        res.header('Content-Type', 'application/xml')
        res.send(xml)
      })
    })
  })
}