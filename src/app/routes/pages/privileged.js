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

  app.get('/admin', functions.isPrivileged, function (req, res, next) {
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
      resources.queries.getUsers()
      .then(function(users) {
        renderObj.users = users.length
      }),
      resources.queries.getPages(
        {},
        {
          _id: 1
        }
      )
      .then(function(pages) {
        renderObj.pages_total = pages.length
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
    .then(function() {
      res.render('admin/index', renderObj)
    })
    .catch(function(err) {
      console.log(err)
      return next()
    })
  })

  app.get('/admin/borttagning/:post_id', functions.isPrivileged, function (req, res, next) {
    var renderObj =  extend({
      active_page: 'remove',
      loadAdminResources: {
        remove: true
      },
      page: null
    }, req.vegosvar)

    resources.queries.getPages({
      _id: new ObjectID(req.params.post_id)
    })
    .then(function(pages) {
      renderObj.page = pages[0]
    })
    .then(function() {
      res.render('admin/remove', renderObj)
    })
    .catch(function(err) {
      console.log(err)
      return next()
    })
  })

  app.get('/admin/uppdateringar', functions.isPrivileged, function (req, res, next) {
    var renderObj = extend({
      active_page: 'changes',
      loadPageResources: {
        datatables: true
      }
    }, res.vegosvar)

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
      renderObj.changes = changes
    })
    //Get the pages flagged for deletion
    .then(function() {
      return resources.queries.getPages({
        delete: true,
        removed: {
          $exists: false
        }
      })
      .then(function(pages) {
        if(pages.length > 0) {
          //Loop over all the pages flagged for deletion
          pages.forEach(function(page) {

            //Check if this page is already in changes, then don't push it to the array again
            var duplicate = false
            renderObj.changes.forEach(function(change) {
              if(page._id === change.id) {
                duplicate = true
              }
            })

            //If page is not in the changes array, add it
            if(!duplicate) {
              renderObj.changes.push({
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
        }
      })
    })
    .then(function() {
      res.render('admin/changes', renderObj)
    })
    .catch(function(err) {
      console.log(err)
      return next()
    })
  })

  app.get('/admin/profil/:userId', functions.isPrivileged, function (req, res) {
    var userId = new ObjectID(req.params.userId)

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

    new Promise.all([
      //Get the user from the database
      resources.queries.getUsers({
        _id: userId
      })
      .then(function(users) {
        if(users.length > 0) {
          renderObj.current_user = users[0]
        }
      }),
      //Get the pages that this user has created
      resources.queries.getPages({
        'user_info.id': userId
      })
      .then(function(pages) {
        renderObj.pages = pages
      }),
      //Get all the votes user has cast
      resources.queries.getVotes({
        'user.id': userId
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
        'user.id': userId
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
          $ne: userId
        },
        'user_info.contributors': {
          $elemMatch: {
            id: userId
          }
        }
      })
      .then(function(pages) {
        renderObj.contributions = pages
      })
    ])
    .then(function() {
      res.render('admin/profile', renderObj)
    })
    .catch(function(err) {
      console.log(err)
    })
  })

  app.get('/admin/revisioner/:url', functions.isPrivileged, function (req, res, next) {
    var url = req.params.url
    var pagesdb = resources.collections.pages
    var revisionsdb = resources.collections.revisions

    var renderObj = extend({
      revisions: [],
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
    .then(function() {
      res.render('admin/revisions', renderObj)
    })
    .catch(function(err) {
      console.log(err)
    })
  })

  app.get('/admin/users', functions.isPrivileged, function (req, res) {
    var renderObj = extend({
      active_page: 'users',
      loadAdminResources: {
        users: true
      },
      users: []
    }, res.vegosvar)

    resources.queries.getUsers()
    .then(function(users) {
      renderObj.users = users
    })
    .then(function() {
      res.render('admin/users', renderObj)
    })
    .catch(function(err) {
      console.log(err)
    })
  })

  app.get('/admin/installningar', functions.isPrivileged, function (req, res) {

    var renderObj = extend({
      active_page: 'settings',
      instagram: false
    }, res.vegosvar)

    //Get the timestamp of the instagram access token
    new Promise(function(resolve, reject) {
      var settingsdb = resources.collections.settings
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
    .then(function() {
      res.render('admin/settings', renderObj)
    })
    .catch(function(err) {
      console.log(err)
    })
  })

  app.get('/admin/gillningar', functions.isPrivileged, function (req, res) {
    var renderObj = extend({
      active_page: 'likes',
      loadPageResources: {
        datatables: true
      },
      likes: []
    }, res.vegosvar)

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
    .then(function() {
      res.render('admin/likes', renderObj)
    })
    .catch(function(err) {
      console.log(err)
    })
  })

  app.get('/admin/rostningar', functions.isPrivileged, function (req, res) {
    var renderObj = extend({
      active_page: 'ratings',
      loadPageResources: {
        datatables: true
      },
      votes: []
    }, res.vegosvar)

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
    .then(function() {
      res.render('admin/votes', renderObj)
    })
    .catch(function(err) {
      console.log(err)
    })
  })

  app.get('/admin/sidor', functions.isPrivileged, function (req, res) {
    var renderObj = extend({
      active_page: 'pages',
      loadPageResources: {
        datatables: true
      },
      revisions: [],
      pages: []
    }, res.vegosvar)

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
    .then(function(pages) {
      res.render('admin/pages', renderObj)
    })
    .catch(function(err) {
      console.log(err)
    })
  })
}