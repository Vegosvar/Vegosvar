$(window).load(function () {

  $(document).on('change', '.btn-file :file', function () {
    var input = $(this)
    var numFiles = input.get(0).files ? input.get(0).files.length : 1
    var label = input.val().replace(/\\/g, '/').replace(/.*\//, '')

    input.trigger('fileselect', [numFiles, label])
  })

  $(document).ready(function () {
    $('.btn-file :file').on('fileselect', function (event, numFiles, label) {
      //console.log(numFiles)
      //console.log(label)
    })
  })
  $('[data-toggle="tooltip"]').tooltip()
})

$(function () {
  $('.searchForm').keyup(function () {
    if ($('.searchForm').val() === '') {
      if ($('#heroSearch').hasClass('contracted')) {
        $('#heroSearch').removeClass('contracted')
      }
    } else {
      $('#heroSearch').addClass('contracted')
      $('html, body').animate({ scrollTop: 0 }, 'fast')
    }
  })

  var typingTimer
  $('.searchForm').on('keyup', function () {
    clearTimeout(typingTimer)
    typingTimer = setTimeout(doTrigger, 150)
  })
  $('.searchForm').on('keydown', function () {
    clearTimeout(typingTimer)
  })
  function doTrigger() {
    if ($('.searchForm').val().length > 2) {
      $.get('/ajax/search/?s=' + $('.searchForm').val(), function (data) {
        console.log(data)

        $('#textReceiver').html('Sökresultat för <strong>' + data + '</strong>')
      })
    }
  }
})