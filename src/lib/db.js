var client = require('mongodb').MongoClient
var ObjectID = require('mongodb').ObjectID
var Promise = require('promise')
var extend = require('util')._extend
var functions = require('./functions')

var instance = false

module.exports = {
  connect: function(config, callback) {
    client.connect(config.database.host+config.database.name, function(err, db){
        //Make db instance available to the rest of the module
      instance = db
      //Set up db index on pages collection
      instance.collection('pages').ensureIndex({
        'url': 'text',
        'title': 'text',
        'post.city': 'text',
        'post.content': 'text',
        'post.food': 'text',
        'post.product_type': 'text',
        'post.veg_type': 'text',
        'post.veg_offer': 'text'
        }, {
          'weights': {
            'title': 20,
            'url': 18,
            'post.city': 15,
            'post.food': 10,
            'post.product_type': 10,
            'post.content': 5,
            'post.veg_type': 3,
            'post.veg_offer': 1
        },
        'default_language': 'swedish'
      })
      callback(db)
    })
  },
  instance: function() {
    return instance
  },
  disconnect: function() {
    instance.close()
  },
  queries: {
    getPages: function(query) {
      var query = extend({}, query)
      var fields = extend({}, fields)
      var sort = extend({}, sort)

      return new Promise(function(resolve, reject) {
        instance.collection('pages').find(query, fields).sort(sort).toArray(function(err, pages) {
          if (err) {
            reject(err)
          } else {
            resolve(pages)
          }
        })
      })
    },
    getPageRevisions: function(page) {
      return new Promise(function(resolve, reject) {
        var id = new ObjectID(page._id)
        instance.collection('revisions').find({
          post_id: id
        }).toArray(function(err, revisions) {
          if (err) {
            reject(err)
          } else {
            resolve(revisions)
          }
        })
      })
    },
    getPageUser: function(page) {
      return new Promise(function(resolve, reject) {
        var id = new ObjectID(page.user_info.id)
        instance.collection('users').find({_id: id}).toArray(function(err, users) {
          if (err) {
            reject(err)
          } else {
            resolve(users)
          }
        })
      })
    },
    getRevisions: function(query) {
      var query = extend({}, query)
      var fields = extend({}, fields)
      var sort = extend({}, sort)

      return new Promise(function(resolve, reject) {
        instance.collection('revisions').find(query, fields).sort(sort).toArray(function(err, revisions) {
          if (err) {
            reject(err)
          } else {
            resolve(revisions)
          }
        })
      })
    },
    getUsers: function(query, fields, sort) {
      var query = extend({}, query)
      var fields = extend({}, fields)
      var sort = extend({}, sort)

      return new Promise(function(resolve, reject) {
        instance.collection('users').find(query, fields).sort(sort).toArray(function(err, users) {
          if (err) {
            reject(err)
          } else {
            resolve(users)
          }
        })
      })
    },
    getVotes: function(query) {
      var query = extend({}, query)
      var fields = extend({}, fields)
      var sort = extend({}, sort)

      return new Promise(function(resolve, reject) {
        instance.collection('votes').find(query, fields).sort(sort).toArray(function(err, votes) {
          if (err) {
            reject(err)
          } else {
            resolve(votes)
          }
        })
      })
    },
    getLikes: function(query, fields, sort) {
      var query = extend({}, query)
      var fields = extend({}, fields)
      var sort = extend({}, sort)

      return new Promise(function(resolve, reject) {
        instance.collection('likes').find(query, fields).sort(sort).toArray(function(err, users) {
          if (err) {
            reject(err)
          } else {
            resolve(users)
          }
        })
      })
    },
    getContributorsFromPage: function(page) {

    },
    getPagesThisWeek: function() {
      return new Promise(function(resolve, reject) {
        var today = new Date( functions.getISOdate() )
        var monday_this_week = today.setDate(today.getDate() - (today.getDay() + 6) % 7)
        monday_this_week = functions.newISOdate( new Date( monday_this_week) )

        //Pages submitted this week (counted from monday)
        instance.collection('pages').find({
          'timestamp.created': {
            $gte : monday_this_week
          }
        }, function(err, pages) {
          if (err) {
            reject(err)
          } else {
            resolve(pages)
          }
        })
      })
    },
    getPagesByMonth: function() {
      return new Promise(function(resolve, reject) {
        //New pages submitted this month
        instance.collection('pages').aggregate([{
            $group: {
              _id: {
                id: '$_id', type: '$type', date: '$timestamp.created'
              }
            }
          }, {
            $group: {
              _id: {
                date: { $substr: ['$_id.date', 0, 10] }, type: '$_id.type'
              },
              pages: {
                $sum: 1
              }
            }
          }
        ], function(err, pages) {
          if (err) {
            reject(err)
          } else {
            resolve(pages)
          }
        })
      })
    },
    getAdminSidebar: function() {
      return new Promise(function(resolve, reject) {
        //Get revisions not yet moderated
        module.exports.queries.getRevisions({
          pending: {
            $gt: 0
          }
        })
        .then(function(revisions) {
          var changes = []

          //Get deleted pages
          module.exports.queries.getPages({
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

            resolve(changes)
          })
        })
      })
    }
  }
}