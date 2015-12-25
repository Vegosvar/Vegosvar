(function($) {
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

$(document).bind('mapready', function(e) {
  //Initialize map
  mapInstance = $('#map').googleMap();

  //Place markers on map
  function setMarkers(data) {
    for (var i = 0; i < data.length; i++) {
      entry = data[i]
      if(typeof(entry.post.coordinates) !== 'undefined') {
        var iconUrl = '/assets/images/'

        switch(entry.type) {
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

        var entryContent = '<div class="infowindow-container">'
        entryContent += '<div class="infowindow-header">'
        entryContent +='<div class="infowindow-title"><a href="' + entry.url + '">' + entry.title + '</a></div>'
        entryContent += '<div class="infowindow-stars-container"><div class="star">5 <span class="glyphicon glyphicon-star"></span></div></div>' //TODO add actual rating
        entryContent += '</div>' // /.infowindow-header
        entryContent += '<div class="infowindow-content">'
        entryContent += (entry.post.content.length > 115) ? entry.post.content.substr(0, 115) + '...' : entry.post.content
        entryContent += '</div>' // /.infowindow-content
        entryContent += '</div>' // /.infowindow-container

        mapInstance.setMarker({
          position: {
            lat: parseFloat(entry.post.coordinates.latitude),
            lng: parseFloat(entry.post.coordinates.longitude)
          },
          title: entry.title,
          content: entryContent,
          icon: {
            url: iconUrl,
            size: new google.maps.Size(32, 32)
          }
        })
      } else {
        console.log(entry.title + ' has no coordinates!')
      }
    }
    mapInstance.clusterMarkers();
  }

  $('#show-map').on('click', function(e) {
    e.preventDefault();

    $('.filter').hide(); //Remove overlay filter
    
    //Get marker data
    $.ajax({
      url: '/ajax/map',
    })
    .done(function(data) {
      setMarkers(data)
    });

    $.fn.geoLocation(function(result) {
      if (result.success === true) {
        console.log(result);
        mapInstance.setMarker({
          position: {
            lat: parseFloat(result.position.latitude),
            lng: parseFloat(result.position.longitude)
          },
          title: entry.title,
          content: 'Du är här!',
          icon: '/assets/images/pin-my-position.png'
        })
        mapInstance.setCenter({
          lat: result.position.latitude,
          lng: result.position.longitude
        })
        mapInstance.setZoom(11)
      } else {
        //TODO display error
      }
    })
  })
})