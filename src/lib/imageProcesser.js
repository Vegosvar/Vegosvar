var sharp = require('sharp')
var fs = require('fs')

module.exports = {
	resize: function(filename) {
		var image = sharp(__dirname + '/../uploads/' + filename + '_original.jpg')
		image.resize(1920, 1080)
		image.quality(90)
		image.toFile(__dirname + '/../uploads/' + filename + '_processed.jpg', function (err, info) { })
		
		var imagesmall = sharp(__dirname + '/../uploads/' + filename + '_original.jpg')
		imagesmall.resize(1200, 630)
		imagesmall.toFile(__dirname + '/../uploads/' + filename + '.jpg', function (err, info) { })

		var imagethumb = sharp(__dirname + '/../uploads/' + filename + '_original.jpg')
		imagethumb.resize(345, 181)
		imagethumb.toFile(__dirname + '/../uploads/' + filename + '_thumb.jpg', function (err, info) { 
			fs.unlink(__dirname + '/../uploads/' + uFilename + '_original.jpg')
		})
		
		return true
	},
	avatar: function(id) {
		fs.unlink(__dirname + '/../uploads/avatar/' + id + '.jpg', function(err){}) //Quietly ignore unlink errors
		var image = sharp(__dirname + '/../uploads/avatar/' + id + '_raw.jpg')
		image.resize(200, 200)
		image.quality(90)
		image.toFile(__dirname + '/../uploads/avatar/' + id + '.jpg', function (err, info) {
			fs.unlink(__dirname + '/../uploads/avatar/' + id + '_raw.jpg')
		})

		return true
	}
}