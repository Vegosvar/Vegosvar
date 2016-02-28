var player
function parseYouTubeURL(url) {
  var regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  var match = url.trim().match(regExp);
  if (match && match[2].length == 11) {
    return match[2];
  } else {
    return false
  }
}

function getVideoId() {
  var ytURL = $('#youtube-video').val()

  if(ytURL.length > 0) {
    var videoId = parseYouTubeURL(ytURL)
  
    $('#player-error').remove()
    if(videoId) {
      showYouTubePlayer('player', videoId)
    } else {
      if(typeof player !== 'undefined') {
        if('getIframe' in player && typeof(player.getIframe) === 'function') {
          if(player.getIframe() !== null) {
            player.destroy()
          }
        }
      }

      $('#player-container')
      .append(
        $('<div>', {
            id: 'player-error',
            class: 'alert alert-danger'
        })
        .append(
          $('<span>', {
            class: 'glyphicon glyphicon-warning-sign'
          }),
          $('<span>')
          .html(
            $('<span>')
            .append(
              $('<span>')
              .html('&nbsp; Kunde inte ladda Youtube video med URL:'),
              $('<span>')
              .html(ytURL)
            )
          )
        )
      )
    }
  }
}

function showYouTubePlayer(elementId, videoId) {
  player = new YT.Player(elementId, {
    videoId: videoId,
    width: document.getElementById(elementId).offsetWidth
  });
}

function onYouTubePlayerAPIReady() {
  $('#youtube-video').on('change', function() {
    getVideoId()
  })

  if($('#player').length > 0) {
    var videoUrl = $('#player').data('video')
    if(videoUrl) {
      var videoId = parseYouTubeURL(videoUrl)
      if(videoId) {
        showYouTubePlayer('player', videoId)
      }
    }
  }
}