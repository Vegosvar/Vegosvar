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

var util = require('util')

var config = require('./config')

var db = require('monk')(config.database.host + config.database.name)
var users = db.get('users')

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

app.engine('html', consolidate.ejs)
app.set('view engine', 'html')
app.set('views', __dirname + '/views')

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
  users.findById(id, ['_id', 'name', 'photo'], function (error, result) {
    done(error, result)
  })
})

// TODO dynamically generate routes?

// TODO cache views etc, NODE_ENV === production?

// TODO make one default template instead of the same includes in every?
app.get('/', function (req, res) {
  res.render('index', { user: req.user, showsearch: true })
})

app.get('/test', function (req, res) {
  var testing = db.get('pages')
  testing.insert({title: "Vad är Gelatin?", post:{ content: "Gelatin kommer från djur, fakta.", cover_image: "https://unsplash.it/200/300/?random", sources:{ 1:"http://google.com/", 2:"http://aekstrom.se/", 3:"http://wikipedia.com/", 4:"http://imdb.com/" }}, type: "1","user_info":{ "id": req.user._id, "name": req.user.name.display_name }}, function(err, doc) {
    if(err) throw err
    else { 
      res.json(doc)
    }
  })
})

app.get('/test/view', function (req, res) {
  var testing = db.get('pages')
  testing.find({}, function(err, doc) {
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
  res.render('about');
})

app.get('/annonsera', function (req, res) {
  res.render('advertise');
})

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

app.get('/mina-sidor', function (req, res) {
  res.render('pages', { user: req.user })
})

app.get('/ny', function (req,res) {
  res.render('new', { user: req.user })
})

app.get('/ny/fakta', function (req, res) {
  res.render('post', { user: req.user })
})


// TODO 'uncaughtException' as well? See what happens if DB goes down etc
app.use(function error_handler (error, req, res, next) {
  // TODO better error page
  console.error(error.stack)
  res.status(500)
  res.send('An error occured!')
})

app.listen(process.env.PORT || config.port, config.address)