import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Genhør",
  description: "Engagere unge i lokal kulturskabelse og udstiller lydkunst i det offentlige rum.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="da">
      <body
        className={`w-screen h-screen flex justify-center items-center ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
