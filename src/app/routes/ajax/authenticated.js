/** authenticated.js
* @file: /src/app/routes/ajax/authenticated.js
* @description: Handles express routing for the authenticated ajax routes
* @parameters: Object(app), Object(resources)
* @exports: Express routes
*/

var ObjectID = require('mongodb').ObjectID

module.exports = function (app, resources) {
  var functions = resources.functions
  /** /ajax/addVote
  * @type: GET
  * @description: Ajax route for handling user votes.
  */
  app.get('/ajax/addVote', function (req, res) {
    if(req.query.id != undefined && req.query.content != undefined) {
     if (req.isAuthenticated()) {
        var usersdb = resources.collections.users
        var votesdb = resources.collections.votes
        var pagesdb = resources.collections.pages

        usersdb.find({ _id: new ObjectID(req.user._id), blocked: false }).toArray(function(err, result) {
          if(err) throw err
          if(result.length > 0) {
            //Proceed as normal
            votesdb.count({ "post.id": new ObjectID(req.query.id), "user.id": req.user._id }, function(err, count) {
              if(count < 1) { // Användaren har inte röstat
                var isodate = resources.functions.getISOdate()
                var data = {
                  content: parseInt(req.query.content),
                  timestamp: isodate,
                  post: { id: new ObjectID(req.query.id) },
                  user: { id: req.user._id }
                }

                votesdb.insert(data, function (err) {
                  if(err) throw err
                  votesdb.aggregate(
                  [ { $match: { "post.id": new ObjectID(req.query.id) } },
                    { $group: {
                      _id: new ObjectID(req.query.id),
                      avg: { $avg: "$content" },
                    }
                  } ], function(err, result) {
                    votesdb.count({ "post.id": new ObjectID(req.query.id) }, function (err, total_count) {
                      result[0].count = total_count
                      pagesdb.update({ "_id": new ObjectID(req.query.id) }, {$set: { "rating.votes_sum": result[0].avg}, $inc: { "rating.votes": 1 }}, function (err) {
                        if(err) throw err
                        res.send(result)
                      })
                    })
                  })
                })
              } else { // Användaren har röstat
                res.send('3') // Vote already found!
              }
            })
          } else {
            res.send('5') //User is blocked
          }
        })
      } else {
        res.send('1') // Not logged in
      }
    } else {
      res.send('2') // All required variables not found in url
    }
  })

  /** /ajax/like
  * @type: GET
  * @description: Ajax route for handling user likes.
  */
  app.get('/ajax/like', function (req, res) {
    if(req.query.id != undefined) {

      if (req.isAuthenticated()) {
        var likesdb = resources.collections.likes
        likesdb.count({ "post.id": new ObjectID(req.query.id), "user.id": req.user._id }, function (err, count) {
          if(count > 0) { // Already liked, remove it
            likesdb.remove({ "post.id": new ObjectID(req.query.id), "user.id": req.user._id }, function (err) {
              if (err) throw err
            })

            var pagesdb = resources.collections.pages
            pagesdb.update({ "_id": new ObjectID(req.query.id) }, {$inc: { "rating.likes": -1, }}, function (err) {
              if(err) throw err
            })

            likesdb.count({ "post.id": new ObjectID(req.query.id) }, function (err, sum) {
              if (err) throw err
              var response = { 'action':0, 'new_value':sum }
              res.send(response)
            })
          } else { // First time pressing, add it
            var data = {
              post: { id: new ObjectID(req.query.id) },
              user: { id: req.user._id }
            }

            likesdb.insert(data, function (err) {
              if (err) throw err
            })

            var pagesdb = resources.collections.pages
            pagesdb.update({ "_id": new ObjectID(req.query.id) }, {$inc: { "rating.likes": 1, }}, function (err) {
              if (err) throw err
            })

            likesdb.count({ "post.id": new ObjectID(req.query.id) }, function (err, sum) {
              if (err) throw err
              var response = { 'action':1, 'new_value':sum }
              res.send(response)
            })
          }
        })
      } else {
        res.redirect('/login/like')
      }
    } else {
      res.send('2') // All variables isnt set
    }
  })

  app.get('/ajax/remove/:post_id', function(req, res) {
    var post_id = req.params.post_id
    var userid = req.user._id

    var pagesdb = resources.collections.pages
    var usersdb = resources.collections.users

    if(typeof(req.user) !== 'undefined') {
      //Make sure user exists
      usersdb.find({_id: new ObjectID(userid)}).toArray(function(err, users) {
        if (err) throw err

        if(users.length > 0) {
          var user = users[0]

          var pageQuery = {
            _id: new ObjectID(post_id)
          }
          //TODO move this into functions.js
          var privileged = ['admin','moderator']
          if( privileged.indexOf(user.info.permission) == -1 ) {
            //Lacking privileges, check that the user is the creator of the page
            pageQuery["user_info.id"] = new ObjectID(user._id)
          }

          pagesdb.update( pageQuery, { $set: { delete: true, "timestamp.updated": functions.getISOdate() } }, function(err, status) {
            if (err) throw err
            if(status.result.n > 0) {
              res.json({
                success: status.result.nModified,
                message: (status.result.nModified) ? 'Page has already been scheduled for deletion' : 'Page has been scheduled for deletion'
              })
            } else {
              res.json({
                success: false,
                message: 'No page in database matched'
              })
            }
          })
        } else {
          res.json({
            success: false,
            message: 'Unable to locate user in database'
          })
        }
      })
    }
  })
}