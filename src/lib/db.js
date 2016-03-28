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
    aggregate: function(collection, query) {

      return new Promise(function(resolve, reject) {
        if(collection && query) {
          instance.collection(collection).aggregate(query, function(err, result) {
            if (err) {
              reject(err)
            } else {
              resolve(result)
            }
          })
        } else {
          reject(new Error('"collection" and "query" argument must be supplied'))
        }
      })
    },
    delete: function(collection, query) {
      query = (query) ? query : false

      return new Promise(function(resolve, reject) {
        if(query) {
          instance.collection(collection).delete(query, function(err, result) {
            if(err) {
              reject(err)
            } else {
              resolve(result)
            }
          })
        } else {
          reject(new Error('"collection" and "query" argument must be supplied'))
        }
      })
    },
    find: function(collection, query, fields, sort, limit) {
      collection = (collection) ? collection : false
      query = extend({}, query)
      fields = extend({}, fields)
      sort = extend({}, sort)
      limit = (limit) ? limit : 0

      return new Promise(function(resolve, reject) {
        if(collection) {
          instance.collection(collection).find(query, fields).sort(sort).limit(limit).toArray(function(err, result) {
            if (err) {
              reject(err)
            } else {
              resolve(result)
            }
          })
        } else {
          reject(new Error('"collection" argument must be supplied'))
        }
      })
    },
    insert: function(collection, query) {
      collection = (collection) ? collection : false
      query = extend({}, query)

      return new Promise(function(resolve, reject) {
        if(collection && query) {
          instance.collection(collection).insert(query, function(err, result) {
            if(err) {
              reject(err)
            } else {
              resolve(result)
            }
          })
        } else {
          reject(new Error('"collection" and "query" argument must be supplied'))
        }
      })
    },
    update: function(collection, query, update, options) {
      query = (query) ? query : false
      update = (update) ? update : false
      options = extend({}, options)

      return new Promise(function(resolve, reject) {
        if(collection && query && update) {
          instance.collection(collection).update(query, update, options, function(err, result) {
            if(err) {
              reject(err)
            } else {
              resolve(result)
            }
          })
        } else {
          reject(new Error('"collection", "query" and "update" arguments must be supplied'))
        }
      })
    },
    getPages: function(query, fields, sort, limit) {
      var query = extend({}, query)
      var fields = extend({}, fields)
      var sort = extend({}, sort)
      var limit = (limit) ? limit : 0

      return new Promise(function(resolve, reject) {
        instance.collection('pages').find(query, fields).sort(sort).limit(limit).toArray(function(err, pages) {
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
    getPageCategories: function(type) {
      return new Promise(function(resolve, reject) {
        instance.collection('categories').aggregate([
          {
            $match: { type: type }
          }, {
            $group: {
               _id: { id: "$_id", name: "$name", subcategory: "$subcategory" }
            }
          }, {
            $group: {
              "_id": "$_id.subcategory",
              "names": {
                "$push": {
                  name: "$_id.name"
                }
              },
              count: {
                $sum: 1
              }
            }
          }, {
            $sort: {
              _id: 1
            }
          }
        ], function(err, categories) {
          if(err) {
            reject(err)
          } else {
            resolve(categories)
          }
        })
      })
    },
    getRevisions: function(query, fields, sort, limit) {
      var query = extend({}, query)
      var fields = extend({}, fields)
      var sort = extend({}, sort)
      var limit = (limit) ? limit : 0

      return new Promise(function(resolve, reject) {
        instance.collection('revisions').find(query, fields).sort(sort).limit(limit).toArray(function(err, revisions) {
          if (err) {
            reject(err)
          } else {
            resolve(revisions)
          }
        })
      })
    },
    getUsers: function(query, fields, sort, limit) {
      var query = extend({}, query)
      var fields = extend({}, fields)
      var sort = extend({}, sort)
      var limit = (limit) ? limit : 0

      return new Promise(function(resolve, reject) {
        instance.collection('users').find(query, fields).sort(sort).limit(limit).toArray(function(err, users) {
          if (err) {
            reject(err)
          } else {
            resolve(users)
          }
        })
      })
    },
    getVotes: function(query, fields, sort, limit) {
      var query = extend({}, query)
      var fields = extend({}, fields)
      var sort = extend({}, sort)
      var limit = (limit) ? limit : 0

      return new Promise(function(resolve, reject) {
        instance.collection('votes').find(query, fields).sort(sort).limit(limit).toArray(function(err, votes) {
          if (err) {
            reject(err)
          } else {
            resolve(votes)
          }
        })
      })
    },
    getLikes: function(query, fields, sort, limit) {
      var query = extend({}, query)
      var fields = extend({}, fields)
      var sort = extend({}, sort)
      var limit = (limit) ? limit : 0

      return new Promise(function(resolve, reject) {
        instance.collection('likes').find(query, fields).sort(sort).limit(limit).toArray(function(err, users) {
          if (err) {
            reject(err)
          } else {
            resolve(users)
          }
        })
      })
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
    getPagesStats: function() {
      return new Promise(function(resolve, reject) {
        //Get page stats
        instance.collection('pages').aggregate([{
            $group: {
                _id: {
                    type: "$type"
                },
                count: {
                    $sum: 1
                }
            }
        }], function(err, pages) {
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
    },
    updateUser: function(query, update, options) {
      var query = (query) ? query : false
      var update = (update) ? update : false
      var options = extend({}, options)

      return new Promise(function(resolve, reject) {
        if(query && update) {
          instance.collection('users').update(query, update, options, function(err, result) {
            if(err) {
              reject(err)
            } else {
              resolve(result)
            }
          })
        } else {
          reject(new Error('Both "query" and "update" arguments must be supplied'))
        }
      })
    },
    deleteUser: function(query) {
      var query = (query) ? query : false

      return new Promise(function(resolve, reject) {
        if(query) {
          instance.collection('users').delete(query, function(err, result) {
            if(err) {
              reject(err)
            } else {
              resolve(result)
            }
          })
        } else {
          reject(new Error('"query" argument must be supplied'))
        }
      })
    }
    /*
    TODO: Would be cool if these could be dynamically generated somehow
    Maybe we could get a list of all the collections, then loop over them to build these objects?
    votes: {
      delete: function(query) {
        return module.exports.queries.delete('votes', query)
      },
      find: function(query, fields, sort, limit) {
        return module.exports.queries.find('votes', query, fields, sort, limit)
      },
      insert: function() {
        return module.exports.queries.insert('votes', query)
      },
      update: function(query, update, options) {
        return module.exports.queries.update('votes', query, update, options)
    },
    */
  }
}