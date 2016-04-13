var modalTitle = {
    block: function(user) {
      return $('<h4>', {
        class: 'modal-title'
      })
      .append(
        $('<span>')
        .html('Blockera&nbsp;'),
        $('<small>')
        .append(
          $('<span>', {
            class: 'user-display-name'
          })
          .text(user.name.display_name)
        )
      )
    },
    unblock: function(user) {
      return $('<h4>', {
        class: 'modal-title'
      })
      .append(
        $('<span>')
        .html('Häv blockering av&nbsp;'),
        $('<small>')
        .append(
          $('<span>', {
            class: 'user-display-name'
          })
          .text(user.name.display_name)
        )
      )
    }
}

var modalBody = {
  block: function(user) {
    return $('<div>')
      .append(
        $('<strong>')
        .text('En blockering upphäver användarens rättigheter att:'),
        $('<ul>')
        .append(
          $.map([
            'Skapa nya sidor',
            'Redigera sidor',
            'Gilla/betygsätta sidor'
            ], function(text) {
            return $('<li>').text(text)
          })
        ),
        $('<strong>')
        .text('En blockerad användare kan fortfarande:'),
        $('<ul>')
        .append(
          $.map([
            'Logga in på Vegosvar',
            'Begära borttagning av sidor den själv skapat',
            'Ta bort sitt eget konto'
            ], function(text) {
            return $('<li>').text(text)
          })
        )
      )
  },
  unblock: function(user) {
    return $('<div>')
    .append(
      $('<strong>')
      .text('Att häva blockeringen återställer användarens rättigheter att:'),
      $('<ul>')
      .append(
        $.map([
          'Skapa nya sidor',
          'Redigera sidor',
          'Gilla/betygsätta sidor'
          ], function(text) {
          return $('<li>').text(text)
        })
      )
    )
  }
}

var modalFooter = {
  block: function(user) {
    return $('<div>')
    .append(
      $('<button>', {
        class: 'btn btn-primary'
      })
      .html('Blockera användare')
      .on('click', function() {
        ajaxBlock(user._id, function(result) {
          var modalButton = $('#' + user._id).children('.btn-modal-action')
          $(modalButton).toggleClass('btn-danger btn-success')
          $(modalButton).html('Häv blockering')

          $('#modal').modal('hide')
        })
      }),
      $('<button>', {
        class: 'btn btn-danger'
      })
      .attr('data-dismiss','modal')
      .html('Avbryt')
    )
  },
  unblock: function(user) {
    return $('<div>')
    .append(
      $('<button>', {
        class: 'btn btn-primary'
      })
      .html('Häv blockering')
      .on('click', function() {
        ajaxUnblock(user._id, function(result) {
          var modalButton = $('#' + user._id).children('.btn-modal-action')
          $(modalButton).toggleClass('btn-danger btn-success')
          $(modalButton).html('Blockera')

          $('#modal').modal('hide')
        })
      }),
      $('<button>', {
        class: 'btn btn-danger'
      })
      .html('Avbryt')
      .attr('data-dismiss','modal')
    )
  }
}

var newModal = function(user) {
  var blocked = (user.info.hasOwnProperty('blocked')) ? ( ( user.info.blocked === true ) ? 'unblock' : 'block' ) : 'block'

  return $('<div>', {
    id: 'modal',
    class: 'modal fade'
  })
  .append(
    $('<div>', {
      class: 'modal-dialog'
    })
    .append(
      $('<div>', {
        class: 'modal-content'
      })
      .append(
        $('<div>', {
          class: 'modal-header'
        })
        .append(
          $('<button>', {
            class: 'close'
          })
          .data({
            dismiss:'modal'
          })
          .html('&times;'),
          modalTitle[blocked](user)
        ),
        $('<div>', {
          class: 'modal-body'
        })
        .append(
          modalBody[blocked](user)
        ),
        $('<div>', {
          class: 'modal-footer'
        })
        .append(
          modalFooter[blocked](user)
        )
      )
    )
  )
}

var ajaxBlock = function(userId, callback) {
  $.ajax({
    url: '/ajax/admin/block/' + userId
  }).done(function(result) {
    callback(result)
  })
}

var ajaxUnblock = function(userId, callback) {
  $.ajax({
    url: '/ajax/admin/unblock/' + userId
  }).done(function(result) {
    callback(result)
  })
}

$(document).ready(function() {
  $('.btn-modal-action').on('click', function(e) {
    e.preventDefault()

    var data = $(this).data()
    var userId = ('user' in data) ? data.user : false

    if(userId) {
      $.ajax({
        url: '/ajax/admin/user/' + userId
      }).done(function(result) {
        //Create new modal
        if(result.success) {
          var modal = newModal(result.data)

          $('#main').append( $(modal) )
          $('#modal').modal('show')
          $('#modal').on('hidden.bs.modal', function () {
            $('#modal').remove(); //Remove modal after it closes
          })
        }
      })
    } else {
      console.log('Nope')
    }
  })
})
