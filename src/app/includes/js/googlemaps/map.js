(function ($) {
  var mapInstance
  var defaults = {
    element: null,
    center: {
      lat: 59.3293358,
      lng: 18.0686101
    },
    zoom: 4,
    google: {
      map: null,
      markers: [],
      overlay: null,
      cluster: null
    },
    autorun: true
  }

  $.fn.googleMap = function (options) {
    var settings = $.extend(defaults, options)

    google.maps.InfoWindow.prototype.isOpen = function () {
      var map = this.map
      return (map !== null && typeof map !== "undefined")
    }

    fn = {
      init: function () {
        try {
          settings.google.map = new google.maps.Map(settings.element, {
            zoom: settings.zoom,
            center: settings.center
          })

          settings.google.overlay = new google.maps.OverlayView()
          settings.google.overlay.draw = function () {}
          settings.google.overlay.setMap(settings.google.map)

          return true
        } catch (err) {
          throw err
        }
      },
      setMarker: function (options) {
        settings.google.markers.push(new google.maps.Marker({
          position: options.position,
          map: settings.google.map,
          title: options.title,
          icon: options.icon
        }))

        var index = settings.google.markers.length - 1

        settings.google.markers[index].infowindow = new google.maps.InfoWindow({
          content: options.content,
          maxWidth: 200,
          minWidth: 200
        })

        settings.google.markers[index].addListener('click', function () {
          if (settings.google.markers[index].infowindow.isOpen()) {
            settings.google.markers[index].infowindow.close()
          } else {
            for (var i = settings.google.markers.length - 1; i >= 0; i--) {
              settings.google.markers[i].infowindow.close()
            }
            settings.google.markers[index].infowindow.open(settings.google.map, settings.google.markers[index])
          }
        })
      },
      clusterMarkers: function () {
        settings.google.cluster = new MarkerClusterer(settings.google.map, settings.google.markers, {
          minimumClusterSize: 2,
          maxZoom: 13,
          gridSize: 20,
          styles: [
            {
              textColor: 'white',
              url: '/assets/images/map/cluster.png',
              height: 28,
              width: 31
            },
          ]
        })
      },
      setCenter: function (position) {
        try {
          settings.google.map.setCenter(position)
        } catch (err) {
          throw err
        }
      },
      setZoom: function (zoom) {
        try {
          settings.google.map.setZoom(parseInt(zoom))
        } catch (err) {
          throw err
        }
      },
      setBounds: function (bounds) {
        try {
          settings.google.map.fitBounds(bounds)
        } catch (err) {
          throw err
        }
      },
      getSettings: function () {
        return settings
      },
      getBounds: function () {
        return settings.google.map.getBounds()
      },
      getCenter: function () {
        return settings.google.map.getCenter()
      },
      getMap: function () {
        return settings.google.map
      },
      getMarkers: function () {
        return settings.google.markers
      },
      getOverlay: function () {
        return settings.google.overlay
      },
      getZoom: function () {
        return settings.google.map.getZoom()
      },
      getLatLng: function (obj) {
        return new google.maps.LatLng(obj)
      },
      getLatLngBounds: function (obj) {
        return new google.maps.LatLngBounds(obj)
      },
      panBy: function (point) {
        try {
          settings.google.map.panBy(point)
        } catch (err) {
          throw err
        }
      },
      panTo: function (latLng) {
        try {
          settings.google.map.panTo(latLng)
        } catch (err) {
          throw err
        }
      },
      panToBounds: function (bounds) {
        try {
          settings.google.map.panToBounds(bounds)
        } catch (err) {
          throw err
        }
      },
      triggerResize: function () {
        google.maps.event.trigger(settings.google.map, 'resize')
      },
      removeMarkers: function () {
        settings.google.markers = settings.google.markers.filter(function (marker) {
          marker.setMap(null)
        })
      }
    }

    if (settings.autorun === true && ($(this).length)) {
      settings.element = $(this)[0]
      fn.init()
    }

    return fn
  }
}(jQuery))

//Place markers on map
function setMarkers(data, settings) {
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
        default:
          iconUrl = false //use default google marker
          break
      }

      var infoWindowContent = function (entry) {
        var content = (entry.post.content.length > 90) ? entry.post.content.substr(0, 90) + '...' : entry.post.content
        return $('<div>', {
          class: 'infowindow-content'
        })
        .html(content)
      }

      var entryContent = $('<div>')
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
                    class: ('rating' in entry && 'votes_sum' in entry.rating && (i + 1) <= entry.rating.votes_sum) ? 'star active' : 'star'
                  }).append(
                    $('<span>', {
                      class: 'glyphicon glyphicon-star'
                    })
                 )
                })
             )
           )
         ),
          infoWindowContent(entry)
       )
     )

      mapInstance.setMarker({
        position: {
          lat: parseFloat(entry.post.coordinates.latitude),
          lng: parseFloat(entry.post.coordinates.longitude)
        },
        title: entry.title,
        content: entryContent.html(),
        icon: {
          url: iconUrl,
          size: new google.maps.Size(32, 32)
        }
      })

      if ('infoWindowOpen' in settings && settings.infoWindowOpen === true) {
        //Open the newly added infowindow by default
        var mapSettings = mapInstance.getSettings()
        var markers = mapSettings.google.markers

        if ($('.filter:visible').length <= 0) {
          ///show open infowindow only if filter is not visible
          var marker = markers[markers.length - 1]
          marker.infowindow.open(mapInstance.getMap(), marker)
          google.maps.event.addListenerOnce(marker.infowindow, 'domready', function () {
            panToFit()
          })
        }
      }
    } else {
      console.log(entry.title + ' has no coordinates!')
    }
  }
  if (typeof(settings) !== 'undefined' && settings.hasOwnProperty('cluster')) {
    if (settings.cluster === true) {
      mapInstance.clusterMarkers()
    }
  }
}

