$(window).load(function () {
  $('.star').on('click', function (e) {
    e.preventDefault()
    var article = $(this).parent().attr('id')
    var content = $(this).attr('id')
    if (!($(this).parent().hasClass('deactive'))) {
      $.get('/ajax/addVote?id=' + article + '&content=' + content, function (data) {
        console.log(data)
        if (data === '0') {
          alert('Voted!')
        } else if (data === '1') {
          window.location.assign('/recensera')
        } else if (data === '3') {
          console.log('Du har redan röstat!')
        }
      })
    }
  })

  $('.btn-like').on('click', function (e) {
    e.preventDefault()
    var id = $(this).attr('id')
    $.get('/ajax/like?id=' + id, function (data) {
      if (data.action === 0) {
        $('#heart-glyphicon').removeClass('glyphicon glyphicon-heart')
        $('#heart-glyphicon').addClass('glyphicon glyphicon-heart-empty')
      } else if (data.action === 1) {
        $('#heart-glyphicon').removeClass('glyphicon glyphicon-heart-empty')
        $('#heart-glyphicon').addClass('glyphicon glyphicon-heart')
      }
      $('.count').html(data.new_value)
    })
  })
})