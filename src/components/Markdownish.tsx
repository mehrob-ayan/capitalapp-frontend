import type { ReactNode } from 'react'

// Minimal Markdown renderer for advisor output — handles headings, bullet
// lists, bold and italic. Not a full parser; enough for the model's replies.
function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const re = /\*\*(.+?)\*\*|_(.+?)_/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[1] != null) nodes.push(<strong key={k++}>{m[1]}</strong>)
    else nodes.push(<em key={k++}>{m[2]}</em>)
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

export function Markdownish({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n')
  const out: ReactNode[] = []
  let list: ReactNode[] = []
  const flush = () => {
    if (list.length) { out.push(<ul key={`ul${out.length}`} className="md-ul">{list}</ul>); list = [] }
  }
  lines.forEach((raw, i) => {
    const line = raw.trimEnd()
    const t = line.trim()
    if (!t) { flush(); return }
    if (/^#{1,6}\s/.test(t)) {
      flush()
      out.push(<h4 key={i} className="md-h">{inline(t.replace(/^#{1,6}\s/, ''))}</h4>)
    } else if (/^[-*•]\s/.test(t)) {
      list.push(<li key={i}>{inline(t.replace(/^[-*•]\s/, ''))}</li>)
    } else {
      flush()
      out.push(<p key={i} className="md-p">{inline(t)}</p>)
    }
  })
  flush()
  return <div className="md">{out}</div>
}
