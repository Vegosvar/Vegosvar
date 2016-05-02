Dropzone.autoDiscover = false //Fix dropzone already attached error

var dropzoneOptions = {
  paramName: 'image',
  acceptedFiles: 'image/*',
  method: 'post',
  maxFiles: 1,
  dictDefaultMessage: "<div class='well'><span class='glyphicon glyphicon-picture'></span> <h2>Huvudbild</h2> <div>Släpp bilden här för att ladda upp <span class='info'>Rekommenderad storlek 1200 x 630 px</span></div> <span class='btn btn-edit'>Lägg till bild</span></div>",
  dictFallbackMessage: "Uppdatera din webbläsare för att kunna ladda upp bilder",
  dictFileTooBig: "Bilden är för stor ({{filesize}}MiB). Maxstorlek: {{maxFilesize}}MiB.",
  dictInvalidFileType: "Du kan inte ladda upp den här typen av filer",
  dictCancelUpload: "Avbryt uppladdning",
  dictCancelUploadConfirmation: "Är du säker på att du vill avbryta?",
  dictRemoveFile: "Ta bort bild",
  dictRemoveFileConfirmation: null,
  dictMaxFilesExceeded: "Du kan inte ladda upp fler bilder",
  init: function() {
      this.hiddenFileInput.removeAttribute('multiple');
  },
  maxfilesexceeded: function(file) {
    this.removeAllFiles()
    this.addFile(file)
  }
}

$('#uploader').dropzone(
  $.extend({
    url: "/submit/file",
    previewTemplate : '<div style="display:none"></div>',
    maxFiles: 5,
    sending: function(data, xhr) {
      $('#uploader').before(
        $('<div>', {
          class: 'preview-image'
        })
        .css({
          'background-image': 'url("https://placeholdit.imgix.net/~text?txtsize=33&txt=Laddar&w=160&h=87")' //TODO: replace with our own placeholder image
        })
      )

      //Add the class to make sure the right css rules are applied
      $('#uploader').addClass('uploading')

      //Enable file uploading
      $('.dz-hidden-input').prop('disabled', true);

      $('#uploader .dz-message').html(
        $('<div>')
        .append(
          $('<span>')
          .html('&nbsp; Laddar upp..')
        )
      )
    },
    success: function(object, result) {
      var imageUrl = '/uploads/' + result.data.filename + '.jpg'

      setTimeout(function() {
        //Set the uploaded image
        $('.upload-previews .preview-image').last()
        .addClass('done')
        .css({
          'background-image': 'url(' + imageUrl + ')'
        })

        //Enable file uploading
        $('.dz-hidden-input').prop('disabled', false);

        $('#uploader .dz-message').html(
          $('<div>')
          .append(
            $('<span>', {
              class: 'fa fa-plus'
            }),
            $('<span>')
            .html('&nbsp; L&auml;gg till fler')
          )
        )
      }, 1500)

    }
  }, dropzoneOptions)
)

if($('#avatar').length > 0) {
  var avatarDZ = new Dropzone('#avatar',
    $.extend({
      url: '/submit/file/avatar',
      previewsContainer: $('.avatar')[0],
      previewTemplate: 
      $('<div>', {
        class: 'dz-preview dz-file-preview'
      })
      .append(
        $('<div>', {
          class: 'dz-details'
        })
        .append(
          $('<img>')
          .attr('data-dz-thumbnail', '')
        )
      )[0].outerHTML,
    }, dropzoneOptions)
  )

  avatarDZ.on('sending', function () {
    $('#user-avatar').hide()

    if($('.dz-preview').length > 1) {
      $('.dz-preview:first').remove()
    }
  })
}

$('.preview-image').hover(function() {
  console.log(this)
})