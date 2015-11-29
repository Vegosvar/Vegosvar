$(window).load(function () {
	$('.star').on('click', function (e) {
		e.preventDefault()
		var article = $(this).parent().attr('id')
		var content = $(this).attr('id')
		if(!($(this).parent().hasClass('deactive'))) {
			$.get('/ajax/addVote?id=' + article + '&content=' + content, function (data) {
				console.log(data)
				if(data === "0") {
					alert('Voted!')
				} else if(data === "1") {
					window.location.assign('/vote-login')
				} else if(data === "3") {
					console.log('You already voted!')
				}
			})
		}
	})

	$('.btn-like').on('click', function (e) {
		e.preventDefault()
		var id = $(this).attr('id')
		$.get('/ajax/like?id=' + id, function (data) {
			console.log(data)
		})
	})
})