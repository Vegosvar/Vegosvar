var config = require('../src/config/config')
var client = require('mongodb').MongoClient
var fs = require('fs-extra')

client.connect(config.database.host+'vegodev', function(err, db){
  if (err) throw err

  //Drop vegodev database if it exists
  db.dropDatabase(function(err, result) {

    var adminDb = db.admin()
    //Get a fresh copy
    adminDb.command({
      copydb: 1,
      fromdb: 'vegosvar',
      todb: 'vegodev'

    }, function(err, result) {
      if (err) throw err
      if(result.ok) {
        console.log('Database copied successfully')
      }

      //Copy uploads folder
      var source = '/var/www/beta.vegosvar.se/src/uploads'
      var destination = '/var/www/dev.vegosvar.se/src/uploads'

      //assume this directory has a lot of files and folders
      fs.emptyDir(destination, function (err) {
        if (err) throw err
        fs.copy(source, destination, function (err) {
          if (err) throw err
         
          console.log('Uploads folder copied successfully')

          db.close()
        })
      })
    })
  })
})
