/** index.js
* @file: /config/index.js
* @description: Handles passport authentication
* @parameters: Object(app), Object(passport)
* @exports: Passport authentication
*/
var passport = require('passport')
var FacebookStrategy = require('./facebook')
var ObjectID = require('mongodb').ObjectID

module.exports = function (app, utils) {
  passport.use(FacebookStrategy({
    facebook: {
      app_id: utils.config.facebook.app_id,
      app_secret: utils.config.facebook.app_secret,
      callback: utils.config.facebook.callback
    },
    dbinstance: utils.dbinstance
  }))

  passport.serializeUser(function (user, done) {
    //console.log(user)
    done(null, user.id)
  })

  // TODO error handling etc
  passport.deserializeUser(function (id, done) {
    var usersdb = utils.dbinstance.collection('users')

    usersdb.find({_id: new ObjectID(id)}, ['_id', 'name', 'photo', 'info']).toArray(function (error, result) {
      done(error, result[0])
    })
  })
}