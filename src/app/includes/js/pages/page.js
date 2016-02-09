$(document).ready(function() {

    function checkLicenseVal(value) {
        if(value !== 'CC0') {
            $('#license_info').fadeIn()
        } else {
            $('#license_info').hide()
        }
    }

    $('#license_select').on('change', function() {
        checkLicenseVal($(this).val())
    })

    checkLicenseVal( $('#license_select').val() )
})