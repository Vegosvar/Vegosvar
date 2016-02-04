function pagesPerMonth(data) {
  $('.stats-container').highcharts({
    title: {
      text: 'Nya sidor per månad',
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
    legend: {
      layout: 'vertical',
      align: 'right',
      verticalAlign: 'middle',
      borderWidth: 0
    },
    series: [{
      name: 'Sidor',
      data: data
    }]
  });
}