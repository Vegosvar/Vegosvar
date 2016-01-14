if (process.env.NODE_ENV !== 'development') {
  process.env.NODE_ENV = 'production'
}

var passport = require('passport')
var facebook_strategy = require('passport-facebook').Strategy

var express = require('express')
var session = require('express-session')
var session_store = require('connect-mongo')(session)
var cookie_parser = require('cookie-parser')
var body_parser = require('body-parser')
var consolidate = require('consolidate')
var getSlug = require('speakingurl')
var busboy = require('connect-busboy')
var fs = require('fs')
var md5 = require('md5')

var util = require('util')

var config = require('./config')
var image_processer = require('./imageProcesser.js')
var functions = require('./functions.js')

var urlencodedParser = body_parser.urlencoded({ extended: false })
var striptags = require('striptags')
var ObjectID = require('mongodb').ObjectID
var db = require('./db')
db.connect()


// TODO Move this out using cluster to a separate file, add more files for routes etc!
// TODO Index auth.facebook etc
// TODO set callback URLs etc in Facebook dev console
// TODO Set enableProof: true
// TODO Set fallback photo to actual link
// TODO Reauthenticate etc?
passport.use(new facebook_strategy({
    clientID: config.facebook.app_id,
    clientSecret: config.facebook.app_secret,
    callbackURL: config.facebook.callback,
    profileFields: ['id', 'name', 'displayName', 'picture.type(large)']
  },

  function (access_token, refresh_token, profile, done) {
    var dbinstance = db.instance()
    var usersdb = dbinstance.collection('users')
    usersdb.findAndModify({
      auth: {
        facebook: profile.id
      }
    },
    [
      ['_id','asc'] // sort order
    ],
    {
      $setOnInsert: {
        auth: {
          facebook: profile.id
        },

        name: {
          display_name: profile.displayName,
          first: profile.name.givenName
        },

        info: {
          website: null,
          description: null,
        },

        photo: profile.photos ? profile.photos[0].value : '/unknown_user.png'
      }
    }, {
      new: true,
      upsert: true
    }, function (error, result) {
      done(error, {
        id: result.value._id,
        display_name: result.value.name.display_name,
        photo: result.value.photo
      })
    })
  }
))

var app = express()

// TODO Replace this with streaming json parser
app.engine('html', consolidate.ejs)
app.set('view engine', 'html')
app.set('views', __dirname + '/views')
app.use(body_parser.json())
app.use(busboy())

app.use(cookie_parser())
// TODO re-use db connection
// TODO resave/saveUnitialized
// TODO heighten cookie max time?
// TODO set secure: true later when redirecting for https etc!
// TODO use redis store?
app.use(session({
  secret: config.session_secret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: new session_store({
    url: config.database.host + config.database.name
  }),
  cookie: {
    maxAge: 60*60*1000,
    secure: false
  }
}))

app.use(passport.initialize())
app.use(passport.session())

if (process.env.NODE_ENV === 'development') {
  app.use(express.static(__dirname + '/public'))
  app.use('/includes', express.static(__dirname + '/includes'))
  app.use('/uploads', express.static(__dirname + '/uploads'))
}

passport.serializeUser(function (user, done) {
  //console.log(user)
  done(null, user.id)
})

// TODO error handling etc
passport.deserializeUser(function (id, done) {
  var dbinstance = db.instance()
  var usersdb = dbinstance.collection('users')

  usersdb.find({_id: new ObjectID(id)}, ['_id', 'name', 'photo', 'info']).toArray(function (error, result) {
    done(error, result[0])
  })
})

// TODO dynamically generate routes?

// TODO cache views etc, NODE_ENV === production?

// TODO make one default template instead of the same includes in every?

