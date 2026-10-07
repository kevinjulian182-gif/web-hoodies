// Plain <textarea> fields (product description/details, CMS copy, delivery
// notes, ...) store raw text, not HTML — so "paste fidelity" here means
// turning a pasted <ul>/<ol> into bullet-prefixed lines instead of losing
// the list structure entirely (the browser's default plain-text paste just
// concatenates every <li> into one run-on line).

const BLOCK_TAGS = new Set(['p', 'div', 'section', 'article', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

export function htmlToPlainTextWithBullets(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const lines: string[] = [];
  let current = '';

  // Only pushes a line when there's actual pending content — a block tag's
  // "flush before I start" call would otherwise push a spurious blank line
  // every time (since `current` is still empty at that point), stacking up
  // a blank line between every bullet.
  const flush = () => {
    if (current.trim().length > 0) lines.push(current.trimEnd());
    current = '';
  };

  const walk = (node: ChildNode, listStack: { type: 'ul' | 'ol'; counter: number }[]) => {
    if (node.nodeType === Node.TEXT_NODE) {
      current += (node.textContent ?? '').replace(/\s+/g, ' ');
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'br') {
      flush();
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      flush();
      listStack.push({ type: tag, counter: 1 });
      el.childNodes.forEach((child) => walk(child, listStack));
      listStack.pop();
      flush();
      return;
    }
    if (tag === 'li') {
      flush();
      const depth = listStack.length;
      const top = listStack[listStack.length - 1];
      const indent = '  '.repeat(Math.max(0, depth - 1));
      current = top?.type === 'ol' ? `${indent}${top.counter++}. ` : `${indent}• `;
      el.childNodes.forEach((child) => walk(child, listStack));
      flush();
      return;
    }
    if (BLOCK_TAGS.has(tag)) {
      flush();
      el.childNodes.forEach((child) => walk(child, listStack));
      flush();
      return;
    }
    el.childNodes.forEach((child) => walk(child, listStack));
  };

  doc.body.childNodes.forEach((child) => walk(child, []));
  flush();

  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Attach to a textarea/input's onPaste. No-ops (lets the default plain-text
 * paste happen) when the clipboard has no HTML to convert. */
export function pasteBulletedText(
  e: React.ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  value: string,
  onChange: (next: string) => void
) {
  const html = e.clipboardData.getData('text/html');
  if (!html) return;
  e.preventDefault();
  const converted = htmlToPlainTextWithBullets(html);
  const target = e.currentTarget;
  const start = target.selectionStart ?? value.length;
  const end = target.selectionEnd ?? value.length;
  onChange(value.slice(0, start) + converted + value.slice(end));
}

// Live typing shortcut: a lone "-" followed by a space at the start of a
// line (only leading whitespace before it) becomes a bullet character,
// mirroring the markdown-list shortcut from Notion/Word.
export function autoBulletize(value: string, cursorPos: number): string {
  const lineStart = value.lastIndexOf('\n', cursorPos - 1) + 1;
  const linePrefix = value.slice(lineStart, cursorPos);
  const match = linePrefix.match(/^(\s*)-\s$/);
  if (!match) return value;
  const dashIndex = lineStart + match[1].length;
  return value.slice(0, dashIndex) + '•' + value.slice(dashIndex + 1);
}
