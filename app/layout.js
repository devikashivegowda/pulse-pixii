import "./globals.css";

export const metadata = {
  title: "Rufus Readiness Twin",
  description: "AI shopping assistant readiness reports for Amazon sellers."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
