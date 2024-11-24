import "./globals.scss";
import { Metadata } from "next";
import { Link } from "@nextui-org/link";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/react";
import { meta } from "@/data/config";
import { Recursive } from "next/font/google";

const recursive = Recursive({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(meta.siteUrl),
  title: {
    default: meta.title,
    template: `%s - ${meta.title}`,
  },
  description: meta.descriptionFull,
  keywords: meta.keywords,
  authors: { name: meta.author },
  creator: meta.author,
  icons: {
    icon: ["/favicon.ico"],
  },
  openGraph: {
    title: meta.description,
    description: meta.descriptionFull,
    url: meta.siteUrl,
    siteName: meta.title,
    images: [
      {
        url: meta.ogImage,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: meta.description,
    description: meta.descriptionFull,
    images: ["https://easy-peasy.ai/cdn-cgi/image/quality=80,format=auto,width=700/https://fdczvxmwwjwpwbeeqcth.supabase.co/storage/v1/object/public/images/888352b5-c064-453f-864b-fa1cd328e501/616f339a-e9a9-4c7f-855d-3d911ef45570.png"],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={cn(
          "sm:ring-x-8 min-h-screen bg-background pt-6 text-foreground antialiased ring-secondary-800 light sm:pt-20",
          recursive.className,
        )}
      >
        <Providers>
          <main>{children}</main>
          <footer className="flex w-full items-center justify-center py-3">
            <Link
              isExternal
              href="https://nextui-docs-v2.vercel.app?utm_source=next-app-template"
              className="flex items-center gap-1 text-current"
              title="nextui.org homepage"
            >
              <span className="text-default-600">Designed by</span>
              <p className="text-secondary">Ren Yayuri</p>
            </Link>
          </footer>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
