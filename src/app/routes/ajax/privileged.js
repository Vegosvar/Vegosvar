/** privileged.js
* @file: /src/app/routes/ajax/privileged.js
* @description: Handles express routing for the privileged ajax routes
* @parameters: Object(app), Object(resources)
* @returns: Express routes
*/

var ObjectID = require('mongodb').ObjectID

module.exports = function (app, resources) {
  var functions = resources.functions
  /** /ajax/admin/user/:user_id
  * @type: GET
  * @description: Ajax admin route for loading user info.
  */
  app.get('/ajax/admin/user/:user_id', functions.isPrivileged, function (req, res) {
    var usersdb = resources.collections.users
    var user_id = req.params.user_id

    usersdb.find({_id : new ObjectID(user_id)}).toArray(function(err, user) {
      if(err) throw err
      res.send(user[0])
    })
  })

  app.get('/ajax/admin/block/:user_id', functions.isPrivileged, function (req, res) {
    var usersdb = resources.collections.users
    var user_id = req.params.user_id

    usersdb.update({
        _id : new ObjectID(user_id)
      }, {
        $set: {
         "info.blocked": true,
       }
      }, function(err, status) {
        if(err) throw err
        res.json(status)
      }
    )
  })

  app.get('/ajax/admin/unblock/:user_id', functions.isPrivileged, function (req, res) {
    var usersdb = resources.collections.users
    var user_id = req.params.user_id

    usersdb.update({
        _id : new ObjectID(user_id)
      }, {
        $set: {
         "info.blocked": false,
       }
      }, function(err, status) {
        if(err) throw err
        res.json(status)
      }
    )
  })

  app.get('/ajax/admin/revision/apply/:page_id/:revision_number', functions.isPrivileged, function (req, res, next) {
    var pagesdb = resources.collections.pages
    var revisionsdb = resources.collections.revisions

    var page_id = req.params.page_id
    var revision_number = req.params.revision_number

    revisionsdb.find({ post_id: new ObjectID(page_id)}).toArray(function(err, docs) {
      if(err) {
        res.json({
          success:false,
          post: page_id,
          message: 'Could not find an entry for the page\'s revisions in the database'
        })
      }

      var doc = docs[0]
      var revisions = doc.revisions
      if(revision_number in revisions) {
        
        //If this has not been moderated before, decrease the number of revisions pending revision
        var pending = (revisions[revision_number].meta.accepted === null) ? (doc.pending -1) : doc.pending

        var data = {
          pending: pending,
          revision: revision_number,
          revisions: revisions
        }

        data.revisions[revision_number].meta.accepted = true

        revisionsdb.findAndModify({
            post_id: new ObjectID(page_id)
          },
          ['_id','asc'], // sort order
          {
            $set: data
          }, {
            new: true,
            upsert: true
          },
          function (err, result) {
            if(err) {
              res.json({
                success:false,
                post: page_id,
                message:'Failed to update the page\'s revision'
              })
            }

            var new_post = data.revisions[revision_number]
            var contributors = (new_post['meta'].user_info instanceof Array) ? new_post['meta'].user_info : [new_post['meta'].user_info]
            delete(new_post['meta'])

            var isodate = functions.newISOdate(new Date(revision_number * 1000))

            pagesdb.findAndModify({
                _id: new ObjectID(page_id)
              },
              ['_id','asc'], // sort order
              {
                $set: {
                  post: new_post,
                  "user_info.contributors": contributors,
                  "timestamp.updated": isodate
                }
              }, {
                new: true,
                upsert: true
              }, function (err, result) {
                if(err) {
                  res.json({
                    success:false,
                    post: page_id,
                    message: 'Failed to update the page\'s content'
                  })
                }

                res.json({
                  success:true,
                  post: page_id,
                  message: 'Successfully updated page to approved revision'
                })
              }
            )
          }
        )
      } else {
        res.json({
          success:false,
          post: page_id,
          message:'Could not find a revision with supplied id among the page\'s revisions'
        })
      }
    })
  })

  app.get('/ajax/admin/revision/deny/:page_id/:revision_number', functions.isPrivileged, function (req, res, next) {
    //TODO write this route similar to the apply one
  })

  app.get('/ajax/admin/revision/compare/:page_id/:revision_number', functions.isPrivileged, function (req, res, next) {
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
}