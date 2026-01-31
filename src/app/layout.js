import { Suspense } from "react";
import { REM } from "next/font/google";
import "./globals.css";
import { AudioProvider } from '@/context/AudioContext';
import Header from "@/components/Header";
import Toolbar from "@/components/Toolbar";
import Player from "@/components/Player/Player";
import Map from "@/components/Map/Map";

const rem = REM({
    variable: "--font-rem",
    subsets: ["latin"],
});

export const metadata = {
    metadataBase: new URL("https://genhoer.dk"),
    title: { default: "Genhør", template: "%s | Genhør", },
    description: "Engagerer unge i lokal kulturskabelse og udstiller lydkunst i offentlige rum, der styrker kendskabet til den nære danmarkshistorie.",
    alternates: { canonical: "/" },
    robots: { index: true, follow: true, },
    icons: { icon: "/favicon.ico", },
};

export const viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#fafafa" },
        { media: "(prefers-color-scheme: dark)", color: "#27272a" },
    ],
};

export default function RootLayout({ children }) {
    return (
        <html lang="da">
            <body className={`${rem.className} ${rem.variable} antialiased bg-paper text-ink`}>
                <AudioProvider>
                    <Header />
                    <main className="w-screen min-h-svh">
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
