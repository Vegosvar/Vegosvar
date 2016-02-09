/** auth.js
* @file: /src/app/routes/auth.js
* @description: Handles express routing for authentication routes
* @parameters: Object(app), Object(passport)
* @returns: Express routes
*/

var passport = require('passport')

module.exports = function (app) {
  app.get('/auth/facebook', passport.authenticate('facebook'), function(req, res) {})

  app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/logga-in' }), function (req, res) {
    res.redirect( req.session.returnTo );
  })
}