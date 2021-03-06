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
  var functions = resources.functions

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
        { type: '5' },
        { type: '6' }
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
        ignore: function(id) {
          return {
            _id: {
              $ne: new ObjectID(id)
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

    pagesdb.find(filter).toArray(function(err, pages) {
      pages = pages.filter(function(page) {
        if('post' in page) {
          if('content' in page.post) {
            page.post.content = striptags(page.post.content, ['br'])
            return page
          }
        }
      })

      res.json(pages)
    })
  })

  /** /ajax/search
  *
  */
  app.get('/ajax/search', function (req, res) {
    var searchString = req.query.s
    //console.log(searchString)

    var valid = false
    if(searchString.match(/\w/gi) !== null ) {
      valid = true
    }

    //No valid word characters, quit early
    if(!valid) {
      res.json([])
      return
    }

    //The default query object
    var query = {}

    //General query object
    var filteredQuery = {
      $match: {
        accepted: true //Only published pages
      }
    }

    //The default fields we search
    var searchFields = ['url','type','slug','title','post.content','post.food','post.product_type','post.city']

    var searchWeights = {
      'post.veg_type': 30, //This is very high, since it can only match 'vegan', 'lacto_ovo' and 'animal'
      'type': 25,
      'title': 25,
      'post.product_type': 18,
      'slug': 15,
      'post.content': 15,
      'post.city': 15,
      'post.food': 10,
    }

    //Check if query matches a type
    var queryType = false

    var queryKeywords = {
      'kafe': function() {
        searchWeights.slug = 30
        searchFields.push({
          property: 'slug',
          value: 'kafe'
        })

        searchString += ' cafe'

        return false
      },
      'cafe': function() {
        searchWeights.slug = 30
        searchFields.push({
          property: 'slug',
          value: 'cafe'
        })

        searchString += ' kafe'

        return false
      },
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
        if('type' in query && query.type === '4') {
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
        if('type' in query && query.type === '4') {
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
        if('type' in query && query.type === '4') {
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
      string = functions.replaceDiacritics(string)
      string = string.replace(/[^a-z]/gi, '') //Remove non alphabet characters

      var keywords = ['cafe','kafe','butik','restaurang','produkt','recept','fakta','vegan','laktoovo','animal']
      var regexMatches = new RegExp('^' + keywords.join('|'))

      var match = string.match(regexMatches)
      if(match !== null && match.length > 0) {
        var key = match[0]

        if(key in queryKeywords) {
          //Perform the operations on the search query
          if(queryKeywords[key]() === true) {
            //Update the search string to remove the key from the search, otherwise might result in unwanted results
            var tmpArray = searchString.split(' ')

            //Filter out the current key from the search query
            searchString = tmpArray.filter(function(text) {
              var compareText = functions.replaceDiacritics(text)
              var isKey = compareText.match(key)
              if(isKey === null) {
                return text
              }
            }).join(' ').trim()
          }
        }
      }
    }

    var searchArray = searchString.toLowerCase().split(' ')
    for (var i in searchArray) {
      queryTypes(searchArray[i])
    }

    //Remove extraneous spaces
    searchString = searchString.replace(/\s+/g, " ").replace(/^\s|\s$/g, "")

    //Go over all the keys
    for(var key in query) {
      if( ! (key in filteredQuery.$match) ) {
        filteredQuery.$match[key] = query[key]
      }
    }

    //Check if query matches a city
    var citiesdb = resources.collections.cities
    citiesdb.find({
      name: {
        $in: searchString.toLowerCase().split(' ')
      }
    }).toArray(function(err, cities) {
      if(err) throw err

      if(cities.length > 0) {
        filteredQuery.$match['post.city'] = {
          '$regex': cities[0].name, //Search only this city
          '$options': '-i'
        }

        searchString = searchString.replace(new RegExp(cities[0].name, 'i'), '')
      }

      //Check if we've matched a category and bias results towards that
      var categoriesdb = resources.collections.categories
      categoriesdb.find({
        name: {
          $in: searchString.toLowerCase().split(' ')
        }
      }).toArray(function(err, categories) {
        if(err) throw err

        if(categories.length > 0) {
          //Don't apply category filter if we've already matched on a generic query /home/tobias/mount/src/app/routes/ajax/unauthenticated.jskeyword or city
          if( ! ('type' in filteredQuery.$match || 'post.city' in filteredQuery.$match) ) {
            if('type' in categories[0]) {
              switch (categories[0].type) {
                case '4':
                  //We matched a product, filter using this product type
                  filteredQuery.$match['post.product_type'] = categories[0].name
                  searchString = searchString.replace(new RegExp(categories[0].name, 'i'), '')
                  break
                default:
                  break
              }
            }
          }
        }

        console.log(searchString)

        //As the searchString has been manipulated it might not even be anything at all anymore
        if(searchString.length > 0) {
          //Array to hold regex objects of search strings
          var regexArray = []
          regexArray = searchString.split(' ').map(function(text) {
            return new RegExp(text, 'gi')
          })

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
                $in: regexArray
              }
            }

            orFields.push(obj)
          }

          //Add $or matches with the regex strings
          filteredQuery.$match.$or = orFields
        }

        //Find pages
        var pagesdb = resources.collections.pages
        pagesdb.aggregate([filteredQuery], function (err, pages) {
          if(err) throw err

          var weightedResult = [] //To hold the page results with their newly calculated weights

          for (var i = 0; i < pages.length; i++) {
            //Look up weights for each field and reorder array of results accordingly

            //The order is important, not just the weights.
            //If a match is made later that value can not match against another key in searchWeights, choose carefully

            //Calculate the weight of each result
            var totalWeight = 0
            var matchedValues = []
            for(var key in searchWeights) {
              var weight = searchWeights[key]
              var value = ''

              //TODO This should really be replaced with a loop that supports deeper structures, will do for now though considering our weights are only 2 levels max
              if(key.indexOf('.') >= 0) {
                subKey = key.substr( key.indexOf('.') +1 )
                parentKey = key.substr(0, key.indexOf('.') )
                if(parentKey in pages[i]) {
                  if(subKey in pages[i][parentKey]) {
                      value = pages[i][parentKey][subKey]
                  }
                }
              } else {
                if(key in pages[i]) {
                  value = pages[i][key]
                }
              }

              if(value) { //If value was found, check which fields it matched in the db query
                var matches = 0 //No matches = no points

                //Count the matched regex cases against the search query string
                for(var index in regexArray) {
                  var regex = regexArray[index]
                  var match = value.match(regex)
                  if(match !== null && match.length > 0) {
                    var matchedValue = match[0].toLowerCase()
                    if(matchedValues.indexOf(matchedValue) === -1) {
                      var points = 1

                      //If this was an "exact" case insensitive match, half a bonus point is given
                      var exactRegex = new RegExp('^'+matchedValue+'$', 'i')
                      var exactMatch = value.match(exactRegex)

                      if(exactMatch !== null) {
                        points += .5
                      }

                      matches += points
                      matchedValues.push(matchedValue)
                    }
                  }
                }

                totalWeight += Math.abs(matches * weight) //Add the new weight to the totalWeight
              }
            }

            //Give bonus points if several matches were made
            if(matchedValues.length > 1) {
              totalWeight += (totalWeight * Math.floor(matchedValues.length * .5) )
            }

            if('post' in pages[i]) {
              if('content' in pages[i].post) {
                //All pages should have content, if not, then something is wrong with document in db, anyway make sure this is not cause of failure
                //Strip html tags of content
                pages[i].post.content = striptags(pages[i].post.content, ['br','p'])

                //Add the page with its new weight
                weightedResult.push({
                  page: pages[i],
                  weight: totalWeight,
                  keywords: matchedValues
                })
              }
            }
          }

          //Sort the weighted results based on the weight value
          weightedResult.sort(function(a,b) {
            if (a.weight < b.weight)
              return 1
            else if (a.weight > b.weight)
              return -1
            else
              return 0
          })

          //Get the final result array of just the pages
          var finalResult = weightedResult.map(function(obj) {
            //console.log(obj.page.title, obj.weight) //This is really useful info for debugging search result weights
            return obj.page
          })

          res.json(finalResult)
        })
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