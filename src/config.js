// Everything that depends on LinkedIn's markup lives here, so when LinkedIn
// ships a redesign this is the one file to update.
(function (root) {
  const CONFIG = {
    // Editors we consider. Anything contenteditable that matches one of these.
    editorSelector: [
      '[contenteditable="true"][role="textbox"]',
      '.ql-editor[contenteditable="true"]',
      '.ProseMirror[contenteditable="true"]',
      '.msg-form__contenteditable[contenteditable="true"]',
    ].join(','),

    // Contexts are checked in this order; the first match wins. `hints` are
    // matched against the editor's aria-label / placeholder text.
    // Layouts: inline (full row on top of the editor), row (compact row above
    // LinkedIn's footer icons), floating (pill above the box; the fallback when
    // a row target can't be found).
    contexts: [
      {
        id: 'message',
        containers: '.msg-form, .msg-overlay-conversation-bubble, .msg-convo-wrapper, [class*="msg-form"], [class*="msg-overlay"]',
        hints: /write a message|scrivi un messaggio|message/i,
        box: '.msg-form__msg-content-container, .msg-form__contenteditable',
        // Own row right above the message box.
        layout: 'row',
        rowBefore: '.msg-form__msg-content-container',
        limit: null,
      },
      {
        id: 'comment',
        containers: '.comments-comment-box, .comments-comment-texteditor, [class*="comments-comment-box"], [class*="comment-texteditor"], [class*="comments-comment"]',
        hints: /add a comment|add a reply|comment|reply|commento|rispondi/i,
        box: '.comments-comment-box__form-container, .comments-comment-texteditor, .comments-comment-box__form, form',
        // Own row inside the comment box, above the emoji / GIF / photo row. Class
        // names are hashed, so that row is found through the emoji button's label.
        // Shown once you start typing, like LinkedIn's own footer row.
        layout: 'row',
        rowNear: 'button[aria-label*="emoji" i]',
        showOnDraft: true,
        counterBelow: true,
        limit: 1250,
      },
      {
        id: 'post',
        // [role="dialog"] last: the "Start a post" modal (LinkedIn now uses an unlabelled TipTap editor in it).
        containers: '.share-creation-state, .share-box, [class*="share-box"], [class*="share-creation"], [data-test-modal-id="sharebox"], [role="dialog"]',
        hints: /share your thoughts|what do you want to talk about|creating content|create a post|condividi|di cosa vuoi parlare/i,
        layout: 'inline',
        limit: 3000,
      },
    ],

    // How many characters a line break counts as. LinkedIn's comment box
    // appears to count each break as 2 (a 45-line comment overflowed by about
    // the right amount only with 2). Verify on real posts and adjust.
    newlineWeight: { comment: 2, post: 2, message: 1 },

  };
  root.LTF = Object.assign(root.LTF || {}, { CONFIG });
})(globalThis);