function panToFit() {
  var projection = mapInstance.getMap().getProjection()

  var bounds = mapInstance.getBounds()
  var center = bounds.getCenter()

  var latLng = projection.fromLatLngToPoint(center)
  var scale = 1 << mapInstance.getZoom()

  var position = null

  if ($(window).height() > 640) {
    var offset = ((($(window).height() * 256)) / scale)

    position = new google.maps.Point(
      ((latLng.x * scale) - 1) / scale,
      ((latLng.y * scale) - offset) / scale
   )
  } else {
    var offset = ((($(window).height() * 256) * 2.5) / scale)

    position = new google.maps.Point(
      ((latLng.x * scale) + 15) / scale,
      ((latLng.y * scale) - offset) / scale
   )
  }

  if (position) {
    var newCenter = projection.fromPointToLatLng(position)
    mapInstance.setCenter(newCenter)
  }
}

function zoomToUserLocation () {
  $.fn.geoLocation(function (result) {
    if (result.success === true) {
      mapInstance.setMarker({
        position: {
          lat: parseFloat(result.position.latitude),
          lng: parseFloat(result.position.longitude)
        },
        title: 'Din plats',
        content: 'Du är här!',
        icon: '/assets/images/pin-my-position.png',
      })
      mapInstance.setCenter({
        lat: parseFloat(result.position.latitude),
        lng: parseFloat(result.position.longitude)
      })
      mapInstance.setZoom(11)
      openLastMarkerInfowindow()
    } else {
      //TODO display error
    }
  })
}

function getMarkerData(options, callback) {
  var settings = $.extend({
    url: '/ajax/map'
  }, options)

  $.ajax(settings)
  .done(function (data) {
    callback(data)
  })
}

function getMapOptions(element) {
  var options = {}
  var mapData = $('#map').data()

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
          id: $('.content')[0].id
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
}

function applyMarkerData(data, options) {
  if (options.hasOwnProperty('data')) {
    if (options.data.filterName === 'single') {
      if (data.length > 0 && data[0].post.hasOwnProperty('coordinates')) {
        mapInstance.setCenter({
          lat: parseFloat(data[0].post.coordinates.latitude),
          lng: parseFloat(data[0].post.coordinates.longitude)
        })

        mapInstance.setZoom(11)

        setMarkers(data, { infoWindowOpen: true })

        getMarkerData({}, function (data) {
          applyMarkerData(data, {})
        })
      } else {
        console.log('Page is missing map coordinates')
        return
      }
    }
  }

  setMarkers(data, options)
}

function openLastMarkerInfowindow() {
  settings = mapInstance.getSettings()
  marker = settings.google.markers[settings.google.markers.length - 1]
  marker.infowindow.open(mapInstance.getMap(), marker)
}

function setSingleOpenMarker (obj) {
  mapInstance.setMarker({
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

  openLastMarkerInfowindow()
}

function fullscreenSupported () {
  return (document.fullscreenEnabled ||
    document.webkitFullscreenEnabled ||
    document.mozFullScreenEnabled ||
    document.msFullscreenEnabled
 )
}

function isFullscreen () {
  return (document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement) ? true : false
}

function enterFullscreen (element) {
  if (element.requestFullscreen) {
    element.requestFullscreen()
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen()
  } else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen()
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen()
  }
}

function exitFullscreen () {
  if (document.exitFullscreen) {
    document.exitFullscreen()
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen()
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen()
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen()
  }
}

$(document).bind('mapready', function (e) {
  //Initialize map
  mapInstance = $('#map').googleMap()

  $('#show-map').on('click', function (e) {
    e.preventDefault()

    $('.filter').addClass('hidden') //Remove overlay filter

    //Get map options
    var options = getMapOptions()

    //Get marker data
    getMarkerData(options, function (data) {
      applyMarkerData(data, options)
    })
  })

  $('.showMyLocation').on('click', function (e) {
    e.preventDefault()
    zoomToUserLocation()
  })

  $('.showFullscreen').on('click', function (e) {
    e.preventDefault()
    if (fullscreenSupported()) {
      var element = document.getElementById('mapContainer')

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

      var data = $('#map').data()
      data.center = mapInstance.getCenter()

      enterFullscreen(element)

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
        mapInstance.setCenter(data.center)
      })
    } else {
      console.log('no fullscreen support')
      //TODO notify user
    }
  })

  if ($('#map').length > 0) {
    var options = getMapOptions()

    if ('init' in options && options.init === true) {
      if ('markerLatitude' in options && 'markerLongitude' in options) {
        //Map provides it's own coordinates
        setSingleOpenMarker({
          coordinates: {
            latitude: options.markerLatitude,
            longitude: options.markerLongitude
          },
          content: options.markerTitle
        })
      } else {
        getMarkerData(options, function (data) {
          applyMarkerData(data, options)
        })
      }
    }
  }
})
