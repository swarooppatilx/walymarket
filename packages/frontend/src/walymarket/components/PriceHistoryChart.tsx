import { useMemo, useRef, useState } from 'react';
import { Card, Flex, SegmentedControl, Text } from '@radix-ui/themes';
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
        <Card>
            <Flex direction="column" gap="3">
                <Flex justify="between" align="center" wrap="wrap" gap="3">
                    <Text weight="bold" size="3">Price History</Text>
                    <SegmentedControl.Root value={tf} onValueChange={(v) => setTf(v as Timeframe)} size="1">
                        <SegmentedControl.Item value="1H">1H</SegmentedControl.Item>
                        <SegmentedControl.Item value="24H">24H</SegmentedControl.Item>
                        <SegmentedControl.Item value="7D">7D</SegmentedControl.Item>
                        <SegmentedControl.Item value="1M">1M</SegmentedControl.Item>
                        <SegmentedControl.Item value="ALL">ALL</SegmentedControl.Item>
                    </SegmentedControl.Root>
                </Flex>
                <Flex align="center" gap="3">
                    <Flex align="center" gap="1">
                        <div style={{ width: 12, height: 12, background: '#46a758', borderRadius: 2 }} />
                        <Text size="2" weight="medium">Yes {currentYes}</Text>
                    </Flex>
                    <Flex align="center" gap="1">
                        <div style={{ width: 12, height: 12, background: '#e5484d', borderRadius: 2 }} />
                        <Text size="2" weight="medium">No {currentNo}</Text>
                    </Flex>
                </Flex>
                {!loading && !error && points.length === 0 && (
                    <Flex justify="center" align="center" style={{ height: size.height, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                        <Text color="gray" size="2">No trading history yet</Text>
                    </Flex>
                )}
                {!loading && !error && points.length > 0 && (
                    <svg
                        ref={svgRef}
                        width="100%"
                        height={size.height}
                        viewBox={`0 0 ${size.width} ${size.height}`}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleLeave}
                        style={{ cursor: 'crosshair', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}
                    >
                        {/* Grid lines */}
                        {[0.25, 0.5, 0.75].map(ratio => (
                            <line
                                key={ratio}
                                x1={padding.left}
                                y1={padding.top + (size.height - padding.top - padding.bottom) * ratio}
                                x2={size.width - padding.right}
                                y2={padding.top + (size.height - padding.top - padding.bottom) * ratio}
                                stroke="#333"
                                strokeDasharray="2 4"
                                opacity={0.3}
                            />
                        ))}
                        {/* Axes */}
                        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={size.height - padding.bottom} stroke="#555" strokeWidth={1.5} />
                        <line x1={padding.left} y1={size.height - padding.bottom} x2={size.width - padding.right} y2={size.height - padding.bottom} stroke="#555" strokeWidth={1.5} />
                        {/* Y-axis labels */}
                        <text x={padding.left - 8} y={padding.top + 4} fontSize="10" fill="#888" textAnchor="end">100%</text>
                        <text x={padding.left - 8} y={size.height - padding.bottom + 4} fontSize="10" fill="#888" textAnchor="end">0%</text>
                        {/* No/Yes paths */}
                        <path d={paths.no} stroke="#e5484d" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                        <path d={paths.yes} stroke="#46a758" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                        {/* Hover indicator */}
                        {hover && (
                            <>
                                <line x1={hover.x} x2={hover.x} y1={padding.top} y2={size.height - padding.bottom} stroke="#888" strokeDasharray="4 4" strokeWidth={1} />
                                <circle cx={hover.x} cy={hover.y} r={4} fill="#46a758" stroke="#fff" strokeWidth={2} />
                            </>
                        )}
                    </svg>
                )}
                {hover && (
                    <Flex justify="center" style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 6 }}>
                        <Text size="1" color="gray">{formatTime(hover.p.ts)} • Yes {formatPercent(hover.p.yes)} • No {formatPercent(hover.p.no)}</Text>
                    </Flex>
                )}
                {loading && (
                    <Flex justify="center" align="center" style={{ height: size.height }}>
                        <Text color="gray" size="2">Loading history…</Text>
                    </Flex>
                )}
                {error && (
                    <Flex justify="center" align="center" style={{ height: size.height }}>
                        <Text color="red" size="2">Failed to load history</Text>
                    </Flex>
                )}
            </Flex>
        </Card>
    );
};

export default PriceHistoryChart;
