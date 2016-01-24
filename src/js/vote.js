$(window).load(function () {
  $(document).on('click', '.star', function (e) {
    e.preventDefault()
    console.log('click')
    $(e.target).parent().addClass('push')
    var article = $(e.target).parent().parent().attr('id')
    var content = $(e.target).parent().index() + 1
    if (!($(e.target).parent().hasClass('deactive'))) {
      $.get('/ajax/addVote?id=' + article + '&content=' + content, function (data) {
        if (data === '1') {
          window.location.assign('/recensera')
        } else if (data === '3') {
          alert('Du har redan röstat!')
        } else {
          $('span.votes').html(data[0].count)
          var element = $('#' + data[0]._id + '.stars')
          $(element).children('.star').each(function () {
            $(e.target).removeClass('active')
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