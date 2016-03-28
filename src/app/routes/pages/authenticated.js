/** authenticated.js
* @file: /src/app/routes/pages/authenticated.js
* @description: Handles express routing for the authenticated page routes
* @parameters: Object(app), Object(resources)
* @exports: Express routes
*/

var ObjectID = require('mongodb').ObjectID
var body_parser = require('body-parser')
var urlencodedParser = body_parser.urlencoded({ extended: false })
var extend = require('util')._extend
var Promise = require('promise')

module.exports = function (app, resources) {
  var functions = resources.functions

  app.get('/installningar', functions.isAuthenticated, function (req, res, next) {
    var renderObj = extend({
      loadEditorResources: true,
      loadDropzoneResources: true 
    }, res.vegosvar)

    res.render('settings', renderObj)
  })

  app.get('/installningar/ta-bort', functions.isAuthenticated, function (req, res, next) {
    var renderObj = extend({}, res.vegosvar)
    res.render('deregister', renderObj)
  })

  //TODO, move this to authenticated ajax routes
  app.get('/installningar/ta-bort/submit', functions.isAuthenticated, function (req, res, next) {
    if(req.isAuthenticated()) {
      var usersdb = resources.collections.users
      usersdb.remove({ "_id": new ObjectID(req.user._id) }, function(err, result) {
        if (err) throw err
        res.send('1')
      })
    } else {
      res.send('0')
    }
  })

  //TODO, move this to post.js routes
  app.post('/installningar/submit', functions.isAuthenticated, urlencodedParser, function (req, res, next) {
    //TODO, should really do some sanitization here 
    var user_id = req.user._id
    var display_name = req.body.displayName
    var website = req.body.website
    var description = req.body.description

    //Send info to model to perform database queries
    resources.models.user.updateInfo({
      user_id: user_id,
      display_name: display_name,
      website: website,
      description: description
    })
    .then(function(result) {
      //Handle result

      //Notify user
      res.json({
        success: true
      })
    })
    .catch(function(err) {
      //Handle errors
      console.log(err)

      //Notify user
      res.json({
        success: false,
        message: err.message
      })
    })

    resources.queries.updateUser({
      _id : new ObjectID(id)
    }, {
      $set: {
        'name.display_name': display_name,
        'info.website': website,
        'info.description': description
      }
    })
    .then(function(result) {
      res.send('1')
    })
    .catch(function(err) {
      console.log(err)
      res.send('0')
    })
  })

  app.get('/mina-sidor', functions.isAuthenticated, function (req, res, next) {
    var user_id = new ObjectID(req.user._id)

    var renderObj = extend({
      loadPageResources: {
        datatables: true
      },
      votes: [],
      likes: []
    }, res.vegosvar)

    new Promise.all([
      //Get the user from the database
      resources.queries.getUsers({
        _id: user_id
      })
      .then(function(users) {
        renderObj.current_user = users[0]
      }),
      //Get the pages that this user has created
      resources.queries.getPages({
        'user_info.id': user_id
      })
      .then(function(pages) {
        renderObj.pages = pages
      }),
      //Get all the votes user has cast
      resources.queries.getVotes({
        'user.id': user_id
      })
      .then(function(votes) {
        //Then loop over all the votes and find the associated page
        return new Promise.all(votes.map(function(vote) {
          resources.queries.getPages({
            _id: new ObjectID(vote.post.id)
          }, {
            url: 1,
            title: 1
          })
          .then(function(pages) {
            if(pages.length > 0) {
              var page = pages[0]

              renderObj.votes.push({
                page_id: page._id,
                url: page.url,
                title: page.title,
                content: vote.content
              })
            }
          })
        }))
      }),
      //Get likes this user has given
      resources.queries.getLikes({
        'user.id': user_id
      })
      .then(function(likes) {
        //Loop over all the likes and get the associated page
        return new Promise.all(likes.map(function(like) {
          resources.queries.getPages({
            _id: new ObjectID(like.post.id)
          }, {
            url: 1,
            title: 1
          })
          .then(function(pages) {
            if(pages.length > 0) {
              var page = pages[0]

              renderObj.likes.push({
                page_id: page._id,
                url: page.url,
                title: page.title
              })
            }
          })
        }))
      }),
      //Get pages this user has contributed to, but not created
      resources.queries.getPages({
        'user_info.id': {
          $ne: user_id
        },
        'user_info.contributors': {
          $elemMatch: {
            id: user_id
          }
        }
      })
      .then(function(pages) {
        renderObj.contributions = pages
      })
    ])
    .then(function() {
      res.render('pages', renderObj)
    })
    .catch(function(err) {
      console.log(err)
      return next()
    })
  })

  app.get('/ny', functions.isAuthenticated, function (req, res, next) {
    var renderObj = extend({}, res.vegosvar)
    res.render('new', renderObj)
  })

  app.get('/ny/publicerad', functions.isAuthenticated, function (req, res, next) {
    var hideredirect = (typeof(req.query.newpost) === 'undefined') ? true : false
    var renderObj = extend({
      type: 'product',
      hideredirect: hideredirect,
      post_url: req.query.newpost
    }, res.vegosvar)

    res.render('post/published', renderObj)
  })

  app.get('/ny/uppdaterad', functions.isAuthenticated, function (req, res, next) {
    var hideredirect = (typeof(req.query.newpost) === 'undefined') ? true : false
    var renderObj = extend({
      type: 'product',
      hideredirect: hideredirect,
      post_url: req.query.newpost
    }, res.vegosvar)

    res.render('post/updated', renderObj)
  })

  app.get('/ny/:type', functions.isAuthenticated, function (req, res, next) {
    var renderObj = extend({
      type: req.params.type,
      loadEditorResources: true,
      loadDropzoneResources: true,
      loadValidationResources: true,
      loadPageResources: {
        create_page: true
      },
      categories: []
    }, res.vegosvar)

    //Check if current user is blocked
    resources.queries.getUsers({
      _id: new ObjectID(req.user._id),
      'info.blocked': false
    })
    .then(function(users) {
      if(users.length > 0) {
        return //User checks out, continue
      } else {
        throw new Error('blocked') //User is blocked
      }
    })
    //Check which type of page the user wants to create
    .then(function() {
      var types = {
        'fakta': '1',
        'recept': '2',
        'restaurang': '3',
        'produkt': '4',
        'butik': '5',
        'cafe': '6'
      }

      //Check if type is known
      if( ! (renderObj.type in types) ) {
        throw new Error('unknown') //Unknown type
      }

      var pageType = types[renderObj.type]

      //Load additional browser dependences based on page type
      renderObj.loadMapResources = (pageType === '3' || pageType === '5' || pageType === '6') ? { autocomplete: true, map: true } : false
      renderObj.loadPageResources.youtube = (pageType === '2')

      return pageType
    })
    //Get the categories for this page type
    .then(function(type) {
      return resources.queries.getPageCategories(type)
      .then(function(categories) {
        renderObj.categories = categories
      })
    })
    .then(function() {
      res.render('post/' + renderObj.type, renderObj)
    })
    .catch(function(err) {
      //TODO, handle error better maybe?
      switch(err.message) {
        case 'blocked':
          res.redirect('/blockerad')
          break
        case 'unknown':
          return next()
          break
        default:
          //This should probably be a 500 error
          console.log(err)
          return next()
          break
      }
    })
  })

  app.get('/redigera/:url', functions.isAuthenticated, function (req, res, next) {
    var renderObj = extend({
      loadEditorResources: true,
      loadDropzoneResources: true,
      loadValidationResources: true,
      loadPageResources: {
        create_page: true
      },
      post: null,
      categories: []
    }, res.vegosvar)

    resources.queries.getPages({
      url: req.params.url
    })
    .then(function(pages) {
      if(pages.length <= 0) {
        throw new Error('404')
      }

      return pages[0]
    })
    .then(function(page) {
      renderObj.post = page

      //Load additional browser dependences based on page type
      renderObj.loadMapResources = (page.type === '3' || page.type === '5' || page.type === '6') ? { autocomplete: true, map: true } : false
      renderObj.loadPageResources.youtube = (page.type === '2')

      return page
    })
    //Get the categories for this page type
    .then(function(page) {
      return resources.queries.getPageCategories(page.type)
      .then(function(categories) {
        renderObj.categories = categories
        return page
      })
    })
    .then(function(page) {
      var types = {
        'fakta': '1',
        'recept': '2',
        'restaurang': '3',
        'produkt': '4',
        'butik': '5',
        'cafe': '6'
      }

      for(var type in types) {
        if(types[type] === page.type) {
          renderObj.type = type
        }
      }

      res.render('post/' + renderObj.type, renderObj)
    })
    .catch(function(err) {
      console.log(err)
      return next()
    })
  })
}