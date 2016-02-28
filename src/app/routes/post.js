/** post.js
* @file: /src/app/routes/post.js
* @description: Handles express routing for the POST routes
* @parameters: Object(app), Object(resources)
* @exports: Express routes
*/

var busboy = require('connect-busboy')
var body_parser = require('body-parser')
var urlencodedParser = body_parser.urlencoded({ extended: false })
var fs = require('fs')
var md5 = require('md5')
var getSlug = require('speakingurl')
var ObjectID = require('mongodb').ObjectID

module.exports = function (app, resources) {
  var functions = resources.functions
  var image_processer = resources.image_processer

  app.post('/submit', urlencodedParser, function (req, res, next) {
    var id = req.body.id
    var type = req.body.type
    var hidden = (req.body.hidden) ? true : false;
    var isodate = functions.getISOdate()

    //Prevent speakingurl from converting swedish characters to ae and oe by replacing them with what we want 
    var tamperedTitle = String(req.body.title).toLowerCase().replace(/å|ä/g, 'a').replace(/ö/g, 'o')
    var niceurl = getSlug(tamperedTitle, {
      // URL Settings
      separator: '-',
      maintainCase: false,
      symbols: false
    })
    var simpleSlug = getSlug(tamperedTitle, {separator: ''})

    var usersdb = resources.collections.users
    var pagesdb = resources.collections.pages
    var revisionsdb = resources.collections.revisions

    usersdb.find({ _id: new ObjectID(req.user._id), "info.blocked": false }).toArray(function(err, result) {
      if(result.length > 0) {
        //Proceed as normal
        if(req.body.cover_image_id == 'undefined' || req.body.cover_image_filename == 'undefined') {
          cover_image_id = null
          cover_image_filename = null
        } else {
          cover_image_id = req.body.cover_image_id
          cover_image_filename = req.body.cover_image_filename
        }

        if(type == 1) { // Fakta
          var data = {
            title: req.body.title,
            url: niceurl,
            type: type,
            post: {
              content: req.body.content,
              sources: {
                  name: typeof(req.body.source_name) === 'string' ? [req.body.source_name] : req.body.source_name,
                  url: typeof(req.body.source_url) === 'string' ? [req.body.source_url] : req.body.source_url,
              },
              type: req.body.type,
              license: req.body.license,
              license_cc_version: req.body.license_cc_version,
              license_holder: req.body.license_holder,
              license_holder_website: req.body.license_holder_website,
              cover: {
                id: cover_image_id,
                filename: cover_image_filename
              }
            }, rating: {
              likes: 0
            }, user_info: {
              id: req.user._id,
              hidden: hidden
            }
          }
        } else if(type == 2) { // Recept
          var data = {
            title: req.body.title,
            url: niceurl,
            type: type,
            post: {
              content: req.body.content,
              sources: {
                  name: typeof(req.body.source_name) === 'string' ? [req.body.source_name] : req.body.source_name,
                  url: typeof(req.body.source_url) === 'string' ? [req.body.source_url] : req.body.source_url,
              },
              food_type: req.body.food_type,
              license: req.body.license,
              license_cc_version: req.body.license_cc_version,
              license_holder: req.body.license_holder,
              license_holder_website: req.body.license_holder_website,
              cover: {
                id: cover_image_id,
                filename: cover_image_filename
              }
            }, rating: {
              likes: 0,
              votes: 0,
              votes_sum: 0
            }, user_info: {
              id: req.user._id,
              hidden: hidden
            }
          }
        } else if(type == 3) { // Restaurang
          var data = {
            title: req.body.title,
            url: niceurl,
            type: type,
            post: {
              content: req.body.content,
              sources: {
                  name: typeof(req.body.source_name) === 'string' ? [req.body.source_name] : req.body.source_name,
                  url: typeof(req.body.source_url) === 'string' ? [req.body.source_url] : req.body.source_url,
              },
              city: req.body.city,
              street: req.body.street,
              coordinates: {
                  latitude: req.body.latitude,
                  longitude: req.body.longitude
              },
              phone: req.body.phone,
              website: req.body.website,
              email: req.body.email,
              license: req.body.license,
              license_cc_version: req.body.license_cc_version,
              license_holder: req.body.license_holder,
              license_holder_website: req.body.license_holder_website,
              veg_offer: req.body.veg_offer,
              food: req.body.food,
              hashtag: req.body.hashtag,
              openhours: {
                monday: req.body.monday,
                tuesday: req.body.tuesday,
                wednesday: req.body.wednesday,
                thursday: req.body.thursday,
                friday: req.body.friday,
                saturday: req.body.saturday,
                sunday: req.body.sunday
              }, cover: {
                id: cover_image_id,
                filename: cover_image_filename
              },
            }, rating: {
                likes: 0,
                votes: 0,
                votes_sum: 0
            }, user_info: {
              id: req.user._id,
              hidden: hidden
            }
          }
        } else if(type == 4) { // Produkt
          var data = {
            title: req.body.title,
            url: niceurl,
            type: type,
            post: {
              content: req.body.content,
              sources: {
                  name: typeof(req.body.source_name) === 'string' ? [req.body.source_name] : req.body.source_name,
                  url: typeof(req.body.source_url) === 'string' ? [req.body.source_url] : req.body.source_url,
              },
              license: req.body.license,
              license_cc_version: req.body.license_cc_version,
              license_holder: req.body.license_holder,
              license_holder_website: req.body.license_holder_website,
              veg_type: req.body.veg_type,
              product_type: req.body.product_type,
              manufacturer: req.body.manufacturer,
              manufacturer_website: req.body.manufacturer_website,
              hashtag: req.body.hashtag,
              cover: {
                id: cover_image_id,
                filename: cover_image_filename
              }
            }, rating: {
              likes: 0,
              votes: 0,
              votes_sum: 0
            }, user_info: {
              id: req.user._id,
              hidden: hidden
            }
          }
        } else if(type == 5) { // Butik
          var data = {
            title: req.body.title,
            url: niceurl,
            type: type,
            post: {
              content: req.body.content,
              sources: {
                  name: typeof(req.body.source_name) === 'string' ? [req.body.source_name] : req.body.source_name,
                  url: typeof(req.body.source_url) === 'string' ? [req.body.source_url] : req.body.source_url,
              },
              license: req.body.license,
              license_cc_version: req.body.license_cc_version,
              license_holder: req.body.license_holder,
              license_holder_website: req.body.license_holder_website,
              city: req.body.city,
              street: req.body.street,
              coordinates: {
                  latitude: req.body.latitude,
                  longitude: req.body.longitude
              },
              website: req.body.website,
              hashtag: req.body.hashtag,
              openhours: {
                monday: req.body.monday,
                tuesday: req.body.tuesday,
                wednesday: req.body.wednesday,
                thursday: req.body.thursday,
                friday: req.body.friday,
                saturday: req.body.saturday,
                sunday: req.body.sunday
              },
              cover: {
                id: cover_image_id,
                filename: cover_image_filename
              }
            }, rating: {
              likes: 0,
              votes: 0,
              votes_sum: 0
            }, user_info: {
              id: req.user._id,
              hidden: hidden
            }
          }
        } else {
          res.redirect('/ny')
        }

        data.accepted = null
        data.slug = simpleSlug

        if(id) {
          id = new ObjectID(id) //If editing the post, the id will be provided as a string and we need to convert it to an objectid
          if('contributors' in data.user_info) {
            //Check if this user has already contributed to the post, otherwise add the user to the array
            var alreadyContributed = false

            for(var userObj in data.user_info.contributors) {
              var userObjId = data.user_info.contributors[userObj].id
              if(req.user._id == userObjId) {
                alreadyContributed = true
              }
            }

            if(!alreadyContributed) {
              data.user_info.contributors.push({
                id: req.user._id,
                hidden: hidden
              })
            }
          }
        } else {
          //This is the first revision, add the user creating it to the list of contributors
          data.user_info.contributors = [{
            id: req.user._id,
            hidden: hidden
          }]
        }

        pagesdb.count({ _id : id }, function(err, count) {
          if(err) throw err
          if(count > 0) {
            //Update
            revisionsdb.find({ post_id : id }).toArray(function(err, result) {
              if(result.length > 0) {
                var revision = result[0]
                revision.modified = isodate //Update date modified
                revision.pending += 1 //Update revisions pending moderation for this post
                revision_number = (new Date(isodate).getTime() / 1000) //This is a unix timestamp
                revision.revisions[revision_number] = data.post

                revision.revisions[revision_number].meta = {
                  accepted: null,
                  user_info: {
                    id: req.user._id,
                    hidden: hidden
                  },
                  timestamp: {
                    created: isodate,
                    updatedby: req.user._id
                  }
                }

                revisionsdb.update({ post_id : id}, revision, function(err, result) {
                  res.redirect('/ny/uppdaterad/?newpost='+niceurl)
                })
              } else {
                console.log('No entry for this page in revisions collection')
                pagesdb.find({ _id : id }).toArray(function(err, result) {
                  data.timestamp = {
                    created: result[0].timestamp.created,
                    update: isodate, // Add timestamp for update
                    updatedby: req.user._id
                  }

                  pagesdb.update({_id:id}, data, function(err, result) {
                    res.redirect('/ny/uppdaterad/?newpost='+niceurl)
                  })
                })
              }
            })
          } else {
            //Insert
            data.timestamp = {}
            data.timestamp.created = isodate // Add timestamp for creation
            pagesdb.insert(data, function(err, doc) {
              if(err) throw err

              var revision_number = (new Date(isodate).getTime() / 1000) //This is a unix timestamp
              var revision = {
                post_id: doc.ops[0]._id,
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

              revisionsdb.insert(revision, function(err, doc) {
                //Should probably make a redirect to a page showing that the page is updated and will be published after moderation
                res.redirect('/ny/publicerad/?newpost='+niceurl)
              })
            })
          }
        })
      } else {
        //User is blocked, should not be able to send this request in the first place
        next()
      }
    })
  })

  app.post('/submit/file', function(req, res) {
    var fstream
    req.pipe(req.busboy)
    req.busboy.on('file', function (fieldname, file, filename) {
      var imagesdb = resources.collections.images
      imagesdb.count({ }, function (err, num_rows) {
        if (err) throw err
        random = Math.floor((Math.random() * 99999999) + 10000000);
        uHash = md5(num_rows + 1 + random)
        randomsubstring = Math.floor((Math.random() * 20) + 10)
        uFilename = uHash.substring(0, randomsubstring)

        imagesdb.insert({ id:num_rows + 1, filename: uFilename, active: false, deleted: false, "user_info":{ id: req.user._id } }, function(err, doc) {
          if(err) throw err

          var filePath = resources.config.uploads
          var fileNameOriginal = filePath + '/' + uFilename + '_original.jpg'
          fstream = fs.createWriteStream(fileNameOriginal)
          file.pipe(fstream)
          fstream.on('finish', function() {
            var resize = image_processer.resize(uFilename)
            if(resize == true) {
              fstream.on('close', function () {
                res.send(doc.ops[0]._id)
              })
            }
          })
        })
      })
    })
  })

  app.post('/submit/file/avatar', function(req, res) {
  var fstream
  req.pipe(req.busboy)
  req.busboy.on('file', function (fieldname, file, filname) {
    fstream = fs.createWriteStream(resources.config.uploads + '/avatar/' + req.user._id + '_raw.jpg')
    file.pipe(fstream)
    fstream.on('finish', function() {
      var usersdb = resources.collections.users
      var resize = image_processer.avatar(req.user._id)
      if(resize == true) {
        fstream.on('close', function () {
          usersdb.update({
              _id : new ObjectID(req.user._id)
            }, {
            $set: {
              "active_photo": 'vegosvar', // This can be fb or vegosvar, later gr. For easy switching later on
              "vegosvar_photo": '/avatar/' + req.user._id + '.jpg'
            }
            }, function(err, status) {
              if(err) throw err
              res.send(req.user._id)
            })
          })
        }
      })
    })
  })

}