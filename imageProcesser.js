var sharp = require('sharp')
var fs = require('fs')

exports.resize = function(filename, width, height) {
	var image = sharp('uploads/' + filename + '_original.jpg')
	var imagesmall = image
	image.resize(1920, undefined)
	image.quality(90)
	image.toFile('/uploads/' + filename + '._default.jpg', function (err, info) { })
	
	imagesmall.resize(width, height)
	imagesmall.quality(90)
	imagesmall.toFile('uploads/' + filename + '.jpg', function (err, info) { })
	return true
}