//Dropzone.autoDiscover = false //Fix dropzone already attached error

$("div#uploader").dropzone({ url: "/submit/file",
paramName: "image",
method: "post",
maxFiles: 1,
success: function(object, response) {
	setTimeout(function () { 
		console.log('id: ' + response)
		$('div#uploader').addClass('finished')
		$('.dz-preview').hide()
		$.getJSON('/ajax/imageInfo/?id='+ response, function (data) {
			console.log(data)
			if($('.cover-input_hidden').length) {
				console.log('already is')
				$('.cover-input_hidden').remove()
				$('div#uploader').css('background-image', 'url("/uploads/' + data[0].filename + '.jpg")')
				$('#upload-group').append('<input type="hidden" value="' + data[0]._id + '" name="cover_image_id" />')
				$('#upload-group').append('<input type="hidden" value="' + data[0].filename + '" name="cover_image_filename" />')
			} else {
				console.log('isnt')
				$('div#uploader').css('background-image', 'url("/uploads/' + data[0].filename + '.jpg")')
				$('#upload-group').append('<input type="hidden" value="' + data[0]._id + '" name="cover_image_id" />')
				$('#upload-group').append('<input type="hidden" value="' + data[0].filename + '" name="cover_image_filename" />')
			}
		})
	}, 500)
	}
})

$("div#avatar").dropzone({ url: "/submit/file/avatar", 
paramName: "image",
method: "post",
maxFile: 1,
success: function(object, response) {
	setTimeout(function () {
		alert(response)
	})
}
})
