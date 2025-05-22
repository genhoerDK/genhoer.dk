import { REM, Lato } from "next/font/google";
import "./globals.css";
import Header from "@/components/UI/Header";

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

        {children}
      </body>
    </html>
  );
}
