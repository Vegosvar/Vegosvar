/** privileged.js
* @file: /src/app/routes/pages/privileged.js
* @description: Handles express routing for the privileged page routes
* @parameters: Object(app), Object(resources)
* @exports: Express routes
*/

var ObjectID = require('mongodb').ObjectID
var Promise = require('promise')
var extend = require('util')._extend

module.exports = function (app, resources) {
  var functions = resources.functions

  app.get('/admin', functions.isPrivileged, function (req, res) {
    var usersdb = resources.collections.users
    var pagesdb = resources.collections.pages
    var revisionsdb = resources.collections.revisions

    renderObj = {
      user: req.user,
      active_page: 'index',
      loadPageResources: { highcharts: true },
      loadAdminResources: { overview: true }
    }

    new Promise.all([
      resources.queries.getUsers()
      .then(function(users) {
        renderObj.users = users.length
      }),
      resources.queries.getPages()
      .then(function(pages) {
        renderObj.pages_total = pages.length
      }),
      resources.queries.getAdminSidebar()
      .then(function(changes) {
        renderObj.changes = changes
      }),
      resources.queries.getPagesThisWeek()
      .then(function(pages) {
        renderObj.pages_this_week = pages
      }),
      resources.queries.getPagesByMonth()
      .then(function(pages) {
        renderObj.pages_stats = pages
      })
    ])
    .done(function() {
      res.render('admin/index', renderObj)
    })
  })

  app.get('/admin/borttagning/:post_id', functions.isPrivileged, function (req, res) {
    var renderObj =  {
      user: req.user,
      active_page: 'remove',
      loadAdminResources: { remove: true }
    }

    new Promise.all([
      resources.queries.getAdminSidebar()
      .then(function(changes) {
        renderObj.changes = changes
      }),
      resources.queries.getPages({
        _id: new ObjectID(req.params.post_id)
      })
      .then(function(pages) {
        renderObj.page = pages[0]
      })
    ])
    .done(function() {
      res.render('admin/remove', renderObj)
    })
  })

  app.get('/admin/uppdateringar', functions.isPrivileged, function (req, res) {
    var revisionsdb = resources.collections.revisions
    var pagesdb = resources.collections.pages

    //Get sidebar info (move this elsewhere maybe?)
    resources.queries.getAdminSidebar()
      .then(function(changes) {
        renderObj.changes = changes
    })

    //Get revisions pending moderation
    resources.queries.getRevisions({
      pending: {
        $gt: 0
      }
    })
    .then(function(revisions) {
      //Get pages associated with each revision
      return new Promise.all(revisions.map(function(revision) {
        return resources.queries.getPages({
          _id: new ObjectID(revision.post_id)
        })
        .then(function(pages) {
          if(pages.length > 0) {
            var page = pages[0]

            var pageObj = {
              id: page._id,
              title: page.title,
              url: page.url,
              created: functions.getPrettyDateTime(page.timestamp.created),
              updated: functions.getPrettyDateTime(revision.modified),
              revisions: Object.keys(revision.revisions).length,
              delete: page.hasOwnProperty('delete') ? page.delete : false
            }

            return pageObj
          } else {
            return false
          }
        })
      }))
    })
    .then(function(changes) {
      return resources.queries.getPages({
        delete: true,
        removed: {
          $exists: false
        }
      })
      .then(function(pages) {
        if(pages.length > 0) {
          pages.forEach(function(page) {
            var duplicate = false
            changes.forEach(function(change) {
              if(page._id === change.id) {
                duplicate = true
              }
            })

            if(!duplicate) {
              changes.push({
                id: page._id,
                title: page.title,
                url: page.url,
                created: functions.getPrettyDateTime(page.timestamp.created),
                updated: page.timestamp.hasOwnProperty('updated') ? functions.getPrettyDateTime(page.timestamp.updated) : 0,
                revisions: 0,
                delete: page.hasOwnProperty('delete') ? page.delete : false
              })
            }
          })

          return changes
        }
      })
      .then(function() {
        return changes
      })
    })
    .done(function(changes) {
      res.render('admin/changes', {
        user: req.user,
        active_page: 'changes',
        changes: changes,
        loadPageResources: { datatables: true }
      })
    })
  })

  app.get('/admin/profil/:user_id', functions.isPrivileged, function (req, res) {
    var userid = new ObjectID(req.params.user_id)

    var renderObj =  {
      user: req.user,
      votes: [],
      likes: [],
      loadPageResources: { datatables: true }
    }

    new Promise.all([
      //Get sidebar info (move this elsewhere maybe?)
      resources.queries.getAdminSidebar()
        .then(function(changes) {
          renderObj.changes = changes
      }),
      //Get the user from the database
      resources.queries.getUsers({
        _id: userid
      })
      .then(function(users) {
        renderObj.current_user = users[0]
      }),
      //Get the pages that this user has created
      resources.queries.getPages({
        'user_info.id': userid
      })
      .then(function(pages) {
        renderObj.pages = pages
      }),
      //Get all the votes user has cast
      resources.queries.getVotes({
        'user.id': userid
      })
      .then(function(votes) {
        //Then loop over all the votes and find the associated page
        return new Promise.all(votes.map(function(vote) {
          resources.queries.getPages({
            _id: new ObjectID(vote.post.id)
          }, {
            url: 1,
            title: 1
          })
          .then(function(pages) {
            if(pages.length > 0) {
              var page = pages[0]

              renderObj.votes.push({
                page_id: page._id,
                url: page.url,
                title: page.title,
                content: vote.content
              })
            }
          })
        }))
      }),
      //Get likes this user has given
      resources.queries.getLikes({
        'user.id': userid
      })
      .then(function(likes) {
        //Loop over all the likes and get the associated page
        return new Promise.all(likes.map(function(like) {
          resources.queries.getPages({
            _id: new ObjectID(like.post.id)
          }, {
            url: 1,
            title: 1
          })
          .then(function(pages) {
            if(pages.length > 0) {
              var page = pages[0]

              renderObj.likes.push({
                page_id: page._id,
                url: page.url,
                title: page.title
              })
            }
          })
        }))
      }),
      //Get pages this user has contributed to, but not created
      resources.queries.getPages({
        'user_info.id': {
          $ne: userid
        },
        'user_info.contributors': {
          $elemMatch: {
            id: userid
          }
        }
      })
      .then(function(pages) {
        renderObj.contributions = pages
      })
    ])
    .done(function() {
      res.render('admin/profile', renderObj)
    })
  })

  app.get('/admin/revisioner/:url', functions.isPrivileged, function (req, res, next) {
    var url = req.params.url
    var pagesdb = resources.collections.pages
    var revisionsdb = resources.collections.revisions

    var renderObj = {
      user: req.user,
      revisions: [],
      active_page: 'changes',
      loadAdminResources: { revisions: true },
      loadPageResources: {
        public_page: true
      }
    }

    new Promise.all([
      //Get sidebar info (move this elsewhere maybe?)
      resources.queries.getAdminSidebar()
        .then(function(changes) {
          renderObj.changes = changes
      }),
      resources.queries.getPages({
        url: req.params.url
      })
      .then(function(pages) {
        var page = pages[0]
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

        return resources.queries.getRevisions({
          post_id: page._id
        })
        .then(function(revisions) {
          var revisions = revisions[0]
          renderObj.current = revisions.revision

          return new Promise.all(Object.keys(revisions.revisions).map(function(revision) {
            renderObj.revisions.push({
              id: revision,
              accepted: revisions.revisions[revision].meta.accepted,
              created: functions.getPrettyDateTime(new Date(revision * 1000))
            })
          }))
        })
      })
    ])
    .done(function() {
      res.render('admin/revisions', renderObj)
    })
  })

  app.get('/admin/users', functions.isPrivileged, function (req, res) {
    var renderObj = {
      user: req.user,
      active_page: 'users',
      loadAdminResources: { users: true }
    }

    new Promise.all([
      //Get sidebar info (move this elsewhere maybe?)
      resources.queries.getAdminSidebar()
      .then(function(changes) {
        renderObj.changes = changes
      }),
      resources.queries.getUsers()
      .then(function(users) {
        renderObj.users = users
      })
    ])
    .done(function() {
      res.render('admin/users', renderObj)
    })
  })

  app.get('/admin/installningar', functions.isPrivileged, function (req, res) {
    var settingsdb = resources.collections.settings

    var renderObj = {
      active_page: 'settings',
      instagram: false
    }

    Promise.all([
      //Get sidebar info (move this elsewhere maybe?)
      resources.queries.getAdminSidebar()
      .then(function(changes) {
        renderObj.changes = changes
      }),

      //Get the timestamp of the instagram access token
      new Promise(function(resolve, reject) {
        settingsdb.find({
          'instagram.access_token': {
            $exists:true
          }
        }).toArray(function(err, instagram) {
          if (err) {
            reject(err)
          } else {
            resolve(instagram)
          }
        })
      })
      .then(function(instagram) {
        if(instagram.length > 0 && 'timestamp' in instagram[0]) {
          renderObj.instagram = resources.functions.getPrettyDateTime(instagram[0].timestamp)
        }
      })
    ])
    .done(function() {
      res.render('admin/settings', renderObj)
    })
  })

  app.get('/admin/gillningar', functions.isPrivileged, function (req, res) {
    var renderObj = {
      user: req.user,
      active_page: 'likes',
      likes: [],
      loadPageResources: { datatables: true },
    }

    new Promise.all([
      //Get sidebar info (move this elsewhere maybe?)
      resources.queries.getAdminSidebar()
      .then(function(changes) {
        renderObj.changes = changes
      }),
      //Get all the likes
      resources.queries.getLikes({}, {}, {
        _id: -1 //Sort descendingly, a.k.a. newest first
      })
      .then(function(likes) {
        //Get which page the like is for
        return new Promise.all(likes.map(function(like) {
          return resources.queries.getPages({
            _id: like.post.id
          }, {
            url: 1,
            title: 1
          })
          .then(function(pages) {
            if(pages.length > 0) {
              var page = pages[0]
              return {
                user: like.user.id,
                url: page.url,
                title: page.title
              }
            }
          })
        }))
      })
      //And more info about the user which liked the page
      .then(function(likes) {
        return new Promise.all(likes.map(function(like) {
          return resources.queries.getUsers({
            _id: like.user,
          })
          .then(function(users) {
            if(users.length > 0) {
              like.user = users[0]
              renderObj.likes.push(like)
            }
          })
        }))
      })
    ])
    .done(function() {
      res.render('admin/likes', renderObj)
    })
  })

  app.get('/admin/rostningar', functions.isPrivileged, function (req, res) {
    var renderObj = {
      user: req.user,
      active_page: 'ratings',
      votes: [],
      loadPageResources: { datatables: true }
    }

    new Promise.all([
      //Get sidebar info (move this elsewhere maybe?)
      resources.queries.getAdminSidebar()
      .then(function(changes) {
        renderObj.changes = changes
      }),
      //Get all the votes
      resources.queries.getVotes({}, {}, {
        _id: -1 //Sort descendingly, a.k.a. newest first
      })
      .then(function(votes) {
          //Get which page the vote is for
          return new Promise.all(votes.map(function(vote) {
            return resources.queries.getPages({
              _id: vote.post.id
            }, {
              url: 1,
              title: 1
            })
            .then(function(pages) {
              if(pages.length > 0) {
                var page = pages[0]
                return {
                  user: vote.user.id,
                  url: page.url,
                  title: page.title,
                  content: vote.content,
                }
              }
            })
          }))
        })
        //And more info about the user whom voted on that page
        .then(function(votes) {
          return new Promise.all(votes.map(function(vote) {
            if(vote) {
              console.log(vote)
              return resources.queries.getUsers({
                _id: vote.user,
              })
              .then(function(users) {
                if(users.length > 0) {
                  vote.user = users[0]
                  renderObj.votes.push(vote)
                }
              })
            }
          }))
        })
    ])
    .done(function() {
      res.render('admin/votes', renderObj)
    })
  })

  app.get('/admin/sidor', functions.isPrivileged, function (req, res) {
    var renderObj = {
      user: req.user,
      active_page: 'pages',
      loadPageResources: { datatables: true }
    }

    new Promise.all([
      //Get sidebar info (move this elsewhere maybe?)
      resources.queries.getAdminSidebar()
      .then(function(changes) {
        renderObj.changes = changes
      }),

      //Get all the pages
      resources.queries.getPages()
      //Get the revisions for each page
      .then(function(pages) {
        //Loop through all pages
        return new Promise.all(pages.map(function(page) {
          //Get the revisions for this page
          return resources.queries.getPageRevisions(page)
          .then(function(revisions) {
            page.revisions = revisions
            return page
          })
        }))
        .then(function(pages) {
          //Convert timestamps to a human readable datetime
          return new Promise.all(pages.map(function(page) {
            if('updated' in page.timestamp) {
              page.timestamp.updated = functions.getPrettyDateTime(page.timestamp.updated)
            }

            page.timestamp.created = functions.getPrettyDateTime(page.timestamp.created)

            return page
          }))
        })
      })
      //Get the user whom created each page
      .then(function(pages) {
        //Loop through all pages
        return new Promise.all(pages.map(function(page) {
          //Get the user whom created this page
          return resources.queries.getPageUser(page)
          .then(function(user) {
            if(user.length > 0) {
              page.user = user[0]
            }

            return page
          })

        }))
      })
      .then(function(pages) {
        renderObj.pages = pages
      })
    ])
    .done(function(pages) {
      res.render('admin/pages', renderObj)
    })
  })
}