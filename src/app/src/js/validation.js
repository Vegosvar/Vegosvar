$('.validate-me').submit(function (e) {
	// Type
	// 		1 == Fakta
	//		2 == Recept
	// 		3 == Restaurang
	//		4 == Produkt
	// 		5 == Butik
	e.preventDefault()
	var type = $('#submit-type').val()
	alert('submit')
	if (type === '1' || type == '2') {
		var title = $('.form-control.title').val()
		var description = $('.form-control.editable-content').val()
		if (!(title === '') && !(description === '')) {
			$.get('/ajax/validate/title?t='+title, function(data) {
				if(data === '1') {
					$.post( $('.validate-me').attr('action'), $('.validate-me').serialize(), function(response) {
						window.location.href = '/ny/publicerad/?newpost=' + response
					})
				} else {
					$('.form-control.title').addClass('invalid')
				}
			})
		} else {
			alert('Fyll i alla fält')
		}
	}

	if (type === '5' || type === '3') {
		var title = $('.form-control.title').val()
		var description = $('.form-control.editable-content').val()
		var adress = $('.form-control.street').val()
		if (!(title === '') && !(description === '') && !(adress === '')) {
			$.get('/ajax/validate/title?t='+title, function(data) {
				if(data === '1') {
					$.post( $('.validate-me').attr('action'), $('.validate-me').serialize(), function(response) {
						window.location.href = '/ny/publicerad/?newpost=' + response
					})	
				} else {
					$('.form-control.title').addClass('invalid')
				}
			})
		} else {
			alert('Fyll i alla fält')
		}
	}
	
	if (type === '4') {
		var title = $('.form-control.title').val()
		var description = $('.form-control.editable-content').val()
		var manufacturer = $('.form-control.manufacturer').val()
		var website = $('.form-control.manufacturer_website').val()
		if (!(title === '') && !(description === '') && !(manufacturer === '') && !(website === '')) {
			$.get('/ajax/validate/title?t='+title, function(data) {
				if(data === '1') {
					$.post( $('.validate-me').attr('action'), $('.validate-me').serialize(), function(response) {
						window.location.href = '/ny/publicerad/?newpost=' + response
					})	
				} else {
					$('.form-control.title').addClass('invalid')
				}
			})
		} else {
			alert('Fyll i alla fält')
		}
	}
})