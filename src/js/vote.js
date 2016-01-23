$(window).load(function () {
  $('.star').on('click', function (e) {
    e.preventDefault()
    console.log('click')
    $(this).addClass('push')
    var article = $(this).parent().attr('id')
    var content = $(this).attr('id')
    if (!($(this).parent().hasClass('deactive'))) {
      $.get('/ajax/addVote?id=' + article + '&content=' + content, function (data) {
        if (data === '1') {
          window.location.assign('/recensera')
        } else if (data === '3') {
          alert('Du har redan röstat!')
        } else {
          $('span.votes').html(data[0].count)
          var element = $('#' + data[0]._id + '.stars')
          $(element).children('.star').each(function () {
            $(this).removeClass('active')
          })

          for (var i = 0; i <= data[0].avg; i++) {
            $('#' + data[0]._id + '.stars > div:nth-child(' + i  + ')').addClass('active')
          }
        }
      })
    }
  })

  $('#like .add-like').on('click', function (e) {
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

  $('#like .toggle-hint').on('click', function (e) {
    $('#like .hint').toggleClass('active')
  })

})