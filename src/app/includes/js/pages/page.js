$(document).ready(function() {

    function checkLicenseVal(value) {
        if(value === 'CC BY') {
            $('.cc-version').fadeIn()
        } else {
            $('.cc-version').hide()
        }
    }

    $('#license_select').on('change', function() {
        checkLicenseVal($(this).val())
    })

    checkLicenseVal( $('#license_select').val() )
})