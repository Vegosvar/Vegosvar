Dropzone.autoDiscover = false //Fix dropzone already attached error

var dropzoneOptions = {
  paramName: "image",
  method: "post",
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
        console.log('id: ' + response)
        $('div#uploader').addClass('finished')
        $('.dz-preview').hide()
        $.getJSON('/ajax/imageInfo/?id='+ response, function (data) {
          console.log(data)
          if($('.cover-input_hidden').length) {
            console.log('already is')
            $('.cover-input_hidden').remove()
            $('div#uploader').css('background-image', 'url("/uploads/' + data[0].filename + '.jpg")')
            $('#upload-group').append('<input type="hidden" value="' + data[0]._id + '" name="cover_image_id" />')
            $('#upload-group').append('<input type="hidden" value="' + data[0].filename + '" name="cover_image_filename" />')
          } else {
            console.log('isnt')
            $('div#uploader').css('background-image', 'url("/uploads/' + data[0].filename + '.jpg")')
            $('#upload-group').append('<input type="hidden" value="' + data[0]._id + '" name="cover_image_id" />')
            $('#upload-group').append('<input type="hidden" value="' + data[0].filename + '" name="cover_image_filename" />')
          }
        })
      }, 500)
    }
  }, dropzoneOptions)
)

$("div#avatar").dropzone(
  $.extend({
    url: "/submit/file/avatar", 
    success: function(object, response) {
      setTimeout(function () {
        alert(response)
      })
    }
  }, dropzoneOptions)
)
