/** city.js
* @file: /src/app/models/city.js
* @description: Model logic for city specific operations
* @parameters: None
* @exports: Object with model logic
*/

var Promise = require('promise')
var ObjectID = require('mongodb').ObjectID

module.exports = function(resources) {

  return cityModel = {
    get: function(query, fields, sort, limit) {
      return resources.queries.find('cities', query, fields, sort, limit)
    }
  }

}
