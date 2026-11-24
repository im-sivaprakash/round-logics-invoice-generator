import { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Large Markdown editor with a formatting toolbar and live preview.
// Toolbar buttons write standard Markdown, so the text can also be copied to/from .md files.

const TOOLS = [
  { id: 'h2', label: 'H2', title: 'Section heading', line: '## ' },
  { id: 'h3', label: 'H3', title: 'Sub-heading', line: '### ' },
  { id: 'bold', label: 'B', title: 'Bold (Ctrl+B)', wrap: '**', style: { fontWeight: 800 } },
  { id: 'italic', label: 'I', title: 'Italic (Ctrl+I)', wrap: '*', style: { fontStyle: 'italic' } },
  { id: 'ul', label: '• List', title: 'Bulleted list', line: '- ' },
  { id: 'ol', label: '1. List', title: 'Numbered list', line: 'numbered' },
  { id: 'quote', label: '❝', title: 'Quote / note', line: '> ' },
  { id: 'hr', label: '―', title: 'Divider', insert: '\n\n---\n\n' },
  { id: 'table', label: 'Table', title: 'Insert table', insert: '\n\n| Item | Detail |\n|---|---|\n| | |\n\n' },
];

// Replace the textarea selection while keeping the browser's undo history where possible.
function replaceRange(el, start, end, text) {
  el.focus();
  el.setSelectionRange(start, end);
  const ok = typeof document.execCommand === 'function' && document.execCommand('insertText', false, text);
  if (!ok) el.setRangeText(text, start, end, 'end');
}

export default function MarkdownEditor({ value, onChange, placeholder, minRows = 22 }) {
  const ref = useRef(null);
  const [view, setView] = useState('write');
  const [expanded, setExpanded] = useState(false);

  // Full-screen mode: Esc closes it; page behind doesn't scroll
  useEffect(() => {
    if (!expanded) return undefined;
    const onKey = (e) => e.key === 'Escape' && setExpanded(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [expanded]);

  const toggleExpand = () => {
    setExpanded((x) => {
      setView(!x ? 'split' : 'write');
      return !x;
    });
  };

  const html = useMemo(
    () => (view === 'write' ? '' : DOMPurify.sanitize(marked.parse(value || '', { gfm: true, breaks: false }))),
    [value, view],
  );

  const emit = () => onChange(ref.current.value);

  function apply(tool) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value: v } = el;

    if (tool.wrap) {
      const sel = v.slice(s, e) || 'text';
      replaceRange(el, s, e, `${tool.wrap}${sel}${tool.wrap}`);
      el.setSelectionRange(s + tool.wrap.length, s + tool.wrap.length + sel.length);
    } else if (tool.line) {
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const lineEnd = v.indexOf('\n', e) === -1 ? v.length : v.indexOf('\n', e);
      const lines = v.slice(lineStart, lineEnd).split('\n');
      const prefixed = lines.map((l, i) => {
        const bare = l.replace(/^(#{1,6} |- |\* |> |\d+\. )/, '');
        return (tool.line === 'numbered' ? `${i + 1}. ` : tool.line) + bare;
      });
      replaceRange(el, lineStart, lineEnd, prefixed.join('\n'));
    } else if (tool.insert) {
      replaceRange(el, s, e, tool.insert);
    }
    emit();
  }

  function onKeyDown(ev) {
    if (!(ev.ctrlKey || ev.metaKey)) return;
    const k = ev.key.toLowerCase();
    if (k === 'b' || k === 'i') {
      ev.preventDefault();
      apply(TOOLS.find((t) => t.id === (k === 'b' ? 'bold' : 'italic')));
    }
  }

  const words = (value || '').trim() ? (value || '').trim().split(/\s+/).length : 0;

  return (
    <>
    {expanded && <div className="md-backdrop" onClick={toggleExpand} />}
    <div className={`md-editor view-${view}${expanded ? ' expanded' : ''}`}>
      <div className="md-toolbar" role="toolbar" aria-label="Formatting">
        <div className="md-tools">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="md-tool"
              title={t.title}
              aria-label={t.title}
              style={t.style}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => apply(t)}
              disabled={view === 'preview'}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="md-views" role="tablist" aria-label="Editor view">
          {[['write', 'Write'], ['split', 'Split'], ['preview', 'Preview']].map(([v, l]) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>
              {l}
            </button>
          ))}
          <button type="button" className="md-expand" onClick={toggleExpand} title={expanded ? 'Close full screen (Esc)' : 'Edit full screen'}>
            {expanded ? 'Done' : 'Expand'}
          </button>
        </div>
      </div>

      <div className="md-panes">
        {view !== 'preview' && (
          <textarea
            ref={ref}
            className="md-input"
            value={value}
            rows={minRows}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck
          />
        )}
        {view !== 'write' && (
          <div className="md-preview" aria-label="Preview">
            {(value || '').trim()
              ? <div dangerouslySetInnerHTML={{ __html: html }} />
              : <p className="hint">Nothing to preview yet.</p>}
          </div>
        )}
      </div>
      <div className="md-foot">
        <span>Markdown · {words} words</span>
        <span>**bold** · *italic* · ## heading · - list · 1. list</span>
      </div>
    </div>
    </>
  );
}