app.get('/', function (req, res) {
  var dbinstance = db.instance()
  var pagesdb = dbinstance.collection('pages')
  var citiesdb = dbinstance.collection('cities')
  var categoriesdb = dbinstance.collection('categories')
  var likesdb = dbinstance.collection('likes')

  var pages = {}
  var options = {
    limit: 9,
    sort: [ ['rating.likes', 'desc'] ]
  }

  //Get cities
  citiesdb.find({}).toArray(function(err, cities) {
    if (err) throw err
    //Get categories
    categoriesdb.find({}).toArray(function(err, categories) {
      if(err) throw err
      //Get pages
      pagesdb.find({}, options).toArray(function(err, pages) {
        pagesdb.find({
          $or:[
            {type:'3'},
            {type:'5'}
            ]
          }).sort({_id:-1}).limit(10).toArray(function(err, establishments) {
            res.render('index', { user: req.user, pages: pages, cities: cities, categories: categories, establishments: establishments, loadGeoLocation: true, loadMapResources: { map: true, mapCluster: true }, startpage: false, searchString: req.query.s, striptags: striptags })
        })
      })
    })
  })
})

app.get('/auth/facebook', passport.authenticate('facebook'), function(req, res) {})

// TODO manually handle failure?
// TODO redirect to /konto?
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), function (req, res) {
  res.redirect(req.session.returnTo);
})

app.get('/logga-in', function (req, res) {
  // TODO make this a middleware or something
  if (req.isAuthenticated()) {
    return req.session.returnTo
  }

  res.render('login', { })
})

app.get('/*', function (req, res, next) {
  var noRedirect = ['logga-in','logga-ut', 'ajax', 'recensera']
  var canRedirectTo = true
  var path = req.originalUrl.split("?")

  if(path[0] !== '/' && path[0] !== 'auth') {
    path = path.shift().split('/')[1]
    for (var i = noRedirect.length - 1; i >= 0; i--) {
      if(noRedirect[i].indexOf(path) !== -1) {
        canRedirectTo = false
      }
    }

    if( canRedirectTo ) {
      req.session.returnTo = functions.returnUrl(req)
    }
  } else if(path[0] === '/') {
    req.session.returnTo = '/'
  }

  next()
})

app.get('/om', function(req, res) {
  res.render('about', { user: req.user })
})

app.get('/licens', function(req, res) {
  res.render('license', { user: req.user })
})

app.get('/riktlinjer', function (req, res) {
  res.render('guidelines', { user: req.user, hidelink: true })
})

app.get('/villkor', function (req, res) {
  res.render('terms-of-use', { user: req.user, hidelink: true })
})

app.get('/vanliga-fragor', function (req, res) {
  res.render('faq', { user: req.user })
})

app.get('/press', function (req, res) {
  res.render('press', { user: req.user })
})

app.get('/recensera', function (req, res) {
  if (req.isAuthenticated()) {
    return req.session.returnTo
  }

  req.session.returnTo = req.headers.referer //Fix

  res.render('vote-login', { user: req.user })
})

app.get('/rapportera', function (req, res) {
  res.render('report', { user: req.user })
})

app.get('/logga-ut', function (req, res) {
  req.logout()
  res.redirect('/')
})

app.get('/handle/votes', function (req, res) {
  var dbinstance = db.instance()
  var votesdb = dbinstance.collection('votes')

  votesdb.find({}).toArray(function(err, doc) {
    res.json(doc)
  })
})

app.get('/ajax/search', function (req, res) {
  var searchString = req.query.s
  var dbinstance = db.instance()

  //The default query
  var query = {
    $text: {
      $search: searchString
    }
  }

  //The default options
  var options = {
    "score": {
      $meta: "textScore",
    }
  }

  //The default sort options
  var sort = {
    "score": {
      $meta: "textScore"
    }
  }

  //Check if query matches a type
  var searchArray = searchString.toLowerCase().split(' ')

  var queryType = false
  for (var i in searchArray) {
    switch (searchArray[i]) {
      case 'butik':
      case 'butiker':
        queryType = "5"
        break
      case 'restaurang':
      case 'restauranger':
        queryType = "3"
        break
      case 'produkt':
      case 'produkter':
        queryType = "4"
        break
    }
  }

  if(queryType) {
    query['type'] = queryType
  }

  var citiesdb = dbinstance.collection('cities')
  citiesdb.find({name:{$in:searchArray}}).toArray(function(err, doc) {
    if(err) throw err
    if(doc.length > 0) {
      query['post.city'] = {
        '$regex': doc[0].name, //Search only this city
        '$options': '-i'
      }
    }

    //Find pages
    var pagesdb = dbinstance.collection('pages')

    pagesdb.find(query, options).sort(sort).toArray(function (err, doc) {
      if(err) throw err
      for (var i = 0; i < doc.length; i++) {
        doc[i].post.content = striptags(doc[i].post.content, ['br','p','a','span','i','b'])
      }
      res.json(doc)
    })
  })
})


