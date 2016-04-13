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
    update: function(query, update, options) {
      return resources.queries.update('revisions', query, update, options)
    },
    insert: function(query) {
      return resources.queries.insert('revisions', query)
    },
    accept: function(page_id, id) {
      return models.revision.setStatus(page_id, id, true)
    },
    reject: function(page_id, id) {
      return models.revision.setStatus(page_id, id, false)
    },
    setStatus: function(page_id, id, status) {
      page_id = new ObjectID(page_id)

      return models.revision.get({
        post_id: page_id
      })
      .then(function(result) {
        if( ! result.length > 0) {
          throw new Error('Could not find a revisions document for page ' + page_id)
        }

        var revision_document = result[0]
        var revisions = result[0].revisions

        if(id in revisions) {
          //If this has not been moderated before, decrease the number of revisions pending revision
          var pending = (revisions[id].meta.accepted === null) ? (revision_document.pending -1) : revision_document.pending

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
            if(result.result.n > 0) {
              //TODO: document this better

              if(status === false) {
                  return result.result.nModified
              }

              var new_post = data.revisions[id]
              var contributors = (new_post['meta'].user_info instanceof Array) ? new_post['meta'].user_info : [new_post['meta'].user_info]
              delete(new_post['meta'])

              var isodate = resources.utils.newISOdate(new Date(id * 1000))

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
                if(result.result.n > 0) {
                  return result.result.nModified
                } else {
                  throw new Error('No page document matched update query')
                }
              })
            } else {
              console.log(result)
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
