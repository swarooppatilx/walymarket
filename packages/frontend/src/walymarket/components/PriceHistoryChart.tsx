import { useMemo, useRef, useState } from 'react';
import UICard from '~~/components/ui/Card';
import { formatPercent, formatTime } from '~~/walymarket/helpers/format';
import usePriceHistory, { PricePoint, Timeframe } from '~~/walymarket/hooks/usePriceHistory';

const padding = { left: 36, right: 12, top: 8, bottom: 24 };

function linePath(points: PricePoint[], width: number, height: number, key: 'yes' | 'no') {
    if (!points.length) return '';
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;
    const minX = points[0].ts;
    const maxX = points[points.length - 1].ts;
    const rangeX = Math.max(1, maxX - minX);
    const mapX = (ts: number) => padding.left + ((ts - minX) / rangeX) * innerW;
    const mapY = (val: number) => padding.top + (1 - val) * innerH;
    let d = '';
    points.forEach((p, idx) => {
        const x = mapX(p.ts);
        const y = mapY(p[key]);
        d += `${idx === 0 ? 'M' : 'L'}${x},${y}`;
    });
    return d;
}

export const PriceHistoryChart = ({ marketId }: { marketId: string }) => {
    const [tf, setTf] = useState<Timeframe>('24H');
    const { points, loading, error, last } = usePriceHistory(marketId, tf);
    const svgRef = useRef<SVGSVGElement>(null);
    const [hover, setHover] = useState<{ x: number; y: number; p: PricePoint } | null>(null);

    const size = { width: 680, height: 240 };

    const paths = useMemo(() => {
        return {
            yes: linePath(points, size.width, size.height, 'yes'),
            no: linePath(points, size.width, size.height, 'no'),
        };
    }, [points]);

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current || !points.length) return;
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const innerW = size.width - padding.left - padding.right;
        const minX = points[0].ts;
        const maxX = points[points.length - 1].ts;
        const ratio = Math.min(1, Math.max(0, (x - padding.left) / innerW));
        const ts = minX + (maxX - minX) * ratio;
        // find nearest point
        let idx = 0;
        let best = 0;
        for (let i = 0; i < points.length; i++) {
            const dist = Math.abs(points[i].ts - ts);
            if (i === 0 || dist < best) { best = dist; idx = i; }
        }
        const p = points[idx];
        const innerH = size.height - padding.top - padding.bottom;
        const y = padding.top + (1 - p.yes) * innerH;
        setHover({ x: padding.left + ratio * innerW, y, p });
    };

    const handleLeave = () => setHover(null);

    const currentYes = last ? formatPercent(last.yes) : '—';
    const currentNo = last ? formatPercent(last.no) : '—';

    return (
        <UICard className="p-4">
            <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center flex-wrap gap-3">
                    <h3 className="text-base font-bold text-white">Price History</h3>
                    <div className="flex gap-1 rounded-md border border-[#535353] bg-[#1a1a1a] p-1">
                        {(['1H', '24H', '7D', '1M', 'ALL'] as Timeframe[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTf(t)}
                                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                                    tf === t ? 'bg-[#B6F34E] text-black' : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                        <span className="text-sm font-medium text-white">Yes {currentYes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-rose-500" />
                        <span className="text-sm font-medium text-white">No {currentNo}</span>
                    </div>
                </div>
                {!loading && !error && points.length === 0 && (
                    <div className="flex justify-center items-center h-[240px] rounded-lg bg-[#1a1a1a]">
                        <p className="text-gray-400 text-sm">No trading history yet</p>
                    </div>
                )}
                {!loading && !error && points.length > 0 && (
                    <svg
                        ref={svgRef}
                        width="100%"
                        height={size.height}
                        viewBox={`0 0 ${size.width} ${size.height}`}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleLeave}
                        className="cursor-crosshair rounded-lg"
                    >
                        {/* Grid lines */}
                        {[0.25, 0.5, 0.75].map(ratio => (
                            <line
                                key={ratio}
                                x1={padding.left}
                                y1={padding.top + (size.height - padding.top - padding.bottom) * ratio}
                                x2={size.width - padding.right}
                                y2={padding.top + (size.height - padding.top - padding.bottom) * ratio}
                                stroke="#334155"
                                strokeDasharray="2 4"
                                opacity={0.25}
                            />
                        ))}
                        {/* Axes */}
                        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={size.height - padding.bottom} stroke="#475569" strokeWidth={1.5} opacity={0.6} />
                        <line x1={padding.left} y1={size.height - padding.bottom} x2={size.width - padding.right} y2={size.height - padding.bottom} stroke="#475569" strokeWidth={1.5} opacity={0.6} />
                        {/* Y-axis labels */}
                        <text x={padding.left - 8} y={padding.top + 4} fontSize="10" fill="#94a3b8" textAnchor="end">100%</text>
                        <text x={padding.left - 8} y={size.height - padding.bottom + 4} fontSize="10" fill="#94a3b8" textAnchor="end">0%</text>
                        {/* Chance labels mid-grid */}
                        <text x={padding.left - 8} y={padding.top + (size.height - padding.top - padding.bottom) * 0.5 + 4} fontSize="10" fill="#64748b" textAnchor="end">50%</text>
                        {/* No/Yes paths */}
                        <path d={paths.no} stroke="#e5484d" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                        <path d={paths.yes} stroke="#46a758" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                        {/* Hover indicator */}
                        {hover && (
                            <>
                                <line x1={hover.x} x2={hover.x} y1={padding.top} y2={size.height - padding.bottom} stroke="#64748b" strokeDasharray="4 4" strokeWidth={1} />
                                <circle cx={hover.x} cy={hover.y} r={4} fill="#46a758" stroke="#fff" strokeWidth={2} />
                            </>
                        )}
                    </svg>
                )}
                {hover && (
                    <div className="flex justify-center rounded-md bg-white/10 px-2 py-1">
                        <span className="text-xs text-gray-400">{formatTime(hover.p.ts)} • Yes {formatPercent(hover.p.yes)} • No {formatPercent(hover.p.no)}</span>
                    </div>
                )}
                {loading && (
                    <div className="flex justify-center items-center h-[240px]">
                        <p className="text-gray-400 text-sm">Loading history…</p>
                    </div>
                )}
                {error && (
                    <div className="flex justify-center items-center h-[240px]">
                        <p className="text-red-400 text-sm">Failed to load history</p>
                    </div>
                )}
            </div>
        </UICard>
    );
};

export default PriceHistoryChart;
