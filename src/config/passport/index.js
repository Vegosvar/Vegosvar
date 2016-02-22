/** index.js
* @file: /config/index.js
* @description: Handles passport authentication
* @parameters: Object(app), Object(passport)
* @exports: Passport authentication
*/
var ObjectID = require('mongodb').ObjectID
var passport = require('passport')

module.exports = function (app, resources) {
  var FacebookStrategy = require('./facebook')(resources)
  var InstagramStrategy = require('./instagram')(resources)

  /* Facebook */
  passport.use(FacebookStrategy)

  /* Instagram (for admin) */
  passport.use(InstagramStrategy)

  passport.serializeUser(function (req, user, done) {
    done(null, user.id)
  })

  // TODO error handling etc
  passport.deserializeUser(function (req, id, done) {
    var usersdb = resources.collections.users

    usersdb.find({_id: new ObjectID(id)}, ['_id', 'name', 'fb_photo', 'vegosvar_photo', 'active_photo', 'info']).toArray(function (error, result) {
      done(error, result[0])
    })
  })

}