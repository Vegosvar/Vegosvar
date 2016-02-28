/** facebook.js
* @file: /config/passport/facebook.js
* @description: Handles passport authentication for Facebook strategy
* @parameters: Object(config)
* @exports: Facebook authentication for Passport
*/

var FacebookStrategy = require('passport-facebook').Strategy

module.exports = function(resources) {
  return new FacebookStrategy({
    clientID: resources.config.facebook.app_id,
    clientSecret: resources.config.facebook.app_secret,
    callbackURL: resources.config.facebook.callback,
    profileFields: ['id', 'name', 'displayName', 'picture.type(large)'],
  }, function (access_token, refresh_token, profile, done) {
    var usersdb = resources.collections.users

    usersdb.findAndModify({
      auth: {
        facebook: profile.id
      }
    },
    [
      ['_id','asc'] // sort order
    ], {
      $setOnInsert: {
        auth: {
          facebook: profile.id
        },
        name: {
          display_name: profile.displayName,
          first: profile.name.givenName
        },
        info: {
          website: null,
          description: null,
          blocked: false
        },
        fb_photo: (profile.photos) ? profile.photos[0].value : '/unknown_user.png',
        active_photo: 'facebook',
      }
    }, {
      new: true,
      upsert: true
    }, function (error, result) {
      done(error, {
        id: result.value._id,
        display_name: result.value.name.display_name,
        fb_photo: result.value.photo,
        active_photo: 'facebook'
      })
    })
  })
}