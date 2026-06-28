import { EditorState, StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection
} from '@codemirror/view';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting
} from '@codemirror/language';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab
} from '@codemirror/commands';
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  completeFromList
} from '@codemirror/autocomplete';
import { css } from '@codemirror/lang-css';

const cssProperties = [
  'align-content', 'align-items', 'align-self', 'animation', 'animation-delay',
  'animation-direction', 'animation-duration', 'animation-fill-mode',
  'animation-name', 'animation-timing-function', 'appearance',
  'backdrop-filter', 'background', 'background-attachment', 'background-clip',
  'background-color', 'background-image', 'background-position',
  'background-repeat', 'background-size', 'border', 'border-bottom',
  'border-bottom-color', 'border-bottom-left-radius',
  'border-bottom-right-radius', 'border-bottom-style', 'border-bottom-width',
  'border-collapse', 'border-color', 'border-image', 'border-left',
  'border-left-color', 'border-left-style', 'border-left-width',
  'border-radius', 'border-right', 'border-right-color',
  'border-right-style', 'border-right-width', 'border-spacing',
  'border-style', 'border-top', 'border-top-color',
  'border-top-left-radius', 'border-top-right-radius', 'border-top-style',
  'border-top-width', 'border-width', 'bottom', 'box-shadow',
  'box-sizing', 'caption-side', 'caret-color', 'clear', 'clip-path',
  'color', 'color-scheme', 'column-count', 'column-gap', 'column-rule',
  'columns', 'content', 'cursor', 'display', 'filter', 'flex',
  'flex-basis', 'flex-direction', 'flex-flow', 'flex-grow', 'flex-shrink',
  'flex-wrap', 'float', 'font', 'font-family', 'font-feature-settings',
  'font-size', 'font-style', 'font-variant', 'font-weight', 'gap',
  'grid', 'grid-area', 'grid-auto-columns', 'grid-auto-flow',
  'grid-auto-rows', 'grid-column', 'grid-column-end', 'grid-column-start',
  'grid-row', 'grid-row-end', 'grid-row-start', 'grid-template',
  'grid-template-areas', 'grid-template-columns', 'grid-template-rows',
  'height', 'hyphens', 'inset', 'isolation', 'justify-content',
  'justify-items', 'justify-self', 'left', 'letter-spacing',
  'line-height', 'list-style', 'list-style-image', 'list-style-position',
  'list-style-type', 'margin', 'margin-bottom', 'margin-left',
  'margin-right', 'margin-top', 'max-height', 'max-width', 'min-height',
  'min-width', 'mix-blend-mode', 'object-fit', 'object-position',
  'opacity', 'order', 'outline', 'outline-color', 'outline-offset',
  'outline-style', 'outline-width', 'overflow', 'overflow-wrap',
  'overflow-x', 'overflow-y', 'padding', 'padding-bottom', 'padding-left',
  'padding-right', 'padding-top', 'perspective', 'place-content',
  'place-items', 'place-self', 'pointer-events', 'position', 'resize',
  'right', 'rotate', 'row-gap', 'scale', 'scroll-behavior',
  'scroll-margin', 'scroll-padding', 'text-align', 'text-decoration',
  'text-decoration-color', 'text-decoration-line',
  'text-decoration-style', 'text-indent', 'text-overflow', 'text-shadow',
  'text-transform', 'top', 'transform', 'transform-origin', 'transition',
  'transition-delay', 'transition-duration', 'transition-property',
  'transition-timing-function', 'translate', 'user-select',
  'vertical-align', 'visibility', 'white-space', 'width', 'word-break',
  'word-spacing', 'word-wrap', 'writing-mode', 'z-index'
];

const propertyCompletions = cssProperties.map((label) => ({
  label,
  type: 'property',
  apply: label + ': '
}));

const setExternalMarks = StateEffect.define();
const externalMarks = StateField.define({
  create() {
    return Decoration.none;
  },
  update(value, tr) {
    value = value.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setExternalMarks)) return effect.value;
    }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field)
});

class ColorWidget extends WidgetType {
  constructor(textarea, start, end, color) {
    super();
    this.textarea = textarea;
    this.start = start;
    this.end = end;
    this.color = color;
  }

  eq(other) {
    return this.start === other.start && this.end === other.end && this.color === other.color;
  }

  toDOM() {
    const swatch = document.createElement('span');
    swatch.className = 'cm-sc-color-swatch';
    swatch.style.background = this.color;
    swatch.title = 'Edit color';
    swatch.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.textarea.dispatchEvent(new CustomEvent('sc-color-swatch-click', {
        detail: {
          start: this.start,
          end: this.end,
          color: this.color,
          rect: swatch.getBoundingClientRect()
        }
      }));
    });
    return swatch;
  }

  ignoreEvent() {
    return false;
  }
}

