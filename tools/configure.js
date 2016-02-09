var config = require('./config')
var client = require('mongodb').MongoClient

var collections = [
    {
        name: 'categories',
        exists: false,
        data: [{
            name: 'annat',
            type: '4',
            subcategory: 'övrigt'
        },{
            name: 'chips',
            type: '4',
            subcategory: 'livsmedel'
        },{
            name: 'e-nummer',
            type: '4',
            subcategory: 'övrigt'
        },{
            name: 'glass',
            type: '4',
            subcategory: 'livsmedel'
        },{
            name: 'godis',
            type: '4',
            subcategory: 'livsmedel'
        },{
            name: 'hudvård',
            type: '4',
            subcategory: 'kropp'
        },{
            name: 'kosttillskott',
            type: '4',
            subcategory: 'övrigt'
        },{
            name: 'makeup',
            type: '4',
            subcategory: 'kropp'
        },{
            name: 'margarin',
            type: '4',
            subcategory: 'livsmedel'
        },{
            name: 'ost',
            type: '4',
            subcategory: 'livsmedel'
        },{
            name: 'schampo',
            type: '4',
            subcategory: 'kropp'
        },{
            name: 'tandkräm',
            type: '4',
            subcategory: 'kropp'
        },{
            name: 'vegokött',
            type: '4',
            subcategory: 'livsmedel'
        },{
            name: 'vin',
            type: '4',
            subcategory: 'alkohol'
        },{
            name: 'växtdryck',
            type: '4',
            subcategory: 'livsmedel'
        },{
            name: 'växtgrädde',
            type: '4',
            subcategory: 'livsmedel'
        },{
            name: 'öl',
            type: '4',
            subcategory: 'alkohol'
        },{
            name: 'sprit',
            type: '4',
            subcategory: 'alkohol'
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
        name: 'revisions',
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

function containsObject(obj, array) {
    var i;
    for (i = 0; i < array.length; i++) {
        if (array[i] === obj) {
            return true;
        }
    }

    return false;
}

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


function verifyPageRevision(page) {
    client.connect(config.database.host+config.database.name, function(err, db){
    if (err) throw err
        db.collection('revisions').find({post_id:page._id}).toArray(function(err, doc) {
            if (err) throw err
            if(doc.length <= 0) {
                insertPageRevision(page)
            } else {
                for(i = 0; i < doc.length; i++) {
                    var current = doc[i]
                    var properties = {
                        post_id: function() {
                            return { post_id: null }
                        },
                        revision: function() {
                            return { revision: Math.floor(Date.now() / 1000) }
                        },
                        revisions: function() {
                            return { revision: {} }
                        },
                        modified: function() {
                            return { modified: new Date() }
                        },
                        pending: function() {
                            return { pending: 0 }
                        }
                    }

                    for(var property in properties) {
                        if( property in current ) {
                            console.log('Verified property ' + property + ' of revision: ' + current._id)
                        } else {
                            //Update revision document with given property
                            var update = properties[property]()
                            updatePageRevisionProperty(current._id, update )
                        }
                    }
                }
            }

            db.close()
        })
    })
}

function updatePageRevisionProperty(id, object) {
    client.connect(config.database.host+config.database.name, function(err, db){
        if (err) throw err

        db.collection('revisions').update({_id:id},{ $set: object }, function(err, result) {
            if (err) throw err

            console.log('Updated property ' + Object.keys(object) + ' for revision: ' + id)

            db.close()
        })
    })
}

function insertPageRevision(page) {
    client.connect(config.database.host+config.database.name, function(err, db){
        if (err) throw err

        var timestamp = ( new Date(page.timestamp.created) / 1000 ) //Unix timestamp
        var revision = {
            post_id: page._id,
            pending: 0,
            modified: "2016-02-03T22:22:12Z",
            revision: timestamp,
            revisions: {}
        }

        revision.revisions[timestamp] = page.post
        revision.revisions[timestamp].meta = {
            accepted: true, //always accept current page version
            user_info: page.user_info,
            timestamp: page.timestamp
        }

        db.collection('revisions').insert(revision, function(err, result) {
            if (err) throw err
            
            if(result.insertedCount > 0) {
                console.log('Skapade revision document för sida ' + page.title)
            }

            db.close()
        })
    })
}

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

        /* Create revision document for pages that don't have one */
        db.collection('pages').find({}).toArray(function(err, docs){
            if (err) throw err
            if(docs.length > 0) {
                for (var i = docs.length - 1; i >= 0; i--) {
                    verifyPageRevision(docs[i])
                }

                db.close()
            }
        })
    })

    process.on('exit', function() {
        console.log('*** Configure done! ***')
    });
})
