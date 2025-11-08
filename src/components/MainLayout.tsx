import { Container } from "@radix-ui/themes";
import { PropsWithChildren } from "react";
import { Header } from "./Header";

export function MainLayout({ children }: PropsWithChildren) {
    return (
        <>
            <Header />
            <Container>
                <main style={{ minHeight: 500, paddingTop: 16 }}>{children}</main>
            </Container>
        </>
    );
}

export default MainLayout;
