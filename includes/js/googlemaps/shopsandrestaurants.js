$(function() {
  //Initialize map
  var mapInstance = $('.google-map').googleMap()

  //Get marker data
  $.ajax({
    url: '/ajax/map',
  })
  .done(function(data) {
    setMarkers(data)
  })

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

        console.log(iconUrl)

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

  $('#position').on('click', function() {
    $.fn.geoLocation(function(result) {
      if (result.success === true) {
        mapInstance.setMarker({
          position: {
            lat: parseFloat(entry.post.coordinates.latitude),
            lng: parseFloat(entry.post.coordinates.longitude)
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