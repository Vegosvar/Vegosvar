$(window).load(function () {
  $('.star').on('click', function (e) {
    e.preventDefault()
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
          var element = $('#'+data[0]._id)
          console.log(data[0]._id)
          element.removeClass('active')
          if (data[0].avg > 4) {
            $('.stars#' + data[0]._id + ' > #1').addClass('active')
            $('.stars#' + data[0]._id + ' > #2').addClass('active')
            $('.stars#' + data[0]._id + ' > #3').addClass('active')
            $('.stars#' + data[0]._id + ' > #4').addClass('active')
            $('.stars#' + data[0]._id + ' > #5').addClass('active')
          } else if (data[0].avg > 3) {
            $('.stars#' + data[0]._id + ' > #1').addClass('active')
            $('.stars#' + data[0]._id + ' > #2').addClass('active')
            $('.stars#' + data[0]._id + ' > #3').addClass('active')
            $('.stars#' + data[0]._id + ' > #4').addClass('active')
          } else if (data[0].avg > 2) {
            $('.stars#' + data[0]._id + ' > #1').addClass('active')
            $('.stars#' + data[0]._id + ' > #2').addClass('active')
            $('.stars#' + data[0]._id + ' > #3').addClass('active')
          } else if (data[0].avg > 1) {
            $('.stars#' + data[0]._id + ' > #1').addClass('active')
            $('.stars#' + data[0]._id + ' > #2').addClass('active')
          } else if (data[0].avg > 0) {
            $('.stars#' + data[0]._id + ' > #1').addClass('active')
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