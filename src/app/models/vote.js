/** vote.js
* @file: /src/app/models/vote.js
* @description: Model logic for vote specific operations
* @parameters: None
* @exports: Object with model logic
*/

var Promise = require('promise')
var ObjectID = require('mongodb').ObjectID

module.exports = function(resources, models) {

  return voteModel = {
    aggregate: function(query) {
      return resources.queries.aggregate('votes', query)
    },
    get: function(query, fields, sort, limit) {
      return resources.queries.find('votes', query, fields, sort, limit)
    },
    insert: function(query) {
      return resources.queries.insert('votes', query)
    },
    update: function(query, update, options) {
      return resources.queries.update('votes', query, update, options)
    },
    insertOrUpdate: function(post_id, user_id, content) {
      content = parseInt(content)
      post_id = new ObjectID(post_id)
      user_id = new ObjectID(user_id)

      //Check if user has voted on this page before
      models.vote.get({
        'post.id': post_id,
        'user.id': user_id
      })
      .then(function(votes) {
        if(votes.length > 0) {
          //User has voted before, update that vote
          return models.vote.update({
            _id: votes[0]._id
          }, {
            $set: {
              content: content,
              timestamp: resources.utils.getISOdate(),
            }
          })
          .then(function(votes) {
            //Check if we succeeded
            return (votes.result.ok)
          })
        } else {
          //First time user votes on this page, insert new vote
          return models.vote.insert({
            content: content,
            timestamp: resources.utils.getISOdate(),
            post: {
              id: post_id
            },
            user: {
              id: user_id
            }
          })
          .then(function(result) {
            //Check if we succeeded
            return (votes.result.ok)
          })
        }
      })
      .then(function(result) {
        return result
      })
    },
    getAverage: function(post_id) {
      post_id = new ObjectID(post_id)
      return models.vote.aggregate([{
        $match: {
          'post.id': post_id
        }
      }, {
        $group: {
          _id: post_id,
          avg: {
            $avg: '$content'
          },
          count: { $sum: 1 }
        }
      }])
    }
  }

}