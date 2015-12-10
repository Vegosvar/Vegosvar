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
                        verifyDataInCollection(collections[collection].name, collections[collection].data)
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

function verifyDataInCollection(name, data) {
    client.connect(config.database.host+config.database.name, function(err, db){
        if (err) throw err

        var dataFound = []

        db.collection(name).find({}).toArray(function(err, docs){
            if (err) throw err
            for (var doc in docs) {
                if (docs.hasOwnProperty(doc)) {
                    for (var entry in data) {
                        if (data.hasOwnProperty(entry)) {
                            if(data[entry].name == docs[doc].name) {

                                //Check if it already exists in the dataFound array (in case of duplicate data in db)
                                if(!containsObject(data[entry],dataFound)) {
                                    //Entry wasn't found in array, add it
                                    dataFound.push(data[entry])
                                }
                            }
                        }
                    }
                }
            }

            if(dataFound.length < data.length) {
                var dataToInsert = []
                for (var i = 0; i < data.length; i++) {
                    if(!containsObject(data[i], dataFound)) {
                        dataToInsert.push(data[i])
                    }
                }
                //Insert missing data
                insertDataToCollection(name, dataToInsert)
            }

            db.close()
        })

    })
}

function containsObject(obj, array) {
    var i;
    for (i = 0; i < array.length; i++) {
        if (array[i] === obj) {
            return true;
        }
    }

    return false;
}