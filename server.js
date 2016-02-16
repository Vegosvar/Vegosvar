var config = require('./src/config/config')

process.env.NODE_ENV = (config.environment) ? config.environment : 'development'

var functions = require('./src/lib/functions.js')
var image_processer = require('./src/lib/imageProcesser.js')
var db = require('./src/lib/db')

var express = require('express')

var numCores = require('os').cpus().length
var cluster = require('cluster')

if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < numCores; i++) {
    cluster.fork()
  }

  cluster.on('exit', function (worker, code, signal) {
    console.log('worker' + worker.process.pid + 'died')
    cluster.fork() //Initialize a new worker to replace the one that died
  })
} else {
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
}
