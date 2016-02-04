var autocompleteService, geocodeService, mapInstance,
inputCity, inputStreet, inputLatitude, inputLongitude

var requestCity = {
    types: ['(cities)'],
    componentRestrictions: {
        country: 'SE'
    },
    region: 'SE'
}

var requestStreet = {
    componentRestrictions: {
        country: 'SE'
    },
    types: ['address'],
    region: 'SE'
}

function getAutocompletePredictions(request, response) {
    autocompleteService.getPlacePredictions(request, function (predictions, status) {
        if (status != google.maps.places.PlacesServiceStatus.OK) {
            response([{
                label: 'Inga resultat hittades',
                value: 'Inga resultat hittades'
            }])

            return false
        }

        response($.map(predictions, function (prediction, i) {
            return {
                prediction: prediction,
                label: prediction.description,
                value: prediction.description
            }
        }))
    })
}

function setupAutocomplete() {
    $(inputCity).autocomplete({
        source: function (request, response) {
            requestCity.input = request.term
            return getAutocompletePredictions(requestCity, response)
        },
        focus: function (event, ui) {
            ui = updateSelectionCity(ui)

            if('value' in ui.item) {
                limitBounds(ui.item.value)
            }

            return ui
        },
        selectFirst: true,
        autoFocus: true
    })
    .focus(function () {
        if ($(this).attr('state') != 'open') {
            $(this).autocomplete('search')
        }
    })
    .change(function (event) {
         var data = $(this).data()
         if('uiAutocomplete' in data) {
            if('selectedItem' in data.uiAutocomplete) {
                if(data.uiAutocomplete.selectedItem !== null) {
                    if('value' in data.uiAutocomplete.selectedItem) {
                        limitBounds(data.uiAutocomplete.selectedItem.value)
                        return
                    }
                }
            }
         }

         inputCity.val('')
         resetMap()
    })

    $(inputStreet).autocomplete({
        source: function (request, response) {
            requestStreet.input = request.term
            return getAutocompletePredictions(requestStreet, response)
        },
        focus: function (event, ui) {
            ui = updateSelectionStreet(ui)

            if('prediction' in ui.item) {
                setStreetCoordinates(ui.item.prediction)
            }

            return ui
        },
        selectFirst: true,
        autoFocus: true
    })
    .focus(function () {
        if ($(this).attr('state') != 'open') {
            $(this).autocomplete('search')
        }
    })
    .change(function (event) {
         var data = $(this).data()
         if('uiAutocomplete' in data) {
            if('selectedItem' in data.uiAutocomplete) {
                if(data.uiAutocomplete.selectedItem !== null) {
                    if('prediction' in data.uiAutocomplete.selectedItem) {
                        setStreetCoordinates(data.uiAutocomplete.selectedItem.prediction)
                        return
                    }
                }
            }
         }

         removeMarkers()
    })
}

function updateSelectionCity(ui) {
    if('prediction' in ui.item) {
        if('terms' in ui.item.prediction) {
            if(ui.item.prediction.terms.length > 0) {
                if('value' in ui.item.prediction.terms[0]) {
                    ui.item.value = ui.item.prediction.terms[0].value
                }
            }
        }
    } else {
        ui.item.value = ""
    }

    return ui
}

function updateSelectionStreet(ui) {
    if('prediction' in ui.item) {
        var terms = new Array()

        for(var obj in ui.item.prediction.terms) {
            terms.push( ui.item.prediction.terms[obj].value )
        }

        ui.item.value = terms.slice(0,-1).join(' ')
    } else {
        ui.item.value = ""
    }

    return ui
}

function setStreetCoordinates(prediction) {
    var terms = new Array()

    for(var obj in prediction.terms) {
        terms.push( prediction.terms[obj].value )
    }

    var address = terms.slice(0).join(' ')

    if('meta' in requestStreet) {
        if('address' in requestStreet.meta) {
            if(address == requestStreet.meta.address) {
                //Do not perform another lookup if we were given the same address
                mapInstance.setZoom(11) //Just zoom the map to the current marker
                return
            }
        }
    }

    var city = terms.slice(0).pop()

    //If the user changes to the same address in another city, update inputCity correspondingly
    if(inputCity.val() !== city) {
        //Set bounds to new city
        limitBounds(city)
        
        if( ! inputCity.data('color') ) {
            inputCity.data('color', inputCity.css('color'))
        }

        inputCity.animate({
            color: 'rgb(255, 255, 255)'
        }, 400, function() {
            inputCity.val(city) //Update inputCity value to the new city
            inputCity.animate({
                color: inputCity.data('color')
            }, 400)
        })
    }
    
    requestStreet.meta = { address: address }

    geocodeService.geocode({
        country: 'SE',
        bounds: requestStreet.bounds,
        address: address
    }, function(result) {
        if(result.length > 0) {
            if('geometry' in result[0]) {
                var location = result[0].geometry.location

                var latitude = parseFloat( location.lat() )
                var longitude = parseFloat( location.lng() )

                inputLatitude.val( latitude )
                inputLongitude.val( longitude )

                //Remove all markers from map
                removeMarkers()

                //Place new marker on map
                setMarker({
                  position: {
                    lat: latitude,
                    lng: longitude
                  },
                  content: address
                })
            }
        }
    })
}

function limitBounds(location) {
    geocodeService.geocode({
        country: 'SE',
        address: location
    }, function(result, status) {
        if(result.length > 0) {
            if('geometry' in result[0]) {
                var geometry = result[0].geometry
                var bounds
                if('bounds' in geometry) {
                    bounds = geometry.bounds //Large areas such as cities
                } else {
                    bounds = geometry.viewport //Small areas such as villages
                }

                requestStreet.bounds = bounds //Set bias towards location bounds

                mapInstance.setBounds(bounds) //Set viewport to location bounds
            }
        }
    })
}

function resetMap() {
    settings = mapInstance.getSettings()
    mapInstance.setZoom(3)
    mapInstance.setCenter(settings.center)
}

function setMarker(obj) {
    settings = mapInstance.getSettings()

    mapInstance.setMarker(obj)

    mapInstance.setZoom(11)

    mapInstance.setCenter(obj.position)

    marker = settings.google.markers[0]
    marker.infowindow.open(settings.google.map, marker)
}

function removeMarkers() {
    settings = mapInstance.getSettings()
    if(settings.google.markers.length !== 0) {
        for (var i = settings.google.markers.length - 1; i >= 0; i--) {
            //Close infowindow
            settings.google.markers[i].infowindow.close()
            //Remove marker
            settings.google.markers[i].setMap(null)

            //Delete from array
            delete(settings.google.markers[i])
        }

        //Reindex array
        settings.google.markers = settings.google.markers.filter( function(item){
            return item
        })
    }
}

$(document).bind('mapready', function(e) {
    //Set up services
    autocompleteService = new google.maps.places.AutocompleteService()
    geocodeService = new google.maps.Geocoder()

    if(!$('#map').data('init')) {
        mapInstance = $('#map').googleMap({
            center:{
                lat: 62.3958153,
                lng: 17.2222896
            },
            zoom: 3
        })
    }

    //Set up dom nodes
    inputStreet = $('input[name="street"]')
    inputCity = $('input[name="city"]')
    inputLongitude = $('input[name="longitude"]')
    inputLatitude = $('input[name="latitude"]')

    $(document).ready(function() {
        setupAutocomplete()
    })
})