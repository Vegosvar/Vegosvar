(function($) {
    $.fn.geoLocation = function(callback) {
        if (callback && typeof(callback) === 'function') {
            var options = {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0 //Always request the current location
            };

            function success(position) {
                callback({
                    success: true,
                    position: position.coords
                })
            }

            function error(err) {
                callback({
                    success: false,
                    error: err
                })
            };

            if ('geolocation' in navigator) { //Verify basic support
                navigator.geolocation.getCurrentPosition(success, error, options);
            } else {
                error({code: 999, message: 'Geopositioning is not supported by the current device'})
            }
        } else {
            console.log('No callback function provided')
        }
    }
}(jQuery));