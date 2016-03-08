(function ($) {
  $.fn.vegosvar.search = {
    settings: {
      query: null,
      results: [],
      map: {
        initialized: false,
        element: '#mapResults',
        instance: null
      }
    },
    query: function (searchTerm) {
      $.fn.vegosvar.search.settings.query = searchTerm

      $.ajax({
        url: '/ajax/search',
        data: {
          s: searchTerm
        }
      })
      .done(function (data, error) {
        $.fn.vegosvar.search.settings.results = data
      })
      .always(function () {
        $('#searchForm-btn-default').html(
          $('<i>', {
            class: 'glyphicon glyphicon-search'
          })
        )
        $.fn.vegosvar.search.validate()
      })
    },
    validate: function () {
      var results = $.fn.vegosvar.search.settings.results
      if (results.length > 0) {
        $('#searchFor')
        .html(
          $('<h2>', {
            id: 'searchFor'
          })
          .append(
            $('<span>', {
              class: 'searchIntro'
            })
            .append(
              $('<span>', {
                class: 'visible-xs text-muted'
              })
              .html('S&ouml;kresultat'),
              $('<span>', {
                class: 'hidden-xs'
              })
              .html('Resultat f&ouml;r')
            ),
            $('<span>', {
              class: 'searchTerm hidden-xs'
            })
            .html('&nbsp;' + $.fn.vegosvar.search.settings.query)
          )
        )

        $('#searchFilter').show()
        $('#results').show()
        $('#searchFilter').remove()

        $.fn.vegosvar.search.process()
      } else {
        $('#searchFor').html(
          $('<h2>').text('Inga resultat kunde hittas')
        )

        $('#searchFilter').hide()
        $('#results').show()
        $('#searchResultsContainer').html('')
        $('.searchMapContainer').hide()
        $('.showSearchMap').hide()
        $('.showSearchMapText').html('Se karta')
      }
    },
    process: function () {
      var results = $.fn.vegosvar.search.settings.results

      var resultContainer = $('<div>', {
        id: 'searchResultsContainer'
      })

      $.each(results, function (i, entry) {
        $.fn.vegosvar.search.filter.add(entry)

        $(resultContainer).append(
          $.fn.vegosvar.search.results.create(entry)
        )
      })

      $('#searchResult').html(resultContainer)

      $('.showSearchMap').unbind('click') //Unbind any previously bound listeners
      $('.showSearchMap').bind('click', function () {
        $.fn.vegosvar.search.map.toggleVisibilty()

        $.fn.vegosvar.search.map.init()
        $.fn.vegosvar.search.map.update()
      })

      $.fn.vegosvar.search.filter.init()
      if ($.fn.vegosvar.search.map.visible()) {
        $.fn.vegosvar.search.map.update()
      }
    },
    filter: {
      add: function (entry) {
        var typeNames = {
          '1': 'Fakta',
          '2': 'Recept',
          '3': 'Restauranger',
          '4': 'Produkter',
          '5': 'Butiker',
          '6': 'Caféer'
        }

        if ($('#searchFilter').index() === -1) {
          $('#results').children('.container').prepend(
            $('<div>', {
              id: 'searchFilter'
            })
            .append(
              $('<select>', {
                class: 'filterSelect',
                multiple: 'multiple'
              })
              .append(
                $.map(typeNames, function (type, key) {
                  return $('<option>', {
                      disabled: 'disabled' //Set all disabled initially
                    })
                    .val(key)
                    .text(type)
                })
              )
            )
          )
        }

        //Enable current entry type
        $('.filterSelect option[value="' + entry.type + '"]').prop('disabled', false)
      },
      init: function () {
        if ($('.filterSelect').index() !== -1) { //Filter exists
          $('.filterSelect').multiselect('destroy')
          $('.filterSelect').multiselect({
            nonSelectedText: 'Filter',
            inheritClass: true,
            onChange: function (element, checked) {
              var values = []

              //Get selected options
              $(element).parent().find('option:selected').each(function (i, item) {
                values.push(item.value)
              })

              if (values.length > 0) {
                $('.entryResult.showResult').removeClass('showResult') //Remove show class from each entryResult

                $.each(values, function (i, value) {
                  $('.entryResult[data-type="' + value + '"]').each(function () {
                    $(this).addClass('showResult') //Add show class to each result matching filter
                  })
                })

                $('.entryResult.showResult').hide().fadeIn() //Show results matching filter
                $('.entryResult').not('.showResult').hide() //Hide results not matching filter

                var entryIds = []
                $('.entryResult:visible').each(function (i, entry) {
                  var entryId = $(this).data('id')
                  entryIds.push(entryId)
                })

                var filteredResult = []
                $.each($.fn.vegosvar.search.settings.results, function (i, result) {
                  if ($.inArray(result._id, entryIds) >= 0) {
                    filteredResult.push(result)
                  }
                })

                $.fn.vegosvar.search.map.update(filteredResult)
              } else {
                //Show all
                $('.entryResult').fadeIn()
                $.fn.vegosvar.search.map.update()
              }
            }
          })
        }
      }
    },
    map: {
      query: function (entryIds, callback) {
        var settings = {
          url: '/ajax/map',
          data: {
            filter: {
              ids: entryIds
            }
          }
        }

        $.ajax(settings)
        .done(function (data) {
          callback(data)
        })
      },
      init: function () {
        var initialized = $.fn.vegosvar.search.settings.map.initialized
        if (!initialized) {
          $.fn.vegosvar.search.settings.map.instance = $($.fn.vegosvar.search.settings.map.element).googleMap()
          $.fn.vegosvar.search.map.setup()
        }
      },
      setup: function () {
        if ($.fn.vegosvar.search.map.get() && !$.fn.vegosvar.search.settings.map.initialized) {
          //Create map controls
          var controlContainer = $('<div>', {
            class: 'toolbar'
          })

          if (navigator.geolocation) {
            var controlUserLocation = $('<div>', {
              class: 'btn showMyLocation'
            })
            .append(
              $('<span>', {
                class: 'fa fa-location-arrow'
              }),
              $('<span>')
              .text('Min position')
            )
            .on('click', function () {
              var buttonIcon = $(this).find('span.fa')
              buttonIcon.removeClass('fa-location-arrow').addClass('fa-spinner fa-pulse')

              $.fn.vegosvar.search.map.updateUserLocation(function () {
                buttonIcon.removeClass('fa-spinner fa-pulse').addClass('fa-location-arrow')
              })
            })

            $(controlContainer).append(controlUserLocation)
          }

          if (fullscreenSupported()) {
            var controlFullscreen = $('<div>', {
              class: 'btn showFullscreen'
            })
            .append(
              $('<span>', {
                class: 'glyphicon glyphicon-fullscreen'
              })
            )
            .on('click', function () {
              $.fn.vegosvar.search.map.toggleFullscreen()
            })

            $(controlContainer).append(controlFullscreen)
          }

          //Add controls to map
          $.fn.vegosvar.search.settings.map.instance.addControl(controlContainer[0])
          $.fn.vegosvar.search.settings.map.initialized = true
        }
      },
      get: function () {
        //Return map instance here or false if none exists
        var instance = $.fn.vegosvar.search.settings.map.instance
        if (instance) {
          return instance
        } else {
          return false
        }
      },
      update: function (results) {
        if ($.fn.vegosvar.search.settings.map.initialized) {
          if (typeof(results) === 'undefined') {
            results = $.fn.vegosvar.search.settings.results
          }

          var entryIds = [] //Array to hold all the posts ids

          $.each(results, function (i, entry) {
            if (entry.type === '6' || entry.type === '5' || entry.type === '3') {
              //Check if any of the results can be placed on a map
              entryIds.push(entry._id)
            }
          })

          if (entryIds.length > 0) {
            $.fn.vegosvar.search.map.markers.remove() //Remove all markers before adding new ones

            $.fn.vegosvar.search.map.query(entryIds, function (data) {
              $.fn.vegosvar.search.map.markers.add(data)
            })
          } else {
            $.fn.vegosvar.search.map.hide()
          }
        } else {
          return false
        }
      },
      show: function () {
        $('.showSearchMapText').html('D&ouml;lj karta')
        $('.searchMapContainer').fadeIn()
      },
      hide: function () {
        $('.showSearchMapText').html('Se karta')
        $('.searchMapContainer').fadeOut()
      },
      toggleVisibilty: function () {
        if ($.fn.vegosvar.search.map.visible()) {
          $.fn.vegosvar.search.map.hide()
        } else {
          $.fn.vegosvar.search.map.show()
        }
      },
      toggleFullscreen: function () {
        var element = $($.fn.vegosvar.search.settings.map.element).parent()

        if (isFullscreen()) {
          exitFullscreen()
          $(element).css({
            margin: '',
            width: '',
            height: '',
            position: '',
            top: ''
          })
          return
        }

        var mapInstance = $.fn.vegosvar.search.settings.map.instance
        var center = mapInstance.getCenter()

        enterFullscreen(element[0])

        $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange', function (e) {
          if (isFullscreen()) {
            $(element).css({
              margin: '0',
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: '0'
            })
          } else {
            $(element).css({
              margin: '',
              width: '',
              height: '',
              position: '',
              top: ''
            })
          }

          mapInstance.triggerResize()
          mapInstance.setCenter(center)
        })
      },
      updateUserLocation: function (callback) {
        var userMarker = {
          title: 'Din plats',
          content: 'Du är här!',
          icon: '/assets/images/pin-my-position.png',
        }

        $.fn.geoLocation(function (result) {
          if (result.success === true) {
            userMarker.position = {
              lat: parseFloat(result.position.latitude),
              lng: parseFloat(result.position.longitude)
            }

            var mapInstance = $.fn.vegosvar.search.settings.map.instance
            var markers = mapInstance.getMarkers()

            var setNew = true

            //Loop over all existing markers, if user location marker is found, update it
            $.each(markers, function (i, marker) {
              if ('title' in marker) {
                if (marker.title === userMarker.title) { //This is bad and I know it's bad, deal with it
                  setNew = false

                  marker.setPosition(userMarker.position)
                  marker.infowindow.open(mapInstance.getMap(), marker)
                }
              }
            })

            if (setNew) {
              var marker = mapInstance.setMarker(userMarker)
              marker.infowindow.open(mapInstance.getMap(), marker)
            }

            mapInstance.setCenter(userMarker.position)
            mapInstance.setZoom(11)

            if (typeof(callback) === 'function') {
              callback()
            }
          }
        })
      },
      visible: function () {
        return $($.fn.vegosvar.search.settings.map.element).is(':visible')
      },
      markers: {
        remove: function () {
          var mapInstance = $.fn.vegosvar.search.map.get()
          mapInstance.removeMarkers()
        },
        add: function (entries) {
          //Set all entries to map
          $.fn.vegosvar.search.map.markers.set(entries, function () {
            //Recalculate bounds after adding markers
            var mapInstance = $.fn.vegosvar.search.map.get()
            var bounds = mapInstance.getLatLngBounds()
            var markers = mapInstance.getMarkers()

            if (markers.length > 0) {
              $.each(markers, function (i, marker) {
                var position = marker.getPosition()
                if (!bounds.contains(position)) {
                  bounds.extend(position)
                }
              })

              //Prevent map to zoom in too much
              mapInstance.getMap().setOptions({
                maxZoom: 15
              })

              mapInstance.setBounds(bounds)

              //Set max zoom available again
              mapInstance.getMap().setOptions({
                maxZoom: 20
              })
            }
          })
        },
        set: function (entries, callback) {
          var mapInstance = $.fn.vegosvar.search.map.get()
          $.each(entries, function (i, entry) {
            if ('post' in entry) {
              if ('coordinates' in entry.post && typeof(entry.post.coordinates) !== 'undefined') {
                var iconUrl = '/assets/images/'

                switch (entry.type) {
                  case '3':
                    iconUrl += 'pin-restaurant.png'
                    break
                  case '5':
                    iconUrl += 'pin-store.png'
                    break
                  case '6':
                    iconUrl += 'pin-cafe.png'
                    break
                  default:
                    return false
                }

                var content = $.fn.vegosvar.map().entryContent(entry)

                mapInstance.setMarker({
                  position: {
                    lat: parseFloat(entry.post.coordinates.latitude),
                    lng: parseFloat(entry.post.coordinates.longitude)
                  },
                  title: entry.title,
                  content: content.html(),
                  icon: {
                    url: iconUrl,
                    size: mapInstance.getSize(32, 32)
                  }
                })
              }
            }
          })

          callback()
        }
      }
    },
    results: {
      image: function (entry) {
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
      },
      title: function (entry) {
        return $('<a>', {
          href: '/' + entry.url
        })
        .append(
          $('<h3>').text(entry.title)
        )
      },
      description: function (entry) {
        var description = $('<p>')

        if (entry.type === '4') {
          var veg_type = entry.post.veg_type

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
                $('<span>').html(' Veganskt&nbsp;')
              )
            },
            lacto_ovo: function () {
              return $('<strong>', {
                class: 'text-warning'
              })
              .append(
                $('<span>').html(' Lakto-Ovo&nbsp;')
              )
            },
            animal: function () {
              return $('<strong>', {
                class: 'text-danger'
              })
              .append(
                $('<span>').html(' Animaliskt&nbsp;')
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
      },
      rating: function (entry) {
        var rating = (entry.hasOwnProperty('rating') ? (entry.rating.hasOwnProperty('votes_sum') ? entry.rating.votes_sum : false) : false)
        return $('<div>', {
          class: 'stars'
        })
        .append(
          $.map(new Array(5), function (item, index) {
            return $('<div>', {
              class: (rating !== false && index <= rating && rating > 0) ? 'active star-static' : 'star-static'
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
      },
      likes: function (entry) {
        var likes = (entry.hasOwnProperty('rating')) ? (entry.rating.hasOwnProperty('likes') ? entry.rating.likes : false) : false

        if (likes) {
          return $('<div>', {
            class: 'likes xs'
          })
          .append(
            $('<div>', {
              class: 'hint'
            })
            .append(
              $('<a>', {
                href: '/logga-in'
              })
              .text('Logga in'),
              $('<span>')
              .html('&nbsp;p&aring; Vegosvar f&ouml;r att gilla')
            ),
            $('<span>', {
              class: 'like add-like'
            })
            .attr('data-id', entry._id)
            .append(
              $('<span>', {
                id: 'heart-glyphicon',
                class: 'glyphicon glyphicon-heart'
              }),
              $('<span>', {
                class: 'count'
              })
              .html('&nbsp;' + likes)
            )
          )
        }
      },
      create: function (entry) {
        return $('<div>', {
          class: 'col-sm-6 col-md-4 col-lg-3 entryResult',
          id: 'searchResult-' + entry._id
        })
        .attr({
          'data-id':  entry._id,
          'data-type': entry.type
        })
        .append(
          $('<div>', {
            class: 'result'
          })
          .append(
            $.fn.vegosvar.search.results.image(entry),
            $.fn.vegosvar.search.results.likes(entry),
            $('<div>', {
              class: 'content'
            })
            .append(
              $('<div>', {
                class: 'text-overflow'
              })
              .append(
                $.fn.vegosvar.search.results.title(entry),
                $.fn.vegosvar.search.results.description(entry),
                $.fn.vegosvar.search.results.rating(entry),
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
    }
  }
}(jQuery))