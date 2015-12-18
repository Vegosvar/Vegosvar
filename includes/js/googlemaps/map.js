(function($) {
  var defaults = {
    element: null,
    center: {
      lat: 59.3293358,
      lng: 18.0686101
    },
    zoom: 4,
    google: {
      map: null,
      markers: []
    },
    autorun: true
  }

  $.fn.googleMap = function(options) {
    var settings = $.extend(defaults, options)

    fn = {
      init: function() {
        try {
          settings.google.map = new google.maps.Map(settings.element, {
            zoom: settings.zoom,
            center: settings.center
          })
          return true
        } catch (err) {
          throw err
        }
      },
      setMarker: function(options) {
        settings.google.markers.push(new google.maps.Marker({
          position: options.position,
          map: settings.google.map,
          title: options.title,
          icon: options.icon
        }))

        var index = settings.google.markers.length -1

        settings.google.markers[index].infowindow = new google.maps.InfoWindow({
          content: options.content,
          maxWidth: 200,
          minWidth: 200
        })

        settings.google.markers[index].addListener('click', function() {
          for (var i = settings.google.markers.length - 1; i >= 0; i--) {
            settings.google.markers[i].infowindow.close();
          };
          settings.google.markers[index].infowindow.open(settings.google.map, settings.google.markers[index]);
        })
      },
      clusterMarkers: function() {
        new MarkerClusterer(settings.google.map, settings.google.markers, {
          minimumClusterSize: 1,
          maxZoom: 9
        });
      },
      setCenter: function(position) {
        try {
          settings.google.map.setCenter(position)
        } catch(err) {
          throw err
        }
      },
      setZoom: function(zoom) {
          try {
              settings.google.map.setZoom( parseInt(zoom) )
          } catch(err) {
              throw err
          }
      },
      getSettings: function() {
        return settings
      }
    }

    if (settings.autorun === true && ($(this).length)) {
      settings.element = $(this)[0]
      fn.init()
    }

    return fn
  }
}(jQuery));