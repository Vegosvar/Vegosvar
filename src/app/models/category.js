/** category.js
* @file: /src/app/models/category.js
* @description: Model logic for category specific operations
* @parameters: None
* @exports: Object with model logic
*/

var Promise = require('promise')
var ObjectID = require('mongodb').ObjectID

module.exports = function(resources) {

  return categoryModel = {
    get: function(query, fields, sort, limit) {
      return resources.queries.find('categories', query, fields, sort, limit)
    }
  }

}
