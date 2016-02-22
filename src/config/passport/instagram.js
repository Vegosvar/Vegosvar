/** instagram.js
* @file: /config/passport/instagram.js
* @description: Handles passport authentication for Instagram strategy
* @parameters: Object(config)
* @exports: Instagram authentication for Passport
*/

var InstagramStrategy = require('passport-instagram').Strategy

module.exports = function(resources) {
  return new InstagramStrategy({
    clientID: resources.config.instagram.client_id,
    clientSecret: resources.config.instagram.client_secret,
    callbackURL: resources.config.instagram.callback,
    passReqToCallback: true
  }, function (req, access_token, refresh_token, profile, done) {
    var settingsdb = resources.collections.settings

    settingsdb.findAndModify({
      "instagram.access_token": {
        $exists: true
      }
    }, [
      ['_id', 'asc'] //sort order
    ], {
      $set: {
        instagram: {
          access_token: access_token
        },
        timestamp: resources.functions.getISOdate()
      }
    }, {
      new: true,
      upsert: true
    }, function (error, result) {
      return done(error, {
        id: req.user._id //Pass back the ID of the user generating the request
      })
    })
  })
}


