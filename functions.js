var config = require('./config')
var client = require('mongodb').MongoClient

var instance = false

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
		var yyyy = date.getUTCFullYear().toString()
		var mm = (date.getUTCMonth()()+1).toString()
		var dd  = date.getUTCDate().toString()
		return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0])
	},
  getPrettyDateTime: function(date) {
    year = "" + date.getUTCFullYear();
    month = "" + (date.getUTCMonth() + 1); if (month.length == 1) { month = "0" + month; }
    day = "" + date.getUTCDate(); if (day.length == 1) { day = "0" + day; }
    hour = "" + date.getHours(); if (hour.length == 1) { hour = "0" + hour; }
    minute = "" + date.getUTCMinutes(); if (minute.length == 1) { minute = "0" + minute; }
    second = "" + date.getUTCSeconds(); if (second.length == 1) { second = "0" + second; }
    return year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second;
	},
  returnUrl: function(req) {
    previousUrl = req.headers.referer
    host = req.headers.host

    if(typeof(previousUrl) !== 'undefined') {
      if(previousUrl.indexOf(host) >= 0) {
        var page = ( previousUrl.substr(previousUrl.indexOf(host) + host.length) )
        var url = page

        if ( req.session.returnTo !== 'undefined' ) {
          if( req.session.returnTo === '/' && page === '/' && req.originalUrl.indexOf('.') === -1 ) {
            url = req.originalUrl
          }
        }

        return url
      } else {
        return req.originalUrl
      }
    } else {
      return req.originalUrl
    }
  }
}