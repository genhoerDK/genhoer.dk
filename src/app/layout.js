import { Suspense } from "react";
import { REM } from "next/font/google";
import "./globals.css";
import { AudioProvider } from '@/context/AudioContext';
import Header from "@/components/Layout/Header";
import Toolbar from "@/components/Layout/Toolbar";
import Player from "@/components/Player/Player";
import Map from "@/components/Map/Map";

const rem = REM({
    variable: "--font-rem",
    subsets: ["latin"],
});

export const metadata = {
    metadataBase: new URL("https://www.genhoer.dk"), // Must match public/CNAME,
    title: { default: "Genhør", template: "%s | Genhør", },
    description: "Engagerer unge i lokal kulturskabelse og udstiller lydkunst i offentlige rum, der styrker kendskabet til den nære danmarkshistorie.",
    alternates: { canonical: "/" },
    robots: { index: true, follow: true, },
    icons: { icon: "/favicon.ico", },
};

// Sets --page-height (see globals.css) before the page is drawn. On phones it is only measured again when
// the width changes (rotation), so the page doesn't jump when the browser bar collapses while scrolling.
const PAGE_HEIGHT_SCRIPT = `(() => {
    const root = document.documentElement;
    const touch = matchMedia("(pointer: coarse)").matches;
    let width = 0;
    const set = () => {
        if (touch && innerWidth === width) return;
        width = innerWidth;
        root.style.setProperty("--page-height", innerHeight + "px");
    };
    set();
    addEventListener("resize", set);
})();`;

export default function RootLayout({ children }) {
    return (
        // suppressHydrationWarning: the script above adds a style attribute to <html> before React hydrates
        <html lang="da" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: PAGE_HEIGHT_SCRIPT }} />
            </head>
            <body className={`${rem.className} ${rem.variable} antialiased bg-paper text-ink`}>
                <AudioProvider>
                    <Header />
                    <main className="w-screen min-h-page">
                        {children}
                    </main>
                    <Suspense fallback={null}>
                        <Toolbar />
                    </Suspense>
                    <Suspense fallback={null}>
                        <Map />
                    </Suspense>
                    <Suspense fallback={null}>
                        <Player />
                    </Suspense>
                </AudioProvider>
            </body>
        </html>
    );
}
