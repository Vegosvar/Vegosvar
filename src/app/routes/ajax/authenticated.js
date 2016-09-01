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

  app.get('/installningar/ta-bort/submit', utils.isAuthenticated, function (req, res, next) {
    resources.models.user.remove({
      _id: new ObjectID(req.user._id)
    })
    .then(function(result) {
      //Handle result

      //Notify user
      res.json({
        success: true
      })
    })
    .catch(function(err) {
      //Handle errors
      console.log(req.route.path, err)

      //Notify user
      res.json({
        success: false,
        message: err.message
      })
    })
  })

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
    new Promise(function(resolve, reject) {
      //Check that variables are set and valid
      post_id = (req.query.id) ? new ObjectID(req.query.id) : false

      if(post_id) {
        resolve()
      } else {
        reject()
      }
    })
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

  app.get('/ajax/remove/:page_id', utils.isAuthenticated, function(req, res) {
    var page_id = new ObjectID(req.params.page_id)
    var userid = new ObjectID(req.user._id)

    resources.models.user.isBlocked(user_id)
    .then(function(blocked) {
      if(blocked) {
        throw new Error('User ' + user_id + ' is blocked')
      }

      var query = {
        _id: page_id
      }

      return resources.models.user.isPrivileged(user_id)
      .then(function(privileged) {
        if(!privileged) {
          //Lacking privileges, check that the user is the creator of the page
          query['user_info.id'] = user_id
        }

        return resources.models.page.delete(query)
        .then(function(result) {
          if(result.result.nMatched > 0) {
            return {
              updated: result.result.nUpdated
            }
          } else {
            throw new Error('No page was matched in remove request query')
          }
        })
      })
    })
    .then(function(result) {
      res.json({
        success: true,
        data: result
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

  app.get('/ajax/validate/title/:title', utils.isAuthenticated, function(req, res) {
    var slug = utils.replaceDiacritics(req.params.title)
    var niceurl = getSlug(slug, {
      // URL Settings
      separator: '-',
      maintainCase: false,
      symbols: false
    })

    resources.models.page.get({
      url: niceurl,
    })
    .then(function(result) {
      res.json({
        success: true,
        data: {
          available: (result.length === 0),
          url: niceurl
        }
      })
    })
    .catch(function(err) {
      res.json({
        success: false,
        message: err.message
      })
    })
  })

  app.get('/ajax/chains/:type', function(req, res) {
    /*
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
    */
  })
}