function buildColorDecorations(view, textarea) {
  const widgets = [];
  const colorPattern = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|(?:rgb|rgba|hsl|hsla)\([^)]*\)/g;

  for (const range of view.visibleRanges) {
    const text = view.state.doc.sliceString(range.from, range.to);
    colorPattern.lastIndex = 0;
    let match;
    while ((match = colorPattern.exec(text)) !== null) {
      const start = range.from + match.index;
      const end = start + match[0].length;
      widgets.push(
        Decoration.widget({
          widget: new ColorWidget(textarea, start, end, match[0]),
          side: -1
        }).range(start)
      );
    }
  }

  return Decoration.set(widgets, true);
}

function colorSwatches(textarea) {
  return ViewPlugin.fromClass(class {
    constructor(view) {
      this.decorations = buildColorDecorations(view, textarea);
    }

    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildColorDecorations(update.view, textarea);
      }
    }
  }, {
    decorations: (plugin) => plugin.decorations
  });
}

function styleCraftTheme() {
  return EditorView.theme({
    '&': {
      height: '100%',
      background: 'var(--sc-bg)',
      color: 'var(--sc-text)',
      fontSize: '13px'
    },
    '.cm-scroller': {
      fontFamily: "'SFMono-Regular','Cascadia Code','Consolas','Liberation Mono','Menlo',monospace",
      lineHeight: '20px',
      overflow: 'auto'
    },
    '.cm-content': {
      padding: '10px 14px',
      caretColor: 'var(--sc-cursor)',
      minHeight: '100%'
    },
    '.cm-gutters': {
      background: 'var(--sc-gutter-bg)',
      color: 'var(--sc-gutter-text)',
      borderRight: '1px solid var(--sc-border)'
    },
    '.cm-activeLineGutter': {
      background: 'var(--sc-accent-dim)',
      color: 'var(--sc-gutter-active)',
      fontWeight: '600'
    },
    '.cm-activeLine': {
      background: 'rgba(203,166,247,0.035)'
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      background: 'var(--sc-selection)'
    },
    '&.cm-focused': {
      outline: 'none'
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--sc-cursor)'
    },
    '.cm-foldGutter span': {
      color: 'var(--sc-muted)'
    },
    '.cm-tooltip': {
      background: 'var(--sc-surface)',
      color: 'var(--sc-text)',
      border: '1px solid var(--sc-border-h)',
      borderRadius: '6px',
      boxShadow: '0 8px 24px var(--sc-shadow)'
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      background: 'var(--sc-accent-dim)',
      color: 'var(--sc-accent)'
    },
    '.cm-sc-find-match': {
      background: 'rgba(249,226,175,0.25)',
      outline: '1px solid rgba(249,226,175,0.4)',
      borderRadius: '2px'
    },
    '.cm-sc-find-current': {
      background: 'rgba(249,226,175,0.5)',
      outline: '1px solid var(--sc-yellow)',
      borderRadius: '2px'
    },
    '.cm-sc-bracket': {
      background: 'rgba(203,166,247,0.2)',
      outline: '1px solid rgba(203,166,247,0.4)',
      borderRadius: '2px'
    },
    '.cm-sc-color-swatch': {
      display: 'inline-block',
      width: '10px',
      height: '10px',
      borderRadius: '2px',
      border: '1px solid rgba(255,255,255,0.28)',
      verticalAlign: 'middle',
      marginRight: '4px',
      cursor: 'pointer',
      position: 'relative',
      top: '1px'
    },
    '.tok-comment': {
      color: 'var(--sc-hl-comment)',
      fontStyle: 'italic'
    },
    '.tok-keyword': {
      color: 'var(--sc-hl-atrule)'
    },
    '.tok-propertyName': {
      color: 'var(--sc-hl-property)'
    },
    '.tok-string': {
      color: 'var(--sc-hl-string)'
    },
    '.tok-number': {
      color: 'var(--sc-hl-number)'
    },
    '.tok-variableName, .tok-atom, .tok-literal': {
      color: 'var(--sc-hl-value)'
    },
    '.tok-punctuation, .tok-operator': {
      color: 'var(--sc-hl-punct)'
    },
    '.tok-className, .tok-tagName, .tok-attributeName': {
      color: 'var(--sc-hl-selector)'
    }
  });
}

function clampPosition(view, pos) {
  return Math.max(0, Math.min(Number(pos) || 0, view.state.doc.length));
}

function cloneKeyboardEvent(type, event) {
  return new KeyboardEvent(type, {
    key: event.key,
    code: event.code,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
    repeat: event.repeat,
    bubbles: true,
    cancelable: true
  });
}

