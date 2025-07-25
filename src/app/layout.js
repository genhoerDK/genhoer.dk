import { REM } from "next/font/google";
import "./globals.css";
import { ControlBarProvider } from "@/context/ControlBarContext";
import Header from "@/components/Header";
import ControlBar from "@/components/ControlBar";

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
        <ControlBarProvider>
          <Header />
          <main className="w-screen min-h-svh">
            {children}
          </main>
          <ControlBar />
        </ControlBarProvider>
      </body>
    </html>
  );
}
