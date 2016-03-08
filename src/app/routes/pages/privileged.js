/** privileged.js
* @file: /src/app/routes/pages/privileged.js
* @description: Handles express routing for the privileged page routes
* @parameters: Object(app), Object(resources)
* @exports: Express routes
*/

var ObjectID = require('mongodb').ObjectID

module.exports = function (app, resources) {
  var functions = resources.functions

  app.get('/admin', functions.isPrivileged, function (req, res) {
    var usersdb = resources.collections.users
    var pagesdb = resources.collections.pages
    var revisionsdb = resources.collections.revisions

    usersdb.count({}, function(err, users) {
      if (err) throw err

      pagesdb.count({}, function(err, pages) {
        if (err) throw err

        var today = new Date( functions.getISOdate() )
        var monday_this_week = today.setDate(today.getDate() - (today.getDay() + 6) % 7)
        monday_this_week = functions.newISOdate( new Date( monday_this_week) )

        //Pages this week
        pagesdb.count({"timestamp.created":{ $gte : monday_this_week }}, function(err, pages_this_week) {

          //Pages per month
          pagesdb.aggregate([
            {
              $group: {
                _id: {
                  id: "$_id", type: "$type", date: "$timestamp.created"
                }
              }
            },
            {
              $group: {
                _id: {
                  date: { $substr: ["$_id.date", 0, 10] }, type: "$_id.type"
                },
                pages: {
                  $sum: 1
                }
              }
            }
          ], function(err, pages_stats) {
            if (err) throw err

            revisionsdb.find({pending: { $gt: 0 } }).toArray(function(err, revisions) {
              pagesdb.find({delete: true}).toArray(function(err, removals) {
                var changes = []
                //Check if any of the removed pages has new revisions
                for (var i = 0; i < removals.length; i++) {
                  changes.push( String(removals[i]._id) )
                }

                for (var i = 0; i < revisions.length; i++) {
                  if( changes.indexOf( String(revisions[i].post_id ) ) == -1 ) {
                    changes.push( String(revisions[i].post_id ) )
                  }
                }

                res.render('admin/index', {
                  user: req.user,
                  active_page: 'index',
                  users: users,
                  pages_total: pages,
                  pages_this_week: pages_this_week,
                  pages_stats: pages_stats,
                  changes: changes,
                  loadPageResources: { highcharts: true },
                  loadAdminResources: { overview: true }
                })
              })
            })
          })
        })
      })
    })
  })

  app.get('/admin/borttagning/:post_id', functions.isPrivileged, function (req, res) {
    var usersdb = resources.collections.users
    var pagesdb = resources.collections.pages

    pagesdb.find({_id: new ObjectID(req.params.post_id)}).toArray(function(err, doc) {
      var page = doc[0]

      res.render('admin/remove', {
        user: req.user,
        active_page: 'remove',
        page: page,
        loadAdminResources: { remove: true }
      })
    })
  })

  app.get('/admin/uppdateringar', functions.isPrivileged, function (req, res) {
    var revisionsdb = resources.collections.revisions
    var pagesdb = resources.collections.pages

    revisionsdb.find({pending: { $gt: 0 } }).toArray(function(err, revisions) {
      if (err) throw err

      var updated = []
      var changes = []
      var revisionIds = []

      for (var i = 0; i < revisions.length; i++) {
        updated.push(new ObjectID(revisions[i].post_id))
        revisionIds.push(String(revisions[i].post_id))
      }

      pagesdb.find({ $or: [ { _id: { $in: updated } }, { delete: true } ] } ).toArray(function(err, pages) {
        if (err) throw err

        if(pages.length > 0) {
          for (var i = 0; i < pages.length; i++) {
            var page_id = String(pages[i]._id)

            if( revisionIds.indexOf(page_id) >= 0 ) {
              for(var key in revisions) {
                var revision = revisions[key]
                var revision_id = String(revision.post_id)

                if(revision_id == page_id) {
                  changes.push({
                    title: pages[i].title,
                    url: pages[i].url,
                    id: pages[i]._id,
                    created: functions.getPrettyDateTime(pages[i].timestamp.created),
                    updated: functions.getPrettyDateTime(revision.modified),
                    revisions: Object.keys(revision.revisions).length,
                    delete: pages[i].hasOwnProperty('delete') ? pages[i].delete : false
                  })
                }
              }
            } else {
              if('delete' in pages[i]) {
                changes.push({
                  title: pages[i].title,
                  url: pages[i].url,
                  id: pages[i]._id,
                  created: functions.getPrettyDateTime(pages[i].timestamp.created),
                  updated: pages[i].timestamp.hasOwnProperty('updated') ? functions.getPrettyDateTime(pages[i].timestamp.updated) : 0,
                  revisions: 0,
                  delete: pages[i].delete
                })
              }
            }
          }
        }

        res.render('admin/changes', {
          user: req.user,
          active_page: 'changes',
          changes: changes,
          loadPageResources: { datatables: true }
        })
      })
    })
  })

  app.get('/admin/profil/:user_id', functions.isPrivileged, function (req, res) {
    var usersdb = resources.collections.users
    var pagesdb = resources.collections.pages
    var revisionsdb = resources.collections.revisions

    var user_id = req.params.user_id

    usersdb.find({_id: new ObjectID(user_id) }).toArray(function(err, user) {
      if (err) throw err

      user = user[0]
      pagesdb.find( { "user_info.id": new ObjectID(user_id) }).toArray(function(err, pages) {
        res.render('admin/profil', {
          user: req.user,
          current_user: user,
          active_page: 'users',
          pages: pages
        })
      })
    })
  })

  app.get('/admin/revisioner/:url', functions.isPrivileged, function (req, res, next) {
    var pagesdb = resources.collections.pages
    var revisionsdb = resources.collections.revisions

    var url = req.params.url

    pagesdb.find({url:url}).toArray(function(err, doc) {
      var post = doc[0]

      revisionsdb.find({ post_id : new ObjectID(post._id) }).toArray(function(err, docs) {
        if(err) throw err
        if(docs.length > 0) {
          var revisions = docs[0].revisions
          var current = docs[0].revision

          var revisions_available = []
          for(var revision in revisions) {
            revisions_available.push({
              id: revision,
              accepted: revisions[revision].meta.accepted,
              created: functions.getPrettyDateTime(new Date(revision * 1000))
            })
          }

          var mapResources = {
            map: true,
            mapCluster: !(post.type === '3' || post.type === '5' || post.type === '6')
          }

          var pageResources = {
            public_page: true,
            youtube: (post.type === '2') ? true : false
          }

          res.render('admin/revisions', {
            user: req.user,
            post: post,
            revisions: revisions_available,
            current: current,
            loadAdminResources: { revisions: true },
            loadMapResources: mapResources,
            loadPageResources: pageResources
          })
        } else {
          console.log(post.title + ' saknar document i revisions collection')
          return next()
        }
      })
    })
  })

  app.get('/admin/users', functions.isPrivileged, function (req, res) {
    var usersdb = resources.collections.users
    var revisionsdb = resources.collections.revisions

    usersdb.find({}).toArray(function(err, users) {
      if (err) throw err

      res.render('admin/users', {
        user: req.user,
        active_page: 'users',
        users: users,
        loadAdminResources: { users: true }
      })
    })
  })

  app.get('/admin/installningar', functions.isPrivileged, function (req, res) {
    var settingsdb = resources.collections.settings

    settingsdb.find({
      'instagram.access_token': {
        $exists:true
      }
    }).toArray(function(err, instagram) {
      if (err) throw err

      var instagram_timestamp
      if(instagram.length > 0 && 'timestamp' in instagram[0]) {
        instagram_timestamp = resources.functions.getPrettyDateTime(instagram[0].timestamp)
      }

      res.render('admin/settings', {
        active_page: 'settings',
        instagram: instagram_timestamp
      })
    })
  })
}