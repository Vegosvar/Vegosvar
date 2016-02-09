var sharp = require('sharp')
var fs = require('fs')

exports.resize = function(path, filename, width, height) {
	var image = sharp(path + '/' + filename + '_original.jpg')
	image.resize(1920, 1080)
	image.quality(90)
	image.toFile(path + '/' + filename + '_processed.jpg', function (err, info) { })
	
	var imagesmall = sharp(path + '/' + filename + '_original.jpg')
	imagesmall.resize(width, height)
	imagesmall.toFile(path + '/' + filename + '.jpg', function (err, info) { })

	var imagethumb = sharp(path + '/' + filename + '_original.jpg')
	imagethumb.resize(345, 181)
	imagethumb.toFile(path + '/' + filename + '_thumb.jpg', function (err, info) { 
		fs.unlink(path + '/' + uFilename + '_original.jpg')
	})
	
	return true
}