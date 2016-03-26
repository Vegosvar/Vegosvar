#!/usr/bin/env node
var config = require('./src/config/config')
process.env.NODE_ENV = (config.environment) ? config.environment : 'development'

var functions = require('./src/lib/functions.js')
var image_processer = require('./src/lib/imageProcesser.js')
var db = require('./src/lib/db')

var sitemap = require('sitemap')
var toobusy = require('toobusy-js')
toobusy.maxLag(100) //Max 100 ms delay before considered overloaded

var express = require('express')

var numCores = require('os').cpus().length
var cluster = require('cluster')

if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < numCores; i++) {
    cluster.fork()
  }

  cluster.on('exit', function (worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died')
    cluster.fork() //Initialize a new worker to replace the one that died
  })

} else {
  db.connect(config, function (dbinstance) {
    var app = express()

    var categoriesdb = dbinstance.collection('categories')
    var citiesdb = dbinstance.collection('cities')
    var chainsdb = dbinstance.collection('chains')
    var imagesdb = dbinstance.collection('images')
    var likesdb = dbinstance.collection('likes')
    var pagesdb = dbinstance.collection('pages')
    var revisionsdb = dbinstance.collection('revisions')
    var settingsdb = dbinstance.collection('settings')
    var usersdb = dbinstance.collection('users')
    var votesdb = dbinstance.collection('votes')

    var resources = {
      dbinstance: dbinstance,
      functions: functions,
      image_processer: image_processer,
      toobusy: toobusy,
      config: config,
      sitemap: sitemap.createSitemap ({
        hostname: 'http://' + config.address,
        cacheTime: 600000
      }),
      collections: {
        cities: citiesdb,
        categories: categoriesdb,
        chains: chainsdb,
        images: imagesdb,
        likes: likesdb,
        pages: pagesdb,
        revisions: revisionsdb,
        settings: settingsdb,
        users: usersdb,
        votes: votesdb,
      },
      queries: db.queries
    }

    require('./src/config')(app, resources)
    require('./src/app/routes')(app, resources)

    var server = app.listen(process.env.PORT || config.port, config.address)

    //Gracefully take down server on Ctrl+c
    process.on('SIGINT', function() {
      server.close()
      toobusy.shutdown()
      process.exit()
    })
  })
}
