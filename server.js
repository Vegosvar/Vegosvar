if (process.env.NODE_ENV !== 'development') {
  process.env.NODE_ENV = 'production'
}

var config = require('./src/config/config')
var functions = require('./src/lib/functions.js')
var image_processer = require('./src/lib/imageProcesser.js')
var db = require('./src/lib/db')

var express = require('express')

db.connect(config, function (dbinstance) {
  var app = express()

  var categoriesdb = dbinstance.collection('categories')
  var citiesdb = dbinstance.collection('cities')
  var usersdb = dbinstance.collection('users')
  var votesdb = dbinstance.collection('votes')
  var likesdb = dbinstance.collection('likes')
  var imagesdb = dbinstance.collection('images')
  var pagesdb = dbinstance.collection('pages')
  var revisionsdb = dbinstance.collection('revisions')

  var resources = {
    dbinstance: dbinstance,
    functions: functions,
    image_processer: image_processer,
    config: config,
    collections: {
      cities: citiesdb,
      categories: categoriesdb,
      images: imagesdb,
      likes: likesdb,
      pages: pagesdb,
      revisions: revisionsdb,
      users: usersdb,
      votes: votesdb
    }
  }

  require('./src/config')(app, resources)
  require('./src/app/routes')(app, resources)

  app.listen(process.env.PORT || config.port, config.address)
})