function create(options) {
  const { host, textarea } = options;
  if (!host || !textarea) return null;

  let forwardingSelection = false;
  let suppressInput = false;

  const state = EditorState.create({
    doc: textarea.value || '',
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      autocompletion({
        override: [completeFromList(propertyCompletions)],
        activateOnTyping: true
      }),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      css(),
      externalMarks,
      colorSwatches(textarea),
      styleCraftTheme(),
      keymap.of([
        indentWithTab,
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap
      ]),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !suppressInput) {
          textarea.dispatchEvent(new Event('input', { bubbles: false }));
        }
        if (update.selectionSet && !forwardingSelection) {
          textarea.dispatchEvent(new KeyboardEvent('keyup', {
            key: 'ArrowRight',
            bubbles: false
          }));
        }
      })
    ]
  });

  const view = new EditorView({ state, parent: host });
  const scroller = view.scrollDOM;

  view.dom.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && ['f', 'h'].includes(key)) {
      textarea.dispatchEvent(new CustomEvent('sc-editor-shortcut', {
        detail: { key },
        cancelable: true
      }));
      event.preventDefault();
      return;
    }
    const shouldForward = (
      ((event.ctrlKey || event.metaKey) && ['s', 'z', 'y'].includes(key)) ||
      (event.key === 'Escape')
    );
    if (!shouldForward) return;
    const forwarded = cloneKeyboardEvent('keydown', event);
    textarea.dispatchEvent(forwarded);
    if (forwarded.defaultPrevented) event.preventDefault();
  }, true);

  view.dom.addEventListener('click', () => {
    textarea.dispatchEvent(new MouseEvent('click', { bubbles: false }));
  });

  scroller.addEventListener('scroll', () => {
    textarea.dispatchEvent(new Event('scroll', { bubbles: false }));
  });

  function selectionStart() {
    const selection = view.state.selection.main;
    return Math.min(selection.from, selection.to);
  }

  function selectionEnd() {
    const selection = view.state.selection.main;
    return Math.max(selection.from, selection.to);
  }

  function setSelection(start, end = start) {
    const from = clampPosition(view, start);
    const to = clampPosition(view, end);
    forwardingSelection = true;
    view.dispatch({
      selection: { anchor: from, head: to },
      scrollIntoView: true
    });
    forwardingSelection = false;
  }

  return {
    engine: 'codemirror',
    getValue() {
      return view.state.doc.toString();
    },
    setValue(value) {
      const next = String(value ?? '');
      const current = view.state.doc.toString();
      if (next === current) return;
      suppressInput = true;
      try {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: next },
          selection: { anchor: Math.min(selectionStart(), next.length) }
        });
      } finally {
        suppressInput = false;
      }
    },
    selectionStart,
    selectionEnd,
    setSelectionRange(start, end) {
      setSelection(start, end);
    },
    replaceRange(replacement, start, end, selectionMode = 'preserve') {
      const from = clampPosition(view, start);
      const to = clampPosition(view, end);
      const insert = String(replacement ?? '');
      let anchor = from + insert.length;
      if (selectionMode === 'select') anchor = from;
      if (selectionMode === 'start') anchor = from;
      suppressInput = true;
      try {
        view.dispatch({
          changes: { from, to, insert },
          selection: selectionMode === 'select'
            ? { anchor: from, head: from + insert.length }
            : { anchor },
          scrollIntoView: true
        });
      } finally {
        suppressInput = false;
      }
    },
    focus() {
      view.focus();
    },
    getBoundingClientRect() {
      return scroller.getBoundingClientRect();
    },
    get clientHeight() {
      return scroller.clientHeight;
    },
    get scrollTop() {
      return scroller.scrollTop;
    },
    set scrollTop(value) {
      scroller.scrollTop = Number(value) || 0;
    },
    get scrollLeft() {
      return scroller.scrollLeft;
    },
    set scrollLeft(value) {
      scroller.scrollLeft = Number(value) || 0;
    },
    setExternalMarks({ findMatches = [], findCurrent = -1, bracketA = -1, bracketB = -1 } = {}) {
      const marks = [];
      const docLength = view.state.doc.length;

      for (let index = 0; index < findMatches.length; index++) {
        const match = findMatches[index];
        const from = clampPosition(view, match.start);
        const to = clampPosition(view, match.end);
        if (to <= from || from >= docLength) continue;
        marks.push(Decoration.mark({
          class: index === findCurrent ? 'cm-sc-find-current' : 'cm-sc-find-match'
        }).range(from, Math.min(to, docLength)));
      }

      if (bracketA >= 0 && bracketB >= 0) {
        const first = clampPosition(view, bracketA);
        const second = clampPosition(view, bracketB);
        if (first < docLength) marks.push(Decoration.mark({ class: 'cm-sc-bracket' }).range(first, first + 1));
        if (second < docLength) marks.push(Decoration.mark({ class: 'cm-sc-bracket' }).range(second, second + 1));
      }

      view.dispatch({
        effects: setExternalMarks.of(Decoration.set(marks, true))
      });
    },
    destroy() {
      view.destroy();
    }
  };
}

window.StyleCraftCodeMirror = { create };
