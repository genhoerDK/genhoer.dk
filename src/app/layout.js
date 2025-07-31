import { REM } from "next/font/google";
import "./globals.css";
import { motion } from "framer-motion";
import { ControlBarProvider } from "@/context/ControlBarContext";
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
        <ControlBarProvider>
          <Header />
          <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.3 }}
            className="w-screen min-h-svh"
          >
            {children}
          </motion.main>
          <Footer />
        </ControlBarProvider>
      </body>
    </html>
  );
}
