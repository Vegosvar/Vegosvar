$(function(){
    function getRevision(revision, callback) {
        var post_id = $('.content')[0].id;

        $.ajax({
            url: '/ajax/revision/compare/' + post_id + '/' + revision
        }).done(function(result) {
            callback(result)
        })
    }

    $('.revision').on('click', function () {
        //Restore default classes to the list group items 
        $('.revision').each( function () {
            $(this).addClass($(this).data('item-class'))
        })

        //Remove active class from the currently active list item
        $('.revision.active').removeClass('active')

        //And add it to this item (while removing the default class)
        $(this).removeClass($(this).data('item-class')).addClass('active')

        //
        var revision = $(this).data('revision')
        getRevision(revision, function(result) {
            //Get the diffed result
            var diffs = result.diffs

            var content = $('<div>')

            //to make sure we can see the differences we add some color
            for (var i = 0; i < diffs.length; i++) {
                content.append(
                    $('<span>', {
                        class: 'text-' + diffs[i].status
                    })
                    .html(diffs[i].value)
                )
            }

            //Then apply it to the page with a nice fade effect
            $('.revision_content').html(content).hide().fadeIn()
        })
    })

    $('#apply').on('click', function() {
        var revision = $('.revision.active').data('revision')
        var post_id = $('.content')[0].id;

        $.ajax({
          url: '/ajax/revision/apply/' + post_id + '/' + revision
        }).done(function(result) {
          var msg = $('.message')
          $(msg).hide();
          if(result.success === true) {

            $(msg).removeClass('alert-danger').addClass('alert-success')

            $(msg).html('<span class="glyphicon glyphicon-info-sign"></span>&nbsp;Den aktuella sidans har uppdaterats till vald revision!')

            //Move the label to the new revision
            $('.revision.active').append( $('.revisions').find('.current') )
          } else {
            $(msg).removeClass('alert-success').addClass('alert-danger')
            $(msg).html('<span class="glyphicon glyphicon-warning-sign"></span>&nbsp;Oj! N&aring;got blev fel n&auml;r sidan skulle uppdateras!<br /><small>Felmeddelande: <code>' + result.message + '</code></small>')
          }

          $(msg).fadeIn()
        })
    })
})