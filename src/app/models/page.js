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

module.exports = function(resources) {
  var userModel = require('./user')(resources)

  return pageModel = {
    get: function(query) {
      return resources.queries.find('pages', query)
      .then(function(pages) {
        if( pages.length <= 0) {
          throw new Error(404)
        } else {
          return pages[0]
        }
      })
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
      return resources.queries.find('pages',
        {
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
            return userModel.get({
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
    nearbyEstablishments: function(page) {
      return resources.queries.getPages(
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
    }
  }

}