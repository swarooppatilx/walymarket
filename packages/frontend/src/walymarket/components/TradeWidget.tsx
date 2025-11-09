import { useEffect, useMemo, useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Card as RadixCard, Flex, Text, Tabs } from '@radix-ui/themes';
import UIButton from '~~/components/ui/Button';
import UIInput from '~~/components/ui/Input';
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
        <RadixCard size="3" className="border border-white/10 bg-white/5 dark:bg-slate-900/40">
            <Flex direction="column" gap="4">
                <Tabs.Root value={mode} onValueChange={(v) => setMode(v as 'buy' | 'sell')}>
                    <Flex justify="between" align="center">
                        <Text weight="bold" size="4">{mode === 'buy' ? 'Buy Shares' : 'Sell Shares'}</Text>
                        <Tabs.List>
                            <Tabs.Trigger value="buy" disabled={pending}>Buy</Tabs.Trigger>
                            <Tabs.Trigger value="sell" disabled={pending || market.resolved}>Sell</Tabs.Trigger>
                        </Tabs.List>
                    </Flex>
                </Tabs.Root>

                {market.resolved && (
                    <RadixCard variant="surface" className="border border-red-500/20 bg-red-500/10">
                        <Text size="2" color="red" weight="medium" className="py-1">
                            Market Resolved • Trading Closed
                        </Text>
                    </RadixCard>
                )}

                {!currentAccount && !market.resolved && (
                    <RadixCard variant="surface" className="border border-amber-500/20 bg-amber-500/10">
                        <Text size="2" weight="medium" className="py-1">
                            Connect wallet to trade
                        </Text>
                    </RadixCard>
                )}

                <Flex direction="column" gap="2">
                    <Text size="2" color="gray" weight="medium">Select Outcome</Text>
                    <div className="grid grid-cols-2 gap-2">
                        <UIButton
                            className={selectedOutcome === 'Yes' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-white/5 hover:bg-white/10 text-white'}
                            onClick={() => setSelectedOutcome('Yes')}
                            disabled={market.resolved || !currentAccount}
                        >
                            <span className="flex items-center gap-2">
                                <span className="font-bold">Yes</span>
                                <span className="text-xs opacity-80">{formatCents(market.yesChance)}</span>
                            </span>
                        </UIButton>
                        <UIButton
                            className={selectedOutcome === 'No' ? 'bg-rose-500 hover:bg-rose-400' : 'bg-white/5 hover:bg-white/10 text-white'}
                            onClick={() => setSelectedOutcome('No')}
                            disabled={market.resolved || !currentAccount}
                        >
                            <span className="flex items-center gap-2">
                                <span className="font-bold">No</span>
                                <span className="text-xs opacity-80">{formatCents(market.noChance)}</span>
                            </span>
                        </UIButton>
                    </div>
                </Flex>

                {mode === 'buy' && (
                    <Flex direction="column" gap="2">
                        <Text size="2" color="gray" weight="medium">Amount (SUI)</Text>
                        <UIInput
                            placeholder="Enter amount..."
                            type="number"
                            value={amountSUI}
                            onChange={(e) => setAmountSUI(e.target.value)}
                            disabled={market.resolved || !currentAccount || !selectedOutcome}
                        />
                        <Flex justify="between" wrap="wrap" gap="1">
                            <Text size="1" color="gray">Liquidity: {(market.totalPool / 1_000_000_000).toFixed(2)} SUI</Text>
                            {selectedOutcome && (
                                <Text size="1" color="gray">
                                    {selectedOutcome} pool: {((selectedOutcome === 'Yes' ? market.yesPool : market.noPool) / 1_000_000_000).toFixed(2)} SUI
                                </Text>
                            )}
                        </Flex>
                    </Flex>
                )}
                {mode === 'sell' && (
                    <Flex direction="column" gap="2">
                        <Text size="2" color="gray" weight="medium">Shares to sell (SUI units)</Text>
                        <UIInput
                            placeholder="Enter shares..."
                            type="number"
                            value={sellShares}
                            onChange={(e) => setSellShares(e.target.value)}
                            disabled={market.resolved || !currentAccount || !selectedOutcome}
                        />
                        {selectedOutcome && (
                            <Flex justify="between" wrap="wrap" gap="1">
                                <Text size="1" color="gray">
                                    Holding: {((selectedOutcome === 'Yes' ? yesHolding?.amount || 0 : noHolding?.amount || 0) / 1_000_000_000).toFixed(3)} SUI shares
                                </Text>
                                <UIButton size="sm" onClick={() => {
                                    const amt = selectedOutcome === 'Yes' ? yesHolding?.amount || 0 : noHolding?.amount || 0;
                                    setSellShares((amt / 1_000_000_000).toString());
                                }} disabled={!currentAccount || pending}>Max</UIButton>
                            </Flex>
                        )}
                    </Flex>
                )}

                {payoutEstimate && selectedOutcome && mode === 'buy' && (
                    <RadixCard variant="surface" className="bg-emerald-500/10">
                        <Flex direction="column" gap="2">
                            <Text size="2" weight="medium">Expected Returns</Text>
                            <Flex direction="column" gap="1">
                                <Flex justify="between">
                                    <Text size="2" color="gray">If {selectedOutcome} wins:</Text>
                                    <Text size="2" weight="bold">{payoutEstimate.payoutSUI.toFixed(3)} SUI</Text>
                                </Flex>
                                <Flex justify="between">
                                    <Text size="2" color="gray">Profit:</Text>
                                    <Text size="2" weight="bold" color={payoutEstimate.profit >= 0 ? 'jade' : 'red'}>
                                        {payoutEstimate.profit >= 0 ? '+' : ''}{payoutEstimate.profit.toFixed(3)} SUI
                                    </Text>
                                </Flex>
                                <Flex justify="between">
                                    <Text size="1" color="gray">New price (chance / cents):</Text>
                                    <Text size="1" color="gray">
                                        {selectedOutcome === 'Yes'
                                            ? `${(payoutEstimate.yesOddsAfter * 100).toFixed(2)}% • ${formatCents(payoutEstimate.yesOddsAfter)}`
                                            : `${(payoutEstimate.noOddsAfter * 100).toFixed(2)}% • ${formatCents(payoutEstimate.noOddsAfter)}`}
                                    </Text>
                                </Flex>
                                <Flex justify="between">
                                    <Text size="1" color="gray">Liquidity b used:</Text>
                                    <Text size="1" color="gray">{payoutEstimate.bUsed}</Text>
                                </Flex>
                            </Flex>
                        </Flex>
                    </RadixCard>
                )}
                {sellPreview && selectedOutcome && mode === 'sell' && (
                    <RadixCard variant="surface" className="bg-rose-500/10">
                        <Flex direction="column" gap="2">
                            <Text size="2" weight="medium">Sell Preview</Text>
                            <Flex direction="column" gap="1">
                                <Flex justify="between">
                                    <Text size="2" color="gray">Refund:</Text>
                                    <Text size="2" weight="bold">{sellPreview.refundSUI.toFixed(3)} SUI</Text>
                                </Flex>
                                <Flex justify="between">
                                    <Text size="1" color="gray">New Yes price:</Text>
                                    <Text size="1" color="gray">{(sellPreview.newYesPrice * 100).toFixed(2)}%</Text>
                                </Flex>
                                <Flex justify="between">
                                    <Text size="1" color="gray">Liquidity b used:</Text>
                                    <Text size="1" color="gray">{sellPreview.bUsed}</Text>
                                </Flex>
                            </Flex>
                        </Flex>
                    </RadixCard>
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
            </Flex>
        </RadixCard>
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