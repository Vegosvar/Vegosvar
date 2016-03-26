/** authenticated.js
* @file: /src/app/routes/pages/authenticated.js
* @description: Handles express routing for the authenticated page routes
* @parameters: Object(app), Object(resources)
* @exports: Express routes
*/

var ObjectID = require('mongodb').ObjectID
var body_parser = require('body-parser')
var urlencodedParser = body_parser.urlencoded({ extended: false })
var Promise = require('promise')

module.exports = function (app, resources) {
  var functions = resources.functions
  var cities = resources.collections.cities

  //Have to be at least a logged in user at this point
  app.use(function ensure_authenticated (req, res, next) {
    functions.isAuthenticated(req, res, next)
  })

  app.get('/installningar', function (req, res) {
    res.render('settings', { user: req.user, loadEditorResources: true, loadDropzoneResources: true })
  })

  app.get('/installningar/ta-bort', function (req, res) {
    res.render('deregister', { user: req.user})
  })

  app.get('/installningar/ta-bort/submit', function (req, res) {
    if(req.isAuthenticated()) {
      var usersdb = resources.collections.users
      usersdb.remove({ "_id": new ObjectID(req.user._id) }, function(err, result) {
        if (err) throw err
        res.send('1')
      })
    } else {
      res.send('0')
    }
  })

  app.post('/installningar/submit', urlencodedParser, function (req, res) {
    var id = req.user._id
    var display_name = req.body.displayName
    var website = req.body.website
    var description = req.body.description

    resources.queries.updateUser({
      _id : new ObjectID(id)
    }, {
      $set: {
        'name.display_name': display_name,
        'info.website': website,
        'info.description': description
      }
    })
    .then(function(result) {
      res.send('1')
    })
    .catch(function(err) {
      console.log(err)
      res.send('0')
    })
  })

  app.get('/mina-sidor', function (req, res) {
    var userid = new ObjectID(req.user._id)

    var renderObj =  {
      user: req.user,
      votes: [],
      likes: [],
      loadPageResources: { datatables: true }
    }

    new Promise.all([
      //Get the user from the database
      resources.queries.getUsers({
        _id: userid
      })
      .then(function(users) {
        renderObj.current_user = users[0]
      }),
      //Get the pages that this user has created
      resources.queries.getPages({
        'user_info.id': userid
      })
      .then(function(pages) {
        renderObj.pages = pages
      }),
      //Get all the votes user has cast
      resources.queries.getVotes({
        'user.id': userid
      })
      .then(function(votes) {
        //Then loop over all the votes and find the associated page
        return new Promise.all(votes.map(function(vote) {
          resources.queries.getPages({
            _id: new ObjectID(vote.post.id)
          }, {
            url: 1,
            title: 1
          })
          .then(function(pages) {
            if(pages.length > 0) {
              var page = pages[0]

              renderObj.votes.push({
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
      resources.queries.getLikes({
        'user.id': userid
      })
      .then(function(likes) {
        //Loop over all the likes and get the associated page
        return new Promise.all(likes.map(function(like) {
          resources.queries.getPages({
            _id: new ObjectID(like.post.id)
          }, {
            url: 1,
            title: 1
          })
          .then(function(pages) {
            if(pages.length > 0) {
              var page = pages[0]

              renderObj.likes.push({
                page_id: page._id,
                url: page.url,
                title: page.title
              })
            }
          })
        }))
      }),
      //Get pages this user has contributed to, but not created
      resources.queries.getPages({
        'user_info.id': {
          $ne: userid
        },
        'user_info.contributors': {
          $elemMatch: {
            id: userid
          }
        }
      })
      .then(function(pages) {
        renderObj.contributions = pages
      })
    ])
    .done(function() {
      res.render('pages', renderObj)
    })
  })

  app.get('/ny', function (req, res) {
    res.render('new', { user: req.user })
  })

  app.get('/ny/publicerad', function (req, res) {
    var hideredirect = (typeof(req.query.newpost) === 'undefined') ? true : false
    res.render('post/published', {
      user: req.user,
      type: "product",
      hideredirect: hideredirect,
      post_url: req.query.newpost,
    })
  })

  app.get('/ny/uppdaterad', function (req, res) {
    var hideredirect = (typeof(req.query.newpost) === 'undefined') ? true : false
    res.render('post/updated', {
      user: req.user,
      type: "product",
      hideredirect: hideredirect,
      post_url: req.query.newpost,
    })
  })

  app.get('/ny/:type', function (req, res, next) {
    var renderObj = {
      user: req.user,
      type: req.params.type,
      loadEditorResources: true,
      loadDropzoneResources: true,
      loadValidationResources: true,
      loadPageResources: {
        create_page: true
      }
    }

    //Check if current user is blocked
    resources.queries.getUsers({
      _id: new ObjectID(req.user._id),
      'info.blocked': false
    })
    .then(function(users) {
      if(users.length > 0) {
        return //User checks out, continue
      } else {
        throw new Error('blocked') //User is blocked
      }
    })
    //Check which type of page the user wants to create
    .then(function() {
      var types = {
        'fakta': '1',
        'recept': '2',
        'restaurang': '3',
        'produkt': '4',
        'butik': '5',
        'cafe': '6'
      }

      //Check if type is known
      if( ! (renderObj.type in types) ) {
        throw new Error('unknown') //Unknown type
      }

      var pageType = types[renderObj.type]

      //Load additional browser dependences based on page type
      renderObj.loadMapResources = (pageType === '3' || pageType === '5' || pageType === '6') ? { autocomplete: true, map: true } : false
      renderObj.loadPageResources.youtube = (pageType === '2')

      return pageType
    })
    //Get the categories for this page type
    .then(function(type) {
      return resources.queries.getPageCategories(type)
      .then(function(categories) {
        renderObj.categories = categories
      })
    })
    .then(function() {
      res.render('post/' + renderObj.type, renderObj)
    })
    .catch(function(err) {
      //TODO, handle error better maybe?
      switch(err.message) {
        case 'blocked':
          res.redirect('/blockerad')
          break
        case 'unknown':
          return next()
          break
        default:
          console.log(err)
          return next()
          break
      }
    })
  })

  app.get('/redigera/:url', function (req, res, next) {
    var renderObj = {
      user: req.user,
      loadEditorResources: true,
      loadDropzoneResources: true,
      loadValidationResources: true,
      loadPageResources: {
        create_page: true
      }
    }

    resources.queries.getPages({
      url: req.params.url
    })
    .then(function(pages) {
      if(pages.length <= 0) {
        throw new Error('404')
      }

      return pages[0]
    })
    .then(function(page) {
      renderObj.post = page

      //Load additional browser dependences based on page type
      renderObj.loadMapResources = (page.type === '3' || page.type === '5' || page.type === '6') ? { autocomplete: true, map: true } : false
      renderObj.loadPageResources.youtube = (page.type === '2')

      return page
    })
    //Get the categories for this page type
    .then(function(page) {
      return resources.queries.getPageCategories(page.type)
      .then(function(categories) {
        renderObj.categories = categories
        return page
      })
    })
    .then(function(page) {
      var types = {
        'fakta': '1',
        'recept': '2',
        'restaurang': '3',
        'produkt': '4',
        'butik': '5',
        'cafe': '6'
      }

      for(var type in types) {
        if(types[type] === page.type) {
          renderObj.type = type
        }
      }

      res.render('post/' + renderObj.type, renderObj)
    })
    .catch(function(err) {
      console.log(err)
      return next()
    })
  })
}