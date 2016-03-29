var client = require('mongodb').MongoClient
var ObjectID = require('mongodb').ObjectID
var Promise = require('promise')
var extend = require('util')._extend
var utils = require('./utils')

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
      collection = (collection) ? collection : false
      query = (query) ? query : false

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
    remove: function(collection, query) {
      collection = (collection) ? collection : false
      query = (query) ? query : false

      return new Promise(function(resolve, reject) {
        if(query) {
          instance.collection(collection).remove(query, function(err, result) {
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
      collection = (collection) ? collection : false
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
    }
  }
}