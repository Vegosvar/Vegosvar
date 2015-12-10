$(function() {
    function setAddressBound(bounds) {
        addressAutocomplete.setBounds(bounds);
    }
    var addressAutocomplete, cityAutocomplete

    var inputAddress = (document.getElementsByName('street')[0]);
    var inputCity = (document.getElementsByName('city')[0]);

    var optionsCity = {
        types: ['(cities)'],
        componentRestrictions: {
            country: "SE"
        }
    };

    var optionsAddress = {
        types: ['address']
    }

    var cityAutocomplete = new google.maps.places.Autocomplete(inputCity, optionsCity);
    var addressAutocomplete = new google.maps.places.Autocomplete(inputAddress, optionsAddress);

    cityAutocomplete.addListener('place_changed', function() {
        city = cityAutocomplete.getPlace()
        inputCity.value = city.name

        setAddressBound(city.geometry.viewport)
    });

    addressAutocomplete.addListener('place_changed', function() {
        address = addressAutocomplete.getPlace()
        console.log(address)
        inputAddress.value = address.name
    });
})