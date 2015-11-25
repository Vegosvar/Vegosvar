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
  if ($('#srch-term').length > 0 && $('#srch-term').val() === '') {
    setSearchFormState()
    doTrigger()
  }

  // Open links in-app instead of new window //
  $('.open-in-app a').click(function (event) {
    event.preventDefault()
    if ($(this).attr('href') !== undefined) {
      window.location = $(this).attr('href')
    }
  })

  // Menu toggle //
  $('.toggle-dropdown').on('click', function () {
    var parent = $(this).parent() // Select parent of clicked element
    if (parent.hasClass('active')) {
      parent.removeClass('active')
    } else {
      $('li.active').removeClass('active') // Reset active class
      parent.addClass('active') // Set class 'active' to parent's child
    }
  })

  // Searchform //
  $('.searchForm').keyup(setSearchFormState).blur(function () {
    if (this.value === '') {
      $('#heroSearch')
        .removeClass('contracted')
        .addClass('transition')
    }
  })

  function setSearchFormState() {
    if ($('.searchForm').val() === '') {
      $('#searchForm-btn-default').html('<i class="glyphicon glyphicon-search"></i>')
      $('#results').hide()
    } else {
      $('#heroSearch').addClass('contracted')
      $('html, body').animate({ scrollTop: 0 }, 'fast')
      $('#searchForm-btn-default').html('<img src="/assets/images/loading.svg" class="loading">')
    }
  }

  var typingTimer
  $('.searchForm').on('keyup', function () {
    clearTimeout(typingTimer)
    typingTimer = setTimeout(doTrigger, 150)
  })

  $('.searchForm').on('keydown', function () {
    clearTimeout(typingTimer)
  })

  setTimeout(function () {
    var searchParam = window.location.search
    if (searchParam.length > 0) { //Search query is entered in URL
      setSearchFormState()
      doTrigger()
    }
  }, 0)

  // Search results //
  function doTrigger() {
    if ($('.searchForm').val().length > 2) {
      $('#searchResultsContainer').html('')
      $.getJSON('/ajax/search/?s=' + $('.searchForm').val(), function (data) {
        if (data[0] !== undefined) {
          if ($('#searchEngine-noResults').css('display') === 'block') {
            $('#searchEngine-noResults').show()
          }
          $('#searchFor').html('<h2 id="searchFor">Resultat för <strong>' + $('.searchForm').val() + '</strong></h2>')
          $('#results').show()
          $('#searchResult').append('<div id="searchResultsContainer"></div>')

          $('#searchResultsContainer').show('fast')

          for (var i = 0, result = data; i < result.length; i++) {
            var id = result[i]._id
            var content = '<div class="col-sm-6 col-md-4 col-lg-3" id="searchResult-' + id + '">'
            content += '<div class="result">'
            content += '<a href="/' + result[i].url + '"><div class="image" style="background-image: url('
            content += (result[i].post.cover.filename !== null) ? '/uploads/' + result[i].post.cover.filename + '_thumb.jpg' : 'assets/images/placeholder-' + result[i].type + '.svg'
            content += ')"></div></a>'
            content += '<div class="content"><div class="text-overflow">'
            content += '<a href="/' + result[i].url + '"><h3>' + result[i].title + '</h3></a>'
            content += '<p>' + result[i].post.content.substring(0, 115) + '...</p></div></div>'
            content += '<div class="more">'
            content += '<a href="/' + result[i].url + '" class="btn btn-primary">Läs mer</a></div></div></div>'
            $('#searchResultsContainer').append(content)
            $('#searchResult-' + id).show()
            $('#searchForm-btn-default').html('<i class="glyphicon glyphicon-search"></i>')
            $('#searchEngine-noResults').hide()
          }
        } else { // No results
          $('#searchForm-btn-default').html('<i class="glyphicon glyphicon-search"></i>')
          $('#searchEngine-noResults').show()
          $('#results').show()
          $('#searchFor').html('')
          $('#searchResultsContainer').show()
        }
      })
    }
  }
})