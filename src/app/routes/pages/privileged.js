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
              pagesdb.find({removed: { $exists: false }, delete: true}).toArray(function(err, removals) {
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

      pagesdb.find({ removed: { $exists: false }, $or: [ { _id: { $in: updated } }, { delete: true } ] } ).toArray(function(err, pages) {
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
    var userid = new ObjectID(req.params.user_id)
    var pagesdb = resources.collections.pages
    var likesdb = resources.collections.likes
    var votesdb = resources.collections.votes
    var usersdb = resources.collections.users

    usersdb.find({_id: userid}).toArray(function(err, users) {
      if (err) throw err
      var current_user = users[0]

      //Get pages user has created
      pagesdb.find( { "user_info.id": userid }).toArray(function(err, pages) {
        if (err) throw err

        //Find votes from this user
        votesdb.find( {"user.id": userid }).toArray(function(err, votes) {
          if (err) throw err

          var pages_voted_on = []
          var pages_voted_on_str = []
          var pages_votes = []
          for (var i = 0; i < votes.length; i++) {
            pages_voted_on.push( votes[i].post.id )
            pages_voted_on_str.push( String(votes[i].post.id ) )
            pages_votes.push( votes[i].content )
          }

          //Find pages user voted on
          pagesdb.find( { _id: { $in: pages_voted_on } } ).toArray(function(err, voted) {
            if (err) throw err

            var voted_pages = []
            for (var i = 0; i < voted.length; i++) {
              var position = pages_voted_on_str.indexOf( String(voted[i]._id) )
              if( position !== -1 ) {
                voted_pages.push({
                  page_id: voted[i]._id,
                  url: voted[i].url,
                  title: voted[i].title,
                  content: pages_votes[position]
                })
              }
            }

            //Get likes from this user
            likesdb.find( { "user.id": userid }).toArray(function(err, likes) {
              if (err) throw err

              var pages_liked = []
              for (var i = 0; i < likes.length; i++) {
                pages_liked.push( likes[i].post.id )
              }

              //Pages user has liked
              pagesdb.find( { _id: { $in: pages_liked } }).toArray(function(err, liked) {
                if (err) throw err

                //Pages user has contributed to (but not created)
                pagesdb.find({
                  "user_info.id": {
                    $ne: new ObjectID(userid)
                  },
                  "user_info.contributors": {
                    $elemMatch: {
                      id: new ObjectID(userid)
                    }
                  }
                }).toArray(function(err, contributions) {
                  if(err) throw err

                  res.render('admin/profile', {
                    user: req.user,
                    pages: pages,
                    votes: voted_pages,
                    likes: liked,
                    current_user: current_user,
                    contributions: contributions,
                    loadPageResources: { datatables: true }
                  })
                })
              })
            })
          })
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