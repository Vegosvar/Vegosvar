var autocompleteService;

var requestCity = {
    types: ['(cities)'],
    componentRestrictions: {
        country: 'SE'
    }
}

var requestAddress = {
    types: ['address']
}

function setupAutocomplete() {
    $('input[name="city"]').autocomplete({
        source: function (request, response) {
            requestCity.input = request.term;

            return getAutocompletePredictions(requestCity, response);
        },
        select: function (event, ui) {
            if('object' in ui.item) {
                var city = ui.item.object.terms[0]['value'];
                ui.item.value = city;
                limitAddressBounds(city);
            } else {
                ui.item.value = ""
            }
        }
    });

    $('input[name="street"]').autocomplete({
        source: function (request, response) {
            requestAddress.input = request.term;
            return getAutocompletePredictions(requestAddress, response);
        },
        select: function (event, ui) {
            if('object' in ui.item) {
                var geoObj = ui.item.object

                var street = ui.item.object.terms[0]['value'];
                if(geoObj.terms.length > 3) { //A street number was supplied as well
                    ui.item.value = street + ' ' + ui.item.object.terms[1]['value']
                } else {
                    ui.item.value = street
                }
            } else {
                ui.item.value = ""
            }
        }
    });
}

function getAutocompletePredictions(request, response) {
    autocompleteService.getPlacePredictions(request, function (predictions, status) {
        if (status != google.maps.places.PlacesServiceStatus.OK) {
            response([{
                label: 'Inga resultat hittades',
                value: 'Inga resultat hittades'
            }])

            return false;
        }

        response($.map(predictions, function (prediction, i) {
            return {
                object: prediction,
                label: prediction.description,
                value: prediction.description
            }
        }));
    });
}

function limitAddressBounds(city) {
    var geocoder = new google.maps.Geocoder();
    
    geocoder.geocode({
        country: 'SE',
        address: city
    }, function(result, status) {
        if(result.length > 0) {
            if('geometry' in result[0]) {
                var geometry = result[0].geometry;
                if('bounds' in geometry) {
                    requestAddress.bounds = geometry.bounds //Large areas such as cities
                } else {
                    requestAddress.bounds = geometry.viewport //Small areas such as villages
                }
            }
        }
    })
}

$(document).bind('mapready', function(e) {
    autocompleteService = new google.maps.places.AutocompleteService();
    setupAutocomplete();
})