$(document).ready(function () {
  function toggleToolbarState () {
    //Check if the cursor is within a text segment that is a link
    if ($.fn.editorController('selectionIsType', { type:'createLink' })) {
      $('#insert-link-button').addClass('wysihtml5-command-active')
    } else {
      $('#insert-link-button').removeClass('wysihtml5-command-active')
    }
  }

  function editorCallback () {
    switch (this.event) {
      case 'interaction':
        $.fn.editorController('getBookmark')
        $.fn.editorController('saveSelection')

        toggleToolbarState()
        break
      case 'focus':
      case 'blur':
      case 'newword:composer':
        $('.editable-content').val($.fn.editorController('getValue'))
        break
    }
  }

  /* On mobile devices, we fall back to the default link insert command button.
  Since the wysihtml5 dialog must be subjacent to the command button we
  will experience some visual drawbacks when the dialog div is shown,
  to mitigate that ugly effect a bit we hide the link button until
  the dialog is closed */
  function mobileInsertLinkFix () {
    if ($('#insert-link-button-mobile').hasClass('wysihtml5-command-dialog-opened')) {
      $('#insert-link-button-mobile').addClass('hidden')
    } else {
      $('#insert-link-button-mobile').removeClass('hidden')
    }
  }

  //Listen for when the user brings up the insert link modal
  $('#insert-link-button').on('click', function () {
    var url
    var text
    //Check if the user has selected any text in the editor
    var link = $.fn.editorController('selectionIsType', { type:'createLink' })

    if (link !== false) {
      url = $(link).attr('href')
      text = $(link).html()
    } else {
      var selectObj = $.fn.editorController('getSelection')
      if (selectObj !== false) {
        //Set the selected text as the link's text
        text = selectObj.text
      }
    }

    $('#insert-link-text').val(text)
    $('#insert-link-url').val(url)
  })

  //Listen for when the user inserts a link
  $('#insert-link-save').on('click', function () {
    //Get the url and text value
    var linkUrl = $('#insert-link-url').val()
    var linkText = $('#insert-link-text').val()

    //If no display text was entered, use the url as the text
    if (linkText.length <= 0)
      linkText = linkUrl

    var html = '<a href="' + linkUrl + '">' + linkText + '</a>'

    //Check if text has been selected previous to inserting link
    $.fn.editorController('setSelection')

    //Insert the link
    $.fn.editorController('insert', {
      insert: {
        type: 'html',
        content: html
      }
    })

    //Clear the values
    $('#insert-link-url').val('')
    $('#insert-link-text').val('')

    //Hide the modal
    $('#editorModalLink').modal('hide')
  })

  //Listen for when the user inserts an image
  $('#insert-image-save').on('click', function () {
    var imageUrl = $('#insert-image-url').val()

    var html = '<img src=' + imageUrl + '/>'

    //If the user has specified an image url, insert it
    if (imageUrl.length > 0) {
      $.fn.editorController('insertImage', {
        insert: {
          type: 'image',
          content: html
        }
      })
    }
  })


  //Initialize the wysihtml5 editor
  $.fn.editorController('init', {
    element: '.editable',
    toolbar: '.editor-toolbar',
    parserRules: wysihtml5ParserRules,
    events: {
      handle: ['interaction', 'blur', 'focus', 'newword:composer'],
      callback: editorCallback
    }
  })

  $('#insert-link-button-mobile').bind("DOMSubtreeModified", mobileInsertLinkFix)
})