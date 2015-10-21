$(window).load(function () {
  /* ON HOLD
    var currentTallest = 0
    var currentRowStart = 0
    var rowDivs = []
    var $el
    var topPosition = 0

    $('.resultContainer').each(function () {
      $el = $(this)
      topPosition = $el.position().top

      if (currentRowStart !== topPosition) {
        // we just came to a new row.  Set all the heights on the completed row
        for (currentDiv = 0 ; currentDiv < rowDivs.length ; currentDiv++) {
          $('.fetchHeight', rowDivs[currentDiv]).height(currentTallest)
          //console.log();
        }

        // set the variables for the new row
        rowDivs.length = []
        currentRowStart = topPosition
        currentTallest = $el.height()
        rowDivs.push($el)
      } else {
        // another div on the current row.  Add it to the list and check if it's taller
        rowDivs.push($el)
        currentTallest = (currentTallest < $el.height()) ? ($el.height()) : (currentTallest)
      }

      // do the last row
      for (var currentDiv = 0; currentDiv < rowDivs.length ; currentDiv++) {
        $('.fetchHeight', rowDivs[currentDiv]).height(currentTallest)
      }
    })
  */

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
    typingTimer = setTimeout(doTrigger, 550)
  })
  $('.searchForm').on('keydown', function () {
    clearTimeout(typingTimer)
  })
  function doTrigger() {
    if ($('.searchForm').val().length > 2) {
      $.get('/ajax/search/?s=' + $('.searchForm').val(), function (data) {
        console.log(data)
      })
    }
  }
})