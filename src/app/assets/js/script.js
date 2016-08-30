(function ($) {
  $.fn.vegosvar = {}
}(jQuery))

/* I actually have no idea why this code is in the window.load function,
or anywhere for that matter. //Tobias 2016-08-23
*/
$(window).load(function () {

  $(document).on('change', '.btn-file :file', function () {
    var input = $(this)
    var numFiles = input.get(0).files ? input.get(0).files.length : 1
    var label = input.val().replace(/\\/g, '/').replace(/.*\//, '')

    input.trigger('fileselect', [numFiles, label])
  })
})

$(document).ready(function () {
  if (typeof(FastClick) !== 'undefined') {
    FastClick.attach(document.body) //Attach FastClick
  }

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

  // Searchfilter toggle //
  $('.toggleFilters').on('click', function () {
    $('.toggleFilters').toggleClass('active')
    $('.filters').toggleClass('active')
  })

  // Searchform //

  $('.searchForm').on('keydown', function () {
    $('#heroSearch').addClass('contracted')
    $('html, body').animate({ scrollTop: 0 }, 'fast')
  })

  $('.searchForm').keyup(setSearchFormState).blur(function () {
    if (this.value === '') {
      $('#heroSearch')
        .removeClass('contracted')
        .addClass('transition')
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

  setTimeout(function () {
    var searchParam = window.location.search
    if (searchParam.length > 0) { //Search query is entered in URL
      setSearchFormState()
      doTrigger()
    }
  }, 0)
})

function setSearchFormState() {
  if ($('.searchForm').val() === '') {
    $('#searchForm-btn-default').html(
      $('<i>', {
        class: 'glyphicon glyphicon-search'
      })
    )
    $('#results').hide()
  } else {
    $('#searchForm-btn-default').html(
      $('<img>', {
        alt: 'Laddar...',
        src: '/assets/images/loading.svg',
        class: 'loading'
      })
    )
  }
}

// Get search results
function doTrigger() {
  if ($('.searchForm').length > 0)  {
    if ($('.searchForm').val().length > 2) {
      var searchTerm = $('.searchForm').val()
      $.fn.vegosvar.search.query(searchTerm)
    }
  }
}

function mapReady () {
  $(document).ready(function () {
    $(document).trigger('mapready')
  })
}
