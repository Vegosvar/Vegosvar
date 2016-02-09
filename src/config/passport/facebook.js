var FacebookStrategy = require('passport-facebook').Strategy

module.exports = function(config) {
  return new FacebookStrategy({
    clientID: config.facebook.app_id,
    clientSecret: config.facebook.app_secret,
    callbackURL: config.facebook.callback,
    profileFields: ['id', 'name', 'displayName', 'picture.type(large)']
  }, function (access_token, refresh_token, profile, done) {
    var usersdb = config.dbinstance.collection('users')
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
        },
        photo: (profile.photos) ? profile.photos[0].value : '/unknown_user.png'
      }
    }, {
      new: true,
      upsert: true
    }, function (error, result) {
      done(error, {
        id: result.value._id,
        display_name: result.value.name.display_name,
        photo: result.value.photo
      })
    })
  })
}