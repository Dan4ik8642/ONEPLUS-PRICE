import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const previewImage = `${protocol}://${host}/og.png`;

  return {
    title: "One Price · Ценники",
    description: "Сервис управления и печати ценников One Price Coffee.",
    openGraph: {
      title: "One Price · Ценники",
      description: "Ценники без ручной рутины.",
      locale: "ru_RU",
      type: "website",
      images: [{ url: previewImage, width: 1200, height: 630, alt: "One Price — ценники без ручной рутины" }],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
