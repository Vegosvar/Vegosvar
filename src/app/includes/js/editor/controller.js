  var editor
(function ($) {
  var instance = {
    element: null,
    bookmark: null,
    selection: {}
  }

  $.fn.editorParserRules = function() {
    return $.extend(wysihtml5ParserRules.tags,
      {
        code: { unwrap: 1 },
        pre: { unwrap: 1 },
        li: { unwrap: 1 },
        ul: { unwrap: 1 }
      }
    )
  }

  $.fn.editorController = function (action, args) {
    var settings = $.extend({
      element: null,
      toolbar: null,
      parserRules: $.fn.editorParserRules(),
      events: {
        handle: [],
        callback: function () {}
      },
      type: {},
      insert: {}
    }, args)

    switch (action) {
      case 'init':
        elem = document.querySelector(settings.element)
        if(elem !== null) {
          instance.element = elem;
          editor = new wysihtml5.Editor(elem, {
            parserRules: settings.parserRules,
            toolbar: document.querySelector(settings.toolbar),
            useLineBreaks: true
          })

          //Set up event listener callbacks
          $.each(settings.events.handle, function (i, e) {
            editor.on(e, function () {
              settings.events.callback.call({
                event: e
              })
            })
          })
        }

        break
      case 'insert':
        if (settings.insert.type === 'html') {
          editor.composer.commands.exec('insertHTML', settings.insert.content)
        }
        $.fn.editorController('triggerEvent', {type:'change'})
        break
      case 'setFocus':
        $(instance.element).focus()
        break
      case 'getBookmark':
        $.fn.editorController('setFocus')
        instance.bookmark = editor.composer.selection.getBookmark()
        break
      case 'setBookmark':
        editor.composer.selection.setBookmark(instance.bookmark)
        break
      case 'saveSelection':
        instance.selection = {
          text: editor.composer.selection.getText(),
          html: editor.composer.selection.getHtml(),
          node: editor.composer.selection.getSelectedNode()
        }
        break
      case 'getSelection':
        return instance.selection
      case 'setSelection':
        if('text' in instance.selection && typeof(instance.selection.text) !== 'undefined') {
          if(instance.selection.text.length == 0 && instance.selection.node != instance.element) {
            editor.composer.selection.selectNode(instance.selection.node)
          } else {
            $.fn.editorController('setBookmark')
          }
        } else {
          $.fn.editorController('setFocus')
          $.fn.editorController('setBookmark')
        }
        break
      case 'getValue':
        return editor.composer.getValue()
      case 'setValue':
        editor.setValue(args, false)
        break
      case 'selectionIsType':
        return editor.composer.commands.state(settings.type)
      case 'triggerEvent':
        $(editor).trigger(settings.type);
        break
      case 'disable':
        editor.disable()
        break
      case 'enable':
        editor.enable()
        break
    }
  }
}(jQuery))