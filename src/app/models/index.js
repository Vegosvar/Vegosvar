/** index.js
* @file: /src/app/models/index.js
* @description: Scaffolding of all the model logic
* @parameters: Object(resources)
* @exports: Object with model logic
*/

var Promise = require('promise')
var ObjectID = require('mongodb').ObjectID
var extend = require('util')._extend

module.exports = function(resources) {

  var models = {}

  models.admin = require('./admin')(resources, models)
  models.user = require('./user')(resources, models)
  models.revision = require('./revision')(resources, models)
  models.page = require('./page')(resources, models)
  models.like = require('./like')(resources, models)
  models.vote = require('./vote')(resources, models)
  models.category = require('./category')(resources, models)
  models.city = require('./city')(resources, models)

  return models

}
