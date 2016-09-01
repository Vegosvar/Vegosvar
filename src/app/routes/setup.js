/** setup.js
* @file: /src/app/routes/setup.js
* @description: The first express routes to handles redirect routing and blocking requests when under extreme load
* @parameters: Object(app), Object(resources)
* @returns: Express routes
*/

var ObjectID = require('mongodb').ObjectID

module.exports = function (app, resources) {
  var utils = resources.utils

  //send HTTP header for maintenance
  app.use(function(req, res, next) {
    if(process.env.NODE_ENV === 'maintenance') {
      res.status(502)
    } else {
      return next()
    }
  })

  // middleware which blocks requests when we're too busy
  app.use(function(req, res, next) {
    if (resources.toobusy()) {
      res.status(503).send('Pust! Vegosvar är under hög belastning just nu. Försök att ladda om sidan igen!')
    } else {
      return next()
    }
  })

  app.get('/*', function (req, res, next) {
    var blacklist = ['logga-in', 'logga-ut', 'ajax', 'recensera', 'auth', 'uploads']
    var canRedirectTo = true
    var path = req.originalUrl.split("?").shift()

    if(path !== '/') {
      path = path.split('/')[1]
      blacklist.forEach(function(entry) {
        if(entry.indexOf(path) !== -1) {
          canRedirectTo = false
        }
      });

      if(canRedirectTo) {
        req.session.returnTo = utils.returnUrl(req, blacklist)
      } else {
        //Either reuse previous value or redirect to front page
        req.session.returnTo = (req.session.returnTo) ? req.session.returnTo : '/'
      }
    } else {
      req.session.returnTo = '/'
    }

    return next()
  })

  //Resources for all users
  app.get('*', function(req, res, next) {
    res.vegosvar = {
      user: req.user
    }

    return next()
  })

  //Resources for logged in users
  app.get('*', function(req, res, next) {
    if(req.isAuthenticated()) {
      res.vegosvar.users = {}
    }

    return next()
  })

  //Resources for privileged users
  app.get('*', function(req, res, next) {
    if(req.isAuthenticated()) {
      if(utils.userCheckPrivileged(req.user)) {
        res.vegosvar.admin = {}

        resources.models.admin.getAdminSidebar()
        .then(function(changes) {
          res.vegosvar.admin.changes = changes
        })
        .then(function() {
          return next()
        })
        .catch(function(err) {
          console.log(req.route.path, err)
          return next()
        })
      } else {
        return next()
      }
    } else {
      return next()
    }
  })
}