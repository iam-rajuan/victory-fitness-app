import React, { useMemo } from 'react';
import {
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GOLD = '#C9943A';
const IVORY = '#F7F3EE';
const INTER = "'Inter', sans-serif";
const DMSANS = "'DM Sans', sans-serif";
const MONO = "'JetBrains Mono', monospace";

type Node = {
  type: 'root' | 'text' | 'tag';
  tag?: string;
  text?: string;
  attrs?: Record<string, string>;
  children?: Node[];
};

type Props = {
  htmlContent?: string | null;
  plainText?: string | null;
  pdfUrl?: string | null;
  pdfFilename?: string | null;
};

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  raw.replace(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g, (_m, key, _raw, v1, v2, v3) => {
    attrs[String(key).toLowerCase()] = decodeHtml(String(v1 || v2 || v3 || ''));
    return '';
  });
  return attrs;
}

function plainTextToHtml(value: string) {
  return String(value || '')
    .split(/\n{2,}/)
    .map((part) => `<p>${part.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function parseHtml(html: string): Node {
  const root: Node = { type: 'root', children: [] };
  const stack: Node[] = [root];
  const tokens = String(html || '').match(/<\/?[^>]+>|[^<]+/g) || [];

  tokens.forEach((token) => {
    const parent = stack[stack.length - 1];
    if (!token.startsWith('<')) {
      parent.children?.push({ type: 'text', text: decodeHtml(token) });
      return;
    }
    const close = token.match(/^<\/\s*([a-zA-Z0-9]+)/);
    if (close) {
      const tag = close[1].toLowerCase();
      while (stack.length > 1) {
        const current = stack.pop();
        if (current?.tag === tag) break;
      }
      return;
    }
    const open = token.match(/^<\s*([a-zA-Z0-9]+)([^>]*)>/);
    if (!open) return;
    const tag = open[1].toLowerCase();
    const attrs = parseAttrs(open[2] || '');
    const node: Node = { type: 'tag', tag, attrs, children: [] };
    parent.children?.push(node);
    if (!token.endsWith('/>') && !['br', 'hr', 'img'].includes(tag)) {
      stack.push(node);
    }
  });

  return root;
}

function textContent(nodes: Node[] = []): string {
  return nodes.map((node) => (node.type === 'text' ? node.text || '' : textContent(node.children))).join('');
}

function renderInline(nodes: Node[] = [], keyPrefix: string, extraStyle: object[] = []): React.ReactNode {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    if (node.type === 'text') {
      return <Text key={key}>{node.text}</Text>;
    }
    const tag = node.tag || '';
    if (tag === 'br') return <Text key={key}>{'\n'}</Text>;
    if (tag === 'strong' || tag === 'b') {
      return <Text key={key} style={styles.bold}>{renderInline(node.children, key, extraStyle)}</Text>;
    }
    if (tag === 'em' || tag === 'i') {
      return <Text key={key} style={styles.italic}>{renderInline(node.children, key, extraStyle)}</Text>;
    }
    if (tag === 'u') {
      return <Text key={key} style={styles.underline}>{renderInline(node.children, key, extraStyle)}</Text>;
    }
    if (tag === 'a') {
      const href = String(node.attrs?.href || '');
      return (
        <Text key={key} style={styles.link} onPress={() => href && Linking.openURL(href).catch(() => undefined)}>
          {renderInline(node.children, key, extraStyle)}
        </Text>
      );
    }
    return <Text key={key}>{renderInline(node.children, key, extraStyle)}</Text>;
  });
}

function renderBlocks(nodes: Node[] = [], width: number, keyPrefix = 'legal'): React.ReactNode {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    if (node.type === 'text') {
      const text = String(node.text || '').trim();
      return text ? <Text key={key} style={styles.paragraph}>{text}</Text> : null;
    }
    const tag = node.tag || '';
    if (['h1', 'h2', 'h3', 'h4'].includes(tag)) {
      return <Text key={key} style={[styles.heading, tag === 'h1' && styles.h1, tag === 'h2' && styles.h2]}>{renderInline(node.children, key)}</Text>;
    }
    if (tag === 'p') {
      if ((node.children || []).some((child) => child.tag === 'img')) {
        return <View key={key} style={styles.paragraphBlock}>{renderBlocks(node.children, width, key)}</View>;
      }
      return <Text key={key} style={styles.paragraph}>{renderInline(node.children, key)}</Text>;
    }
    if (tag === 'blockquote') {
      return <Text key={key} style={styles.blockquote}>{renderInline(node.children, key)}</Text>;
    }
    if (tag === 'ul' || tag === 'ol') {
      const items = (node.children || []).filter((child) => child.tag === 'li');
      return (
        <View key={key} style={styles.list}>
          {items.map((item, itemIndex) => (
            <View key={`${key}-li-${itemIndex}`} style={styles.listItem}>
              <Text style={styles.bullet}>{tag === 'ol' ? `${itemIndex + 1}.` : '•'}</Text>
              <Text style={styles.listText}>{renderInline(item.children, `${key}-li-${itemIndex}`)}</Text>
            </View>
          ))}
        </View>
      );
    }
    if (tag === 'img') {
      const src = String(node.attrs?.src || '');
      if (!src) return null;
      const frameHeight = Math.min(260, Math.max(168, width * 0.5625));
      return (
        <View key={key} style={[styles.imageFrame, { height: frameHeight }]}>
          <Image source={{ uri: src }} style={styles.image} resizeMode="contain" />
        </View>
      );
    }
    if (tag === 'hr') return <View key={key} style={styles.rule} />;
    return <View key={key}>{renderBlocks(node.children, width, key)}</View>;
  });
}

export default function LegalContentRenderer({ htmlContent, plainText, pdfUrl, pdfFilename }: Props) {
  const { width } = useWindowDimensions();
  const root = useMemo(() => parseHtml(htmlContent || plainTextToHtml(plainText || '')), [htmlContent, plainText]);
  const hasBody = textContent(root.children).trim() || String(htmlContent || '').includes('<img');

  return (
    <View style={styles.wrap}>
      {hasBody ? renderBlocks(root.children, width - 40) : <Text style={styles.paragraph}>This content is not available right now.</Text>}
      {pdfUrl ? (
        <TouchableOpacity style={styles.pdfButton} activeOpacity={0.82} onPress={() => Linking.openURL(pdfUrl).catch(() => undefined)}>
          <Ionicons name="document-text-outline" size={18} color="#0D0D0D" />
          <Text style={styles.pdfButtonText}>View PDF</Text>
          {pdfFilename ? <Text style={styles.pdfFileName} numberOfLines={1}>{pdfFilename}</Text> : null}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 18,
  },
  heading: {
    color: IVORY,
    fontFamily: DMSANS,
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 25,
    marginTop: 20,
    marginBottom: 10,
  },
  h1: {
    fontSize: 22,
    lineHeight: 29,
  },
  h2: {
    color: GOLD,
    fontSize: 20,
    lineHeight: 27,
  },
  paragraph: {
    color: 'rgba(247,243,238,0.68)',
    fontFamily: INTER,
    fontSize: 15,
    lineHeight: 25,
    marginBottom: 13,
  },
  paragraphBlock: {
    marginBottom: 13,
  },
  bold: {
    fontWeight: '700',
    color: IVORY,
  },
  italic: {
    fontStyle: 'italic',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  link: {
    color: GOLD,
    textDecorationLine: 'underline',
  },
  blockquote: {
    color: 'rgba(247,243,238,0.72)',
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    backgroundColor: 'rgba(201,148,58,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 14,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  list: {
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  bullet: {
    width: 24,
    color: GOLD,
    fontFamily: MONO,
    fontSize: 13,
    lineHeight: 23,
  },
  listText: {
    flex: 1,
    color: 'rgba(247,243,238,0.68)',
    fontFamily: INTER,
    fontSize: 15,
    lineHeight: 24,
  },
  imageFrame: {
    width: '100%',
    maxWidth: '100%',
    backgroundColor: 'rgba(247,243,238,0.96)',
    borderRadius: 12,
    marginVertical: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(247,243,238,0.12)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(247,243,238,0.14)',
    marginVertical: 20,
  },
  pdfButton: {
    marginTop: 18,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: GOLD,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pdfButtonText: {
    color: '#0D0D0D',
    fontFamily: DMSANS,
    fontWeight: '700',
    fontSize: 14,
  },
  pdfFileName: {
    flex: 1,
    color: 'rgba(13,13,13,0.7)',
    fontFamily: INTER,
    fontSize: 12,
    textAlign: 'right',
  },
});
