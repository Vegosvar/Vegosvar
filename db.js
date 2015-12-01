var config = require('./config')
var client = require('mongodb').MongoClient

var instance = false

module.exports = {
    connect: function() {
        client.connect(config.database.host+config.database.name, function(err, db){
            instance = db
        })
    },
    instance: function() {
        return instance
    },
    find: function( query, options, callback ) {
        console.log( instance.pages.find({}) )
    },
    disconnect: function() {
        instance.close()
    }
}