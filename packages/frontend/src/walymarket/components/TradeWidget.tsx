import { useEffect, useMemo, useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import UIButton from '~~/components/ui/Button';
import UIInput from '~~/components/ui/Input';
import UICard from '~~/components/ui/Card';
import useTransact from '@suiware/kit/useTransact';
import { SuiSignAndExecuteTransactionOutput } from '@mysten/wallet-standard';
import { Market } from '~~/walymarket/types';
import useNetworkConfig from '~~/hooks/useNetworkConfig';
import { CONTRACT_PACKAGE_VARIABLE_NAME, EXPLORER_URL_VARIABLE_NAME } from '~~/config/network';
import { notification } from '~~/helpers/notification';
import { transactionUrl } from '~~/helpers/network';
import { prepareTradeV2Tx, prepareSellV2Tx } from '~~/walymarket/helpers/transactions';
import { useSuiClient } from '@mysten/dapp-kit';

const formatCents = (price: number) => `${(price * 100).toFixed(0)}¢`;

export const TradeWidget = ({ market, onTrade }: { market: Market; onTrade?: () => void }) => {
    const [selectedOutcome, setSelectedOutcome] = useState<'Yes' | 'No' | null>(null);
    const [amountSUI, setAmountSUI] = useState('');
    const [sellShares, setSellShares] = useState('');
    const [mode, setMode] = useState<'buy' | 'sell'>('buy');
    const [pending, setPending] = useState(false);
    const currentAccount = useCurrentAccount();
    const client = useSuiClient();
    const { useNetworkVariable } = useNetworkConfig();
    const packageId = useNetworkVariable(CONTRACT_PACKAGE_VARIABLE_NAME);
    const explorerUrl = useNetworkVariable(EXPLORER_URL_VARIABLE_NAME);
    const { transact } = useTransact({
        onSuccess: (result: SuiSignAndExecuteTransactionOutput) => {
            const link = explorerUrl ? transactionUrl(explorerUrl, result.digest) : null;
            if (link) {
                notification.txSuccess(link);
            } else {
                notification.success(`Transaction ${result.digest} submitted.`);
            }
            setPending(false);
            onTrade?.();
        },
        onError: (err: Error) => {
            notification.txError(err);
            setPending(false);
        },
    });

    // Holdings
    const outcomeTokenType = packageId ? `${packageId}::outcome_token::OutcomeToken` : null;
    const [yesHolding, setYesHolding] = useState<{ id: string; amount: number } | null>(null);
    const [noHolding, setNoHolding] = useState<{ id: string; amount: number } | null>(null);

    useEffect(() => {
        const loadHoldings = async () => {
            if (!currentAccount?.address || !outcomeTokenType) return;
            try {
                const res = await client.getOwnedObjects({ owner: currentAccount.address, options: { showContent: true } });
                const tokens = (res.data || []).map((o: any) => {
                    const c = o.data?.content;
                    if (c?.dataType !== 'moveObject' || c.type !== outcomeTokenType) return null;
                    const f = c.fields;
                    return { id: o.data.objectId as string, yes: Boolean(f.yes), amount: Number(f.amount) };
                }).filter(Boolean) as Array<{ id: string; yes: boolean; amount: number }>;
                const yesTok = tokens.filter(t => t.yes).sort((a, b) => b.amount - a.amount)[0] || null;
                const noTok = tokens.filter(t => !t.yes).sort((a, b) => b.amount - a.amount)[0] || null;
                setYesHolding(yesTok);
                setNoHolding(noTok);
            } catch (e) { /* ignore */ }
        };
        loadHoldings();
    }, [client, currentAccount?.address, outcomeTokenType, market.id]);

    const handleTrade = () => {
        if (mode === 'buy') {
            if (!selectedOutcome || !amountSUI || !packageId) return;

            const amountMIST = Math.floor(parseFloat(amountSUI) * 1_000_000_000);
            if (isNaN(amountMIST) || amountMIST <= 0) {
                notification.error(null, 'Please enter a valid amount.');
                return;
            }

            const tx = prepareTradeV2Tx(packageId, market.id, amountMIST, selectedOutcome === 'Yes');
            setPending(true);
            transact(tx);
        } else {
            // sell mode
            if (!selectedOutcome || !packageId) return;
            const shares = Math.floor(parseFloat(sellShares || '0') * 1_000_000_000);
            if (isNaN(shares) || shares <= 0) { notification.error(null, 'Enter valid shares to sell.'); return; }
            const holding = selectedOutcome === 'Yes' ? yesHolding : noHolding;
            if (!holding) { notification.error(null, 'No shares of selected outcome.'); return; }
            if (shares > holding.amount) { notification.error(null, 'Not enough shares in largest token.'); return; }
            try {
                const tx = prepareSellV2Tx(packageId, market.id, holding.id, shares);
                setPending(true);
                transact(tx);
            } catch (e: any) {
                notification.error(null, e.message);
            }
        }
    };

    // Derived payout estimate for the selected outcome (buy mode)
    const payoutEstimate = useMemo(() => {
        if (mode !== 'buy' || !selectedOutcome) return null;
        const stake = parseFloat(amountSUI || '0');
        if (isNaN(stake) || stake <= 0) return null;
        const mistStake = stake * 1_000_000_000;
        const qy = market.yesPool;
        const qn = market.noPool;
        const b = market.b && market.b > 0 ? market.b : Math.max(1, Math.ceil((qy + qn) / 20)); // fallback heuristic
        const buyYes = selectedOutcome === 'Yes';
        // Use LMSR cost function to estimate shares purchased and new price.
        const shares = estimateSharesLmsr(qy, qn, b, buyYes, mistStake);
        const newQy = buyYes ? qy + shares : qy;
        const newQn = buyYes ? qn : qn + shares;
        const newYesPrice = lmsrYes(newQy, newQn, b);
        const newNoPrice = 1 - newYesPrice;
        // Expected payout if chosen side wins: shares * 1 (token pays out 1) converted to SUI
        const payoutSUI = (shares / 1_000_000_000);
        const costSUI = stake; // amount spent
        const profit = payoutSUI - costSUI;
        return { payoutSUI, profit, yesOddsAfter: newYesPrice, noOddsAfter: newNoPrice, bUsed: b };
    }, [mode, selectedOutcome, amountSUI, market.yesPool, market.noPool, market.totalPool, market.b]);

    // Sell preview (sell mode)
    const sellPreview = useMemo(() => {
        if (mode !== 'sell' || !selectedOutcome) return null;
        const shares = Math.floor(parseFloat(sellShares || '0') * 1_000_000_000);
        if (isNaN(shares) || shares <= 0) return null;
        const qy = market.yesPool;
        const qn = market.noPool;
        const b = market.b && market.b > 0 ? market.b : Math.max(1, Math.ceil((qy + qn) / 20));
        const sellYes = selectedOutcome === 'Yes';
        if (sellYes && shares > qy) return null;
        if (!sellYes && shares > qn) return null;
        const oldCost = lmsrCost(qy, qn, b);
        const newCost = sellYes ? lmsrCost(qy - shares, qn, b) : lmsrCost(qy, qn - shares, b);
        const refund = oldCost - newCost;
        const newQy = sellYes ? qy - shares : qy;
        const newQn = sellYes ? qn : qn - shares;
        const newYesPrice = lmsrYes(newQy, newQn, b);
        return { refundSUI: refund / 1_000_000_000, newYesPrice, bUsed: b };
    }, [mode, selectedOutcome, sellShares, market.yesPool, market.noPool, market.b]);

    // Reset selection when market resolves (future-proof; if resolved prop added)
    useEffect(() => {
        if (market.resolved) {
            setSelectedOutcome(null);
            setAmountSUI('');
        }
    }, [market.resolved]);

    return (
        <UICard className="p-4">
            <div className="flex flex-col gap-4">
                {/* Mode Toggle */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">{mode === 'buy' ? 'Buy Shares' : 'Sell Shares'}</h3>
                    <div className="flex gap-1 rounded-md border border-[#535353] bg-[#1a1a1a] p-1">
                        <button
                            onClick={() => setMode('buy')}
                            disabled={pending}
                            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                                mode === 'buy'
                                    ? 'bg-[#B6F34E] text-black'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Buy
                        </button>
                        <button
                            onClick={() => setMode('sell')}
                            disabled={pending || market.resolved}
                            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                                mode === 'sell'
                                    ? 'bg-[#B6F34E] text-black'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Sell
                        </button>
                    </div>
                </div>

                {market.resolved && (
                    <UICard className="border-red-500/20 bg-red-500/10 p-3">
                        <p className="text-sm font-medium text-red-400">
                            Market Resolved • Trading Closed
                        </p>
                    </UICard>
                )}

                {!currentAccount && !market.resolved && (
                    <UICard className="border-amber-500/20 bg-amber-500/10 p-3">
                        <p className="text-sm font-medium text-amber-300">
                            Connect wallet to trade
                        </p>
                    </UICard>
                )}

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-300">Select Outcome</label>
                    <div className="grid grid-cols-2 gap-2">
                        <UIButton
                            variant={selectedOutcome === 'Yes' ? 'primary' : 'secondary'}
                            className={selectedOutcome === 'Yes' ? 'bg-[#B6F34E] hover:bg-[#9ED93A] text-black' : ''}
                            onClick={() => setSelectedOutcome('Yes')}
                            disabled={market.resolved || !currentAccount}
                        >
                            <span className="flex items-center gap-2">
                                <span className="font-bold">Yes</span>
                                <span className="text-xs opacity-80">{formatCents(market.yesChance)}</span>
                            </span>
                        </UIButton>
                        <UIButton
                            variant={selectedOutcome === 'No' ? 'primary' : 'secondary'}
                            className={selectedOutcome === 'No' ? 'bg-[#E5484D] hover:bg-[#DC3E42] text-white' : ''}
                            onClick={() => setSelectedOutcome('No')}
                            disabled={market.resolved || !currentAccount}
                        >
                            <span className="flex items-center gap-2">
                                <span className="font-bold">No</span>
                                <span className="text-xs opacity-80">{formatCents(market.noChance)}</span>
                            </span>
                        </UIButton>
                    </div>
                </div>

                {mode === 'buy' && (
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-300">Amount (SUI)</label>
                        <UIInput
                            placeholder="Enter amount..."
                            type="number"
                            value={amountSUI}
                            onChange={(e) => setAmountSUI(e.target.value)}
                            disabled={market.resolved || !currentAccount || !selectedOutcome}
                        />
                        <div className="flex justify-between flex-wrap gap-1">
                            <span className="text-xs text-gray-400">Liquidity: {(market.totalPool / 1_000_000_000).toFixed(2)} SUI</span>
                            {selectedOutcome && (
                                <span className="text-xs text-gray-400">
                                    {selectedOutcome} pool: {((selectedOutcome === 'Yes' ? market.yesPool : market.noPool) / 1_000_000_000).toFixed(2)} SUI
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {mode === 'sell' && (
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-300">Shares to sell (SUI units)</label>
                        <UIInput
                            placeholder="Enter shares..."
                            type="number"
                            value={sellShares}
                            onChange={(e) => setSellShares(e.target.value)}
                            disabled={market.resolved || !currentAccount || !selectedOutcome}
                        />
                        {selectedOutcome && (
                            <div className="flex justify-between flex-wrap gap-1">
                                <span className="text-xs text-gray-400">
                                    Holding: {((selectedOutcome === 'Yes' ? yesHolding?.amount || 0 : noHolding?.amount || 0) / 1_000_000_000).toFixed(3)} SUI shares
                                </span>
                                <UIButton size="sm" variant="ghost" onClick={() => {
                                    const amt = selectedOutcome === 'Yes' ? yesHolding?.amount || 0 : noHolding?.amount || 0;
                                    setSellShares((amt / 1_000_000_000).toString());
                                }} disabled={!currentAccount || pending}>Max</UIButton>
                            </div>
                        )}
                    </div>
                )}

                {payoutEstimate && selectedOutcome && mode === 'buy' && (
                    <UICard className="bg-emerald-500/10 border-emerald-500/20 p-3">
                        <div className="flex flex-col gap-2">
                            <p className="text-sm font-medium text-white">Expected Returns</p>
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-300">If {selectedOutcome} wins:</span>
                                    <span className="text-sm font-bold text-white">{payoutEstimate.payoutSUI.toFixed(3)} SUI</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-300">Profit:</span>
                                    <span className={`text-sm font-bold ${payoutEstimate.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {payoutEstimate.profit >= 0 ? '+' : ''}{payoutEstimate.profit.toFixed(3)} SUI
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-400">New price (chance / cents):</span>
                                    <span className="text-xs text-gray-400">
                                        {selectedOutcome === 'Yes'
                                            ? `${(payoutEstimate.yesOddsAfter * 100).toFixed(2)}% • ${formatCents(payoutEstimate.yesOddsAfter)}`
                                            : `${(payoutEstimate.noOddsAfter * 100).toFixed(2)}% • ${formatCents(payoutEstimate.noOddsAfter)}`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </UICard>
                )}

                {sellPreview && selectedOutcome && mode === 'sell' && (
                    <UICard className="bg-rose-500/10 border-rose-500/20 p-3">
                        <div className="flex flex-col gap-2">
                            <p className="text-sm font-medium text-white">Sell Preview</p>
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-300">Refund:</span>
                                    <span className="text-sm font-bold text-white">{sellPreview.refundSUI.toFixed(3)} SUI</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-400">New Yes price:</span>
                                    <span className="text-xs text-gray-400">{(sellPreview.newYesPrice * 100).toFixed(2)}%</span>
                                </div>
                            </div>
                        </div>
                    </UICard>
                )}

                <UIButton
                    onClick={handleTrade}
                    disabled={market.resolved || !currentAccount || !selectedOutcome || pending || (mode === 'buy' && !amountSUI) || (mode === 'sell' && !sellShares)}
                    loading={pending}
                    className="w-full"
                >
                    {mode === 'buy'
                        ? (selectedOutcome && amountSUI ? `Buy ${parseFloat(amountSUI).toFixed(2)} SUI of ${selectedOutcome}` : 'Enter amount to buy')
                        : (selectedOutcome && sellShares ? `Sell ${parseFloat(sellShares).toFixed(2)} SUI shares ${selectedOutcome}` : 'Enter shares to sell')}
                </UIButton>
            </div>
        </UICard>
    );
};

// ---- LMSR helpers (UI-side approximation) ----
// Cost function: C(q) = b * ln(exp(qy/b) + exp(qn/b))
function lmsrCost(qy: number, qn: number, b: number): number {
    const y = qy / b;
    const n = qn / b;
    const m = Math.max(y, n);
    return b * (m + Math.log(Math.exp(y - m) + Math.exp(n - m)));
}

function lmsrYes(qy: number, qn: number, b: number): number {
    const y = qy / b;
    const n = qn / b;
    const m = Math.max(y, n);
    const ey = Math.exp(y - m);
    const en = Math.exp(n - m);
    return ey / (ey + en);
}

// Approximate max shares purchasable with 'budget' collateral using binary search on cost difference.
function estimateSharesLmsr(qy: number, qn: number, b: number, buyYes: boolean, budget: number): number {
    if (budget <= 0) return 0;
    let lo = 0;
    // Rough upper bound: budget (1 share ~= 1 collateral unit for early region)
    let hi = budget;
    let best = 0;
    for (let i = 0; i < 28; i++) {
        const mid = Math.floor((lo + hi) / 2);
        if (mid === best && mid !== 0) break;
        const newQy = buyYes ? qy + mid : qy;
        const newQn = buyYes ? qn : qn + mid;
        const cost = lmsrCost(newQy, newQn, b) - lmsrCost(qy, qn, b);
        if (cost <= budget) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return best;
}