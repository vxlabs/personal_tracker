import { useMemo } from 'react'

interface Props {
  content: string
  className?: string
  onPageClick?: (path: string) => void
}

/** Minimal markdown renderer that highlights [[wikilinks]] and basic formatting. */
export function WikiMarkdown({ content, className = '', onPageClick }: Props) {
  const html = useMemo(() => renderMarkdown(content), [content])

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement
    if (el.dataset.wikilink && onPageClick) {
      e.preventDefault()
      onPageClick(el.dataset.wikilink)
    }
  }

  return (
    <div
      className={`wiki-markdown prose prose-sm prose-invert max-w-none ${className}`}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={handleClick}
    />
  )
}

function renderMarkdown(md: string): string {
  // Strip YAML frontmatter
  let text = md.replace(/^---[\s\S]*?---\n?/, '')

  // Escape HTML
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const lines = text.split('\n')
  const out: string[] = []
  let inCode = false
  let inList = false

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (!inCode) {
        inCode = true
        out.push('<pre class="bg-surface-2 border border-border rounded-lg p-3 overflow-x-auto text-xs"><code>')
      } else {
        inCode = false
        out.push('</code></pre>')
      }
      continue
    }
    if (inCode) { out.push(escapeCode(line) + '\n'); continue }

    // Close list if needed
    if (inList && !line.startsWith('- ') && !line.startsWith('* ')) {
      out.push('</ul>')
      inList = false
    }

    if (/^#{6} /.test(line)) { out.push(`<h6 class="text-xs font-semibold text-text-dim mt-3 mb-1">${inline(line.slice(7))}</h6>`); continue }
    if (/^#{5} /.test(line)) { out.push(`<h5 class="text-xs font-bold text-text-primary mt-3 mb-1">${inline(line.slice(6))}</h5>`); continue }
    if (/^#{4} /.test(line)) { out.push(`<h4 class="text-sm font-semibold text-text-primary mt-4 mb-1">${inline(line.slice(5))}</h4>`); continue }
    if (/^#{3} /.test(line)) { out.push(`<h3 class="text-sm font-bold text-text-primary mt-4 mb-2">${inline(line.slice(4))}</h3>`); continue }
    if (/^#{2} /.test(line)) { out.push(`<h2 class="text-base font-bold text-text-primary mt-5 mb-2 border-b border-border pb-1">${inline(line.slice(3))}</h2>`); continue }
    if (/^# /.test(line))    { out.push(`<h1 class="text-lg font-bold text-text-primary mt-5 mb-3">${inline(line.slice(2))}</h1>`); continue }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) { out.push('<ul class="list-disc list-inside space-y-1 my-2">'); inList = true }
      out.push(`<li class="text-sm text-text-primary">${inline(line.slice(2))}</li>`)
      continue
    }

    if (line.startsWith('> ')) {
      out.push(`<blockquote class="border-l-2 border-accent-purple pl-3 my-2 text-sm text-text-dim italic">${inline(line.slice(2))}</blockquote>`)
      continue
    }

    if (line === '') {
      out.push('<div class="h-2"></div>')
      continue
    }

    out.push(`<p class="text-sm text-text-primary leading-relaxed">${inline(line)}</p>`)
  }

  if (inList) out.push('</ul>')
  if (inCode) out.push('</code></pre>')

  return out.join('\n')
}

function inline(text: string): string {
  return text
    // [[wikilinks]]
    .replace(/\[\[([^\]]+)\]\]/g, (_, title) => {
      const path = `wiki/entities/${title.toLowerCase().replace(/\s+/g, '-')}.md`
      return `<button data-wikilink="${path}" class="text-accent-purple hover:underline font-medium cursor-pointer">[[${title}]]</button>`
    })
    // **bold**
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // *italic*
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // `code`
    .replace(/`([^`]+)`/g, '<code class="bg-surface-2 border border-border rounded px-1 py-0.5 text-xs font-mono text-accent-purple">$1</code>')
    // [text](url)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent-purple hover:underline">$1</a>')
}

function escapeCode(text: string): string {
  return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
