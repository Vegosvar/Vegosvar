/** redirects.js
* @file: /src/app/routes/redirects.js
* @description: Handles express redirect routing
* @parameters: Object(app), Object(resources)
* @returns: Express routes
*/

var ObjectID = require('mongodb').ObjectID
var striptags = require('striptags')

module.exports = function (app, resources) {
  var functions = resources.functions

  app.get('/*', function (req, res, next) {
    var noRedirect = ['logga-in','logga-ut', 'ajax', 'recensera', 'auth']
    var canRedirectTo = true
    var path = req.originalUrl.split("?").shift()

    if(path !== '/') {
      path = path.split('/')[1]
      for (var i = noRedirect.length - 1; i >= 0; i--) {
        if(noRedirect[i].indexOf(path) !== -1) {
          canRedirectTo = false
        }
      }

      if( canRedirectTo ) {
        req.session.returnTo = functions.returnUrl(req)
      } else {
        req.session.returnTo = '/'
      }
    } else {
      req.session.returnTo = '/'
    }

    console.log(req.session.returnTo)

    next()
  })
}