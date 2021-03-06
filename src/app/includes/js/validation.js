$(document).ready(function () {
  var fieldValidation = {
    title: function () {
      var element = $('input[name="title"]')
      var typingTimer

      $(element).on('blur', function () {
        verifyFields.title()
        $(element).on('keyup', function () {
          verifyFields.title()
        })
      })
    },
    description: function () {
      var element = $('#editor')
      var typingTimer

      $(element).on('blur', function () {
        verifyFields.description()

        $(element).on('keyup', function () {
          verifyFields.description()
        })
      })
    },
    address: function () {
      var elementCity = $('input[name="city"]')

      $(elementCity).bind('blur', function () {
        setTimeout(function () {
          verifyFields.address.city()
        }, 300)
      })

      //One for street and one for city
      var elementStreet = $('input[name="street"]')

      $(elementStreet).bind('blur', function () {
        setTimeout(function () {
          verifyFields.address.street()
        }, 300)
      })
    },
    manufacturer: function () {
      var elementName = $('input[name="manufacturer"]')

      $(elementName).bind('keyup', function () {
        verifyFields.manufacturer.name()
      })

      var elementSite = $('input[name="manufacturer_website"]')

      $(elementSite).bind('keyup', function () {
        verifyFields.manufacturer.site()
      })
    }
  }

  var verifyFields = {
    title: function (callback) {
      var element = $('input[name="title"]')
      var value = $(element).val()

      if(value.length > 2) {

        var checkTitleResult = function(result, callback) {
          if(result.success) {
            if(result.available) {
              $('.title-error').hide()
              $(element).removeClass('invalid')
            } else {
              $(element).addClass('invalid')

              var error = 'Det finns redan en sida med den h&auml;r rubriken'
              if($('.title-error').length > 0) {
                $('.title-error').html(error).show()
              } else {
                $(element).parent().append(
                  $('<span>', {
                    class: 'title-error'
                  })
                  .html(error)
                )
              }
            }
          }

          if(typeof(callback) === 'function') {
            callback(result.available)
          }
        }

        if($('input[name="id"]').val().length == 24) { //We're editing a page, be more lenient
          checkTitleResult({
            success: true,
            available: true
          }, callback)
          return
        }

        $.ajax({
          url: '/ajax/validate/title',
          data: {
            title: value
          }
        })
        .done(function (result) {
          checkTitleResult(result, callback)
        })
      } else {
        $(element).addClass('invalid')

        var error = 'Rubriken m&aring;ste vara minst 3 tecken'
        if($('.title-error').length > 0) {
          $('.title-error').html(error).show()
        } else {
          $(element).parent().append(
            $('<span>', {
              class: 'title-error text-invalid'
            })
            .html(error)
          )
        }

        if(typeof(callback) === 'function') {
          callback(false)
        }
      }
    },
    description: function (callback) {
      var element = $('#editor')
      var value = $(element).text()

      if(value.length > 10) {
        $('#editor').removeClass('invalid')
        $('.editor-error').hide()

        if(typeof(callback) === 'function') {
          callback(true)
        }
      } else {
        $('#editor').addClass('invalid')
        var error = 'Sidan m&aring;ste ha en beskriving p&aring; minst ' + ((10 - value.length) +1) + ' tecken till'

        if($('.editor-error').length > 0) {
          $('.editor-error').html(error).show()
        } else {
          $('#editor').parent().append(
            $('<span>', {
              class: 'editor-error text-invalid'
            })
            .html(error)
          )
        }

        if(typeof(callback) === 'function') {
          callback(false)
        }
      }
    },
    address: {
      city: function (callback) {
        var elementCity = $('input[name="city"]')
        var value = $(elementCity).val()

        if(value.length > 0) {
          $(elementCity).removeClass('invalid')
          $('.error-city').hide()

          if(typeof(callback) === 'function') {
            callback(true)
          }
        } else {
          $(elementCity).addClass('invalid')

          if($('.error-city').length > 0) {
            $('.error-city').show()
          } else {

            $(elementCity).parent().after(
              $('<span>', {
                class: 'error-city text-invalid'
              })
              .html('Stad m&aring;ste anges')
            )
          }

          if(typeof(callback) === 'function') {
            callback(false)
          }
        }
      },
      street: function (callback) {
        var elementStreet = $('input[name="street"]')
        var value = $(elementStreet).val()

        if(value.length > 0) {
          $(elementStreet).removeClass('invalid')
          $('.error-street').hide()

          if(typeof(callback) === 'function') {
            callback(true)
          }
        } else {
          $(elementStreet).addClass('invalid')

          if($('.error-street').length > 0) {
            $('.error-street').show()
          } else {
            $(elementStreet).parent().after(
              $('<span>', {
                class: 'error-street text-invalid'
              })
              .html('Gatunamn m&aring;ste anges')
            )
          }

          if(typeof(callback) === 'function') {
            callback(false)
          }
        }
      }
    },
    manufacturer: {
      name: function (callback) {
        var elementName = $('input[name="manufacturer"]')
        var value = $(elementName).val()

        if(value.length > 0) {
          $(elementName).removeClass('invalid')
          $('.error-manufacturer-name').hide()

          if(typeof(callback) === 'function') {
            callback(true)
          }
        } else {
          $(elementName).addClass('invalid')

          if($('.error-manufacturer-name').length > 0) {
            $('.error-manufacturer-name').show()
          } else {
            $(elementName).parent().after(
              $('<span>', {
                class: 'error-manufacturer-name text-invalid'
              })
              .html('Tillverkare m&aring;ste anges')
            )
          }

          if(typeof(callback) === 'function') {
            callback(false)
          }
        }
      },
      site: function (callback) {
        var elementSite = $('input[name="manufacturer_website"]')
        var value = $(elementSite).val()

        if(value.length > 0) {
          $(elementSite).removeClass('invalid')
          $('.error-manufacturer-site').hide()

          if(typeof(callback) === 'function') {
            callback(true)
          }
        } else {
          $(elementSite).addClass('invalid')

          if($('.error-manufacturer-site').length > 0) {
            $('.error-manufacturer-site').show()
          } else {
            $(elementSite).parent().after(
              $('<span>', {
                class: 'error-manufacturer-site text-invalid'
              })
              .html('Tillverkarens hemsida m&aring;ste anges')
            )
          }

          if(typeof(callback) === 'function') {
            callback(false)
          }
        }
      }
    }
  }

  var required = {
    '1': ['title', 'description'],
    '2': ['title', 'description'],
    '3': ['title', 'description','address'],
    '4': ['title', 'description','manufacturer'],
    '5': ['title', 'description', 'address'],
    '6': ['title', 'description', 'address']
  }

  var fieldsToValidate = function () {
    var type = $('input[name="type"]').val()

    if(type in required) {
      var requiredFields = required[type]
      return requiredFields
    }
  }

  var validateFields = function () {
    var fields = fieldsToValidate()

    $.each(fields, function(i, field) {
      if(field in verifyFields) {
        if(typeof(verifyFields[field]) === 'function') {
          verifyFields[field](function(result) {
            validatedFields.push({
              field: field,
              valid: result
            })
          })
        } else {
          for(var key in verifyFields[field]) {
            if(typeof(verifyFields[field][key]) === 'function') {
              verifyFields[field][key](function(result) {
                validatedFields.push({
                  field: field,
                  valid: result
                })
              })
            }
          }
        }
      }
    })
  }

  var valid = null
  var validatedFields = []

  function submitForm() {
    if(valid) {
      $.ajax({
        url: '/submit',
        type: 'post',
        data: $('form[method="post"]').serialize()
      })
      .done(function(response) {
        if('success' in response) {
          if('url' in response) {
            window.location = response.url
          }
        }
      })
    } else {
      return false
    }
  }

  var fields = fieldsToValidate()
  $.each(fields, function(i, field) {
    if(field in fieldValidation) {
      fieldValidation[field]()
    }
  })

  $('form[method="post"]').bind('submit', function (e) {
    e.preventDefault()
    return false
  })

  $('button.form-submit').on('click', function () {
    if(valid !== true) {

      validatedFields = []
      validateFields()

      setTimeout(function () {
        var validated = []
        $.each(validatedFields, function(i, result) {
          if('valid' in result) {
            validated.push(result.valid)
          } else {
            valid = false //Something went wrong here
          }
        })

        valid = ($.inArray(false, validated) === -1) //False not present in array

        if(valid) {
          submitForm()
        } else {
          if($('.submit-error').length > 0) {
            $('.submit-error').show();
          } else {
            $('.form-submit').after(
              $('<span>', {
                class: 'text-invalid submit-error'
              })
              .html('&nbsp;Ett eller flera f&auml;lt beh&ouml;ver kompletteras')
            )
          }
        }
      }, 300)
      return false
    } else if(valid === true) {
      submitForm()
    }
  })
})