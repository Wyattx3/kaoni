import './globals.css';

export const metadata = {
  title: 'အထည်စာရင်း - KAONI',
  description: 'Fabric Inventory Manager',
};

export default function RootLayout({ children }) {
  return (
    <html lang="my">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#f2f2f7" />
      </head>
      <body>{children}</body>
    </html>
  );
}
