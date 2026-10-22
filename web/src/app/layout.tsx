import "./globals.css";

export const metadata = {
  title: "SafeShare",
  description: "Blockchain-based community emergency resource network",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}