import { REM, Lato } from "next/font/google";
import "./globals.css";
import Header from "@/components/UI/Header";
import HeroFog from "@/components/UI/HeroFog";
import Footer from "@/components/UI/Footer";

const rem = REM({
  variable: "--font-rem",
  subsets: ["latin"],
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["100", "400", "700"],
});

export const metadata = {
  title: "Genhør",
  description: "Engagerer unge i lokal kulturskabelse og udstiller lydkunst i det offentlige rum.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="da">
      <body className={`${rem.variable} ${lato.variable} antialiased`}>
        <Header />
        <HeroFog />
        <main className="w-screen min-h-svh -mt-20">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
