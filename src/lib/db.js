var client = require('mongodb').MongoClient

var instance = false

module.exports = {
    connect: function(config, callback) {
        client.connect(config.database.host+config.database.name, function(err, db){
            //Make db instance available to the rest of the module
            instance = db
            //Set up db index on pages collection
            instance.collection('pages').ensureIndex({
                "title": "text",
                "post.city": "text",
                "post.content": "text",
                "post.food": "text",
                "post.product_type": "text"
            }, {
                "weights": {
                    "title": 20,
                    "post.city": 15,
                    "post.food": 10,
                    "post.product_type": 5,
                    "post.content": 3
                },
                "default_language": "swedish"
            })

            callback(db)

        })
    },
    instance: function() {
        return instance
    },
    disconnect: function() {
        instance.close()
    }
}