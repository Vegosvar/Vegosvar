/** unauthenticated.js
* @file: /src/app/routes/pages/unauthenticated.js
* @description: Handles express routing for the unauthenticated page routes
* @parameters: Object(app), Object(resources)
* @returns: Express routes
*/

var ObjectID = require('mongodb').ObjectID
var striptags = require('striptags')

module.exports = function (app, resources) {
  var functions = resources.functions

  app.get('/', function (req, res) {
    req.session.returnTo = '/'

    var pagesdb = resources.collections.pages
    var citiesdb = resources.collections.cities
    var categoriesdb = resources.collections.categories
    var likesdb = resources.collections.likes
    var usersdb = resources.collections.users

    var pages = {}
    var options = {
      limit: 9,
      sort: [ ['rating.likes', 'desc'] ]
    }

    //Get page stats
    pagesdb.aggregate([{
        $group: {
            _id: {
                type: "$type"
            },
            count: {
                $sum: 1
            }
        }
    }], function(err, pageStats) {
      //Get pages for front page
      pagesdb.find({}, options).toArray(function(err, pages) {
        pages = pages.filter(function(page) {
          if('post' in page) {
            if('content' in page.post) {
              page.post.content = striptags(page.post.content, ['br','p'])
              page.post.content = (page.post.content.length > 115) ? page.post.content.substr(0, 115) + '...' : page.post.content
              return page
            }
          }
        })
        pagesdb.find({
          accepted: true,
          $or: [
            { type: '3' },
            { type: '5' },
            { type: '6' }
          ]
        }).sort({_id:-1}).limit(12).toArray(function(err, establishments) {
          pagesdb.find({
            accepted: true,
            type: '2'
          }).sort({_id:-1}).limit(6).toArray(function(err, recipes) {

            var recipeUsers = []
            for (var i = recipes.length -1; i >= 0; i--) {
              recipeUsers.push( recipes[i].user_info.id)
            }

            usersdb.find({_id: { $in: recipeUsers } }).toArray(function(err, users) {
              for (var i = recipes.length - 1; i >= 0; i--) {
                for (var u = users.length - 1; u >= 0; u--) {
                  if(!recipes[i].user_info.hidden) {
                    if(String(recipes[i].user_info.id) == String(users[u]._id) ) {
                      recipes[i].user_info.display_name = users[u].name.display_name
                      recipes[i].user_info.active_photo = users[u].active_photo
                      recipes[i].user_info.fb_photo = users[u].fb_photo
                      recipes[i].user_info.vegosvar_photo = users[u].vegosvar_photo
                    }
                  }
                }
              }

              res.render('index', {
                user: req.user,
                pageStats: pageStats,
                pages: pages,
                establishments: establishments,
                recipes: recipes,
                loadGeoLocation: true,
                loadMapResources: {
                  map: true,
                  mapCluster: true
                },
                startpage: false,
                searchString: req.query.s
              })
            })
          })
        })
      })
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
    var votesdb = resources.collections.votes

    votesdb.find({}).toArray(function(err, doc) {
      res.json(doc)
    })
  })

  app.get('/:url', function (req, res, next) {
    var url = req.params.url

    var pagesdb = resources.collections.pages
    var usersdb = resources.collections.users
    var likesdb = resources.collections.likes

    var query = {
      url: url
    }

    pagesdb.count(query, function (err, count) {
      if(count > 0) {

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

        pagesdb.find(query).toArray(function (err, result) {
          if(result.length > 0) {
            var mapResources = {
              map: true,
              mapCluster: !(result[0].type === '3' || result[0].type === '5' || result[0].type === '6')
            }

            var pageResources = {
              public_page: true,
              youtube: (result[0].type === '2') ? true : false
            }

            //Show places in the same city
            pagesdb.find({
              $and: [
                {
                  $or:[
                    {type:'3'},
                    {type:'5'},
                    {type:'6'}
                  ]
                },
                {
                  "post.city": result[0].post.city
                },
                {
                  "_id": {
                    $ne: result[0]._id
                  }
                }
              ]
            }).sort({_id:-1}).limit(10).toArray(function(err, establishments) {

              usersdb.find({ _id : result[0].user_info.id }).toArray(function(err, user_info) {
                if (req.isAuthenticated ()) {
                  likesdb.count({ "post.id": new ObjectID(result[0]._id), "user.id": req.user._id }, function (err, is_liked) {
                    if(typeof(user_info[0]) == 'undefined') {
                      result[0].user_info.hidden = true
                      user_info[0] = { id: '', photo: ''}
                    }

                    res.render('page', {
                      user: req.user,
                      post: result[0],
                      user_info: user_info[0],
                      userLikes: is_liked,
                      establishments: establishments,
                      loadGeoLocation: true,
                      loadMapResources: mapResources,
                      loadPageResources: pageResources,
                      striptags: striptags
                    })
                  })
                } else {
                  if(typeof(user_info[0]) == 'undefined') {
                    result[0].user_info.hidden = true
                    user_info[0] = { id: '', photo: ''}
                  }

                  res.render('page', {
                    user: req.user,
                    post: result[0],
                    user_info: user_info[0],
                    userLikes: 0,
                    establishments: establishments,
                    loadGeoLocation: true,
                    loadMapResources: mapResources,
                    loadPageResources: pageResources,
                    striptags: striptags
                  })
                }
              })
            })
          } else {
            //TODO, maybe we should use the logic of another function here, or throw an error to render 404 page
            res.render('404', { user: req.user })
          }
        })
      } else {
        return next()
      }
    })
  })

  app.get('/sitemap.xml', function(req, res) {
    var sitemap = resources.sitemap
    var pagesdb = resources.collections.pages
    var hostname = resources.config.hostname

    //Add static pages

    var staticPages = ['logga-in', 'om','licens','riktlinjer', 'villkor','vanliga-fragor','press','mina-sidor']

    for (var i = staticPages.length - 1; i >= 0; i--) {
      sitemap.add({
        url: hostname + '/' + staticPages[i],
        priority: 0.8
      })
    }

    //Add dynamic pages
    pagesdb.find({accepted:true}).toArray(function(err, pages) {
      if(err) throw err

      for (var i = pages.length - 1; i >= 0; i--) {
        var obj = {
          url: hostname + '/' + pages[i].url
        }

        if('post' in pages[i]) {
          if('cover' in pages[i].post) {
            if('filename' in pages[i].post.cover) {
              if(pages[i].post.cover.filename !== null && pages[i].post.cover.filename !== "") {
                obj.img = hostname + '/uploads/' + pages[i].post.cover.filename + '.jpg'
              }
            }
          }
        }

        sitemap.add(obj)
      }

      sitemap.toXML( function (err, xml) {
        if (err) {
          return res.status(500).end()
        }

        res.header('Content-Type', 'application/xml')
        res.send( xml )
      })
    })
  })
}