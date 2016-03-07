(function ($) {
  var state = {
    instances: [],
    active: null
  }

  //TODO join this function with $.fn.googleMap
  $.fn.googleMapInstances = function(options) {
    var module = {
      map: {
        add: function(element, settings) {
          //Create new map instance
          var map = $(element).googleMap(settings)

          state.instances.push(map)
          if(state.active === null) { //This is the first map, set it as active
            state.active = state.instances.length -1
          }

          module.map.setup()
        },
        setup: function() {
          var activeMap = state.active

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
              module.map.set(activeMap)
              $.fn.vegosvar.map().updateUserLocation()
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
              module.map.set(activeMap)
              $.fn.vegosvar.map().toggleFullscreen()
            })

            $(controlContainer).append(controlFullscreen)
          }

          //Add controls to map
          module.map.current().addControl(controlContainer[0])
        },
        current: function() {
          //Return the current instance
          if(state.active !== null) {
            if(state.instances[state.active] !== 'undefined') {
              return state.instances[state.active]
            }
          }

          return false
        },
        get: function(instance) {
          //Get instance if one is provided, else return all instances
          if(typeof(instance) === 'undefined') {
            return state.instances
          }

          if(state.instances[instance] !== 'undefined') {
            return state.instances[instance]
          } else {
            return false
          }
        },
        set: function(position) {
          //Set the current
          if(state.instances[position] !== 'undefined') {
            state.active = position
          } else {
            return false
          }
        }
      },
      marker: {
        add: function(element) {

        },
        get: function(element) {

        },
        remove: function(element) {

        }
      }
    }

    return module
  }

  $.fn.vegosvar.map = function() {
    var module = {
      getInfowindowContent: function(content) {
        var content = (content.length > 90) ? content.substr(0, 90) + '...' : content
        var result = $('<div>', {
          class: 'infowindow-content'
        })
        .html(content)

        return result
      },
      entryContent: function(entry) {
        return $('<div>')
          .append(
            $('<div>', {
              id: 'infowindow-' + entry._id,
              class: 'infowindow-container'
            })
            .append(
              $('<div>', {
                class: 'infowindow-header'
              })
              .append(
                $('<div>', {
                  class: 'infowindow-image'
                })
                .append(
                  $('<img>', {
                    src: '/uploads/' + entry.post.cover.filename + '.jpg'
                  })
               ),
                $('<div>', {
                  class: 'infowindow-title'
                })
                .append(
                  $('<a>', {
                    href: entry.url
                  })
                  .html(entry.title)
               ),
                $('<div>', {
                  class: 'infowindow-stars-container'
                })
                .append(
                  $('<div>', {
                    class: 'stars'
                  })
                  .append(
                    $.map(new Array(5), function (value, i) {
                      return $('<div>', {
                        class: ('rating' in entry && 'votes_sum' in entry.rating && (i + 1) <= entry.rating.votes_sum) ? 'star-static active' : 'star-static'
                      }).append(
                        $('<span>', {
                          class: 'glyphicon glyphicon-star'
                        })
                     )
                    })
                 )
               )
             ),
             module.getInfowindowContent(entry.post.content)
           )
         )
      },
      applyMarkerData: function(data, options) {
        if (options.hasOwnProperty('data')) {
          if (options.data.filterName === 'single') {
            if (data.length > 0 && data[0].post.hasOwnProperty('coordinates')) {
              var mapInstance = $.fn.googleMapInstances().map.current()

              mapInstance.setCenter({
                lat: parseFloat(data[0].post.coordinates.latitude),
                lng: parseFloat(data[0].post.coordinates.longitude)
              })

              mapInstance.setZoom(15)

              module.setMarkers(data, { infoWindowOpen: true })

              var filter = {
                data: {
                  filter: {
                    ignore: data[0]._id
                  }
                }
              }

              module.getMarkerData(filter, function (data) {
                module.applyMarkerData(data, {})
              })
            } else {
              //console.log('Page is missing map coordinates')
              return false
            }
          }
        }

        module.setMarkers(data, options)
      },
      setMarkers: function(data, settings) {
        var mapInstance = $.fn.googleMapInstances().map.current()

        for (var i = 0; i < data.length; i++) {
          entry = data[i]
          if (typeof(entry.post.coordinates) !== 'undefined') {
            var iconUrl = '/assets/images/'

            switch (entry.type) {
              case '3':
                iconUrl += 'pin-restaurant.png'
                break
              case '5':
                iconUrl += 'pin-store.png'
                break
              case '5':
                iconUrl += 'pin-cafe.png'
                break
              default:
                return false
            }

            var content = module.entryContent(entry)

            var marker = mapInstance.setMarker({
              position: {
                lat: parseFloat(entry.post.coordinates.latitude),
                lng: parseFloat(entry.post.coordinates.longitude)
              },
              title: entry.title,
              content: content.html(),
              icon: {
                url: iconUrl,
                size: new google.maps.Size(32, 32)
              }
            })

            if(settings) {
              if ('infoWindowOpen' in settings && settings.infoWindowOpen === true) {
                //Open the newly added infowindow
                marker.infowindow.open(mapInstance.getMap(), marker)

                //Pan to fit the new infowindow
                google.maps.event.addListenerOnce(marker.infowindow, 'domready', function () {
                  $.fn.vegosvar.map().panToFit()
                })
              }
            }
          }
        }

        if (typeof(settings) !== 'undefined' && settings.hasOwnProperty('cluster')) {
          if (settings.cluster === true) {
            mapInstance.clusterMarkers()
          }
        }
      },
      panToFit: function() {
        var mapInstance = $.fn.googleMapInstances().map.current()

        var projection = mapInstance.getMap().getProjection()

        var bounds = $.fn.googleMap().getBounds()
        var center = bounds.getCenter()

        var latLng = projection.fromLatLngToPoint(center)
        var scale = 1 << mapInstance.getZoom()

        var position = null
        var offset = null

        if ($(window).height() > 640) {
          offset = ((($(window).height() * 256)) / scale)
        } else {
          offset = ((($(window).height() * 256) * 2.5) / scale)
        }

        if(offset) {
          position = $.fn.googleMap().getPoint(
            ((latLng.x * scale)) / scale,
            ((latLng.y * scale) - offset - 100) / scale
          )

          if (position) {
            var newCenter = projection.fromPointToLatLng(position)
            mapInstance.setCenter(newCenter)
            return
          }
        }
      },
      getMapOptions: function(elementId) {
        var options = {}
        var mapData = $(elementId).data()

        //Check if map is configured to auto initialize
        if (mapData.hasOwnProperty('mapInit')) {
          options.init = mapData.mapInit
        }

        if (mapData.hasOwnProperty('mapCluster')) {
          options.cluster = mapData.mapCluster
        }

        if (mapData.hasOwnProperty('mapFilter')) {
          var filters = {
            single: function () {
              return {
                id: $('.content')[0].id //Include this in the map data attributes
              }
            },
            restaurant: function () {
              return {
                type: '3'
              }
            },
            butik: function () {
              return {
                type: '5'
              }
            },
            cafe: function () {
              return {
                type: '6'
              }
            }
          }

          if (mapData.mapFilter in filters) {
            options.data = {
              filter: filters[mapData.mapFilter](),
              filterName: mapData.mapFilter
            }
          }
        }

        if (mapData.hasOwnProperty('markerLatitude')) {
          options.markerLatitude = mapData.markerLatitude
        }

        if (mapData.hasOwnProperty('markerLongitude')) {
          options.markerLongitude = mapData.markerLongitude
        }

        if (mapData.hasOwnProperty('markerTitle')) {
          options.markerTitle = mapData.markerTitle
        }

        return options
      },
      setSingleOpenMarker: function(obj) {
        var mapInstance = $.fn.googleMapInstances().map.current()
        var marker = mapInstance.setMarker({
          position: {
            lat: parseFloat(obj.coordinates.latitude),
            lng: parseFloat(obj.coordinates.longitude)
          },
          content: obj.content
        })

        mapInstance.setZoom(11)

        mapInstance.setCenter({
          lat: parseFloat(obj.coordinates.latitude),
          lng: parseFloat(obj.coordinates.longitude)
        })

        marker.infowindow.open(mapInstance.getMap(), marker)
        google.maps.event.addListenerOnce(marker.infowindow, 'domready', function () {
          $.fn.vegosvar.map().panToFit()
        })
      },
      getMarkerData: function(options, callback) {
        var settings = $.extend({
          url: '/ajax/map'
        }, options)

        $.ajax(settings)
        .done(function (data) {
          callback(data)
        })
      },
      toggleFullscreen: function () {
        var mapInstance = $.fn.googleMapInstances().map.current()
        var mapElement = mapInstance.getElement()
        var element = $(mapElement).parent()

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
      updateUserLocation: function () {
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

            var mapInstance = $.fn.googleMapInstances().map.current()
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
          }
        })
      }
    }

    return module
  }
}(jQuery))

