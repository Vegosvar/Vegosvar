/** privileged.js
 * @file: /src/app/routes/pages/privileged.js
 * @description: Handles express routing for the privileged page routes
 * @parameters: Object(app), Object(resources)
 * @exports: Express routes
 */

var ObjectID = require('mongodb').ObjectID
var Promise = require('promise')
var extend = require('util')._extend

module.exports = function(app, resources) {
  var utils = resources.utils

  app.get('/admin', utils.isPrivileged, function(req, res, next) {
    var renderObj = extend({
      active_page: 'index',
      loadPageResources: {
        highcharts: true
      },
      loadAdminResources: {
        overview: true
      },
      pages_total: 0,
      users: 0,
      pages_this_week: [],
      pages_stats: []
    }, res.vegosvar)

    new Promise.all([
        resources.models.user.get({}, //Get all users
          {
            _id: 1 //Only include id (we only need to know how many there are)
          }
        )
        .then(function(users) {
          renderObj.users = users.length
        }),
        resources.models.page.get({}, //Get all pages
          {
            _id: 1 //Only include id (we only need to know how many there are)
          }
        )
        .then(function(pages) {
          renderObj.pages_total = pages.length
        }),
        resources.models.admin.getPagesThisWeek()
        .then(function(pages) {
          renderObj.pages_this_week = pages
        }),
        resources.models.admin.getPagesByMonth()
        .then(function(pages) {
          renderObj.pages_stats = pages
        })
      ])
      .then(function() {
        res.render('admin/index', renderObj)
      })
      .catch(function(err) {
        console.error(req.route.path, err)
        return next()
      })
  })

  app.get('/admin/borttagning/:post_id', utils.isPrivileged, function(req, res, next) {
    var renderObj = extend({
      active_page: 'remove',
      loadAdminResources: {
        remove: true
      },
      page: null
    }, req.vegosvar)

    resources.models.page.get({
        _id: new ObjectID(req.params.post_id)
      })
      .then(function(pages) {
        if (pages.length <= 0) {
          throw new Error(404)
        } else {
          renderObj.page = pages[0]
        }
      })
      .then(function() {
        res.render('admin/remove', renderObj)
      })
      .catch(function(err) {
        console.error(req.route.path, err)
        return next()
      })
  })

  app.get('/admin/uppdateringar', utils.isPrivileged, function(req, res, next) {
    var renderObj = extend({
      active_page: 'changes',
      loadPageResources: {
        datatables: true
      }
    }, res.vegosvar)

    resources.models.admin.getChanges()
      .then(function(result) {
        extend(renderObj, result)
        res.render('admin/changes', renderObj)
      })
      .catch(function(err) {
        console.error(req.route.path, err)
        return next()
      })
  })

  app.get('/admin/profil/:user_id', utils.isPrivileged, function(req, res, next) {
    var renderObj = extend({
      loadPageResources: {
        datatables: true
      },
      current_user: null,
      contributions: [],
      pages: [],
      likes: [],
      votes: []
    }, res.vegosvar)

    resources.models.admin.getProfile(req.params.user_id)
      .then(function(profileObj) {
        renderObj = extend(renderObj, profileObj)

        res.render('admin/profile', renderObj)
      })
      .catch(function(err) {
        console.error(req.route.path, err)
        return next()
      })
  })

  app.get('/admin/revisioner/:url', utils.isPrivileged, function(req, res, next) {
    var renderObj = extend({
      active_page: 'changes',
      loadAdminResources: {
        revisions: true
      },
      loadPageResources: {
        public_page: true
      },
      post: null,
      current: null,
      revisions: []
    }, res.vegosvar)

    resources.models.page.get({
        url: req.params.url
      })
      .then(function(pages) {
        if (pages.length <= 0) {
          throw new Error(404)
        } else {
          return pages[0]
        }
      })
      .then(function(page) {
        renderObj.post = page

        //Check if we should load map resources
        var pageHasMap = (page.type === '3' || page.type === '5' || page.type === '6')
        renderObj.loadMapResources = {
          map: pageHasMap,
          mapCluster: !pageHasMap
        }

        //Check for other page specific resources we might require
        var pageHasVideo = (page.type === '2')
        renderObj.loadPageResources.youtube = pageHasVideo

        return resources.models.revision.get({
            post_id: page._id
          })
          .then(function(revisions) {
            var revisions = revisions[0]
            renderObj.current = revisions.revision

            Object.keys(revisions.revisions).forEach(function(revision) {
              renderObj.revisions.push({
                id: revision,
                accepted: revisions.revisions[revision].meta.accepted,
                created: utils.getPrettyDateTime(new Date(revision * 1000))
              })
            })
          })
      })
      .then(function() {
        res.render('admin/revisions', renderObj)
      })
      .catch(function(err) {
        console.error(req.route.path, err)
        return next()
      })
  })

  app.get('/admin/users', utils.isPrivileged, function(req, res, next) {
    var renderObj = extend({
      active_page: 'users',
      loadAdminResources: {
        users: true
      },
      users: []
    }, res.vegosvar)

    resources.models.user.get()
      .then(function(users) {
        renderObj.users = users
      })
      .then(function() {
        res.render('admin/users', renderObj)
      })
      .catch(function(err) {
        console.error(req.route.path, err)
        return next()
      })
  })

  app.get('/admin/installningar', utils.isPrivileged, function(req, res, next) {
    var renderObj = extend({
      active_page: 'settings',
      instagram: null,
      google: null,
    }, res.vegosvar)

    //Get the timestamp of the instagram access token
    new Promise.all([
        resources.models.setting.get({
          'instagram.access_token': {
            $exists: true
          }
        })
        .then(function(result) {
          if (result.length > 0 && 'timestamp' in result[0]) {
            renderObj.instagram = resources.utils.getPrettyDateTime(result[0].timestamp)
          }
        }),
        resources.models.setting.get({
          'google.access_token': {
            $exists: true
          }
        })
        .then(function(result) {
          if (result.length > 0 && 'timestamp' in result[0]) {
            renderObj.google = resources.utils.getPrettyDateTime(result[0].timestamp)
          }
        })
      ])
      .then(function() {
        res.render('admin/settings', renderObj)
      })
      .catch(function(err) {
        console.error(req.route.path, err)
      })
  })

  app.get('/admin/gillningar', utils.isPrivileged, function(req, res, next) {
    var renderObj = extend({
      active_page: 'likes',
      loadPageResources: {
        datatables: true
      },
      likes: []
    }, res.vegosvar)

    resources.models.admin.getLikes()
      .then(function(likes) {
        renderObj.likes = likes
        res.render('admin/likes', renderObj)
      })
      .catch(function(err) {
        console.error(req.route.path, err)
      })
  })

  app.get('/admin/rostningar', utils.isPrivileged, function(req, res, next) {
    var renderObj = extend({
      active_page: 'ratings',
      loadPageResources: {
        datatables: true
      },
      votes: []
    }, res.vegosvar)

    resources.models.admin.getVotes()
      .then(function(votes) {
        renderObj.votes = votes
        res.render('admin/votes', renderObj)
      })
      .catch(function(err) {
        console.error(req.route.path, err)
      })
  })

  app.get('/admin/sidor', utils.isPrivileged, function(req, res, next) {
    var renderObj = extend({
      active_page: 'pages',
      loadPageResources: {
        datatables: true
      },
      revisions: [],
      pages: []
    }, res.vegosvar)

    resources.models.admin.getPages()
      .then(function(pages) {
        renderObj.pages = pages
        res.render('admin/pages', renderObj)
      })
      .catch(function(err) {
        console.error(req.route.path, err)
      })
  })
}