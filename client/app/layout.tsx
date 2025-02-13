import "@/styles/globals.css";
import { Inter } from "next/font/google";
import { Providers } from "./_components/Providers";
import { metadata } from "./metadata";
import { validateEnv } from "./config/validate-env";

// Debug environment variables
if (process.env.NODE_ENV === 'development') {
  console.log("[Layout] Environment:", {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NODE_ENV: process.env.NODE_ENV
  });
}

// Validate environment variables
if (process.env.NODE_ENV === 'development') {
  validateEnv();
}

const inter = Inter({ subsets: ["latin"] });

export { metadata };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.className} bg-white min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
