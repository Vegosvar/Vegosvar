/** revision.js
* @file: /src/app/models/revision.js
* @description: Model logic for revision specific operations
* @parameters: None
* @exports: Object with model logic
*/

var Promise = require('promise')
var ObjectID = require('mongodb').ObjectID

module.exports = function(resources) {

  return revisionModel = {
    get: function(query, fields, sort, limit) {
      return resources.queries.find('revisions', query, fields, sort, limit)
    }
  }

}
