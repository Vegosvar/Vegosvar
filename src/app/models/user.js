/** user.js
* @file: /src/app/models/user.js
* @description: Model logic for user specific operations
* @parameters: None
* @exports: Object with model logic
*/

var Promise = require('promise')
var ObjectID = require('mongodb').ObjectID

module.exports = function(resources, models) {

  return userModel = {
    get: function(query) {
      return resources.queries.find('users', query)
    },
    remove: function(query) {
      return resources.queries.remove('users', query)
    },
    isBlocked: function(user_id) {
      return resources.queries.find('users', {
        _id: new ObjectID(user_id),
        'info.blocked': false
      })
      .then(function(users) {
        if(users.length > 0) {
          return false //User checks out, continue
        } else {
          return true
        }
      })
    },
    isPrivileged: function(user_id) {
      return models.user.get({
        _id: user_id
      })
      .then(function(users) {
        if(users.length > 0) {
          //TODO, move this into utils instead
          var privileged = ['admin','moderator']

          return (privileged.indexOf(user.info.permission) !== -1)
        } else {
          return false
        }
      })
    },
    block: function(user_id) {
      var user_id = new ObjectID(user_id)

      return resources.queries.update('users', {
        _id : new ObjectID(user_id)
      }, {
        $set: {
          'info.blocked': true,
        }
      })
      .then(function(result) {
        if(result.result.nMatched > 0) {
          return {
            updated: result.result.nUpdated
          }
        } else {
          throw new Error('User not found with id ' + user_id)
        }
      })
    },
    unblock: function(user_id) {
      var user_id = new ObjectID(user_id)

      return resources.queries.update('users', {
        _id : new ObjectID(user_id)
      }, {
        $set: {
          'info.blocked': true,
        }
      })
      .then(function(result) {
        if(result.result.nMatched > 0) {
          return {
            updated: result.result.nUpdated
          }
        } else {
          throw new Error('User not found with id ' + user_id)
        }
      })
    },
    getProfile: function(user_id) {
      user_id = new ObjectID(user_id)

      return new Promise(function(resolve, reject) {
        var result = { //This is the object we will return when we're done
          current_user: null,
          contributions: [],
          likes: [],
          pages: [],
          votes: []
        }

        return new Promise.all([
          //Get the user from the database
          models.user.get({
            _id: user_id
          })
          .then(function(users) {
            if(users.length > 0) {
              result.current_user = users[0]
            } else {
              //Todo: throw error maybe
            }
          }),
          //Get the pages that this user has created
          models.page.get({
            'user_info.id': user_id
          })
          .then(function(pages) {
            result.pages = pages
          }),
          //Get all the votes user has cast
          models.vote.get({
            'user.id': user_id
          })
          .then(function(votes) {
            //Then loop over all the votes and find the associated page
            return new Promise.all(votes.map(function(vote) {
              models.page.get({
                _id: new ObjectID(vote.post.id)
              }, {
                url: 1,
                title: 1
              })
              .then(function(pages) {
                if(pages.length > 0) {
                  var page = pages[0]

                  result.votes.push({
                    page_id: page._id,
                    url: page.url,
                    title: page.title,
                    content: vote.content
                  })
                }
              })
            }))
          }),
          //Get likes this user has given
          models.like.get({
            'user.id': user_id
          })
          .then(function(likes) {
            //Loop over all the likes and get the associated page
            return new Promise.all(likes.map(function(like) {
              models.page.get({
                _id: new ObjectID(like.post.id)
              }, {
                url: 1,
                title: 1
              })
              .then(function(pages) {
                if(pages.length > 0) {
                  var page = pages[0]

                  result.likes.push({
                    page_id: page._id,
                    url: page.url,
                    title: page.title
                  })
                }
              })
            }))
          }),
          //Get pages this user has contributed to, but not created
          models.page.get({
            'user_info.id': {
              $ne: user_id
            },
            'user_info.contributors': {
              $elemMatch: {
                id: user_id
              }
            }
          })
          .then(function(pages) {
            result.contributions = pages
          })
        ])
        .then(function() {
          //Finally pass back the result
          resolve(result)
        })
        .catch(function(err) {
          reject(err)
        })
      })
    },
    updateInfo: function(data) {
      return resources.queries.update('users', {
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