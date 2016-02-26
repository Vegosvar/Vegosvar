/** auth.js
* @file: /src/app/routes/auth.js
* @description: Handles express routing for authentication routes
* @parameters: Object(app), Object(passport)
* @returns: Express routes
*/

var passport = require('passport')

module.exports = function(app) {
  app.get('/auth/facebook', passport.authenticate('facebook'))

  app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/logga-in' }), function (req, res) {
    res.redirect( req.session.returnTo );
  })

  app.get('/admin/auth/instagram', passport.authenticate('instagram'));

  app.get('/admin/auth/instagram/callback', passport.authenticate('instagram', {
    scope: ['public_content'],
    failureRedirect: '/admin/installningar?instagram_access_token_updated=false'
  }), function(req, res) {
    // Successful authentication, notify that the access token has been updated
    res.redirect('/admin/installningar?instagram_access_token_updated=true');
  });

}