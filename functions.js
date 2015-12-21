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
	}
}