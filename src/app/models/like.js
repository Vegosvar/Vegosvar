/** like.js
* @file: /src/app/models/like.js
* @description: Model logic for like specific operations
* @parameters: None
* @exports: Object with model logic
*/

var Promise = require('promise')
var ObjectID = require('mongodb').ObjectID
var extend = require('util')._extend

module.exports = function(resources) {

  return likeModel = {
    get: function(query, fields, sort, limit) {
      return resources.queries.find('likes', query, fields, sort, limit)
    },
    remove: function(query) {
      return resources.queries.remove('likes', query)
    },
    insert: function(query) {
      query = extend(query, {
        timestamp: resources.utils.getISOdate()
      })

      return resources.queries.insert('likes', query)
    }
  }

}