import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HeadsUp! - Campus Placement Alerts",
  description: "No hassle. Just the heads-up. Real-time CDC placement notices for IIT Kharagpur students.",
  keywords: ["IIT Kharagpur", "CDC", "placement", "notices", "campus recruitment"],
  authors: [{ name: "himanshoo" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "HeadsUp! - Campus Placement Alerts",
    description: "No hassle. Just the heads-up. Real-time CDC placement notices.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* ✅ Google Analytics (GA4) */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-L88XWQ69B7"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-L88XWQ69B7');
          `}
        </Script>
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased font-sans`}
        style={{ fontFamily: 'var(--font-inter), var(--font-space-grotesk), system-ui, sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}