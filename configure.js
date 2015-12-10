var config = require('./config')
var client = require('mongodb').MongoClient

var collections = [
    {
        name: 'categories',
        exists: false,
        data: [{
            name: 'chips'
        },{
            name: 'glass'
        },{
            name: 'godis'
        },{
            name: 'hudvård'
        },{
            name: 'kosttillskott'
        },{
            name: 'makeup'
        },{
            name: 'ost'
        },{
            name: 'schampoo'
        },{
            name: 'tandkräm'
        },{
            name: 'vegokött'
        },{
            name: 'vin'
        },{
            name: 'växtdryck'
        },{
            name: 'växtgrädde'
        },{
            name: 'öl'
        },{
            name: 'sprit'
        }]
    },
    {
        name: 'cities',
        exists: false,
        data: [{
                name: 'stockholm'
            },{
                name: 'göteborg'
            },{
                name: 'malmö'
            },{
                name: 'uppsala'
            },{
                name: 'västerås'
            },{
                name: 'örebro'
            },{
                name: 'linköping'
            },{
                name: 'helsingborg'
            },{
                name: 'jönköping'
            },{
                name: 'norrköping'
            },{
                name: 'lund'
            }]
    },
    {
        name: 'images',
        exists: false
    },
    {
        name: 'pages',
        exists: false
    },
    {
        name: 'sessions',
        exists: false
    },
    {
        name: 'users',
        exists: false
    },
    {
        name: 'votes',
        exists: false
    }
]

/* Check for collections */
client.connect(config.database.host+config.database.name, function(err, db){
    if(err) throw err

    db.listCollections().toArray(function(err, dbCollections) {
        if(err) throw err

        for (var collection in collections) {
            if (collections.hasOwnProperty(collection)) {
                for (var dbCollection in dbCollections) {
                    if (dbCollections.hasOwnProperty(dbCollection)) {
                        if(dbCollections[dbCollection].hasOwnProperty('name')) {
                            if(dbCollections[dbCollection].name == collections[collection].name) {
                                collections[collection].exists = true
                            }
                        }
                    }
                }
            }
        }

        /* Create collections that don't exist */
        createCollections = []

        for (var collection in collections) {
            if (collections.hasOwnProperty(collection)) {
                if(collections[collection].exists == false) {
                    createCollection(collections[collection].name)

                    if(collections[collection].hasOwnProperty('data')) {
                        insertDataToCollection(collections[collection].name, collections[collection].data)
                    }
                } else {
                    //Check that all data in that collection is inserted
                    if(collections[collection].hasOwnProperty('data')) {
                        //Loop over data
                    }
                }
            }
        }

        db.close()
    })
})

function createCollection(name) {
    client.connect(config.database.host+config.database.name, function(err, db){
        if (err) throw err

        db.createCollection(name, function(err, dbCollection) {
            if(err) throw err
            console.log('Created collection: ' + name)
            db.close()
        })
    })
}

function insertDataToCollection(name, data) {
    client.connect(config.database.host+config.database.name, function(err, db){
        if (err) throw err

        db.collection(name).insert(data, function(err, docs) {
            if (err) throw err
            console.log('Successfully inserted ' + docs.insertedCount + ' documents to collection ' + name)

            db.close()
        })
    })
}