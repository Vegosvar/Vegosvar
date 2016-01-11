$(function(){
    function getComparison() {
        var value = $('#revision_compare').val()
        var revision = (value) ? value : 0
        var post_id = $('.content')[0].id;

        $.ajax({
            url: '/ajax/revision/compare/' + post_id + '/' + revision
        }).done(function(result) {
            var diffs = result.diffs

            var content = $('<div>', {
                class:'revision_comparison'
            })

            console.log(result)

            var approved = (result.revision.accepted) ? 'Ja' : 'Nej'
            var alertClass = (result.revision.accepted) ? 'alert alert-success' : 'alert alert-danger'

            content.append(
                $('<div>')
                .append(
                    $('<div>', {
                        class: alertClass
                    })
                    .append(
                        $('<span>')
                        .html('Godk&auml;nd: ' + approved)
                    ),
                    $('<h3>').html('J&auml;mf&ouml;relse')
                )
            )

            for (var i = 0; i < diffs.length; i++) {
                content.append(
                    $('<span>', {
                        class: 'text-' + diffs[i].status
                    })
                    .html(diffs[i].value)
                )
            }
            $('.revision_content').html(content).hide().fadeIn()
        })
    }

    $('#revision_compare').on('change', function() {
        $('.revision_options').show();
        getComparison()
    })

    $('#apply').on('click', function() {
        var value = $('#revision_compare').val()
        var revision = (value) ? value : 0
        var post_id = $('.content')[0].id;

        $.ajax({
            url: '/ajax/revision/apply/' + post_id + '/' + revision
        }).done(function(result) {
          var msg = $('.revision_content').find('.alert')
          if(result.success === true) {
            $(msg).hide();

            $(msg).removeClass('alert-danger')
            $(msg).addClass('alert-success')
            $(msg).html('Den aktuella sidans har uppdaterats till vald revision!')
            $(msg).fadeIn()
          } else {
            $(msg).html('Oj! N&aring;got blev fel n&auml;r sidan skulle uppdateras. Felmeddelande: <code>' + result.message + '</code>')
          }
        })
    })

    getComparison()
})