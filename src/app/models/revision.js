/** revision.js
* @file: /src/app/models/revision.js
* @description: Model logic for revision specific operations
* @parameters: None
* @exports: Object with model logic
*/

var Promise = require('promise')
var ObjectID = require('mongodb').ObjectID

module.exports = function(resources, models) {

  return revisionModel = {
    get: function(query, fields, sort, limit) {
      return resources.queries.find('revisions', query, fields, sort, limit)
    },
    accept: function(page_id, id) {
      return models.revision.setStatus(page_id, id, true)
    },
    reject: function(page_id, id) {
      return models.revision.setStatus(page_id, id, false)
    },
    setStatus: function(page_id, id, status) {
      return models.revision.get({
        post_id: page_id
      })
      .then(function(result) {
        if( ! result.length > 0) {
          throw new Error('Could not find a revisions document for page ' + page_id)
        }

        var revisions = result[0].revisions

        if(id in revisions) {
          //If this has not been moderated before, decrease the number of revisions pending revision
          var pending = (revisions[id].meta.accepted === null) ? (doc.pending -1) : doc.pending

          var data = {
            pending: pending,
            revision: id,
            revisions: revisions
          }

          data.revisions[id].meta.accepted = status

          return models.revision.update({
            post_id: page_id
          }, {
            $set: data
          }, {
            new: true,
            upsert: true
          })
          .then(function(result) {
            if(result.result.nMatched > 0) {
              //TODO, document this better

              if(status === false) {
                  return result.result.nUpdated
              }

              var new_post = data.revisions[id]
              var contributors = (new_post['meta'].user_info instanceof Array) ? new_post['meta'].user_info : [new_post['meta'].user_info]
              delete(new_post['meta'])

              var isodate = utils.newISOdate(new Date(id * 1000))

              models.page.update({
                _id: page_id
              }, {
                $set: {
                  post: new_post,
                  accepted: true,
                  'user_info.contributors': contributors,
                  'timestamp.updated': isodate
                }
              })
              .then(function(result) {
                if(result.result.nMatched > 0) {
                  return result.result.nUpdated
                } else {
                  throw new Error('No page document matched update query')
                }
              })
            } else {
              throw new Error('No revision document matched update query')
            }
          })
        } else {
          throw new Error('Revision document does not contain revision with id' + id)
        }
      })
    }
  }
}
