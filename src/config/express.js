/** express.js
* @file: express.js
* @description: Handles express routing for authentication routes
* @parameters: Object(app), Object(passport)
* @returns: Express routes
*/

var express = require('express')
var busboy = require('connect-busboy')
var body_parser = require('body-parser')
var session = require('express-session')
var session_store = require('connect-mongo')(session)
var cookie_parser = require('cookie-parser')
var passport = require('passport')
var consolidate = require('consolidate')

var util = require('util') //Is this even used?

module.exports = function (app, resources) {
    // TODO Replace this with streaming json parser
    app.engine('html', consolidate.ejs)
    app.set('view engine', 'html')
    app.set('views', resources.config.root + '/app/views')
    app.use(body_parser.json())
    app.use(busboy())

    app.use(cookie_parser())
    // TODO re-use db connection
    // TODO resave/saveUnitialized
    // TODO heighten cookie max time?
    // TODO set secure: true later when redirecting for https etc!
    // TODO use redis store?
    app.use(session({
      secret: resources.config.session_secret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      store: new session_store({
        url: resources.config.database.host + resources.config.database.name
      }),
      cookie: {
        maxAge: 60*60*1000,
        secure: false
      }
    }))

    //Initialize passport
    app.use(passport.initialize())
    app.use(passport.session())

    if (process.env.NODE_ENV === 'development') {
      app.use('/includes', express.static(resources.config.root + '/app/includes'))
      app.use(express.static(resources.config.root + '/public'))
      app.use('/uploads', express.static(resources.config.root + '/uploads'))
    }
}