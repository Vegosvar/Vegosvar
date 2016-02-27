$(document).ready(function () {
  var d = new Date()
  var weekday = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ]

  var n = weekday[d.getDay()]
  if ($('#' + n).children('p').text() === 'Stängt') {
    $('#' + n).addClass('disabled')
  } else {
    $('#' + n).addClass('active')
  }
})