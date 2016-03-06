/** setup.js
* @file: /src/app/routes/setup.js
* @description: The first express routes to handles redirect routing and blocking requests when under extreme load
* @parameters: Object(app), Object(resources)
* @returns: Express routes
*/

var ObjectID = require('mongodb').ObjectID
var striptags = require('striptags')

module.exports = function (app, resources) {
  var functions = resources.functions

  //send HTTP header for maintenance
  app.use(function(req, res, next) {
    if(process.env.NODE_ENV === 'maintenance') {
      res.status(502)
    }
  })

  // middleware which blocks requests when we're too busy 
  app.use(function(req, res, next) {
    if (resources.toobusy()) {
      res.status(503).send('Pust! Vegosvar är under hög belastning just nu. Försök att ladda om sidan igen!')
    } else {
      next()
    }
  })

  app.get('/*', function (req, res, next) {
    var noRedirect = ['logga-in','logga-ut', 'ajax', 'recensera', 'auth', 'uploads']
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
        //Either reuse previous value or redirect to front page
        req.session.returnTo = (req.session.returnTo) ? req.session.returnTo : '/'
      }
    } else {
      req.session.returnTo = '/'
    }

    next()
  })
}