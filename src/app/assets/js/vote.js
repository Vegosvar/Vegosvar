$(window).load(function () {
  $(document).on('click', '.star', function () {
    var container = $(this).parent()
    var postId = $(container).data('id')
    var content = $(this).index() + 1
    var element = this

    $(element).addClass('push') //Add the push class

    //Update vote count
    $.ajax({
      url: '/ajax/addVote',
      timeout: 3000,
      data: {
        id: postId,
        content: content
      }
    })
    .done(function (result) {
      if ('success' in result && result.success) {
        //Remove active class from stars
        $(container).children('.star').removeClass('active')

        //Show the new vote count
        $(container).find('.votes').html('&nbsp;' + result.data.count)

        //Set the state to the stars again based on the new average
        var average = new Array(parseInt(result.data.average))
        $.each(average, function (i) {
          var index = i + 1

          $(container).children('.star:nth-child(' + index + ')').each(function (n, element) {
            //We don't remove push class until in here as we want to cause as little
            //interruption as possible to the animation on the element the user clicked
            $(element).removeClass('push')

            setTimeout(function (element) {
              $(element).addClass('active push') //Add active and push class to indicate new result

              //And remove it when animation ends
              $(element).one('animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', function (e) {
                $(element).removeClass('push')
              })
            }, 100 * i, element) //Wait 100 ms between each star
          })
        })
      } else {
        var error = ('message' in result) ? result.message : 'Malformed data received from server'
        throw new Error(error)
      }
    })
    .fail(function (error) {
      //TODO handle failure
      console.log(error)
    })
  })

  $('.like.add-like').on('click', function () {
    var element = this
    var postId = $(element).data('id')

    var heartElement = $(element).find('.glyphicon')

    //Remoe all glyphicon classes
    $(heartElement).removeClass(function (index, css) {
      return (css.match (/(^|\s)glyphicon\S+/g) || []).join(' ')
    })
    //Show a spinner to indicate to the user that something's going on
    $(heartElement).addClass('fa fa-spin fa-spinner')

    //Update the like count
    $.ajax({
      url: '/ajax/addLike',
      timeout: 3000,
      data: {
        id: postId
      }
    })
    .always(function () {
      //Remove spinner
      $(heartElement).removeClass('fa fa-spin fa-spinner')
      $(heartElement).addClass('glyphicon')
    })
    .done(function (result) {
      if ('success' in result && result.success) {
        //Restore the heart icon
        if (result.data.count > 0) {
          $(heartElement).addClass('glyphicon-heart')
        } else {
          //If there are no likes after update, show an empty heart icon instead
          $(heartElement).addClass('glyphicon-heart-empty')
        }

        //Show the new like count
        $(element).find('.count').html('&nbsp;' + result.data.count)
      } else {
        var error = ('message' in result) ? result.message : 'Malformed data received from server'
        throw new Error(error)
      }
    })
    .fail(function (error) {
      console.log(error)
      $(heartElement).addClass('glyphicon-warning-sign')
      $(element).find('.count').html('Ett fel intr&auml;ffade')
    })
  })

  $('.like.toggle-hint').on('click', function (e) {
    $(this).parent().find('.hint').toggleClass('active')
  })

})