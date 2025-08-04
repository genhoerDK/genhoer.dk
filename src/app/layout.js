import { REM } from "next/font/google";
import "./globals.css";
import { AudioProvider } from '@/context/AudioContext'
import { FooterProvider } from "@/context/FooterContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const rem = REM({
  variable: "--font-rem",
  subsets: ["latin"],
});

export const metadata = {
  title: "GENHØR",
  description: "Engagerer unge i lokal kulturskabelse og udstiller lydkunst i offentlige rum, der fortolker stedbunden kulturhistorie og styrker kendskabet til den nære danmarkshistorie.",
  themeColor: '#FAFAFA',
};

export default function RootLayout({ children }) {
  return (
    <html lang="da">
      <body className={`${rem.className} antialiased bg-zinc-50`}>
        <AudioProvider>
          <FooterProvider>
            <Header />
            <main className="w-screen min-h-svh">
              {children}
            </main>
            <Footer />
          </FooterProvider>
        </AudioProvider>
      </body>
    </html>
  );
}
