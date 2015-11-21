(function ($) {
  var editor
  var instance = {
    element: null,
    bookmark: null,
    selection: {}
  }

  $.fn.editorController = function (action, args) {
    var settings = $.extend({
      element: null,
      toolbar: null,
      parserRules: null,
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
            parserRules: wysihtml5ParserRules,
            toolbar: document.querySelector(settings.toolbar),
            useLineBreaks: true
          })
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
      case 'getBookmark':
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
        if(instance.selection.text.length == 0 && instance.selection.node != instance.element) {
          editor.composer.selection.selectNode(instance.selection.node)
        } else {
          $.fn.editorController('setBookmark')
        }
        break
      case 'getValue':
        return editor.composer.getValue()
      case 'selectionIsType':
        return editor.composer.commands.state(settings.type)
      case 'triggerEvent':
        $(editor).trigger(settings.type);
    }
  }
}(jQuery))