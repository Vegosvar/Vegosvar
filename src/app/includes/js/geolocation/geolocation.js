(function($) {
  $.fn.geoLocation = function(callback, data) {
    if (callback && typeof(callback) === 'function') {
      var options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0 //Always request the current location
      }

      function success(position) {
        callback({
          success: true,
          position: position.coords
        }, data)
      }

      function error(err) {
        callback({
          success: false,
          error: err
        }, data)
      }

      if ('geolocation' in navigator) { //Verify basic support
        navigator.geolocation.getCurrentPosition(success, error, options);
      } else {
        error({
          success: false,
          error: 'Geopositioning is not supported by the current device'
        }, data)
      }
    } else {
      console.log('No callback function provided')
    }
  }
}(jQuery));