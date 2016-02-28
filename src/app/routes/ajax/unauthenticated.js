/** unauthenticated.js
* @file: /src/app/routes/ajax/unauthenticated.js
* @description: Handles express routing for the unathenticated ajax routes
* @parameters: Object(app), Object(resources)
* @returns: Express routes
*/

var ObjectID = require('mongodb').ObjectID
var striptags = require('striptags')
var extend = require('util')._extend;

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
      accepted: true, //Only published pages
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
    var searchArray = searchString.toLowerCase().split(' ')

    //The default query object
    var query = {}

    //The default fields we search
    var searchFields = ['url','title','post.content','post.food','post.product_type','post.city']

    //Check if query matches a type
    var queryType = false

    var queryOperations = {
      'butik': function() {
        query['type'] = '5'
        return true
      },
      'produkt': function() {
        query['type'] = '4'
        return true
      },
      'restaurang': function() {
        query['type'] = '3'
        return true
      },
      'recept': function() {
        query['type'] = '2'
        return true
      },
      'fakta': function() {
        query['type'] = '1'
        return true
      },
      'vegan': function() {
        if('type' in query && query.type === '3') {
          query['veg_type'] = 'vegan'
          return true
        } else {
          searchFields.push({
            property: 'post.veg_type',
            value: 'vegan'
          })
          return false
        }
      },
      'laktoovo': function() {
        if('type' in query && query.type === '3') {
          query['veg_type'] = 'lacto_ovo'
          return true
        } else {
          searchFields.push({
            property: 'post.veg_type',
            value: 'lacto_ovo'
          })
          return false
        }
      },
      'animal': function() {
        if('type' in query && query.type === '3') {
          query['veg_type'] = 'animal'
          return true
        } else {
          searchFields.push({
            property: 'post.veg_type',
            value: 'animal'
          })
          return false
        }
      }
    }

    var queryTypes = function(string) {
      string = string.toLowerCase().replace(/[^a-z]/gi,'') //Remove non alphabet characters

      var keywords = ['butik','restaurang','produkt','recept','fakta','vegan','laktoovo','animal']
      var regexMatches = new RegExp('^' + keywords.join('|'))

      var match = string.match(regexMatches)
      if(match !== null && match.length > 0) {
        var key = match[0]

        if(key in queryOperations) {
          //Perform the operations on the search query
          if(queryOperations[key]()) {
            //Update the search string to remove the key from the search, otherwise might result in unwanted results

            var tmpArray = searchString.split(' ')

            searchString = tmpArray.filter(function(text) {
              var isKey = text.match(key)
              if(isKey === null) {
                return text
              }
            }).join(' ').trim()
          }
        }
      }
    }

    for (var i in searchArray) {
      queryTypes(searchArray[i])
    }

    //Build general query
    var regexTitleArray = []

    //As the searchString has been manipulated it might not even be anything at all anymore
    if(searchString.length > 0) {
      regexTitleArray = searchString.split(' ').map(function(text) {
        return new RegExp(text, 'i')
      })
    }

    console.log(regexTitleArray)

    var orFields = []
    for (var i = searchFields.length - 1; i >= 0; i--) {
      var obj = {}

      if(typeof searchFields[i] === 'object') {
        if('property' in searchFields[i] && 'value' in searchFields[i]) {
          obj[searchFields[i].property] = {
            $in: [searchFields[i].value]
          }
        }
      } else {
        obj[searchFields[i]] = {
          $in: regexTitleArray
        }
      }

      orFields.push(obj)
    }

    var filteredQuery = {
      $match: {
        accepted: true, //Only published pages
        $or: orFields
      }
    }

    for(var key in query) {
      if( ! (key in filteredQuery.$match) ) {
        filteredQuery.$match[key] = query[key]
      }
    }

    //Check if query matches a city
    var citiesdb = resources.collections.cities
    citiesdb.find({
      name: {
        $in: searchArray
      }
    }).toArray(function(err, cities) {
      if(err) throw err

      if(cities.length > 0) {
        filteredQuery.$match['post.city'] = {
          '$regex': cities[0].name, //Search only this city
          '$options': '-i'
        }

      }

      /*
      //Check if query matches a category
      var categoriesdb = resources.collections.categories
      categoriesdb.find({
        $or: [{
          name: {
            $in: searchArray
          }
        }, {
          subcategory: {
            $in: searchArray
          }
        }]
      }).toArray(function(err, categories) {
        //console.log(categories)
        //If we found a match here, we might want to restrict the query to that type of category
      })
      */

      //TODO build aggregate query better, utilizing $meta: "textScore"
      //Maybe rebuild results with projection or just use group

      console.log(filteredQuery.$match)

      //Find pages
      var pagesdb = resources.collections.pages
      pagesdb.aggregate([filteredQuery], function (err, pages) {
        if(err) throw err

        for (var i = 0; i < pages.length; i++) {
          if('post' in pages[i]) {
            if('content' in pages[i].post) {
              pages[i].post.content = striptags(pages[i].post.content, ['br','p','a','span','i','b'])
            } else {
              delete(pages[i])
            }
          } else {
            delete(pages[i])
          }
        }

        //Reindex array
        pages = pages.filter(function(page) {
          return page
        })


        res.json(pages)
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