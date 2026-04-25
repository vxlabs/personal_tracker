import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useWikiGraph } from '@/hooks/useWiki'
import { Loader2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

const TYPE_COLORS: Record<string, string> = {
  entity: '#a78bfa',
  concept: '#60a5fa',
  syntax: '#34d399',
  synthesis: '#f472b6',
  default: '#6b7280',
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string
  title: string
  pageType: string
  backLinkCount: number
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: string | SimNode
  target: string | SimNode
}

export function WikiGraph() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { data, loading } = useWikiGraph()
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null)

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth || 600
    const height = container.clientHeight || 500

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const g = svg.append('g')

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })
    svg.call(zoom)

    const nodes: SimNode[] = data.nodes.map(n => ({ ...n }))
    const links: SimLink[] = data.edges.map(e => ({ source: e.source, target: e.target }))

    const simulation = d3.forceSimulation<SimNode>(nodes)
      .force('link', d3.forceLink<SimNode, SimLink>(links).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<SimNode>().radius(d => nodeRadius(d) + 5))

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#374151')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.5)

    // Nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        const rect = container.getBoundingClientRect()
        setTooltip({
          x: event.clientX - rect.left + 10,
          y: event.clientY - rect.top - 30,
          text: d.title,
        })
      })
      .on('mouseout', () => setTooltip(null))
      .on('click', (_, d) => setSelectedNode(d))
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    node.append('circle')
      .attr('r', d => nodeRadius(d))
      .attr('fill', d => TYPE_COLORS[d.pageType] ?? TYPE_COLORS.default)
      .attr('fill-opacity', 0.85)
      .attr('stroke', '#1f2937')
      .attr('stroke-width', 1)

    node.append('text')
      .attr('dy', d => nodeRadius(d) + 11)
      .attr('text-anchor', 'middle')
      .attr('fill', '#9ca3af')
      .attr('font-size', '9px')
      .attr('font-family', 'sans-serif')
      .text(d => d.title.length > 16 ? d.title.slice(0, 14) + '…' : d.title)

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SimNode).x ?? 0)
        .attr('y1', d => (d.source as SimNode).y ?? 0)
        .attr('x2', d => (d.target as SimNode).x ?? 0)
        .attr('y2', d => (d.target as SimNode).y ?? 0)
      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    // Zoom controls
    const zoomIn = () => svg.transition().call(zoom.scaleBy, 1.4)
    const zoomOut = () => svg.transition().call(zoom.scaleBy, 0.7)
    const resetZoom = () => svg.transition().call(zoom.transform, d3.zoomIdentity)

    const el = container.querySelector<HTMLButtonElement>('[data-zoom-in]')
    const el2 = container.querySelector<HTMLButtonElement>('[data-zoom-out]')
    const el3 = container.querySelector<HTMLButtonElement>('[data-zoom-reset]')
    if (el) el.onclick = zoomIn
    if (el2) el2.onclick = zoomOut
    if (el3) el3.onclick = resetZoom

    return () => { simulation.stop() }
  }, [data])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-dim">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading graph...
      </div>
    )
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-dim">
        <p className="text-sm">No wiki pages to graph yet.</p>
        <p className="text-xs mt-1">Compile some sources to build your knowledge graph.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-sans text-sm font-bold text-text-primary">Knowledge Graph</h2>
          <p className="text-xs text-text-dim">{data.nodes.length} nodes · {data.edges.length} links</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3">
          {Object.entries(TYPE_COLORS).filter(([k]) => k !== 'default').map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-text-dim capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex-1 rounded-xl border border-border bg-surface-2 overflow-hidden" ref={containerRef}>
        <svg ref={svgRef} className="w-full h-full" />

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          <button data-zoom-in className="p-1.5 rounded-lg bg-surface-1 border border-border text-text-dim hover:text-text-primary transition-colors">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button data-zoom-out className="p-1.5 rounded-lg bg-surface-1 border border-border text-text-dim hover:text-text-primary transition-colors">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button data-zoom-reset className="p-1.5 rounded-lg bg-surface-1 border border-border text-text-dim hover:text-text-primary transition-colors">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-surface-1 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary shadow-lg z-10"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {tooltip.text}
          </div>
        )}

        {/* Selected node info */}
        {selectedNode && (
          <div className="absolute bottom-3 left-3 bg-surface-1 border border-border rounded-lg px-3 py-2 max-w-xs">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-text-primary">{selectedNode.title}</p>
                <p className="text-xs text-text-dim capitalize mt-0.5">
                  {selectedNode.pageType} · {selectedNode.backLinkCount} backlinks
                </p>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-text-dim hover:text-text-primary text-xs">✕</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function nodeRadius(d: SimNode): number {
  const base = 5
  const extra = Math.min(d.backLinkCount * 2, 12)
  return base + extra
}
