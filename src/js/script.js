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

$(document).ready(function () {
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

  function setSearchFormState() {
    if ($('.searchForm').val() === '') {
      $('#searchForm-btn-default').html('<i class="glyphicon glyphicon-search"></i>')
      $('#results').hide()
    } else {
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

      var searchTerm = $('.searchForm').val()
      var container = $('#searchResult')

      $.getJSON('/ajax/search/?s=' + searchTerm, function (data) {
        if (data.length > 0 && data[0] !== undefined) {
          if ($('#searchEngine-noResults').css('display') === 'block') {
            $('#searchEngine-noResults').show()
          }

          $('#searchFor')
          .html(
            $('<h2>', {
              id: 'searchFor'
            })
            .append(
              $('<span class="searchIntro">').html('<span class="visible-xs text-muted">Sökresultat</span><span class="hidden-xs">Resultat för</span> '),
              $('<span class="searchTerm hidden-xs">').html(searchTerm)
            )
          )

          $('#searchFilter').show()
          $('#results').show()

          var entryImage = function (entry) {
            var cover = entry.post.cover.filename
            var image = cover !== null && cover.length > 0 ? '/uploads/' + cover + '_thumb.jpg'
              : '/assets/images/placeholder-' + entry.type + '.svg'
            var imageSrc = 'background-image: url(' + image + ')'

            var entryImage = $('<a>', {
              href: entry.url
            })
            .append(
              $('<div>', {
                class: 'image'
              }).attr('style', imageSrc)
            )

            return entryImage
          }

          var entryTitle = function (entry) {
            return $('<a>', {
              href: '/' + entry.url
            })
            .append(
              $('<h3>').text(entry.title)
            )
          }

          var entryDescription = function (entry) {
            var description = $('<p>')
            if (entry.type === '4') {
              veg_type = entry.post.veg_type

              //TODO this info needs to be updated
              var veg_types = {
                vegan: function () {
                  return $('<strong>', {
                    class: 'text-success'
                  })
                  .append(
                    $('<span>', {
                      class: 'fa fa-check-circle'
                    }),
                    $('<span>').html('Veganskt&nbsp;')
                  )
                },
                lacto_ovo: function () {
                  return $('<strong>', {
                    class: 'text-warning'
                  })
                  .append(
                    $('<span>').html('Lakto-Ovo&nbsp;')
                  )
                },
                animal: function () {
                  return $('<strong>', {
                    class: 'text-danger'
                  })
                  .append(
                    $('<span>').html('Animaliskt&nbsp;')
                  )
                }
              }

              if (veg_type in veg_types) {
                $(description).append(
                  veg_types[veg_type]()
                )
              }
            }

            $(description).append(
              $('<span>')
              .html(entry.post.content.substring(0, 115) + '...')
            )

            return description
          }

          var entryRating = function (entry) {
            var rating = (entry.hasOwnProperty('rating') ? (entry.rating.hasOwnProperty('votes_sum') ? entry.rating.votes_sum : false) : false)
            return $('<div>', {
              class: 'stars',
              id: entry._id
            })
            .append(
              $.map(new Array(5), function (item, index) {
                return $('<div>', {
                  class: (rating !== false && index <= rating) ? 'active star' : 'star'
                })
                .append(
                  $('<span>', {
                    class: 'glyphicon glyphicon-star'
                  })
                )
              }),
              $('<span>', {
                class: 'votes'
              })
              .text((rating) ? entry.rating.votes : 0)
            )
          }

          var createEntry = function (entry) {
            return $('<div>', {
              class: 'col-sm-6 col-md-4 col-lg-3',
              id: 'searchResult-' + entry._id
            })
            .append(
              $('<div>', {
                class: 'result'
              })
              .append(
                entryImage(entry),
                $('<div>', {
                  class: 'content'
                })
                .append(
                  $('<div>', {
                    class: 'text-overflow'
                  })
                  .append(
                    entryTitle(entry),
                    entryDescription(entry),
                    entryRating(entry),
                    $('<div>', {
                      class: 'more'
                    })
                    .append(
                      $('<a>', {
                        href: '/' + entry.url,
                        class: 'btn btn-primary'
                      })
                      .html('L&auml;s mer')
                    )
                  )
                )
              )
            )
          }

          var resultContainer = $('<div>', {
            id: 'searchResultsContainer'
          })

          $.each(data, function (i, entry) {
            $(resultContainer).append(
              createEntry(entry)
            )
          })

          $(container).html(resultContainer)

          $('#searchEngine-noResults').hide()
        } else { // No results
          $('#searchFor').html(
            $('<h2>').text('Inga resultat kunde hittas')
          )

          $('#searchFilter').hide()
          $('#results').show()
          $('#searchResultsContainer').html('')
        }

        $('#searchForm-btn-default').html(
          $('<i>', {
            class: 'glyphicon glyphicon-search'
          })
        )
      })
    }
  }
})