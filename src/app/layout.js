import { REM } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const rem = REM({
  variable: "--font-rem",
  subsets: ["latin"],
});

export const metadata = {
  title: "Genhør",
  description: "Engagerer unge i lokal kulturskabelse og udstiller lydkunst i det offentlige rum.",
  themeColor: '#FAFAFA',
};

export default function RootLayout({ children }) {
  return (
    <html lang="da">
      <body className={`${rem.className} antialiased bg-zinc-50`}>
        <Header />
        <main className="w-screen min-h-svh">
          {children}
        </main>
      </body>
    </html>
  );
}
