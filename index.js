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

var util = require('util')

var config = require('./config')

var db = require('monk')(config.database.host + config.database.name)
var users = db.get('users')
var urlencodedParser = body_parser.urlencoded({ extended: false })

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
    users.findAndModify({
      auth: {
        facebook: profile.id
      }
    }, {
      $setOnInsert: {
        auth: {
          facebook: profile.id
        },

        name: {
          display_name: profile.displayName,
          first: profile.name.givenName
        },

        photo: profile.photos ? profile.photos[0].value : '/unknown_user.png'
      }
    }, {
      new: true,
      upsert: true
    }, function (error, result) {
      done(error, {
        id: result._id,
        display_name: result.display_name,
        photo: result.photo
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
}

passport.serializeUser(function (user, done) {
  done(null, user.id)
})

// TODO error handling etc
passport.deserializeUser(function (id, done) {
  users.findById(id, ['_id', 'name', 'photo', 'info'], function (error, result) {
    done(error, result)
  })
})

// TODO dynamically generate routes?

// TODO cache views etc, NODE_ENV === production?

// TODO make one default template instead of the same includes in every?
app.get('/', function (req, res) {
  var pagesdb = db.get('pages')
  if(typeof req.query.s !== 'undefined') {
    var query = {
      title: {
        $regex: req.query.s,
        $options: 'i' //i: ignore case, m: multiline, etc
      }
    }
    pagesdb.find(query, {}, function(err, doc) {
      res.render('index', { user: req.user, pages: doc, showsearch: true })
    })
  } else {
    pagesdb.find({}, function(err, doc) {
      res.render('index', { user: req.user, pages: doc, showsearch: false })
    })
  }
})

app.get('/test/view', function (req, res) {
  var testing = db.get('pages')
  testing.find({}, function(err, doc) {
    res.json(doc)
  })
})

app.get('/test/users', function (req, res) {
  var users = db.get('users')
  users.find({}, function(err, doc) {
    res.json(doc)
  })
})

app.get('/logga-in', function (req, res) {

  // TODO make this a middleware or something
  if (req.isAuthenticated()) {
    // TODO get latest page we were on or something instead
    return res.redirect('/')
  }

  res.render('login', { })
})

app.get('/om', function(req, res) {
  res.render('about', { user: req.user });
})

app.get('/annonsera', function (req, res) {
  res.render('advertise', { user: req.user });
})

app.get('/riktlinjer', function (req, res) {
  res.render('guidelines', { user: req.user, hidelink: true })
});

app.get('/vanliga-fragor', function (req, res) {
  res.render('faq', { user: req.user })
});

app.get('/auth/facebook', passport.authenticate('facebook'), function(req, res) {})

// TODO manually handle failure?
// TODO redirect to /konto?
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), function (req, res) {
  // TODO get the page we were on when we got sent to auth instead!
  res.redirect('/')
})

app.get('/logga-ut', function (req, res) {
  req.logout()
  res.redirect('/')
})

app.get('/ajax/search', function (req, res) {
  res.send(req.query.s)
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
  res.render('settings', { user: req.user })
})

app.post('/installningar/submit', urlencodedParser, function (req, res) {
  var id = req.user._id
  console.log(id)
  var display_name = req.body.displayName
  var website = req.body.website
  var description = req.body.description
  var users = db.get('users')
  console.log(display_name)
  users.update(
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
  var pages = db.get('pages')
  var userid = req.user.id
  pages.find({id:userid}, function(err, doc) {
    res.render('pages', { user: req.user, pages:doc })
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
  res.render('post/'+req.params.type, { user: req.user, type: req.params.type })
})

app.post('/submit', urlencodedParser, function (req, res) { // Controller for handling page inputs. 
                                                            // ## TODO ######################################################
                                                            // # Add error handling, check and sanitize inputs              #
                                                            // # Improve this code and make it smaller + more simple,       #
                                                            // # Not having to if clause every type would be nice           #
                                                            // # Add support for multiple sources, ingredients, steps et.c. #
                                                            // ##############################################################
  var type = req.body.type

    if(req.body.hidden) {
      var hidden = true
    } else {
      var hidden = false
    }

    var niceurl = getSlug(req.body.title, {
      // URL Settings
      separator: '-',
      maintainCase: false,
      symbols: false
    })

  if(type == 1) {
    var title = req.body.title
    var content = req.body.content
    var source = req.body.source
    var query = db.get('pages')
    query.insert({title: title, url:niceurl, post:{ content: content, cover_image: "https://unsplash.it/200/300/?random", sources:{ 1:source }, type: type }, "user_info":{ "id": req.user._id, hidden: hidden }}, function(err, doc) {
      if(err) throw err
    })
  } else if(type == 2) {
    var title = req.body.title
    var content = req.body.content
    var ingredient = req.body.ingredient
    var step = req.body.step
    var query = db.get('pages')
    query.insert({title: title, url:niceurl, post:{ content: content, ingredients:{ 1:ingredient }, steps:{ 1:step }, type:type }, "user_info":{ "id":req.user._id, hidden: hidden } }, function(err, doc) {
      if(err) throw err
    })
  } else if(type == 3) {
    var title = req.body.title
    var content = req.body.content //
    var adress = req.body.adress
    var city = req.body.city
    var sources = req.body.sources // & Type
    var query = db.get('pages')
    query.insert({title: title, url:niceurl, post:{ content: content, city: city, adress: adress, opentimes:{ mon:req.body.opentimes_mon, tue:req.body.opentimes_tue, wed:req.body.opentimes_wed, thu:req.body.opentimes_thu, fri:req.body.opentimes_fri, sat:req.body.opentimes_sat, sun:req.body.opentimes_sun }, sources:{ 1:sources }, type:type },"user_info":{ "id":req.user._id, hidden: hidden }}, function(err, doc) {
      if(err) throw err
    })
  } else if(type == 4) {
    var title = req.body.title
    var content = req.body.content
    var source = req.body.source
    var query = db.get('pages')
    query.insert({title: title, url:niceurl, post:{ content: content, sources:{ 1:source }, type:type }, "user_info":{ "id": req.user._id, hidden:hidden }}, function(err, doc) {
      if(err) throw err
    })
  } else {
    res.redirect('/ny')
  }
    res.redirect('/ny/publicerad/?newpost='+niceurl)
})

app.get('/:url', function (req, res, next) {
  var url = req.params.url       
  var post = db.get('pages')
  post.count({ url: url }, function (err, count) {
    if(count > 0) {
      post.find({ url : url }, function (err, result) {
        users.find({ _id : result[0].user_info.id }, function(err, user_info) {
          res.render('page', { user: req.user, post: result[0], user_info: user_info[0] })
        })
      })
    } else {
      return next()
    }
  })
})

// TODO 'uncaughtException' as well? See what happens if DB goes down etc
app.use(function error_handler (error, req, res, next) {
  // TODO better error page
  console.error(error.stack)
  res.status(500)
  res.send('An error occured!')
})

app.listen(process.env.PORT || config.port, config.address)