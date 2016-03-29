/** admin.js
* @file: /src/app/models/admin.js
* @description: Model logic for admin specific operations
* @parameters: None
* @exports: Object with model logic
*/

var Promise = require('promise')
var ObjectID = require('mongodb').ObjectID

module.exports = function(resources, models) {

  return adminModel = {
    getAdminSidebar: function() {
      //Get revisions not yet moderated
      return models.revision.get({
        pending: {
          $gt: 0
        }
      })
      .then(function(revisions) {
        var changes = []

        //Get deleted pages
        return models.page.get({
          removed: {
            $exists: false
          },
          delete: true
        })
        .then(function(pages) {
          for (var i = 0; i < pages.length; i++) {
            changes.push( String(pages[i]._id) )
          }

          for (var i = 0; i < revisions.length; i++) {
            if( changes.indexOf( String(revisions[i].post_id ) ) == -1 ) {
              changes.push( String(revisions[i].post_id ) )
            }
          }
        })
        .then(function() {
          return changes
        })
      })
    },
    getProfile: function(user_id) {
      //Seriously, it's the same operation
      return models.user.getProfile(user_id)
    },
    getLikes: function() {
      //Get all the likes
      return models.like.get({}, {}, {
        _id: -1 //Sort descendingly, a.k.a. newest first
      })
      .then(function(likes) {
        //Get which page the like is for
        return new Promise.all(likes.map(function(like) {
          return models.page.get({
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
          return models.like.get({
            _id: like.user,
          })
          .then(function(users) {
            if(users.length > 0) {
              like.user = users[0]
              return like
            }
          })
        }))
      })
    },
    getPages: function() {
      //Get all the pages
      return models.page.get()
      //Get the revisions for each page
      .then(function(pages) {
        //Loop through all pages
        return new Promise.all(pages.map(function(page) {
          //Get the revisions for this page
          return models.revision.get({
            post_id: page._id
          })
          .then(function(revisions) {
            page.revisions = revisions
            return page
          })
        }))
        .then(function(pages) {
          //Convert timestamps to a human readable datetime
          return new Promise.all(pages.map(function(page) {
            if('updated' in page.timestamp) {
              page.timestamp.updated = utils.getPrettyDateTime(page.timestamp.updated)
            }

            page.timestamp.created = utils.getPrettyDateTime(page.timestamp.created)

            return page
          }))
        })
      })
      //Get the user whom created each page
      .then(function(pages) {
        //Loop through all pages
        return new Promise.all(pages.map(function(page) {
          //Get the user whom created this page
          return models.user.get({
            _id: page.user_info.id
          })
          .then(function(user) {
            if(user.length > 0) {
              page.user = user[0]
            }

            return page
          })

        }))
      })
    },
    getChanges: function() {
      var result = {} //The object we eventually will return

      //Get revisions pending moderation
      models.revision.get({
        pending: {
          $gt: 0
        }
      })
      .then(function(revisions) {
        //Get pages associated with each revision
        return new Promise.all(revisions.map(function(revision) {
          return models.page.get({
            _id: new ObjectID(revision.post_id)
          })
          .then(function(pages) {
            if(pages.length > 0) {
              var page = pages[0]

              var pageObj = {
                id: page._id,
                title: page.title,
                url: page.url,
                created: utils.getPrettyDateTime(page.timestamp.created),
                updated: utils.getPrettyDateTime(revision.modified),
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
        result.changes = changes
      })
      //Get the pages flagged for deletion
      .then(function() {
        return models.page.get({
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
              result.changes.forEach(function(change) {
                if(page._id === change.id) {
                  duplicate = true
                }
              })

              //If page is not in the changes array, add it
              if(!duplicate) {
                result.changes.push({
                  id: page._id,
                  title: page.title,
                  url: page.url,
                  created: utils.getPrettyDateTime(page.timestamp.created),
                  updated: page.timestamp.hasOwnProperty('updated') ? utils.getPrettyDateTime(page.timestamp.updated) : 0,
                  revisions: 0,
                  delete: page.hasOwnProperty('delete') ? page.delete : false
                })
              }
            })
          }
        })
      })
    },
    getVotes: function() {
      //Get all the votes
      return models.vote.get({}, {}, {
        _id: -1 //Sort descendingly, a.k.a. newest first
      })
      .then(function(votes) {
        //Get which page the vote is for
        return new Promise.all(votes.map(function(vote) {
          return models.page.get({
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
            return models.user.get({
              _id: vote.user,
            })
            .then(function(users) {
              if(users.length > 0) {
                vote.user = users[0]
                return vote
              }
            })
          }
        }))
      })
    },
    getPagesThisWeek: function() {
      //Get the date of monday current week
      var today = new Date( resources.utils.getISOdate() )
      var monday_this_week = today.setDate(today.getDate() - (today.getDay() + 6) % 7)
      monday_this_week = resources.utils.newISOdate( new Date( monday_this_week) )

      //Pages submitted this week
      return models.page.get({
        'timestamp.created': {
          $gte : monday_this_week
        }
      })
    },
    getPagesByMonth: function() {
        //New pages submitted this month
      return model.page.aggregate([{
          $group: {
            _id: {
              id: '$_id', type: '$type', date: '$timestamp.created'
            }
          }
        }, {
          $group: {
            _id: {
              date: { $substr: ['$_id.date', 0, 10] }, type: '$_id.type' //TODO: STOP SAVING TIMESTAMPS AS STRINGS, SERIOUSLY!
            },
            pages: {
              $sum: 1
            }
          }
        }
      ])
    }
  }

}