/** authenticated.js
* @file: /src/app/routes/pages/authenticated.js
* @description: Handles express routing for the authenticated page routes
* @parameters: Object(app), Object(resources)
* @exports: Express routes
*/

var ObjectID = require('mongodb').ObjectID
var body_parser = require('body-parser')
var urlencodedParser = body_parser.urlencoded({ extended: false })

module.exports = function (app, resources) {
  var functions = resources.functions
  var cities = resources.collections.cities

  //Have to be at least a logged in user at this point
  app.use(function ensure_authenticated (req, res, next) {
    functions.isAuthenticated(req, res, next)
  })

  app.get('/konto', function (req, res) {
    res.render('konto', { user: req.user })
  })

  app.get('/installningar', function (req, res) {
    res.render('settings', { user: req.user, loadEditorResources: true, loadDropzoneResources: true })
  })

  app.get('/installningar/ta-bort', function (req, res) {
    res.render('deregister', { user: req.user})
  })

  app.get('/installningar/ta-bort/submit', function (req, res) {
    if(req.isAuthenticated()) {
      var users = resources.collections.users
      users.remove({ "_id": new ObjectID(req.user._id) }, function(err, doc) {
        if (err) throw err
        res.send('1')
      })
    } else {
      res.send('0')
    }
  })

  app.post('/installningar/submit', urlencodedParser, function (req, res) {
    var id = req.user._id
    var display_name = req.body.displayName
    var website = req.body.website
    var description = req.body.description

    var usersdb = resources.collections.users

    usersdb.update(
      { _id : new ObjectID(id) },
      { $set:
        { "name.display_name": display_name,
         "info.website":website,
         "info.description":description }
      }
    )
    res.send('1')
  })

  app.get('/mina-sidor', function (req, res) {
    var pagesdb = resources.collections.pages
    var likesdb = resources.collections.likes
    var votesdb = resources.collections.votes
    var userid = new ObjectID(req.user._id)

    pagesdb.find( { "user_info.id": userid }).toArray(function(err, pages) {
      if (err) throw err
      votesdb.find( {"user.id": userid }).toArray(function(err, votes) {
        if (err) throw err

        var pages_voted_on = []
        var pages_voted_on_str = []
        var pages_votes = []
        for (var i = 0; i < votes.length; i++) {
          pages_voted_on.push( votes[i].post.id )
          pages_voted_on_str.push( String(votes[i].post.id ) )
          pages_votes.push( votes[i].content )
        }

        pagesdb.find( { _id: { $in: pages_voted_on } } ).toArray(function(err, voted) {
          if (err) throw err

          var voted_pages = []
          for (var i = 0; i < voted.length; i++) {
            var position = pages_voted_on_str.indexOf( String(voted[i]._id) )
            if( position !== -1 ) {
              voted_pages.push({
                page_id: voted[i]._id,
                url: voted[i].url,
                title: voted[i].title,
                content: pages_votes[position]
              })
            }
          }

          likesdb.find( { "user.id": userid }).toArray(function(err, likes) {
            if (err) throw err

            var pages_liked = []
            for (var i = 0; i < likes.length; i++) {
              pages_liked.push( likes[i].post.id )
            }

            pagesdb.find( { _id: { $in: pages_liked } }).toArray(function(err, liked) {
              if (err) throw err

              res.render('pages', {
                user: req.user,
                pages: pages,
                votes: voted_pages,
                likes: liked,
                loadPageResources: { datatables: true },
              })
            })
          })
        })
      })
    })
  })

  app.get('/ny', function (req, res) {
    res.render('new', { user: req.user })
  })

  app.get('/ny/publicerad', function (req, res) {
    var hideredirect = (typeof(req.query.newpost) === 'undefined') ? true : false
    res.render('post/published', {
      user: req.user,
      type: "product",
      hideredirect: hideredirect,
      post_url: req.query.newpost,
    })
  })

  app.get('/ny/uppdaterad', function (req, res) {
    var hideredirect = (typeof(req.query.newpost) === 'undefined') ? true : false
    res.render('post/updated', {
      user: req.user,
      type: "product",
      hideredirect: hideredirect,
      post_url: req.query.newpost,
    })
  })

  app.get('/ny/:type', function (req, res) {
    var type = req.params.type
    var mapResources = false

    var types = {
      'fakta': '1',
      'recept': '2',
      'restaurang': '3',
      'produkt': '4',
      'butik': '5'
    }

    if(type in types) {
      var pageType = types[type]
      var mapResources = (pageType === '3' || pageType === '5') ? { autocomplete: true, map: true } : false
      var categoriesdb = resources.collections.categories

      categoriesdb.aggregate([
        {
          $match: { type: "4" }
        }, {
          $group: {
             _id: { id: "$_id", name: "$name", subcategory: "$subcategory" }
          }
        }, {
          $group: {
            "_id": "$_id.subcategory",
            "names": {
              "$push": {
                name: "$_id.name"
              }
            },
            count: {
              $sum: 1
            }
          }
        }, {
          $sort: {
            _id: 1
          }
        }
      ], function(err, categories) {
        if (err) throw err

        res.render('post/'+type, {
          user: req.user,
          type: type,
          loadEditorResources: true,
          loadDropzoneResources: true,
          loadValidationResources: true,
          loadMapResources: mapResources,
          loadPageResources: { page: true },
          categories: categories
        })

      })
    }
  })

  app.get('/redigera/:url', function (req, res, next) {
    var pagesdb = resources.collections.pages

    pagesdb.find({url:req.params.url}).toArray(function(err, doc) {
      if(doc !== null && doc.length > 0) {
        var post = doc[0]
        var type = parseInt(post.type)
        var page = null
        var mapResources = false
          switch(type) {
            case 1:
              page = 'fakta'
              break
            case 2:
              page = 'recept'
              break
            case 3:
              page = 'restaurang'
              mapResources = { autocomplete: true, map: true }
              break
            case 4:
              page = 'produkt'
              break
            case 5:
              page = 'butik'
              mapResources = { autocomplete: true, map: true }
              break
            default:
              return next()
          }

        if(page !== null) {
          res.render('post/' + page, {
            user: req.user,
            post: post,
            loadEditorResources: true,
            loadDropzoneResources: true,
            loadMapResources: mapResources,
            loadPageResources: { page: true },
          })
        }
      } else {
        next()
      }
    })
  })
}