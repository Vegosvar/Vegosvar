var sharp = require('sharp')
var fs = require('fs')

exports.resize = function(filename, width, height) {
	var image = sharp('uploads/' + filename + '_original.jpg')
	image.resize(width, height)

	image.toFile('uploads/' + filename + '.jpg', function (err, info) { })
	return true
}