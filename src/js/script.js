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
      $.getJSON('/ajax/search/?s=' + $('.searchForm').val(), function (data) {
        $('#searchResult').html('<h2 style="display:none;" id="textReceiver">Sökresultat för <strong>' + $('.searchForm').val() + '</strong></h2>')
        $('#textReceiver').slideDown('fast')
        $('#searchResult').append('<div style="display:none;" id="searchResultsContainer"></div>')
        $('#searchResultsContainer').fadeIn('fast')
        for (var i = 0, result = data; i < result.length; i++) {
          var id = result[i]._id
          var content = '<div class="col-sm-6 col-md-4 col-lg-3" id="searchResult-' + id + '">'
          content += '<div class="result">'
          content += '<div class="image" style="background-image: url(http://holdr.me/image/?w=263&h=148&random=' + id + ')"></div>'
          content += '<div class="content">'
          content += '<a href="/' + result[i].url + '"><h3>' + result[i].title + '</h3></a>'
          content += '<p>' + result[i].post.content + '</p></div>'
          content += '<div class="more">'
          content += '<span class="info">Öppet 17.00 - 19.00</span>'
          content += '<a href="/' + result[i].url + '" class="btn btn-primary">Läs mer</a></div></div></div>'
          $('#searchResultsContainer').append(content)
          $('#searchResult-' + id).fadeIn('fast')
        }
      })
    }
  }
})