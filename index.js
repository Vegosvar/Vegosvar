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

// TODO Index auth.facebook etc
// TODO set callback URLs etc in Facebook dev console
// TODO Update name etc every login maybe? Or allow user to change name on settings page, (or both, but user preference overrides, how will his work with multiple auth services?)
// TODO Store first-name for nicer user UX?
// TODO get large-ish image or url http://stackoverflow.com/questions/11748941/facebook-oauth-no-picture-with-basic-permissions, see if scope down below is uneccesary!
passport.use(new facebook_strategy({
    clientID: config.facebook.app_id,
    clientSecret: config.facebook.app_secret,
    callbackURL: config.facebook.callback,
    profileFields: ['id', 'name', 'displayName']
  },

  function (access_token, refresh_token, profile, done) {
    console.log(profile)

    users.findAndModify({ 
      auth: {
        facebook: profile.id
      }
    }, { 
      $setOnInsert: { 
        auth: { 
          facebook: profile.id, 
        },
        
        name: {
          display_name: profile.displayName,
          first: profile.name.givenName
        }
      }
    }, { 
      new: true, 
      upsert: true
    }, function (error, result) {
      done(error, {
        id: result._id,
        display_name: result.display_name
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

// TODO disable this, should be done in nginx
app.use(express.static(__dirname + '/public'))

passport.serializeUser(function (user, done) {
  done(null, user.id)
})

// TODO error handling etc
passport.deserializeUser(function (id, done) {
  users.findById(id, ['_id', 'name'], function (error, result) {
    done(error, result)
  })
})

// TODO dynamically generate routes?

// TODO cache views etc, NODE_ENV === production?

// TODO make one default template instead of the same includes in every?
app.get('/', function (req, res) {
  res.render('index', { user: req.user })
})

app.get('/login', function (req, res) {
  
  // TODO make this a middleware or something
  if (req.isAuthenticated()) {
    // TODO get latest page we were on or something instead
    return res.redirect('/')
  }

  res.render('login', { })
})

app.get('/auth/facebook', passport.authenticate('facebook'), function(req, res) {})

// TODO manually handle failure?
// TODO redirect to /konto?
app.get('/auth/facebook/callback', passport.authenticate('facebook', { scope: ['picture.type(large)'], failureRedirect: '/login' }), function (req, res) {
  // TODO get the page we were on when we got sent to auth instead!
  res.redirect('/')
})

app.get('/logout', function (req, res) {
  req.logout()
  res.redirect('/')
})

app.use(function ensure_authenticated (req, res, next) {
  if (req.isAuthenticated()) { 
    return next()
  }
  
  res.redirect('/login')
})

app.get('/konto', function (req, res) {
  res.render('konto', { user: req.user })
})

app.get('/settings', function (req, res) {

})

// TODO 'uncaughtException' as well? See what happens if DB goes down etc
app.use(function error_handler (error, req, res, next) {
  // TODO better error page
  console.error(error.stack)
  res.status(500)
  res.send('An error occured!')
})

app.listen(process.env.PORT || config.port, config.address)