import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Citizen Quiz | AI Practice",
  description: "Ace your US Naturalization Test with AI-powered practice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} antialiased bg-navy text-cream selection:bg-gold selection:text-navy`}>
        {children}
      </body>
    </html>
  );
}
