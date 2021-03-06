$(window).load(function () {
  $(document).on('click', '.star', function (e) {
    e.preventDefault()
    $(e.target).parent().addClass('push')
    var parent = $(e.target).parent().parent()
    var article = $(parent).data('id')
    var content = $(e.target).parent().index() + 1
    if (!($(e.target).parent().hasClass('deactive'))) {
      $.get('/ajax/addVote?id=' + article + '&content=' + content, function (data) {
        if (data === '1') {
          window.location.assign('/recensera')
        } else if (data === '3' || data === '5') {
          //TODO, this should really be fixed
        } else {
          $('span.votes').html(data[0].count)
          var element = $('#' + data[0]._id + '.stars')
          $(element).children('.star').each(function () {
            $(e.target).removeClass('active')
          })

          for (var i = 0; i <= data[0].avg; i++) {
            $(parent).find('.star:nth-child(' + i  + ')').addClass('active')
          }
        }
      })
    }
  })

  $('.like.add-like').on('click', function () {
    var container = this
    var id = $(container).data('id')
    var element = $(container).find('#heart-glyphicon')
    $(element).removeClass('glyphicon glyphicon-heart glyphicon-heart-empty').addClass('fa fa-spin fa-spinner')
    $.get('/ajax/like?id=' + id, function (data) {
      $(element).removeClass('fa fa-spin fa-spinner').addClass('glyphicon')

      if (data.new_value === 0) {
        $(element).addClass('glyphicon-heart-empty').removeClass('glyphicon-heart')
      } else {
        $(element).addClass('glyphicon-heart').removeClass('glyphicon-heart-empty')
      }

      $(container).find('.count').html(data.new_value)
    })
  })

  $('.like.toggle-hint').on('click', function (e) {
    $(this).parent().find('.hint').toggleClass('active')
  })

})