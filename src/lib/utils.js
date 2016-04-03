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
  returnUrl: function(req) {
    var url = '/'
    previousUrl = req.headers.referer
    host = req.headers.host

    if(typeof(previousUrl) !== 'undefined') {
      if(previousUrl.indexOf(host) >= 0) {
        var page = ( previousUrl.substr(previousUrl.indexOf(host) + host.length) )
        url = page

        if ( req.session.returnTo !== 'undefined' ) {
          if( req.originalUrl.indexOf('.') === -1 ) { //Fix for not redirecting to an image or something
            url = req.originalUrl
          }
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
  }
}