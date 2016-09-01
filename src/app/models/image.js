/** image.js
* @file: /src/app/models/image.js
* @description: Model logic for image specific operations
* @parameters: None
* @exports: Object with model logic
*/

var Promise = require('promise')
var ObjectID = require('mongodb').ObjectID
var busboy = require('connect-busboy')
var md5 = require('md5')
var request = require('request')
var fs = require('fs')

module.exports = function(resources, models) {

  return imageModel = {
    get: function(query, fields, sort, limit) {
      return resources.queries.find('images', query, fields, sort, limit)
    },
    insert: function(query) {
      return resources.queries.insert('images', query)
    },
    insertImage: function(user_id) {
      return resources.models.image.get({}, { _id: 1 })
      .then(function(images) {
        var random = Math.floor((Math.random() * 99999999) + 10000000);
        var uId = images.length + 1
        var uHash = md5(uId + random)
        var uFilename = uHash.substring(0, Math.floor((Math.random() * 20) + 10))

        return resources.models.image.insert({
          id: uId,
          filename: uFilename,
          active: false,
          deleted: false,
          user_info: {
            id: user_id
          }
        })
        .then(function(result) {
          if(result.result.n > 0) {
            return result.ops[0]
          } else {
            throw new Error('Could not insert image document')
          }
        })
      })
    },
    uploadCover: function(req) {
      return models.image.insertImage(req.user._id)
      .then(function(result) {
        //TODO: move general writing to disk into another function, that is, busboy/fstream
        return new Promise(function(resolve, reject) {
          req.pipe(req.busboy)

          req.busboy.on('file', function (fieldname, file, filename) {
            resolve(file)
          })
        })
        .then(function(file) {
          var filePath = resources.config.uploads + '/' + result.filename + '_original.jpg'
          return resources.utils.writeFile(file, filePath)
        })
        //TODO Should check here that upload was successful
        .then(function() {
          //Resize uploaded image
          var resize = resources.image_processer.resize(result.filename)
          if(resize === true) {
            return true
          } else {
            throw new Error('Failed to resize image ' + result.filename)
          }
        })
        .then(function() {
          return result
        })
      })
    },
    uploadAvatar: function(req) {
      var user_id = req.user._id
      return new Promise(function(resolve, reject) {
        req.pipe(req.busboy)

        req.busboy.on('file', function (fieldname, file, filename) {
          resolve(file)
        })
      })
      .then(function(file) {
        var filePath = resources.config.uploads + '/avatar/vegosvar/' + user_id + '_raw.jpg'
        return resources.utils.writeFile(file, filePath)
      })
      .then(function() {
        //Resize uploaded image
        var resize = resources.image_processer.avatar(String(user_id))
        if(resize === true) {
          return true
        } else {
          throw new Error('Failed to resize user avatar image ' + user_id)
        }
      })
      .then(function() {
        return models.user.update({
          _id : user_id
        }, {
          $set: {
            active_photo: 'vegosvar',
            vegosvar_photo: '/avatar/vegosvar/' + req.user._id + '.jpg'
          }
        })
      })
    },
    //TODO: Maybe move this function into utils instead
    downloadFile: function(url, filePath) {
      return new Promise(function(resolve, reject) {
        var fstream = fs.createWriteStream(resources.config.uploads + filePath)

        fstream.on('open', function() {
          request.get(url).pipe(fstream)
        })
        .on('close', function() {
          resolve(filePath)
        })
        .on('error', function() {
          reject();
        })
      });
    }
  }
}
