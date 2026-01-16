import { REM } from "next/font/google";
import "./globals.css";
import { AudioProvider } from '@/context/AudioContext';
import Header from "@/components/Header";
import Toolbar from "@/components/Toolbar";

const rem = REM({
  variable: "--font-rem",
  subsets: ["latin"],
});

export const metadata = {
  title: "Genhør",
  description: "Engagerer unge i lokal kulturskabelse og udstiller lydkunst i offentlige rum, der fortolker stedbunden kulturhistorie og styrker kendskabet til den nære danmarkshistorie.",
};

export const viewport = {
  themeColor: "#FAFAFA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="da">
      <body className={`${rem.className} antialiased bg-zinc-50`}>
        <AudioProvider>
          <Header />
          <main className="w-screen min-h-svh">
            {children}
          </main>
          <Toolbar />
        </AudioProvider>
      </body>
    </html>
  );
}
