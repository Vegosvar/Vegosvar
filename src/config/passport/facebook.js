/** facebook.js
* @file: /config/passport/facebook.js
* @description: Handles passport authentication for Facebook strategy
* @parameters: Object(resources)
* @exports: Facebook authentication for Passport
*/

var FacebookStrategy = require('passport-facebook').Strategy
var request = require('request');
var extend = require('util')._extend;

module.exports = function(resources) {
  return new FacebookStrategy({
    clientID: resources.config.facebook.app_id,
    clientSecret: resources.config.facebook.app_secret,
    callbackURL: resources.config.facebook.callback,
    profileFields: ['id', 'name', 'displayName', 'picture.type(large)'],
    enableProof: true
  }, function (access_token, refresh_token, profile, done) {
    var usersdb = resources.collections.users

    return resources.models.user.get({
      auth: {
        facebook: profile.id
      }
    })
    .then((users) => {
      if(users && users.length > 0) {
        let user = users[0];

        //Check if facebook photo has been updated
        if(user.active_photo === 'facebook') {
          if(profile.photos.length > 0) {
            var userPhoto = user.fb_photo;
            var userPhotoName = userPhoto.substring(userPhoto.lastIndexOf('/') + 1);

            var facebookPhoto = profile.photos[0].value;
            var facebookPhotoName = facebookPhoto.substring(facebookPhoto.lastIndexOf('/') + 1, facebookPhoto.indexOf('?'));

            if(userPhotoName !== facebookPhotoName) {
              //Photos do not match snag the new one.
              var filePath = '/avatar/facebook/' + facebookPhotoName
              return resources.models.image.downloadFile(facebookPhoto, filePath)
              .then(() => {
                var newValues = {
                  name: {
                    display_name: profile.displayName,
                    first: profile.name.givenName
                  },
                  fb_photo: '/uploads' + filePath
                };

                return resources.models.user.update({
                  auth: {
                    facebook: profile.id
                  }
                }, {
                  $set: newValues
                })
                .then(result => {
                  return extend(user, newValues);
                })
              })
            }
          }
        }

        return user;
      } else {
        //User not found, create a new account
        return resources.models.user.insert({
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
            blocked: false,
            permission: 'user'
          },
          fb_photo: (profile.photos) ? profile.photos[0].value : '/unknown_user.png',
          active_photo: 'facebook',
        })
        .then(result => {
          console.log(result);
          return result;
        })
        .catch(err => {
          done(err, null);
        })
      }
    })
    .then(user => {
      done(null, user)
    })
  })
}