app.get('/ajax/imageInfo', function (req, res) {
  if(req.query.id != undefined) {
    var dbinstance = db.instance()
    var imagesdb = dbinstance.collection('images')
    imagesdb.find({ _id : new ObjectID(req.query.id) }).toArray(function (err, doc) {
      res.json(doc)
    })
  }
})

app.get('/ajax/addVote', function (req, res) {
  if(req.query.id != undefined && req.query.content != undefined) {

   if (req.isAuthenticated()) {
      var database = db.instance()
      var votesdb = database.collection('votes')
      var pagesdb = database.collection('pages')
      votesdb.count({ "post.id": new ObjectID(req.query.id), "user.id": req.user._id }, function(err, count) {
        if(count < 1) {
          var data = {
            content: req.query.content,
            post: { id: new ObjectID(req.query.id) },
            user: { id: req.user._id }
          }

          votesdb.aggregate([
            { $match: { post : { id: 'req.post.id'} } },
            {
              $group: {
                _id: "$post.id",
                average: { $avg: "$content" }
              }
          }]), function (err, results) {
            if (err) {
              console.log(err)
            }
          }

          votesdb.insert(data, function (err) {
            if(err) throw err
          })

          pagesdb.update({ "_id": new ObjectID(req.query.id) }, {$inc: { "rating.votes": 1, }}, function (err) {
            if(err) throw err
          })

          res.send('0')
        } else {
          res.send('3') // Vote already found!
        }
      })
    } else {
      res.send('1') // Not logged in
    }
  } else {
    res.send('2') // All required variables not found in url
  }
})

