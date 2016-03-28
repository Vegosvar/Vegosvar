/** user.js
* @file: /src/app/models/user.js
* @description: Model logic for user specific operations
* @parameters: None
* @exports: Object with model logic
*/

var Promise = require('promise')
var ObjectID = require('mongodb').ObjectID

module.exports = function(resources) {

  return userModel = {
    get: function(query) {
      return resources.queries.find('users', query)
    },
    updateInfo: function(data) {
      return resources.queries.updateUser({
        _id : new ObjectID(data.user_id)
      }, {
        $set: {
          'name.display_name': data.display_name,
          'info.website': data.website,
          'info.description': data.description
        }
      })
      .then(function(result) {
        if(result.length > 0)  {
          return true
        } else {
          throw new Error('Query returned empty result')
        }
      })
      .catch(function(err) {
        throw new Error(err)
      })
    }
  }

}