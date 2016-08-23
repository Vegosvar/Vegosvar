/** unauthenticated.js
* @file: /src/app/routes/ajax/unauthenticated.js
* @description: Handles express routing for the unathenticated ajax routes
* @parameters: Object(app), Object(resources)
* @returns: Express routes
*/

var ObjectID = require('mongodb').ObjectID
var striptags = require('striptags')
var extend = require('util')._extend;

module.exports = function (app, resources) {
  var utils = resources.utils

  /** /ajax/map
  * @type: GET
  * @description: Ajax route for loading page info to a map.
  * @parameters: {
      Object(filter): {
        id: String("568207facddd6a6a0808c770"),
        type: String("5")
      }
  * }
  */
  app.get('/ajax/map', function (req, res) {
    resources.models.page.getMapResults(req.query.filter)
    .then(function(result) {
      //Handle result

      //Notify user
      res.json({
        success: true,
        data: result
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

  /** /ajax/search
  * General site search
  */
  app.get('/ajax/search', function (req, res) {
    var searchString = req.query.s

    resources.models.page.getSearchResults(req.query.s)
    .then(function(result) {
      res.json({
        success: true,
        data: result
      })
    })
    .catch(function(err) {
      console.log(err)
      res.json({
        success: false,
        message: err.message
      })
    })
  })

  app.get('/ajax/categories', function (req, res) {
    var query = extend({}, req.query.query)

    resources.models.category.get(query)
    .then(function(result) {
      res.json({
        success: true,
        data: result
      })
    })
    .catch(function(err) {
      console.log(err)
      res.json({
        success: false,
        message: err.message
      })
    })
  })

  app.get('/ajax/page/:url', function (req, res) {
    var query = extend({
      url: req.params.url
    }, req.query.query)

    resources.models.page.get(query)
    .then(function(result) {
      res.json({
        success: true,
        data: result
      })
    })
    .catch(function(err) {
      console.log(err)
      res.json({
        success: false,
        message: err.message
      })
    })
  })

  /** /ajax/imageInfo
  *
  */
  app.get('/ajax/imageInfo', function (req, res) {
    resources.models.image.get({
      _id: new ObjectID(req.query.id)
    })
    .then(function(result) {
      res.json({
        success: true,
        data: result
      })
    })
    .catch(function(err) {
      console.log(err)
      res.json({
        success: false,
        message: err.message
      })
    })
  })
}