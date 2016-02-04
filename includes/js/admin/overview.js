function pagesPerMonth(obj) {
  $(obj.element).highcharts({
    chart: {
        type: obj.type
    },
    title: {
      text: 'Sidor per månad',
      x: -20 //center
    },
    xAxis: {
      type: 'datetime',
      dateTimeLabelFormats: {
        month: '%b %e %Y'
      }
    },
    yAxis: {
      title: {
        text: 'Antal'
      },
      plotLines: [{
        value: 0,
        width: 1,
        color: '#808080'
      }]
    },
    plotOptions: {
      bar: {
        stacking: (obj.stacking) ? 'normal' : null,
        dataLabels: {
          enabled: true,
          color: (Highcharts.theme && Highcharts.theme.dataLabelsColor) || 'white',
            style: {
              textShadow: '0 0 3px black'
            }
        }
      },
      column: {
        stacking: (obj.stacking) ? 'normal' : null,
        dataLabels: {
          enabled: true,
          color: (Highcharts.theme && Highcharts.theme.dataLabelsColor) || 'white',
            style: {
              textShadow: '0 0 3px black'
            }
        }
      },
      area: {
        stacking: (obj.stacking) ? 'normal' : null,
        fillOpacity: 0.5,
        lineColor: '#ffffff',
        lineWidth: 1,
        marker: {
          lineWidth: 1,
          lineColor: '#ffffff'
        }
      }
    },
    tooltip: {
      shared: (obj.type !== 'area') ? false : true,
      valueSuffix: ' sidor'
    },
    legend: {
      layout: 'vertical',
      align: 'right',
      verticalAlign: 'middle',
      borderWidth: 0
    },
    series: obj.series
  });
}

function sortMultidimensional(a, b) {
    if (a[0] === b[0]) {
        return 0;
    }
    else {
        return (a[0] < b[0]) ? -1 : 1;
    }
}

var series = []
$(function() {
    var stats = {}
    var typeNames = ['Fakta','Recept','Restaurang','Produkt','Butik']
    for (var i = pages_stats.length - 1; i >= 0; i--) {
        var entry = pages_stats[i]

        var id = entry._id
        var date = id.date
        var type = parseInt( id.type ) -1

        var dateObj = new Date(date).getTime()
        var name = typeNames[type]
        var slug = name.toLowerCase()

        if( ! (slug in stats) ) {
            stats[slug] = {
                name: name,
                data: []
            }
        }

        stats[slug]['data'].push([
            dateObj,
            entry.pages
        ])
    }

    for(var key in stats) {
        stats[key].data.sort(sortMultidimensional)
        series.push(stats[key])
    }

    pagesPerMonth({
        element: $('#stats')[0],
        type: 'line',
        series: series
    })

    var data = {
      element: $('#stats'),
      series: series,
      stacking: false
    }

    $('input:radio[name="stacking"]').click(function() {
        var stack = $(this).val();
        data.stacking = (stack == "true") ? true : false
        pagesPerMonth(data)

    })

    $('#stats-type').on('change', function() {
        data.type = $(this).val()
        pagesPerMonth(data)
    })
})