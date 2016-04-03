/** privileged.js
* @file: /src/app/routes/ajax/privileged.js
* @description: Handles express routing for the privileged ajax routes
* @parameters: Object(app), Object(resources)
* @returns: Express routes
*/

var ObjectID = require('mongodb').ObjectID

module.exports = function (app, resources) {
  var utils = resources.utils
  /** /ajax/admin/user/:user_id
  * @type: GET
  * @description: Ajax admin route for loading user info.
  */
  app.get('/ajax/admin/user/:user_id', utils.isPrivileged, function (req, res) {
    var user_id = req.params.user_id
    resources.models.user.get({
      _id : new ObjectID(user_id)
    })
    .then(function(result) {
      if(result.length > 0) {
        res.json({
          success: true,
          data: result[0]
        })
      } else {
        throw new Error('User not found with id ' + user_id)
      }
    })
    .catch(function(err) {
      console.log(err)
      res.json({
        success: false,
        message: err.message
      })
    })
  })

  app.get('/ajax/admin/block/:user_id', utils.isPrivileged, function (req, res) {
    resources.models.user.block(user_id)
    .then(function(result) {
      res.json({
        success: true,
        data: result
      })
    })
    .catch(function(err) {
      console.log(err)
      res.json({
        success: false,
        message: err.message
      })
    })
  })

  app.get('/ajax/admin/unblock/:user_id', utils.isPrivileged, function (req, res) {
    var user_id = req.params.user_id

    resources.models.user.unblock(user_id)
    .then(function(result) {
      res.json({
        success: true,
        data: result
      })
    })
    .catch(function(err) {
      console.log(err)
      res.json({
        success: false,
        message: err.message
      })
    })
  })

  app.get('/ajax/admin/revision/apply/:page_id/:revision_number', utils.isPrivileged, function (req, res, next) {
    var page_id = req.params.page_id
    var revision_number = req.params.revision_number

    resources.models.revision.accept(page_id, revision_number)
    .then(function(updated) {
      res.json({
        success: true,
        data: {
          updated: updated
        }
      })
    })
    .catch(function(err) {
      console.log(err)
      res.json({
        success: false,
        message: err.message
      })
    })
  })

  app.get('/ajax/admin/revision/deny/:page_id/:revision_number', utils.isPrivileged, function (req, res, next) {
    var page_id = new ObjectID(req.params.page_id)
    var revision_number = req.params.revision_number

    resources.models.revision.reject(page_id, revision_number)
    .then(function(updated) {
      res.json({
        success: true,
        data: {
          updated: updated
        }
      })
    })
    .catch(function(err) {
      console.log(err)
      res.json({
        success: false,
        message: err.message
      })
    })
  })

  app.get('/ajax/admin/revision/compare/:page_id/:revision_number', utils.isPrivileged, function (req, res, next) {
    var pagesdb = resources.collections.pages
    var revisionsdb = resources.collections.revisions

    var page_id = req.params.page_id
    var revision_number = req.params.revision_number

    pagesdb.find({_id : new ObjectID(page_id)}).toArray(function(err, doc) {
      var post = doc[0]

      revisionsdb.find({ post_id : new ObjectID(page_id) }).toArray(function(err, docs) {
        if(err) throw err
        var revisions = docs[0].revisions
        var contentPost = post.post.content
        var contentRevision = revisions[revision_number].content

        //Find <br> tags ("line breaks" - kind of) and compare line by line
        var regex = /<br\s*[\/]?>/gi

        var contentNow = contentPost.split(regex) ? contentPost.split(regex) : [contentPost]
        var contentUpdated = contentRevision.split(regex) ? contentRevision.split(regex) : [contentRevision]

        var loop = (contentNow.length > contentUpdated.length) ? contentNow : contentUpdated

        /* TODO: loop over contentNow and in that loop compare contentNow[i] inside another loop against contentUpdated[i],
          if both array's string matches and the [i] is the same, show muted,
          if contentUpdated string matches a string in contentNow and [i] is different, show warning,
          if contentUpdated is not matched and [i] is >= contentNow.length show success,
          if contentNow string is not matched and [i] exists within contentUpdated, show danger,
        */
        var diffs = []
        for (var i = 0; i < loop.length; i++) {
          if(i < contentNow.length && i < contentUpdated.length) {
            if(contentNow[i] == contentUpdated[i]) {
              diffs.push({status: 'muted', value: contentNow[i] + '<br>' })
            } else {
              diffs.push({status: 'success', value: contentUpdated[i] })
              diffs.push({status: 'danger', value: contentNow[i] + '<br>' })
            }
          } else {
            if(i < contentNow.length) {
              diffs.push({status: 'danger', value: contentNow[i] + '<br>' })
            } else if (i < contentUpdated.length) {
              diffs.push({status: 'success', value: contentUpdated[i] + '<br>' })
            }
          }
        }

        var output = {
          post: {
            id: page_id,
            created: post.created,
            updated: post.updated
          },
          revision: {
            number: revision_number,
            created: revisions[revision_number].meta.timestamp.created,
            accepted: revisions[revision_number].meta.accepted
          },
          diffs: diffs
        }

        res.json(output)
      })
    })
  })

  app.get('/ajax/admin/delete/approve/:page_id', utils.isPrivileged, function (req, res, next) {
    var page_id = req.params.page_id

    resources.models.page.update({
      _id: new ObjectID(page_id)
    }, {
      $set: {
        url: page_id,
        accepted: false,
        removed: true
      }
    })
    .then(function(result) {
      res.json({
        success: true
      })
    })
    .catch(function(err) {
      console.log(err)
      res.json({
        success: false,
        message: err.message
      })
    })
  })

  app.get('/ajax/admin/delete/reject/:page_id', utils.isPrivileged, function (req, res, next) {
    var page_id = req.params.page_id

    resources.models.page.update({
      _id: new ObjectID(page_id)
    }, {
      $unset: {
        delete: ''
      }
    })
    .then(function(result) {
      res.json({
        success: true
      })
    })
    .catch(function(err) {
      console.log(err)
      res.json({
        success: false,
        message: err.message
      })
    })
  })
}