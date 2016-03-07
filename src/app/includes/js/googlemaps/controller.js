(function ($) {
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
        var marker = new google.maps.Marker({
          position: options.position,
          map: settings.google.map,
          title: options.title,
          icon: options.icon
        })

        settings.google.markers.push(marker)

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

        return marker
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
      getPoint: function(x, y) {
        return new google.maps.Point(x, y)
      },
      getOverlay: function () {
        return settings.google.overlay
      },
      getSize: function(width, height) {
        return new google.maps.Size(width, height)
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
      },
      addControl: function(control) {
        try {
          settings.google.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(control)
        } catch (err) {
          throw err
        }
      }
    }

    if (settings.autorun === true && ($(this).length)) {
      settings.element = $(this)[0]
      fn.init()
    }

    return fn
  }
}(jQuery))