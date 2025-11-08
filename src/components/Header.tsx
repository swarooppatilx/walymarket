import { ConnectButton } from "@mysten/dapp-kit";
import { Box, Flex, Heading, Link } from "@radix-ui/themes";

export function Header() {
    return (
        <Flex
            asChild
            position="sticky"
            top="0"
            px="4"
            py="2"
            align="center"
            justify="between"
            style={{
                zIndex: 10,
                backdropFilter: "saturate(180%) blur(8px)",
                background: "color-mix(in oklab, var(--color-panel), transparent 20%)",
                borderBottom: "1px solid var(--gray-a2)",
            }}
        >
            <header>
                <Box>
                    <Link href="/" underline="none">
                        <Heading size="6">Walymarket</Heading>
                    </Link>
                </Box>

                <Box>
                    <ConnectButton />
                </Box>
            </header>
        </Flex>
    );
}

export default Header;
