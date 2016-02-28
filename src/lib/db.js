var client = require('mongodb').MongoClient

var instance = false

module.exports = {
    connect: function(config, callback) {
        client.connect(config.database.host+config.database.name, function(err, db){
            //Make db instance available to the rest of the module
            instance = db
            //Set up db index on pages collection
            instance.collection('pages').ensureIndex({
                "url": "text",
                "title": "text",
                "post.city": "text",
                "post.content": "text",
                "post.food": "text",
                "post.product_type": "text",
                "post.veg_type": "text",
                "post.veg_offer": "text"
            }, {
                "weights": {
                    "title": 20,
                    "url": 18,
                    "post.city": 15,
                    "post.food": 10,
                    "post.product_type": 10,
                    "post.content": 5,
                    "post.veg_type": 3
                    "post.veg_offer": 1,
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