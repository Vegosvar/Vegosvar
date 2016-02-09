/** error.js
* @file: /config/error.js
* @description: Express routes for error pages
* @parameters: Object(app), Object(passport)
* @exports: Express routes
*/

module.exports = function (app, resources) {
  app.use(function (req, res) {
    res.render('404', { user: req.user })
    return
  })

  // TODO 'uncaughtException' as well? See what happens if DB goes down etc
  app.use(function error_handler (error, req, res, next) {
    // TODO better error page
    console.error(error.stack)
    res.status(500)
    res.send('<h1>Något blev fel</h1><p>Servern fick slut på havremjölk.</p>')
  })
}