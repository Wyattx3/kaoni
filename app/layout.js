import './globals.css';

export const metadata = {
  title: 'အထည်စာရင်း',
  description: 'Fabric Inventory Manager',
};

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="my">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#f2f2f7" />
      </head>
      <body>{children}</body>
    </html>
  );
}
