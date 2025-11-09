// Shared formatting helpers for SUI values and percentages

export const MIST_PER_SUI = 1_000_000_000;

export function formatSui(mist: number | null | undefined, digits = 3): string {
    if (mist == null) return '—';
    return (mist / MIST_PER_SUI).toFixed(digits);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
    if (value == null) return '—';
    return `${(value * 100).toFixed(digits)}%`;
}

// Format LMSR instantaneous price (0..1) as cents (0..100¢)
export function formatCents(price: number | null | undefined, digits = 0): string {
    if (price == null || !isFinite(price)) return '—';
    const cents = Math.max(0, Math.min(100, price * 100));
    return `${cents.toFixed(digits)}¢`;
}

// Optionally show price in SUI given payout of 1 SUI per share
export function formatPriceSui(price: number | null | undefined, digits = 3): string {
    if (price == null || !isFinite(price)) return '—';
    return `${price.toFixed(digits)} SUI`;
}

export function shortId(id: string, head = 6, tail = 4): string {
    if (!id) return '';
    if (id.length <= head + tail) return id;
    return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

export function formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleDateString();
}

