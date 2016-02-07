$(document).ready(function() {
    $('.datatable').each(function() {
        var index = $(this).find('.sort-default').index()
        var sortDefault = (index > 0) ? index : 0;
        $(this).DataTable({
            conditionalPaging: true,
            order: [[ sortDefault, "asc" ]],
            language: {
              "sEmptyTable": "Tabellen inneh&aring;ller ingen data",
              "sInfo": "Visar _START_ till _END_ av totalt _TOTAL_ sidor",
              "sInfoEmpty": "Visar 0 till 0 av totalt 0 sidor",
              "sInfoFiltered": "(filtrerade fr&aring;n totalt _MAX_ sidor)",
              "sInfoPostFix": "",
              "sInfoThousands": " ",
              "sLengthMenu": "Visa _MENU_ sidor",
              "sLoadingRecords": "Laddar...",
              "sProcessing": "Bearbetar...",
              "sSearch": "S&ouml;k",
              "sZeroRecords": "Hittade inga matchande sidor",
              "oPaginate": {
                "sFirst": "F&ouml;rsta",
                "sLast": "Sista",
                "sNext": "N&auml;sta",
                "sPrevious": "F&ouml;reg&aring;ende"
              },
              "oAria": {
                "sSortAscending": ": aktivera f&ouml;r att sortera kolumnen i stigande ordning",
                "sSortDescending": ": aktivera f&ouml;r att sortera kolumnen i fallande ordning"
              }
            }
        })
    })
})