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
  var utils = resources.utils

  app.get('/installningar', utils.isAuthenticated, function (req, res, next) {
    var renderObj = extend({
      loadEditorResources: true,
      loadDropzoneResources: true 
    }, res.vegosvar)

    res.render('settings', renderObj)
  })

  app.get('/installningar/ta-bort', utils.isAuthenticated, function (req, res, next) {
    var renderObj = extend({}, res.vegosvar)
    res.render('deregister', renderObj)
  })

  //TODO, move this to post.js routes
  app.post('/installningar/submit', utils.isAuthenticated, urlencodedParser, function (req, res, next) {
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
      console.log(req.route.path, err)

      //Notify user
      res.json({
        success: false,
        message: err.message
      })
    })
  })

  app.get('/mina-sidor', utils.isAuthenticated, function (req, res, next) {
    var renderObj = extend({
      loadPageResources: {
        datatables: true
      },
      votes: [],
      likes: []
    }, res.vegosvar)

    resources.models.user.getProfile(req.user._id)
    .then(function(profileObj) {
      renderObj = extend(renderObj, profileObj)
      res.render('pages', renderObj)
    })
    .catch(function(err) {
      console.log(req.route.path, err)
      return next()
    })
  })

  app.get('/ny', utils.isAuthenticated, function (req, res, next) {
    var renderObj = extend({}, res.vegosvar)
    res.render('new', renderObj)
  })

  app.get('/ny/publicerad', utils.isAuthenticated, function (req, res, next) {
    var hideredirect = (typeof(req.query.newpost) === 'undefined') ? true : false
    var renderObj = extend({
      type: 'product',
      hideredirect: hideredirect,
      post_url: req.query.newpost
    }, res.vegosvar)

    res.render('post/published', renderObj)
  })

  app.get('/ny/uppdaterad', utils.isAuthenticated, function (req, res, next) {
    var hideredirect = (typeof(req.query.newpost) === 'undefined') ? true : false
    var renderObj = extend({
      type: 'product',
      hideredirect: hideredirect,
      post_url: req.query.newpost
    }, res.vegosvar)

    res.render('post/updated', renderObj)
  })

  app.get('/ny/:type', utils.isAuthenticated, function (req, res, next) {
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

    //Check if current user is blocked (maybe could do this in utils function?)
    resources.models.user.isBlocked(req.user._id)
    .then(function(blocked) {
      if(blocked) {
        throw new Error('blocked')
      }
    })
    //Check which type of page the user wants to create
    .then(function() {
      //Load additional browser dependences based on page type
      var places = ['restaurang', 'butik', 'cafe']
      renderObj.loadMapResources = (places.indexOf(req.params.type) !== -1) ? { autocomplete: true, map: true } : false
      renderObj.loadPageResources.youtube = (req.params.type === 'recept')
    })
    //Get the categories for this page type
    .then(function() {
      var typeNumber = resources.models.page.typeNumberFromName(req.params.type)
      return resources.queries.getPageCategories(typeNumber)
      .then(function(categories) {
        renderObj.categories = categories
      })
    })
    .then(function() {
      res.render('post/' + req.params.type, renderObj)
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
          console.log(req.route.path, err)
          return next()
          break
      }
    })
  })

  app.get('/redigera/:url', utils.isAuthenticated, function (req, res, next) {
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

    new Promise.all([
      //Check if current user is blocked (maybe could do this in utils function?)
      resources.models.user.isBlocked(req.user._id)
      .then(function(blocked) {
        if(blocked) {
          throw new Error('blocked')
        }
      }),
      resources.models.page.get({
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
        renderObj.type = resources.utils.typeNameFromNumber(page.type)

        //Load additional browser dependences based on page type
        var places = ['restaurang', 'butik', 'cafe']
        renderObj.loadMapResources = (places.indexOf(req.params.type) !== -1) ? { autocomplete: true, map: true } : false
        renderObj.loadPageResources.youtube = (req.params.type === 'recept')

        return page
      })
      //Get the categories for this page type
      .then(function(page) {
        return resources.queries.getPageCategories(page.type)
        .then(function(categories) {
          renderObj.categories = categories
        })
      })
    ])
    .then(function() {
      res.render('post/' + renderObj.type, renderObj)
    })
    .catch(function(err) {
      console.log(req.route.path, err)
      return next()
    })
  })
}