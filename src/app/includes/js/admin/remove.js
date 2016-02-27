$(document).ready(function() {
  $('#delete').on('click', function(e) {
    var id = $(e.target).data('id')

    $.ajax({
      url: '/ajax/admin/delete/approve/' + id
    })
    .done(function(result) {
      if(result.success) {
        $('#message').show().addClass('alert-success').text('Sidan har nu tagits bort')
      } else {
        $('#message').show().addClass('alert-danger').text('Sidan kunde inte tas bort på grund av ett fel')
      }
    })
  })

  $('#reject').on('click', function(e) {
    var id = $(e.target).data('id')

    $.ajax({
      url: '/ajax/admin/delete/reject/' + id
    })
    .done(function(result) {
      if(result.success) {
        $('#message').show().addClass('alert-success').text('Borttagningen av sidan har nekats')
      } else {
        $('#message').show().addClass('alert-danger').text('Borttagningen av sidan kunde inte nekas på grund av ett fel')
      }
    })
  })
})