app.get('/ajax/like', function (req, res) {
  if(req.query.id != undefined) {

    if (req.isAuthenticated()) {
      var database = db.instance()
      var likesdb = database.collection('likes')
      likesdb.count({ "post.id": new ObjectID(req.query.id), "user.id": req.user._id }, function (err, count) {
        if(count > 0) { // Already liked, remove it
          likesdb.remove({ "post.id": new ObjectID(req.query.id), "user.id": req.user._id }, function (err) {
            if (err) throw err
          })

          var pagesdb = database.collection('pages')
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

          var pagesdb = database.collection('pages')
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

app.get('/ajax/map', function (req, res) {
  var filter = {
    $or: [
      { type: '3' },
      { type: '5' }
    ]
  }

  if(req.query.filter !== undefined) { //A filter is used
    var filters = {
      id: function(id) {
        return {
          _id: new ObjectID(id)
        }
      },
      type: function(type) {
        return {
          type: String(type)
        }
      }
    }

    for(var key in req.query.filter) {
      if(key in filters) {
        filter = filters[key](req.query.filter[key])
      }
    }
  }

  var database = db.instance()
  var pagesdb = database.collection('pages')

  pagesdb.find(filter).toArray(function(err, doc) {
    for (var i = 0; i < doc.length; i++) {
      doc[i].post.content = striptags(doc[i].post.content, ['br'])
    }
    res.json(doc)
  })
})

app.get('/:url', function (req, res, next) {
  var url = req.params.url
  var dbinstance = db.instance()
  var pagesdb = dbinstance.collection('pages')
  var usersdb = dbinstance.collection('users')
  var likesdb = dbinstance.collection('likes')

  pagesdb.count({ url: url }, function (err, count) {
    if(count > 0) {
      pagesdb.find({ url : url }).toArray(function (err, result) {
        var mapResources = {
          map: true,
          mapCluster: !(result[0].type === '3' || result[0].type === '5')
        }

        usersdb.find({ _id : result[0].user_info.id }).toArray(function(err, user_info) {
          if (req.isAuthenticated ()) {
            likesdb.count({ "post.id": new ObjectID(result[0]._id), "user.id": req.user._id }, function (err, is_liked) {
              if(typeof(user_info[0]) == 'undefined') {
                result[0].user_info.hidden = true
                user_info[0] = { id: '', photo: ''}
              }
                res.render('page', { user: req.user, post: result[0], user_info: user_info[0], userLikes: is_liked, loadGeoLocation: true, loadMapResources: mapResources })
            })
          } else {
            if(typeof(user_info[0]) == 'undefined') {
              result[0].user_info.hidden = true
              user_info[0] = { id: '', photo: ''}
            }
              res.render('page', { user: req.user, post: result[0], user_info: user_info[0], userLikes: 0, loadGeoLocation: true, loadMapResources: mapResources })
          }
        })
      })
    } else {
      return next()
    }
  })
})

app.use(function ensure_authenticated (req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }

  res.redirect('/logga-in')
})

app.get('/konto', function (req, res) {
  res.render('konto', { user: req.user })
})

app.get('/installningar', function (req, res) {
  res.render('settings', { user: req.user, loadEditorResources: true })
})

app.get('/installningar/ta-bort', function (req, res) {
  res.render('deregister', { user: req.user })
})

app.get('/installningar/ta-bort/submit', function (req, res) {
  if(req.isAuthenticated()) {
    var dbinstance = db.instance()
    var users = dbinstance.collection('users')
    users.remove({ "_id": ObjectID(req.user._id) }, function(err, doc) {
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

  var dbinstance = db.instance()
  var usersdb = dbinstance.collection('users')

  usersdb.update(
    { _id : id },
    { $set:
      { "name.display_name": display_name,
       "info.website":website,
       "info.description":description }
    }
  )
  res.send('1')
})

app.get('/mina-sidor', function (req, res) {
  var dbinstance = db.instance()
  var pagesdb = dbinstance.collection('pages')

  var userid = new ObjectID(req.user._id)

  pagesdb.find( { "user_info.id": userid }).toArray(function(err, doc) {
    res.render('pages', { user: req.user, pages:doc })
  })
})

app.get('/admin', function (req, res) {
  res.render('admin/index', { user: req.user })
})

app.get('/admin/blockera', function (req, res) {
  var dbinstance = db.instance()
  var usersdb = dbinstance.collection('users')

  usersdb.find({}).toArray(function(err, users) {
    res.render('admin/block', { user: req.user, users: users })
  })
})

app.get('/admin/profil/:user_id', function (req, res) {
  var dbinstance = db.instance()
  var usersdb = dbinstance.collection('users')
  var pagesdb = dbinstance.collection('pages')
  var user_id = req.params.user_id

  usersdb.find({_id: new ObjectID(user_id) }).toArray(function(err, user) {
    user = user[0]
    pagesdb.find( { "user_info.id": new ObjectID(user_id) }).toArray(function(err, pages) {
      res.render('admin/profil', { user: req.user, current_user: user, pages: pages })
    })
  })
})

app.get('/ny', function (req, res) {
  res.render('new', { user: req.user })
})

app.get('/ny/publicerad', function (req, res) {
  if(typeof req.query.newpost === 'undefined') {
    res.render('post/published', { user: req.user, type: "product", hideredirect:true })
  } else {
    res.render('post/published', { user: req.user, type: "product", post_url: req.query.newpost })
  }
})

app.get('/ny/:type', function (req, res) {
  var mapResources = (req.params.type === 'restaurang' || req.params.type === 'butik') ? { autocomplete: true } : false
  res.render('post/'+req.params.type, { user: req.user, type: req.params.type, loadEditorResources: true, loadDropzoneResources: true, loadMapResources: mapResources })
})

app.get('/redigera/:url', function (req, res, next) {
  var dbinstance = db.instance()
  var pagesdb = dbinstance.collection('pages')

  pagesdb.find({url:req.params.url}).toArray(function(err, doc) {
    if(doc !== null && doc.length > 0) {
      var post = doc[0]
      var type = parseInt(post.type)
      var page = null
      var mapResources = false
        switch(type) {
          case 1:
            page = 'fakta'
            break
          case 2:
            page = 'recept'
            break
          case 3:
            page = 'restaurang'
            mapResources = { autocomplete: true }
            break
          case 4:
            page = 'produkt'
            break
          case 5:
            page = 'butik'
            mapResources = { autocomplete: true }
            break
          default:
            return next()
        }

      if(page !== null) {
        res.render('post/' + page, { user: req.user, post: post, loadEditorResources: true, loadDropzoneResources: true, loadMapResources: mapResources })
      }
    } else {
      next()
    }
  })
})

app.get('/revisioner/:url', function (req, res, next) {
  var dbinstance = db.instance()
  var pagesdb = dbinstance.collection('pages')
  var revisionsdb = dbinstance.collection('revisions')

  var url = req.params.url

  pagesdb.find({url:url}).toArray(function(err, doc) {
    var post = doc[0]

    revisionsdb.find({ post_id : new ObjectID(post._id) }).toArray(function(err, docs) {
      if(err) throw err
      if(docs.length > 0) {
        var revisions = docs[0].revisions
        var current = docs[0].revision

        var revisions_available = []
        for(var revision in revisions) {
          revisions_available.push({
            id: revision,
            accepted: revisions[revision].meta.accepted,
            created: functions.getPrettyDateTime(new Date(revision * 1000))
          })
        }

        res.render('revisions', { user: req.user, post: post, revisions: revisions_available, current: current, loadPageResources: { revisions: true } })
      } else {
        console.log(post.title + ' saknar document i revisions collection')
        return next()
      }
    })
  })
})

app.get('/ajax/revision/apply/:page_id/:revision_number', function (req, res, next) {
  var dbinstance = db.instance()
  var pagesdb = dbinstance.collection('pages')
  var revisionsdb = dbinstance.collection('revisions')

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

    var revisions = docs[0].revisions
    if(revision_number in revisions) {

      var data = {
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
          delete(new_post['meta'])

          var isodate = functions.newISOdate(new Date(revision_number * 1000))

          pagesdb.findAndModify({
              _id: new ObjectID(page_id)
            },
            ['_id','asc'], // sort order
            {
              $set: {
                post: new_post,
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

app.get('/ajax/revision/compare/:page_id/:revision_number', function (req, res, next) {
  var dbinstance = db.instance()
  var pagesdb = dbinstance.collection('pages')
  var revisionsdb = dbinstance.collection('revisions')

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

      res.json(output);
    })
  })
})

app.post('/submit', urlencodedParser, function (req, res) {
  // Controller for handling page inputs.
  // ## TODO ######################################################
  // # Add error handling, check and sanitize inputs              #
  // ##############################################################

  var id = req.body.id
  var type = req.body.type
  var hidden = (req.body.hidden) ? true : false;
  var isodate = functions.getISOdate()
  var niceurl = getSlug(req.body.title, {
    // URL Settings
    separator: '-',
    maintainCase: false,
    symbols: false
  })

  var dbinstance = db.instance()
  var pagesdb = dbinstance.collection('pages')
  var revisionsdb = dbinstance.collection('revisions')

  if(req.body.cover_image_id == 'undefined' || req.body.cover_image_filename == 'undefined') {
    cover_image_id = null
    cover_image_filename = null
  } else {
    cover_image_id = req.body.cover_image_id
    cover_image_filename = req.body.cover_image_filename
  }

  if(type == 1) { // Fakta
    var data = {
      title: req.body.title,
      url: niceurl,
      type: type,
      post: {
        content: req.body.content,
        sources: {
            name: typeof(req.body.source_name) === 'string' ? [req.body.source_name] : req.body.source_name,
            url: typeof(req.body.source_url) === 'string' ? [req.body.source_url] : req.body.source_url,
        },
        type: req.body.type,
        license: req.body.license,
        license_cc_version: req.body.license_cc_version,
        license_holder: req.body.license_holder,
        license_holder_website: req.body.license_holder_website,
        cover: {
          id: cover_image_id,
          filename: cover_image_filename
        }
      },
      user_info: {
        id: req.user._id,
        hidden: hidden
      }
    }
  } else if(type == 2) { // Recept
    var data = {
      title: req.body.title,
      url: niceurl,
      type: type,
      post: {
        content: req.body.content,
        sources: {
            name: typeof(req.body.source_name) === 'string' ? [req.body.source_name] : req.body.source_name,
            url: typeof(req.body.source_url) === 'string' ? [req.body.source_url] : req.body.source_url,
        },
        food_type: req.body.food_type,
        license: req.body.license,
        license_cc_version: req.body.license_cc_version,
        license_holder: req.body.license_holder,
        license_holder_website: req.body.license_holder_website,
        cover: {
          id: cover_image_id,
          filename: cover_image_filename
        }
      },
      user_info: {
        id: req.user._id,
        hidden: hidden
      }
    }
  } else if(type == 3) { // Restaurang
    var data = {
      title: req.body.title,
      url: niceurl,
      type: type,
      post: {
        content: req.body.content,
        sources: {
            name: typeof(req.body.source_name) === 'string' ? [req.body.source_name] : req.body.source_name,
            url: typeof(req.body.source_url) === 'string' ? [req.body.source_url] : req.body.source_url,
        },
        city: req.body.city,
        street: req.body.street,
        coordinates: {
            latitude: req.body.latitude,
            longitude: req.body.longitude
        },
        phone: req.body.phone,
        website: req.body.website,
        email: req.body.email,
        license: req.body.license,
        license_cc_version: req.body.license_cc_version,
        license_holder: req.body.license_holder,
        license_holder_website: req.body.license_holder_website,
        veg_offer: req.body.veg_offer,
        food: req.body.food,
        hashtag: req.body.hashtag,
        openhours: {
          monday: req.body.monday,
          tuesday: req.body.tuesday,
          wednesday: req.body.wednesday,
          thursday: req.body.thursday,
          friday: req.body.friday,
          saturday: req.body.saturday,
          sunday: req.body.sunday
        },
        cover: {
          id: cover_image_id,
          filename: cover_image_filename
        },
      },
      user_info: {
        id: req.user._id,
        hidden: hidden
      }
    }
  } else if(type == 4) { // Produkt
    var data = {
      title: req.body.title,
      url: niceurl,
      type: type,
      post: {
        content: req.body.content,
        sources: {
            name: typeof(req.body.source_name) === 'string' ? [req.body.source_name] : req.body.source_name,
            url: typeof(req.body.source_url) === 'string' ? [req.body.source_url] : req.body.source_url,
        },
        license: req.body.license,
        license_cc_version: req.body.license_cc_version,
        license_holder: req.body.license_holder,
        license_holder_website: req.body.license_holder_website,
        veg_type: req.body.veg_type,
        product_type: req.body.product_type,
        manufacturer: req.body.manufacturer,
        manufacturer_website: req.body.manufacturer_website,
        hashtag: req.body.hashtag,
        cover: {
          id: cover_image_id,
          filename: cover_image_filename
        }
      },
      user_info: {
        id: req.user._id,
        hidden: hidden
      }
    }
  } else if(type == 5) { // Butik
    var data = {
      title: req.body.title,
      url: niceurl,
      type: type,
      post: {
        content: req.body.content,
        sources: {
            name: typeof(req.body.source_name) === 'string' ? [req.body.source_name] : req.body.source_name,
            url: typeof(req.body.source_url) === 'string' ? [req.body.source_url] : req.body.source_url,
        },
        license: req.body.license,
        license_cc_version: req.body.license_cc_version,
        license_holder: req.body.license_holder,
        license_holder_website: req.body.license_holder_website,
        city: req.body.city,
        street: req.body.street,
        coordinates: {
            latitude: req.body.latitude,
            longitude: req.body.longitude
        },
        website: req.body.website,
        hashtag: req.body.hashtag,
        openhours: {
          monday: req.body.monday,
          tuesday: req.body.tuesday,
          wednesday: req.body.wednesday,
          thursday: req.body.thursday,
          friday: req.body.friday,
          saturday: req.body.saturday,
          sunday: req.body.sunday
        },
        cover: {
          id: cover_image_id,
          filename: cover_image_filename
        }
      },
      user_info: {
        id: req.user._id,
        hidden: hidden
      }
    }
  } else {
    res.redirect('/ny')
  }

  if(id) {
    id = new ObjectID(id) //If editing the post, the id will be provided as a string and we need to convert it to an objectid
  }

  pagesdb.count({ _id : id }, function(err, count) {
    if(err) throw err
    if(count > 0) {
      //Update
      revisionsdb.find({ post_id : id }).toArray(function(err, result) {
        if(result.length > 0) {
          var revision = result[0]
          revision_number = (new Date(isodate).getTime() / 1000) //This is a unix timestamp
          revision.revisions[revision_number] = data.post

          revision.revisions[revision_number].meta = {
            accepted: null,
            user_info: {
              id: req.user._id,
              hidden: hidden
            },
            timestamp: {
              created: isodate,
              updatedby: req.user._id
            }
          }

          revisionsdb.update({ post_id : id}, revision, function(err, result) {
            res.redirect('/ny/publicerad/?newpost='+niceurl)
          })
        } else {
          console.log('No entry for this page in revisions collection')
          pagesdb.find({ _id : id }).toArray(function(err, result) {
            data.timestamp = {
              created: result[0].timestamp.created,
              update: isodate, // Add timestamp for update
              updatedby: req.user._id
            }

            pagesdb.update({_id:id}, data, function(err, result) {
              res.redirect('/ny/publicerad/?newpost='+niceurl)
            })
          })
        }
      })
    } else {
      //Insert
      data.timestamp = {}
      data.timestamp.created = isodate // Add timestamp for creation
      pagesdb.insert(data, function(err, doc) {
        if(err) throw err

        var revision_number = (new Date(isodate).getTime() / 1000) //This is a unix timestamp
        var revision = {
          post_id: doc.ops[0]._id,
          revision: revision_number,
          revisions: {},
        }

        revision.revisions[revision_number] = data.post
        revision.revisions[revision_number].meta = {
          accepted: null,
          user_info: data.user_info,
          timestamp: {
            created: isodate
          }
        }

        revisionsdb.insert(revision, function(err, doc) {
          //Should probably make a redirect to a page showing that the page is updated and will be published after moderation
          res.redirect('/ny/publicerad/?newpost='+niceurl)
        })
      })
    }
  })
})

app.post('/submit/file', function(req, res) {
  var fstream
    req.pipe(req.busboy)
    req.busboy.on('file', function (fieldname, file, filename) {
        var dbinstance = db.instance()
        var imagesdb = dbinstance.collection('images')
        imagesdb.count({ }, function (err, num_rows) {
          random = Math.floor((Math.random() * 99999999) + 10000000);
          uHash = md5(num_rows + 1 + random)
          randomsubstring = Math.floor((Math.random() * 20) + 10)
          uFilename = uHash.substring(0, randomsubstring)
          imagesdb.insert({ id:num_rows + 1, filename: uFilename, active: false, deleted: false, "user_info":{ id: req.user._id } }, function(err, doc) {
            if(err) throw err
            fstream = fs.createWriteStream(__dirname + '/uploads/' + uFilename + '_original.jpg')
            file.pipe(fstream)
            fstream.on('finish', function() {
              var resize = image_processer.resize(uFilename, 1200, 630)
              if(resize == true) {
                fstream.on('close', function () {
                  res.send(doc.ops[0]._id)
                })
              }
            })
          })
        })
    })
})

app.use(function (req, res) {
  res.render('404', { user: req.user })
  return
})

// TODO 'uncaughtException' as well? See what happens if DB goes down etc
app.use(function error_handler (error, req, res, next) {
  // TODO better error page
  console.error(error.stack)
  res.status(500)
  res.send('<h1>Något blev fel</h1><p>Servern fick slut på havremjölk.</p>')
})

app.listen(process.env.PORT || config.port, config.address)
