import type { Metadata } from "next";
import { Geist, Geist_Mono, Diplomata_SC } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const diplomata = Diplomata_SC({
  variable: "--font-diplomata",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Cinema E-booking System",
  description: "Cinema booking platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${diplomata.variable} antialiased`}
      >
        <Navbar /> 
        {children}
      </body>
    </html>
  );
}