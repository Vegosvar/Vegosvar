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
  //var InstagramStrategy = require('./instagram')(resources)

  /* Facebook */
  passport.use(FacebookStrategy)

  /* Instagram (for admin) */
  //passport.use(InstagramStrategy)

  passport.serializeUser(function (req, user, done) {
    if(user && '_id' in user) {
      done(null, user._id);
    } else {
      var error = new Error('Unable to serialize user because of missing ID')
      done(error, null);
    }
  })

  // TODO error handling etc
  passport.deserializeUser(function (req, id, done) {
    return resources.models.user.get({
      _id: new ObjectID(id)
    })
    .then((users) => {
      if(users.length > 0) {
        var user = users[0];
        done(null, user);
      } else {
        throw new Error('User not found in database!');
      }
    })
    .catch(err => {
      done(err, null);
    });
  })
}