function zoomToUserLocation () {
  $.fn.geoLocation(function (result) {
    if (result.success === true) {
      var position = {
        lat: parseFloat(result.position.latitude),
        lng: parseFloat(result.position.longitude)
      }

      var locationObj = {
        position: position,
        title: 'Din plats',
        content: 'Du är här!',
        icon: '/assets/images/pin-my-position.png',
      }

      var mapInstance = $.fn.googleMapInstances().map.current()
      var markers = mapInstance.getMarkers()
      var setNew = true

      //Loop over all existing markers, if user location marker is found, update it
      $.each(markers, function(i, marker) {
        if('title' in marker) {
          if(marker.title === locationObj.title) {
            setNew = false
            marker.setPosition(position)
            marker.infowindow.open(mapInstance.getMap(), marker)
          }
        }
      })

      if(setNew) {
        var marker = mapInstance.setMarker(locationObj)
        marker.infowindow.open(mapInstance.getMap(), marker)
      }

      mapInstance.setCenter(position)
      mapInstance.setZoom(11)
    } else {
      //TODO display error
    }
  })
}

$(document).bind('mapready', function (e) {
  //Initialize map(s)
  $('.googleMap').each(function(i, map) {
    $.fn.googleMapInstances().map.add(map)
  })

  $('#show-map').on('click', function (e) {
    e.preventDefault()

    $('.filter').addClass('hidden') //Remove overlay filter

    //Get map options
    var options = $.fn.vegosvar.map().getMapOptions('#map')

    //Get marker data
    $.fn.vegosvar.map().getMarkerData(options, function (data) {
      $.fn.vegosvar.map().applyMarkerData(data, options)
    })

    if($(this).hasClass('showFullscreen')) {
      $.fn.vegosvar.map().updateUserLocation()
    }
  })

  if ($('#map').length > 0) {
    var options = $.fn.vegosvar.map().getMapOptions('#map')

    if ('init' in options && options.init === true) {
      if ('markerLatitude' in options && 'markerLongitude' in options) {
        //Map provides its own coordinates
        $.fn.vegosvar.map().setSingleOpenMarker({
          coordinates: {
            latitude: options.markerLatitude,
            longitude: options.markerLongitude
          },
          content: options.markerTitle
        })
      } else {
        $.fn.vegosvar.map().getMarkerData(options, function (data) {
          $.fn.vegosvar.map().applyMarkerData(data, options)
        })
      }
    }
  }
})