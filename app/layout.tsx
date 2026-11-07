/* eslint-disable @next/next/no-page-custom-font -- This shared App Router layout loads fonts for every route. */
import type { Metadata } from "next";
import "./theme.css";
import "./reader.css";
import "./roadmaps.css";
import "./manager.css";
import "./design.css";
import "./workspace.css";
import "./learning.css";

export const metadata: Metadata = {
  title: "DevLibrary — личное пространство обучения",
  description: "Курсы, проекты, достижения и время обучения. Продолжай с того места, где остановился.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /><link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" /><script dangerouslySetInnerHTML={{ __html: `try{var savedTheme=localStorage.getItem('devlibrary.theme.v1');document.documentElement.dataset.theme=savedTheme==='dark'||savedTheme==='light'?savedTheme:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{}` }} /></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
