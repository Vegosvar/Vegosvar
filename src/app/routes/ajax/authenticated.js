/** authenticated.js
* @file: /src/app/routes/ajax/authenticated.js
* @description: Handles express routing for the authenticated ajax routes
* @parameters: Object(app), Object(resources)
* @exports: Express routes
*/

var ObjectID = require('mongodb').ObjectID
var getSlug = require('speakingurl')
var Promise = require('promise')

module.exports = function (app, resources) {
  var utils = resources.utils
  /** /ajax/addVote
  * @type: GET
  * @description: Ajax route for handling user votes.
  */
  app.get('/ajax/addVote', utils.isAuthenticated, function (req, res) {
    var user_id = req.user._id
    var post_id, content

    //Verify that everything looks correct before doing any database operations
    new Promise.all([
      new Promise(function(resolve, reject) {
        //Check that variables are set and valid
        post_id = (req.query.id) ? new ObjectID(req.query.id) : false
        content = (req.query.content) ? parseInt(req.query.content) : false

        if(post_id && content) {
          resolve()
        } else {
          reject()
        }
      }),
      //Make sure user isn't blocked
      resources.models.user.get({
        _id: user_id,
        'info.blocked': false
      })
      .then(function(users) {
        if(users.length <= 0) {
          //User is blocked, or id isn't correct or missing dependencies
          throw new Error('blocked')
        }
      })
    ])
    //Handle vote
    .then(function() {
      return resources.models.vote.insertOrUpdate(post_id, user_id, content)
    })
    //So basically, the query above returns before
    //the document has finished being written to the database
    //A 100ms delay is added, because...
    //This works for now, don't touch! //Tobias 2016-03-28
    .then(function() {
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          resolve()
        }, 100)
      })
    })
    //Get the new average for the page
    .then(function() {
      return resources.models.vote.getAverage(post_id)
    })
    .then(function(result) {
      //And set it to the page document
      return resources.models.page.update({
        _id: post_id
      }, {
        $set: {
          'rating.votes_sum': result[0].avg,
          'rating.votes': result[0].count
        }
      })
      .then(function() {
        return result
      })
    })
    //Then notify the user of the new vote average
    .then(function(result) {
      res.json({
        success: true,
        data: {
          average: result[0].avg,
          count: result[0].count
        }
      })
    })
    .catch(function(err) {
      //Handle error
      console.log(req.route.path, err)
      res.json({
        success: false,
        message:  err.message
      })
    })
  })

  /** /ajax/addLike
  * @type: GET
  * @description: Ajax route for handling user likes.
  */
  app.get('/ajax/addLike', utils.isAuthenticated, function (req, res) {
    var user_id = req.user._id
    var post_id

    //Verify that everything looks correct before doing any database operations
    new Promise.all([
      new Promise(function(resolve, reject) {
        //Check that variables are set and valid
        post_id = (req.query.id) ? new ObjectID(req.query.id) : false

        if(post_id) {
          resolve()
        } else {
          reject()
        }
      })
    ])
    .then(function() {
      return resources.models.like.get({
        'post.id': post_id,
        'user.id': user_id
      }, {
        _id: 1 //We'll only use the _id field for a count anyway
      })
      .then(function(likes) {
        if(likes.length > 0) {
          //Previous like found for current page, delete it
          return resources.models.like.remove({
            _id: likes[0]._id
          })
        } else {
          //No like found for current page
          return resources.models.like.insert({
            post: {
              id: post_id },
            user: {
              id: user_id
            }
          })
        }
      })
    })
    //Either we added or deleted one like, recalculate total likes
    .then(function() {
      return resources.models.like.get({
        'post.id': post_id
      }, {
        _id: 1 //We'll only use the _id field for a count anyway
      })
    })
    //Then we update the associated page with the new likes number
    .then(function(likes) {
      return resources.models.page.update({
        _id: post_id
      }, {
        $set: {
          'rating.likes' : likes.length
        }
      })
      //If we arrive here then everything was a success, so notify the user of the new likes count
      .then(function() {
        res.json({
          success: true,
          data: {
            count: likes.length
          }
        })
      })
    })
    .catch(function(err) {
      //Handle error
      console.log(req.route.path, err)
      res.json({
        success: false,
        message:  err.message
      })
    })
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
          //TODO move this into utils.js
          var privileged = ['admin','moderator']
          if( privileged.indexOf(user.info.permission) == -1 ) {
            //Lacking privileges, check that the user is the creator of the page
            pageQuery["user_info.id"] = new ObjectID(user._id)
          }

          pagesdb.update( pageQuery, { $set: { delete: true, "timestamp.updated": utils.getISOdate() } }, function(err, status) {
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

  app.get('/ajax/validate/title', function(req, res) {
    var title = req.query.title
    var slug = utils.replaceDiacritics(title)
    var niceurl = getSlug(slug, {
      // URL Settings
      separator: '-',
      maintainCase: false,
      symbols: false
    })

    var pagesdb = resources.collections.pages
    pagesdb.count({ url: niceurl }, function (err, sum) {
      if (err) {
        res.json({
          success: false
        })
      }

      res.json({
        success: true,
        available: (sum > 0) ? false : true,
        url: niceurl
      })
    })
  })

  app.get('/ajax/chains', function(req, res) {
    var type = ('type' in req.query && typeof(req.query.type) !== 'undefined') ? req.query.type : false
    var chainsdb = resources.collections.chains

    chainsdb.find({ type: type }, { _id: 1, name: 1 }).toArray(function(err, chains) {
      if (err) {
        res.json({
          success: false
        })
      }

      res.json({
        success: true,
        data: chains
      })
    })
  })
}