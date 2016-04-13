/** page.js
* @file: /src/app/models/page.js
* @description: Model logic for page specific operations
* @parameters: None
* @exports: Object with model logic
*/

var Promise = require('promise')
var ObjectID = require('mongodb').ObjectID
var extend = require('util')._extend
var striptags = require('striptags')

module.exports = function(resources, models) {
  return pageModel = {
    aggregate: function(query) {
      return resources.queries.aggregate('pages', query)
    },
    get: function(query, fields, sort, limit) {
      return resources.queries.find('pages', query, fields, sort, limit)
    },
    insert: function(query) {
      return resources.queries.insert('pages', query)
    },
    update: function(query, update, options) {
      return resources.queries.update('pages', query, update, options)
    },
    stats: function() {
      return resources.queries.aggregate('pages', [{
        $group: {
          _id: {
             type: "$type"
          },
          count: {
            $sum: 1
          }
        }
      }])
    },
    hot: function() {
      return resources.queries.find('pages',
        { //Show only restaurants, shops, cafes or products, sorry recipes and facts :(
          $or: [
            { type: '3' },
            { type: '4' },
            { type: '5' },
            { type: '6' }
          ]
        },
        {}, //Include all fields
        {
          'rating.likes': -1 //Sort descendingly based on likes, i.e. highest first
        },
        9 //Limit to 9 results
      )
      .then(function(pages) {
        //Perform some filtering to make sure the content is sanitized
        return pages.filter(function(page) {
          if('post' in page && 'content' in page.post) {
            //Strip all html tags except for br and p from content
            page.post.content = striptags(page.post.content, ['br','p'])
            page.post.content = (page.post.content.length > 115) ? page.post.content.substr(0, 115) + '...' : page.post.content
            return page
          }
        })
      })
    },
    newPlaces: function() {
      return resources.queries.find('pages',
        {
          accepted: true, //Only published pages
          $or: [ //Only restaruants, shops and cafes
            { type: '3' },
            { type: '5' },
            { type: '6' }
          ],
        },
        {}, //All fields
        {
          _id: -1 //Sort descendingly based on created
        },
        12 //Limit to 12 results
      )
    },
    newRecipes: function() {
      return resources.queries.find('pages', {
          accepted: true, //Only published
          type: '2', //Only recipe type
        },
        {}, //All fields
        {
          _id: -1 //Sort descendingly based on created
        },
        3
      )
      .then(function(recipes) {
        //Get the user whom created each recipe
        return new Promise.all(recipes.map(function(recipe) {
          //Make sure we don't show anyone that opted to be anonymous
          if ( ! (recipe.user_info.hidden) ) {
            //Get the associated users's info
            return models.user.get({
              _id: recipe.user_info.id
            })
            .then(function(users) {
              if(users.length > 0) {
                return extend(recipe.user_info, users[0])
              } else {
                //User account was not found, set user_info to hidden to show user as anonymous 
                recipe.user_info.hidden = true
                return recipe
              }
            })
          } else {
            return recipe
          }
        }))
      })
    },
    delete: function(page_id) {
      return resources.queries.update('pages', query, {
        delete: true,
        'timestamp.updated': resources.utils.getISOdate()
      })
    },
    nearbyEstablishments: function(page) {
      return resources.queries.find('pages',
        {
          $and: [
            {
              $or: [
                { type: '3' },
                { type: '5' },
                { type: '6' }
              ]
            },
            {
              "post.city": page.post.city
            },
            {
              "_id": {
                $ne: page._id
              }
            }
          ]
        },
        {}, //Include all fields
        {
          _id: -1
        }, //Sort descendingly, a.k.a. newest first
        10 //Limit to 10 pages
      )
    },
    getMapResults: function(filter) {
      /* TODO:
        If this filters object can be reused somehow we should modularize it
        and put the logic to determine which filter is used somewhere else
      */

      var query = {
        accepted: true, //Only published pages
        $or: [
          { type: '3' }, //Only pages that are places
          { type: '5' },
          { type: '6' }
        ]
      }

      if(filter !== undefined) { //A filter is used
        var filters = {
          id: function(id) {
            return {
              _id: new ObjectID(id)
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
              'post.city': String(city).toLowerCase()
            }
          },
          type: function(type) {
            return {
              type: String(type)
            }
          },
          ignore: function(id) {
            return {
              _id: {
                $ne: new ObjectID(id)
              }
            }
          }
        }

        for(var key in filter) {
          if(key in filters) {
            query = filters[key](filter[key])
          }
        }
      }

      return models.page.get(query)
      .then(function(pages) {
        return pages.filter(function(page) {
          if('post' in page) {
            if('content' in page.post) {
              page.post.content = striptags(page.post.content, ['br', 'p'])
              return page
            }
          }
        })
      })
    },
    getSearchResults: function(queryString) {
      //No valid word characters, quit early
      if(queryString.match(/\w/gi) === null ) {
        throw new Error('No valid characters in query')
      }

      //This is the base query object
      var searchObj = {
        query: {
          $match: {
            'accepted': true //Only published pages
          }
        },
        searchString: queryString.toLowerCase()
      }

      //First, build initial query object based on search string
      return models.page.getPreQueryFilter(searchObj)
      .then(function(searchObj) {
        //Perform a search using the query
        if(searchObj.searchString.length > 0) {
          var query = []

          var searchQuery = {
            $match: extend({
              $text: {
                $diacriticSensitive: true,
                $search: searchObj.searchString
              }
            }, searchObj.query.$match)
          }

          query.push(searchQuery)

          var sortQuery = {
            $sort: {
              score: {
                $meta: 'textScore'
              }
            }
          }

          query.push(sortQuery)

          var projectQuery = {
            $project: {
              "score": {
                  $meta: 'textScore'
              },
              "title": "$title",
              "url": "$url",
              "slug": "$slug",
              "type": "$type",
              "post": "$post",
              "user_info": "$user_info",
              "rating": "$rating",
              "timestamp": "$timestamp"
            }
          }

          query.push(projectQuery)

          console.log('1', query)

          return resources.models.page.aggregate(query)
        } else {
          console.log('2', searchObj.query)
          return resources.models.page.aggregate([searchObj.query])
        }
      })
      .then(function(result) {
        result = result.map(function(page) {
          //TODO: Also sort after views
          page.score = 0

          if (typeof(page.rating) !== 'undefined') {
            if(typeof(page.rating.likes) !== 'undefined') {
              page.score += parseInt(page.rating.likes)
            }

            if(typeof(page.rating.votes) !== 'undefined' && typeof(page.rating.votes_sum) !== 'undefined') {
              page.score += ( parseInt(page.rating.votes_sum) * parseInt(page.rating.votes) / 10 )
            }
          }

          return page
        })

        result.sort(function(a, b) {
          return (b.score - a.score)
        })

        return result
      })
    },
    getPreQueryFilter: function(searchObj) {
      //Build an array of the search string to handle the db querying more easily
      var stringArray = searchObj.searchString.split(' ')

      //Check if string matches a page type
      stringArray = stringArray.filter(function(string) { 
        if(resources.utils.isPageType(string) !== false) {
          //Restrict page type to the one matching current string
          searchObj.query.$match['type'] = resources.utils.typeNumberFromName(string)
          searchObj.searchString = resources.utils.removePatterFromString(searchObj.searchString, string)
        } else {
          return string
        }
      })

      return new Promise.all([
        //Check if any words match a city
        models.city.get({
          name: {
            $in: stringArray
          }
        })
        .then(function(result) {
          if(result.length > 0) {
            var city = result[0].name

            //Restrict results to the matched city
            searchObj.query.$match['post.city'] = {
              '$regex': city, //Search only this city
              '$options': '-i'
            }
            //Remove matched city from the search string
            searchObj.searchString = resources.utils.removePatterFromString(searchObj.searchString, city)
          }
        }),
        //Check if any words match a category
        models.category.get({
          name: {
            $in: stringArray
          }
        })
        .then(function(result) {
          if(result.length > 0) {
            switch (result[0].type) {
              case '4':
                if( ( ! ('type' in searchObj.query.$match) || searchObj.query.$match.type === '4' ) ) {
                  var type = result[0].name
                  //Restrict results to the matched product type
                  searchObj.query.$match['post.product_type'] = type
                  //Remove matched text from the search string
                  searchObj.searchString = resources.utils.removePatterFromString(searchObj.searchString, type)
                }
                break
            }
          }
        })
      ])
      .then(function() {
        return searchObj
      })
    },
    updatePost: function(id, data) {
      //TODO: document this more

      var isodate = resources.utils.getISOdate()
      var user_id = new ObjectID(data.user_info.id)

      id = new ObjectID(id) //If editing the post, the id will be provided as a string and we need to convert it to an objectid

      if('contributors' in data.user_info) {
        //Check if this user has already contributed to the post, otherwise add the user to the array
        var userHasContributed = false

        for(var userObj in data.user_info.contributors) {
          var userObjId = data.user_info.contributors[userObj].id
          if(String(user_id) == String(userObjId)) {
            userHasContributed = true
          }
        }

        if(!userHasContributed) {
          data.user_info.contributors.push({
            id: user_id,
            hidden: data.user_info.hidden
          })
        }
      }

      return models.revision.get({
        post_id: id
      })
      .then(function(result) {
        if(result.length > 0) {
          var revision = result[0]

          var update = {
            modified: isodate,
            pending: revision.pending += 1,
            revisions: {}
          }

          update.revisions[revision_number] = data.post
          
          update.revisions[revision_number].meta = {
            accepted: null,
            user_info: {
              id: user_id,
              hidden: data.user_info.hidden
            },
            timestamp: {
              created: isodate,
              updatedby: user_id
            }
          }

          update = extend(revision, update)

          return models.revision.update({ post_id: id }, update)
        } else {
          throw new Error('No revision document matching ID was found')
        }
      })
    },
    insertPost: function(data) {
      //TODO: document this more

      var isodate = resources.utils.getISOdate()
      var user_id = new ObjectID(data.user_info.id)

      //add the user creating it to the list of contributors
      data.user_info.contributors = [{
        id: user_id,
        hidden: data.user_info.hidden
      }]

      data.timestamp = {
        created: isodate // Add timestamp for time of creation
      }

      return models.page.insert(data)
      .then(function(result) {
        var revision_number = (new Date(isodate).getTime() / 1000) //This is a unix timestamp
        var revision = {
          post_id: result.ops[0]._id,
          pending: 1, //Represents total number of revisions that are awaiting moderation, at insertion, just this one
          modified: isodate,
          revision: revision_number,
          revisions: {},
        }

        revision.revisions[revision_number] = data.post
        revision.revisions[revision_number].meta = {
          accepted: null,
          user_info: data.user_info,
          timestamp: {
            created: isodate
          }
        }

        return models.revision.insert(revision)
      })
    },
    newPost: function(req) {
      var id = req.body.id
      var hidden = (req.body.hidden) ? true : false;

      var data = resources.utils.parseBody(req)
      if(id) {
        //This is an update to an existing post
        return resources.models.page.updatePost(id, data)
        .then(function() {
          return data
        })
      } else {
        //This is a new post
        return resources.models.page.insertPost(data)
        .then(function() {
          return data
        })
      }
    }
  }
}