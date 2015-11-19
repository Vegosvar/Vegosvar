var sharp = require('sharp')
var fs = require('fs')

exports.resize = function(filename, width, height) {
	var image = sharp('uploads/' + filename + '_original.jpg')
	image.resize(1920, 1080)
	image.quality(90)
	image.toFile('uploads/' + filename + '_processed.jpg', function (err, info) { })
	
	var imagesmall = sharp('uploads/' + filename + '_original.jpg')
	imagesmall.resize(width, height)
	imagesmall.toFile('uploads/' + filename + '.jpg', function (err, info) { })

	var imagethumb = sharp('uploads/' + filename + '_original.jpg')
	imagethumb.resize(345, 181)
	imagethumb.toFile('uploads/' + filename + '_thumb.jpg', function (err, info) { 
		fs.unlink(__dirname + '/uploads/' + uFilename + '_original.jpg')
	})
	
	return true
}