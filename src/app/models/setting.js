/** setting.js
 * @file: /src/app/models/setting.js
 * @description: Model logic for setting specific operations
 * @parameters: None
 * @exports: Object with model logic
 */

var Promise = require('promise')
var ObjectID = require('mongodb').ObjectID

module.exports = function(resources, models) {

  return settingModel = {
    aggregate: function(query) {
      return resources.queries.aggregate('settings', query);
    },
    get: function(query, fields, sort, limit) {
      return resources.queries.find('settings', query, fields, sort, limit);
    },
    insert: function(query) {
      return resources.queries.insert('settings', query);
    },
    update: function(query, update, options) {
      return resources.queries.update('settings', query, update, options);
    },
    remove: function(query) {
      return resources.queries.remove('settings', query);
    }
  }
}