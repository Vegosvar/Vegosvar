$(document).ready(function () {
  function checkStorage() {
    if(typeof(Storage) !== "undefined") {
      return ( localStorage.vegosvar_editor ) ? true : false;
    }
  }

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
      case 'aftercommand:composer':
        $('.editable-content').text($.fn.editorController('getValue'))
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
      text = $(link).text()
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

    var html = '<a href="' + linkUrl + '" title="L&auml;nk: ' + linkUrl + '">' + linkText + '</a>'

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

  //Listen for when the user inserts a source reference
  $('#insert-source-save').on('click', function () {
      var html;
      var sourceText = $('#insert-source-name').val();
      var sourceUrl = $('#insert-source-url').val();

      //Check if user has entered a new source
      if(sourceUrl.length > 0) {
          //Create a new source reference

          //Get the ID for the new source reference
          var sourceId = $('#sources-list').children().length + 1;

          //Update the sources-list ul with the new source
          $('#sources-list').append(
              $('<li>')
              .attr({
                  class: 'list-group-item',
                  id: 'source-' + sourceId
              })
              .append(
                  $('<span>')
                  .append(
                      $('<a>')
                      .attr({
                          href: sourceUrl,
                          class: 'source-url',
                          title: sourceUrl,
                          target: '_blank'
                      })
                      .append(
                          $('<span>').
                          attr('class', 'source-id')
                          .text(sourceId),
                          $('<span>')
                          .attr('class', 'source-delimiter')
                          .text(':'),
                          $('<span>')
                          .attr('class', 'source-name')
                          .text(sourceText)
                      ),
                      $('<a>')
                          .attr({
                              href: '#',
                              class: 'source-edit pull-right'
                          })
                          .append(
                              $('<span>')
                              .text('Redigera'),
                              $('<span>')
                              .attr('class', 'glyphicon glyphicon-edit')
                          )
                      )
              )
          );

          //Update the select existing sources drop down
          $('#insert-source-existing').append(
              $('<option>')
              .attr('value',sourceId)
              .text(sourceId + ': ' + sourceText)
          );

          //And insert a new input field with the new source-link
          $('#sources-storage').append(
              $('<div>').append(
                  $('<input>')
                  .attr({
                      class: sourceId,
                      type: 'text',
                      name: 'source_url',
                      value: sourceUrl
                  }),
                  $('<input>')
                  .attr({
                      class: sourceId,
                      type: 'text',
                      name: 'source_name',
                      value: sourceText
                  })
              )
          );

          //Finally set up the html to insert into the editor
          html = '<sup class="wysihtml5-uneditable-container source-link" contenteditable="false" data-source="source-' + sourceId + '">[' + sourceId + ']</sup>';
      } else {
          var sourceId = $('#insert-source-existing').val();
          sourceText = $("#insert-source-existing option:selected" ).text();
          html = '<sup class="wysihtml5-uneditable-container source-link" contenteditable="false" data-source="source-' + sourceId + '">[' + sourceId + ']</sup>';
      }

      html += '&nbsp;'; //blankspace needed otherwise you can't do a line break after if the source is inserted on the last line

      //If the editor is out of focus, restore the bookmark
      $.fn.editorController('setBookmark');

      //Insert the link
      $.fn.editorController('insert', {
        insert: {
          type: 'html',
          content: html
        }
      })

      //Hide reminder to use source references
      if($('#sources-reminder').is(':visible')) {
          $('#sources-reminder').hide()
      }

      $('#editorModalSource').modal('hide')

      $('#editorModalSource').on('hidden.bs.modal', function() {
          //Make sure the select elements container is visible
          if($('#source-existing').hasClass('hidden')) {
           $('#source-existing').removeClass('hidden').show();
          }

          $('#insert-source-name').val('');
          $('#insert-source-url').val('');
      })
  })

  //If user clicks on a source reference link, scroll down to show it
  $('#editor').on('click', '.source-link', function() {
    var elementId = $(this).data('source');
    $('html, body').animate({
      scrollTop: $("#" + elementId).offset().top
    }, 1000)
  })

  //If the user clicks to edit a source reference link, bring up the modal
  $('#sources-list').on('click', '.source-edit', function(e) {
      e.preventDefault()
      var container = $(this).parent();

      //Hide unrelated content
      $('#insert-source-edit').removeClass('hidden')
      $('#source-title-edit').removeClass('hidden')
      $('#source-existing').addClass('hidden')
      $('#source-title-new').addClass('hidden')
      $('#insert-source-save').addClass('hidden')

      //Populate fields
      var name = $(container).find('.source-name').text()
      var url = $(container).find('.source-url').attr('href')
      var id = $(container).find('.source-id').text()

      $('#insert-source-name').val(name)
      $('#insert-source-url').val(url)
      $('#insert-source-id').val(id)

      //Show modal
      $('#editorModalSource').modal('show')
  })

  //Listen for when user updates a source reference
  $('#insert-source-edit').on('click', function () {
      var containerId = $('#insert-source-id').val()
      var container = $('#source-' + containerId)

      var name = $('#insert-source-name').val()
      $(container).find('.source-name').text(name)

      var url = $('#insert-source-url').val()
      $(container).find('.source-url').attr('href', url)
      $(container).find('.source-url').attr('title', url)

      console.log(container, name, url);

      $('#editorModalSource').modal('hide')

      $('#insert-source-name').val('');
      $('#insert-source-url').val('');

      //Reset modal content
      $('#source-title-edit').addClass('hidden')
      $('#insert-source-edit').addClass('hidden')
      $('#source-existing').removeClass('hidden')
      $('#source-title-new').removeClass('hidden')
      $('#insert-source-save').removeClass('hidden')
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
      handle: ['interaction', 'change', 'blur', 'focus', 'newword:composer'],
      callback: editorCallback
    },
  })

  $('.editable').html($('.editable-content').text())

  $('#insert-link-button-mobile').bind("DOMSubtreeModified", mobileInsertLinkFix)
})