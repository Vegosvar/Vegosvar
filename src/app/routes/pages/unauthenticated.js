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
        pagesdb.find({
          $or:[
            {type:'3'},
            {type:'5'}
            ]
        }).sort({_id:-1}).limit(12).toArray(function(err, establishments) {
          pagesdb.find({
            $or:[
              {type:'2'}
              ]
          }).sort({_id:-1}).limit(3).toArray(function(err, recipes) {
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
              searchString: req.query.s,
              striptags: striptags
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

    pagesdb.count({ url: url }, function (err, count) {
      if(count > 0) {
        pagesdb.find({ url : url }).toArray(function (err, result) {
          var mapResources = {
            map: true,
            mapCluster: !(result[0].type === '3' || result[0].type === '5')
          }

          pagesdb.find({
            $and: [
              {
                $or:[
                  {type:'3'},
                  {type:'5'}
                ]
              },
              {"post.city":result[0].post.city}
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
                })
              }
            })
          })
        })
      } else {
        return next()
      }
    })
  })
}