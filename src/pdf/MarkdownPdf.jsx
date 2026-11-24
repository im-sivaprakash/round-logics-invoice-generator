import React from 'react';
import { View, Text, Link, StyleSheet } from '@react-pdf/renderer';
import { marked } from 'marked';

// Renders Markdown (custom T&C) as react-pdf elements: headings, paragraphs, bold/italic,
// links, bulleted and numbered lists (nested), quotes, dividers, tables and code.

const INK = '#0c0c0c';
const MUTED = '#5b5f66';
const RULE = '#d9dbde';
const TINT = '#f4f5f6';

const s = StyleSheet.create({
  h1: { fontSize: 14, fontWeight: 700, marginTop: 8, marginBottom: 5, lineHeight: 1.3 },
  h2: { fontSize: 11, fontWeight: 700, marginTop: 6, marginBottom: 4, lineHeight: 1.3 },
  h3: { fontSize: 10, fontWeight: 700, marginTop: 4, marginBottom: 3, lineHeight: 1.3 },
  h4: { fontSize: 9.4, fontWeight: 700, marginTop: 3, marginBottom: 2, color: MUTED, lineHeight: 1.3 },
  p: { marginBottom: 5, textAlign: 'justify' },
  li: { flexDirection: 'row', marginBottom: 2.5 },
  marker: { width: 16 },
  liBody: { flex: 1 },
  quote: { borderLeftWidth: 2, borderLeftColor: RULE, paddingLeft: 8, marginBottom: 6, color: MUTED },
  hr: { borderBottomWidth: 0.6, borderBottomColor: RULE, marginVertical: 8 },
  code: { backgroundColor: TINT, padding: 6, borderRadius: 3, marginBottom: 6, fontSize: 8.4 },
  table: { borderWidth: 0.6, borderColor: RULE, borderRadius: 3, marginVertical: 5 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.6, borderBottomColor: RULE },
  trLast: { flexDirection: 'row' },
  th: { flex: 1, padding: 5, backgroundColor: TINT, fontWeight: 700, fontSize: 8.4, color: MUTED },
  td: { flex: 1, padding: 5 },
  strong: { fontWeight: 700 },
  em: { fontStyle: 'italic' },
  del: { textDecoration: 'line-through' },
  link: { color: INK, textDecoration: 'underline' },
  codespan: { backgroundColor: TINT },
});

const decode = (t = '') =>
  t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const stripHtml = (t = '') => decode(t.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''));

// Inline tokens → nested <Text>
function inline(tokens = [], keyBase = 'i') {
  return tokens.map((t, i) => {
    const key = `${keyBase}-${i}`;
    switch (t.type) {
      case 'strong': return <Text key={key} style={s.strong}>{inline(t.tokens, key)}</Text>;
      case 'em': return <Text key={key} style={s.em}>{inline(t.tokens, key)}</Text>;
      case 'del': return <Text key={key} style={s.del}>{inline(t.tokens, key)}</Text>;
      case 'codespan': return <Text key={key} style={s.codespan}>{decode(t.text)}</Text>;
      case 'br': return <Text key={key}>{'\n'}</Text>;
      case 'link':
        return /^(https?:|mailto:|tel:)/i.test(t.href || '')
          ? <Link key={key} src={t.href} style={s.link}>{inline(t.tokens, key)}</Link>
          : <Text key={key}>{inline(t.tokens, key)}</Text>;
      case 'image': return <Text key={key}>{decode(t.text || '')}</Text>;
      case 'html': return <Text key={key}>{stripHtml(t.text || t.raw)}</Text>;
      case 'text':
      case 'escape':
        return t.tokens?.length ? <Text key={key}>{inline(t.tokens, key)}</Text> : <Text key={key}>{decode(t.text)}</Text>;
      default:
        return <Text key={key}>{decode(t.text || t.raw || '')}</Text>;
    }
  });
}

function List({ token, depth, keyBase }) {
  const start = Number(token.start) || 1;
  return (
    <View style={{ marginBottom: depth ? 0 : 5, marginLeft: depth ? 4 : 0 }}>
      {token.items.map((item, i) => {
        const key = `${keyBase}-li${i}`;
        const marker = item.task ? (item.checked ? '[x]' : '[ ]') : token.ordered ? `${start + i}.` : depth % 2 ? '–' : '•';
        return (
          <View key={key} style={s.li} wrap={false}>
            <Text style={s.marker}>{marker}</Text>
            <View style={s.liBody}>{blocks(item.tokens, depth + 1, key, true)}</View>
          </View>
        );
      })}
    </View>
  );
}

function Table({ token, keyBase }) {
  const rows = token.rows || [];
  return (
    <View style={s.table}>
      <View style={rows.length ? s.tr : s.trLast} wrap={false}>
        {token.header.map((cell, i) => (
          <Text key={`${keyBase}-h${i}`} style={[s.th, { textAlign: token.align?.[i] || 'left' }]}>{inline(cell.tokens, `${keyBase}-h${i}`)}</Text>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={`${keyBase}-r${r}`} style={r === rows.length - 1 ? s.trLast : s.tr} wrap={false}>
          {row.map((cell, c) => (
            <Text key={`${keyBase}-r${r}c${c}`} style={[s.td, { textAlign: token.align?.[c] || 'left' }]}>{inline(cell.tokens, `${keyBase}-r${r}c${c}`)}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

// Block tokens → <View>/<Text>
function blocks(tokens = [], depth = 0, keyBase = 'b', tight = false) {
  return tokens.map((t, i) => {
    const key = `${keyBase}-${i}`;
    switch (t.type) {
      case 'heading': {
        const style = s[`h${Math.min(t.depth, 4)}`];
        return <Text key={key} style={style} minPresenceAhead={36}>{inline(t.tokens, key)}</Text>;
      }
      case 'paragraph':
        return <Text key={key} style={tight ? { marginBottom: 1 } : s.p}>{inline(t.tokens, key)}</Text>;
      case 'text':
        return <Text key={key} style={tight ? { marginBottom: 1 } : s.p}>{t.tokens ? inline(t.tokens, key) : decode(t.text)}</Text>;
      case 'list':
        return <List key={key} token={t} depth={depth} keyBase={key} />;
      case 'blockquote':
        return <View key={key} style={s.quote}>{blocks(t.tokens, depth, key)}</View>;
      case 'hr':
        return <View key={key} style={s.hr} />;
      case 'code':
        return <Text key={key} style={s.code}>{t.text}</Text>;
      case 'table':
        return <Table key={key} token={t} keyBase={key} />;
      case 'html': {
        const txt = stripHtml(t.text || t.raw).trim();
        return txt ? <Text key={key} style={s.p}>{txt}</Text> : null;
      }
      case 'space':
      case 'def':
        return null;
      default:
        return t.text ? <Text key={key} style={s.p}>{decode(t.text)}</Text> : null;
    }
  });
}

export default function MarkdownPdf({ markdown }) {
  const tokens = marked.lexer(String(markdown || ''), { gfm: true });
  return <View>{blocks(tokens)}</View>;
}
