module.exports = {
	newISOdate: function(d) {
		function pad(n) {return n<10 ? '0'+n : n}
    	return d.getUTCFullYear()+'-'
        + pad(d.getUTCMonth()+1)+'-'
        + pad(d.getUTCDate())+'T'
        + pad(d.getUTCHours())+':'
        + pad(d.getUTCMinutes())+':'
        + pad(d.getUTCSeconds())+'Z'
	},
	getISOdate: function() {
		var d = new Date()
		function pad(n) {return n<10 ? '0'+n : n}
    	return d.getUTCFullYear()+'-'
        + pad(d.getUTCMonth()+1)+'-'
        + pad(d.getUTCDate())+'T'
        + pad(d.getUTCHours())+':'
        + pad(d.getUTCMinutes())+':'
        + pad(d.getUTCSeconds())+'Z'
	},
	getPrettyDate: function(date) {
    if( ! (date instanceof Date) ) {
      date = new Date(date)
    }

		var yyyy = date.getUTCFullYear().toString()
		var mm = (date.getUTCMonth()()+1).toString()
		var dd  = date.getUTCDate().toString()
		return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0])
	},
  getPrettyDateTime: function(date) {
    if( ! (date instanceof Date) ) {
      date = new Date(date)
    }

    year = "" + date.getUTCFullYear();
    month = "" + (date.getUTCMonth() + 1); if (month.length == 1) { month = "0" + month; }
    day = "" + date.getUTCDate(); if (day.length == 1) { day = "0" + day; }
    hour = "" + date.getHours(); if (hour.length == 1) { hour = "0" + hour; }
    minute = "" + date.getUTCMinutes(); if (minute.length == 1) { minute = "0" + minute; }
    second = "" + date.getUTCSeconds(); if (second.length == 1) { second = "0" + second; }
    return year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second;
	},
  formatHtmlEntities: function (str) {
    return str.replace(/[^]/g, function(str) {
        return "&#" + str.charCodeAt(0) + ";"
    })
  },
  returnUrl: function(req, blacklist) {
    var url = '/'
    previousUrl = req.headers.referer
    host = req.headers.host


    if(typeof(previousUrl) !== 'undefined') {
      if(previousUrl.indexOf(host) >= 0) {
        var page = ( previousUrl.substr(previousUrl.indexOf(host) + host.length) )
        if (blacklist && blacklist.indexOf(page.substr(1)) === -1) {
          url = page
        }

        if ( req.session.returnTo !== 'undefined' ) {
          if( req.originalUrl.indexOf('.') === -1 ) { //Fix for not redirecting to an image or something
            url = req.originalUrl
          } else {
            url = req.session.returnTo
          }
        } else {
          url = '/' //If all else fails, return to start page
        }
      } else {
        url = req.originalUrl
      }
    } else {
      url = req.originalUrl
    }

    return url
  },
  replaceDiacritics: function(string) {
    return string.toLowerCase()
    .replace(/á|à|å|ä/g, 'a')
    .replace(/ö|ò|ó/gi, 'o')
    .replace(/é|è|ë|ê/gi, 'e')
    .replace(/ç/gi, 'c')
    .replace(/[^\w\s]/gi, '') //Finally remove all non word characters, but leave spaces
  },
  isAuthenticated: function(req, res, next) {
    if (req.isAuthenticated()) {
      return next()
    } else {
      //Check if this was an ajax request
      if(req.xhr || 'accept' in req.headers && req.headers.accept.indexOf('json') >= 0) {
        res.json({
          success: false,
          message: 'Access denied'
        })
      } else {
        //Redirect to login for browsers
        res.redirect('/logga-in')
      }
    }
  },
  isPrivileged: function(req, res, next) {
    if(module.exports.userCheckPrivileged(req.user)) {
      return next() //User is privileged, continue
    } else {
      //Check if this was an ajax request
      if(req.xhr || req.headers.accept.indexOf('json') >= 0) {
        res.json({
          success: false,
          message: 'Access denied'
        })
      } else {
        //Redirect to front page for browsers
        res.redirect('/')
      }
    }
  },
  userCheckPrivileged: function(user) {
    var privileged = ['admin','moderator']
    return (typeof(user) !== 'undefined') ? (privileged.indexOf(user.info.permission) >= 0) : false
  },
  userCheckAdmin: function(user) {
    var admin = ['admin']
    return (typeof(user) !== 'undefined') ? (admin.indexOf(user.info.permission) >= 0) : false
  },
  pageTypes: function() {
      return {
      'fakta': '1',
      'recept': '2',
      'restaurang': '3',
      'produkt': '4',
      'butik': '5',
      'cafe': '6'
    }
  },
  isPageType: function(string) {
    var pageTypes = module.exports.pageTypes()
    return (string in pageTypes)
  },
  typeNumberFromName: function(name) {
    //Get type name from number
    var pageTypes = module.exports.pageTypes()
    if( ! (name in pageTypes) ) {
      throw new Error('unknown') //Unknown type name
    }

    return pageTypes[name]
  },
  typeNameFromNumber: function(number) {
    //Same as above, but in reverse
    var pageTypes = module.exports.pageTypes()
    for(var key in pageTypes) {
      if(number == pageTypes[key]) {
        return key
      }
    }
  },
  removePatterFromString: function(string, pattern) {
    return string.split(' ').filter(function(text) {
      if(text.match(pattern) === null) {
        return text
      }
    }).join(' ').trim()
  },
  downloadFileFromUrl: function(file, filePath) {
    return new Promise(function(resolve, reject) {
      var fstream = fs.createWriteStream(filePath)

      fstream.on('open', function() {
        request.get(url).pipe(fstream)
      })
      .on('close', function() {
        resolve(filePath)
      })
      .on('error', function(err) {
        reject(err);
      })
    });
  },
  writeFile: function(file, filePath) {
    var fs = require('fs')
    return new Promise(function(resolve, reject) {
      var fstream = fs.createWriteStream(filePath)
      file.pipe(fstream)

      fstream.on('close', function() {
        resolve()
      })
    })
  },
  parseBody: function(req) {
    var getSlug = require('speakingurl')
    var ObjectID = require('mongodb').ObjectID
		var extend = require('util')._extend

    var type = req.body.type
    var hidden = (req.body.hidden) ? true : false;
    var user_id = new ObjectID(req.user._id)

    //Prevent speakingurl from converting swedish characters to ae and oe by replacing them with what we want
    //also remove any non alphanumeric characters in url
    var slug = module.exports.replaceDiacritics(String(req.body.title))
    var niceurl = getSlug(slug, {
      // URL Settings
      separator: '-',
      maintainCase: false,
      symbols: false
    })

    if(req.body.cover_image_id == 'undefined' || req.body.cover_image_filename == 'undefined') {
      cover_image_id = null
      cover_image_filename = null
    } else {
      cover_image_id = req.body.cover_image_id
      cover_image_filename = req.body.cover_image_filename
    }

    //These are the basic attributes shared among all the page types
    //which are all the attributes needed for type 1 (Fact)
    var data = {
      title: req.body.title,
      url: niceurl,
      accepted: null,
      slug: slug,
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
        cover: {
          id: cover_image_id,
          filename: cover_image_filename
        }
      }, rating: {
        likes: 0
      }, user_info: {
        id: user_id,
        hidden: hidden
      }
    }

    //TODO: there has to be a better way to do this than this switch
    switch(type) {
      case '1':
        break;
      case '2': //Recipe
        data.post = extend(data.post, {
          video: req.body.video,
          food_type: req.body.food_type
        })

        data.rating = extend(data.rating, {
          votes: 0,
          votes_sum: 0
        })
        break
      case '3': //Restaurant
      case '5': //Store
        data.post = extend(data.post, {
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
          }
        })

        data.rating = extend(data.rating, {
          votes: 0,
          votes_sum: 0
        })

        break
      case '4': //Product
        data = extend(data, {
          post: {
            veg_type: req.body.veg_type,
            product_type: req.body.product_type,
            manufacturer: req.body.manufacturer,
            manufacturer_website: req.body.manufacturer_website,
            hashtag: req.body.hashtag
          }
        })
        break
      case '6':
        data.post = extend(data.post, {
          city: req.body.city,
          street: req.body.street,
          coordinates: {
            latitude: req.body.latitude,
            longitude: req.body.longitude
          },
          website: req.body.website,
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
          }
        })

        data.rating = extend(data.rating, {
          votes: 0,
          votes_sum: 0
        })
        break
      default:
        throw new Error('Unknown page type in request body')
    }

    return data
  }
}