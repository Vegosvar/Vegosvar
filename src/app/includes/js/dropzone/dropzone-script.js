Dropzone.autoDiscover = false //Fix dropzone already attached error

var dropzoneOptions = {
  paramName: 'image',
  acceptedFiles: 'image/*',
  method: 'post',
  maxFile: 1,
  dictDefaultMessage: "<div class='well'><span class='glyphicon glyphicon-picture'></span> <h2>Huvudbild</h2> <div>Släpp bilden här för att ladda upp <span class='info'>Rekommenderad storlek 1200 x 630 px</span></div> <span class='btn btn-edit'>Lägg till bild</span></div>",
  dictFallbackMessage: "Uppdatera din webbläsare för att kunna ladda upp bilder",
  dictFileTooBig: "Bilden är för stor ({{filesize}}MiB). Maxstorlek: {{maxFilesize}}MiB.",
  dictInvalidFileType: "Du kan inte ladda upp den här typen av filer",
  dictCancelUpload: "Avbryt uppladdning",
  dictCancelUploadConfirmation: "Är du säker på att du vill avbryta?",
  dictRemoveFile: "Ta bort bild",
  dictRemoveFileConfirmation: null,
  dictMaxFilesExceeded: "Du kan inte ladda upp fler bilder",
}

$("div#uploader").dropzone(
  $.extend({
    url: "/submit/file",
    success: function(object, response) {
      setTimeout(function () { 
        $('div#uploader').addClass('finished')
        $('.dz-preview').hide()
        $.getJSON('/ajax/imageInfo/?id='+ response, function (data) {
          if($('.cover-input_hidden').length) {
            $('.cover-input_hidden').remove()
            $('div#uploader').css('background-image', 'url("/uploads/' + data[0].filename + '.jpg")')
            $('#upload-group').append('<input type="hidden" value="' + data[0]._id + '" name="cover_image_id" />')
            $('#upload-group').append('<input type="hidden" value="' + data[0].filename + '" name="cover_image_filename" />')
          } else {
            $('div#uploader').css('background-image', 'url("/uploads/' + data[0].filename + '.jpg")')
            $('#upload-group').append('<input type="hidden" value="' + data[0]._id + '" name="cover_image_id" />')
            $('#upload-group').append('<input type="hidden" value="' + data[0].filename + '" name="cover_image_filename" />')
          }
        })
      }, 500)
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