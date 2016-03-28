/** index.js
* @file: /src/app/models/index.js
* @description: Scaffolding of all the model logic
* @parameters: Object(resources)
* @exports: Object with model logic
*/

var Promise = require('promise')
var ObjectID = require('mongodb').ObjectID

module.exports = function(resources) {

  return models = {
    admin: require('./admin')(resources),
    page: require('./page')(resources),
    user: require('./user')(resources)
  }

} 