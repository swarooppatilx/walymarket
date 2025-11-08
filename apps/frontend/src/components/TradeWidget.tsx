import { Card, Flex, Button, Text } from "@radix-ui/themes";
import { useState } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import type { Market } from "../data/mock";
import { formatPercent } from "../data/mock";

export function TradeWidget({ market }: { market: Market }) {
    const account = useCurrentAccount();
    const [yes, no] = market.outcomes;
    const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
    const [amount, setAmount] = useState<string>("");

    const { mutate: signAndExecute, isPending, isSuccess, isError, error, data } =
        useSignAndExecuteTransaction();

    const amountNumber = Number(amount);
    const canTrade = Boolean(
        account && selectedOutcome && !Number.isNaN(amountNumber) && amountNumber > 0 && !isPending,
    );

    async function handleTrade(e: React.MouseEvent) {
        e.preventDefault();
        if (!canTrade) return;

        // Build a mock transaction; contract doesn't need to exist for UI flow.
        const tx = new Transaction();
        const contractId = "0x11111111111111111111111111111111"; // placeholder
        tx.moveCall({
            target: `${contractId}::walymarket::buy_shares`,
            arguments: [
                tx.pure.string(market.id),
                tx.pure.string(selectedOutcome as string),
                tx.pure.u64(Math.round(amountNumber * 1_000_000)), // mock micros
            ],
        });

        signAndExecute(
            { transaction: tx },
            {
                onSuccess: () => {
                    // Minimal feedback; can be replaced with a toast later
                    alert("Trade submitted to wallet");
                },
            },
        );
    }

    return (
        <Card size="3" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Flex direction="column" gap="3">
                <Text weight="bold">Select Outcome</Text>
                <Flex gap="2">
                    <Button
                        variant={selectedOutcome === yes.name ? "solid" : "outline"}
                        size="2"
                        onClick={() => setSelectedOutcome(yes.name)}
                        disabled={isPending}
                    >
                        Buy {yes.name} ({formatPercent(yes.chance)})
                    </Button>
                    <Button
                        variant={selectedOutcome === no.name ? "solid" : "outline"}
                        size="2"
                        onClick={() => setSelectedOutcome(no.name)}
                        disabled={isPending}
                    >
                        Buy {no.name} ({formatPercent(no.chance)})
                    </Button>
                </Flex>
            </Flex>
            <Flex direction="column" gap="3">
                <Text weight="bold">Amount</Text>
                <Flex align="center" gap="2">
                    <Text color="gray">$</Text>
                    <input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min={0}
                        step="0.01"
                        style={{
                            background: "var(--gray-a2)",
                            border: "1px solid var(--gray-a4)",
                            padding: "8px 12px",
                            borderRadius: 6,
                            width: "100%",
                            color: "var(--gray-11)",
                            fontSize: "14px",
                        }}
                        disabled={isPending}
                    />
                </Flex>
            </Flex>
            <Button size="3" onClick={handleTrade} disabled={!canTrade}>
                {isPending ? "Submitting..." : "Trade"}
            </Button>
            {!account && (
                <Text size="1" color="gray">
                    Connect your wallet to trade.
                </Text>
            )}
            {isSuccess && (
                <Text size="1" color="green">
                    {(() => {
                        if (data && typeof data === "object" && "digest" in data) {
                            return `Submitted: ${(data as { digest: string }).digest}`;
                        }
                        return "Submitted!";
                    })()}
                </Text>
            )}
            {isError && (
                <Text size="1" color="red">
                    {(error as Error)?.message || "Transaction failed"}
                </Text>
            )}
        </Card>
    );
}

export default TradeWidget;
