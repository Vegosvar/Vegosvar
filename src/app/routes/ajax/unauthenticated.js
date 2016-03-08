/** unauthenticated.js
* @file: /src/app/routes/ajax/unauthenticated.js
* @description: Handles express routing for the unathenticated ajax routes
* @parameters: Object(app), Object(resources)
* @returns: Express routes
*/

var ObjectID = require('mongodb').ObjectID
var striptags = require('striptags')

module.exports = function (app, resources) {
  /** /ajax/map
  * @type: GET
  * @description: Ajax route for loading page info to a map.
  * @parameters: {
      Object(filter): {
        id: String("568207facddd6a6a0808c770"),
        type: String("5")
      }
  * }
  */
  app.get('/ajax/map', function (req, res) {
    var filter = {
      $or: [
        { type: '3' },
        { type: '5' }
      ]
    }

    if(req.query.filter !== undefined) { //A filter is used
      var filters = {
        id: function(id) {
          return {
            _id: new ObjectID(id)
          }
        },
        type: function(type) {
          return {
            type: String(type)
          }
        },
        ids: function(ids) {
          var objIds = ids.map(function(id) {
            return new ObjectID(id)
          })

          return {
            _id: {
              $in: objIds
            }
          }
        },
        city: function(city) {
          return {
            "post.city": String(city).toLowerCase()
          }
        }
      }

      for(var key in req.query.filter) {
        if(key in filters) {
          filter = filters[key](req.query.filter[key])
        }
      }
    }

    var pagesdb = resources.collections.pages

    pagesdb.find(filter).toArray(function(err, doc) {
      for (var i = 0; i < doc.length; i++) {
        doc[i].post.content = striptags(doc[i].post.content, ['br'])
      }
      res.json(doc)
    })
  })

  /** /ajax/search
  *
  */
  app.get('/ajax/search', function (req, res) {
    var searchString = req.query.s

    //The default query
    var query = {
      $text: {
        $search: searchString
      }
    }

    //The default options
    var options = {
      "score": {
        $meta: "textScore",
      }
    }

    //The default sort options
    var sort = {
      "score": {
        $meta: "textScore"
      }
    }

    //Check if query matches a type
    var searchArray = searchString.toLowerCase().split(' ')

    var queryType = false
    for (var i in searchArray) {
      switch (searchArray[i]) {
        case 'butik':
        case 'butiker':
          queryType = "5"
          break
        case 'restaurang':
        case 'restauranger':
          queryType = "3"
          break
        case 'produkt':
        case 'produkter':
          queryType = "4"
          break
      }
    }

    if(queryType) {
      query['type'] = queryType
    }

    var citiesdb = resources.collections.cities
    citiesdb.find({name:{$in:searchArray}}).toArray(function(err, doc) {
      if(err) throw err
      if(doc.length > 0) {
        query['post.city'] = {
          '$regex': doc[0].name, //Search only this city
          '$options': '-i'
        }
      }

      //Find pages
      var pagesdb = resources.collections.pages

      pagesdb.find(query, options).sort(sort).toArray(function (err, doc) {
        if(err) throw err
        for (var i = 0; i < doc.length; i++) {
          doc[i].post.content = striptags(doc[i].post.content, ['br','p','a','span','i','b'])
        }
        res.json(doc)
      })
    })
  })


  /** /ajax/imageInfo
  *
  */
  app.get('/ajax/imageInfo', function (req, res) {
    if(req.query.id != undefined) {
      var imagesdb = resources.collections.images
      imagesdb.find({ _id : new ObjectID(req.query.id) }).toArray(function (err, doc) {
        res.json(doc)
      })
    }
  })
}