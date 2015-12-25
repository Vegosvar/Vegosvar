var addressAutocomplete, cityAutocomplete
var inputAddress, inputCity

function checkCityBounds() {
    var cityEntered = $(inputCity).val()
    if(cityEntered) {
        var geocoder = new google.maps.Geocoder();
        geocoder.geocode({
            country: 'SE',
            address: cityEntered
        }, function(result, status) {
            if(result.length > 0) {
                setAutocompleteAddressBound(result[0].geometry.bounds)
            }
        })
    }

}

function init() {
    inputCity = (document.getElementsByName('city')[0]);
    inputAddress = (document.getElementsByName('street')[0]);
    inputLatitude = (document.getElementsByName('latitude')[0]);
    inputLongitude =  (document.getElementsByName('longitude')[0]);

    checkCityBounds()

    setupAutocomplete()
    addAutocompleteListeners()
}

function setupAutocomplete() {
    var optionsCity = {
        types: ['(cities)'],
        componentRestrictions: {
            country: 'SE'
        }
    }

    var optionsAddress = {
        types: ['address']
    }

    cityAutocomplete = new google.maps.places.Autocomplete(inputCity, optionsCity);
    addressAutocomplete = new google.maps.places.Autocomplete(inputAddress, optionsAddress);
}

function setAutocompleteAddressBound(bounds) {
    addressAutocomplete.setBounds(bounds)
}

function addAutocompleteListeners() {
    cityAutocomplete.addListener('place_changed', function() {
        city = cityAutocomplete.getPlace()
        inputCity.value = city.name

        setAutocompleteAddressBound(city.geometry.viewport)
    })

    addressAutocomplete.addListener('place_changed', function() {
        address = addressAutocomplete.getPlace()

        inputAddress.value = address.name

        inputLatitude.value = address.geometry.location.lat()
        inputLongitude.value = address.geometry.location.lng()
    })
}

$(document).bind('mapready', function(e) {
    init()
})