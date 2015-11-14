var sharp = require('sharp')
var fs = require('fs')

exports.resize = function(filename, width, height) {
	var image = sharp('uploads/' + filename + '_original.jpg')
	var image_small = image
	image.resize(1920, undefined)
	image.quality(90)
	image.toFile('/uploads/' + filename + '._original.jpg', function (err, info) { })
	image_small.resize(width, height)
	image_small.quality(90)
	image_small.toFile('uploads/' + filename + '.jpg', function (err, info) { })
	return true
}