/** post.js
* @file: /src/app/routes/post.js
* @description: Handles express routing for the POST routes
* @parameters: Object(app), Object(resources)
* @exports: Express routes
*/

var body_parser = require('body-parser')
var urlencodedParser = body_parser.urlencoded({ extended: false })
var extend = require('util')._extend
var ObjectID = require('mongodb').ObjectID

module.exports = function (app, resources) {
  app.post('/submit', urlencodedParser, function (req, res, next) {
    //Check if user is blocked before proceeding
    resources.models.user.isBlocked(req.user._id)
    .then(function(blocked) {
      if(blocked) {
        throw new Error('User is blocked')
      }
    })
    .then(function() {
      return resources.models.page.newPost(req)
      .then(function(data) {
        console.log(data)
        res.json({
          success: true,
          url: '/ny/uppdaterad/?newpost=' + data.url
        })
      })
    })
    .catch(function(err) {
      console.error(req.route.path, err)
      return next()
    })
  })

  app.post('/submit/file', function(req, res) {
    resources.models.image.uploadCover(req)
    .then(function(image_id) {
      res.json({
        success: true,
        data: image_id
      })
    })
    .catch(function(err) {
      console.error(req.route.path, err)
      res.json({
        success: false,
        message: err.message
      })
    })
  })

  app.post('/submit/file/avatar', function(req, res) {
    resources.models.image.uploadAvatar(req)
    .then(function() {
      res.json({
        success: true
      })
    })
    .catch(function(err) {
      console.error(req.route.path, err)
      res.json({
        success: false,
        message: err.message
      })
    })
  })

}