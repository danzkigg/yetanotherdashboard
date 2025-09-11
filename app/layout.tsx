import './globals.css';

export const metadata = {
  title: 'Dashboard',
  description: 'Minimalistic dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background dark:bg-darkBg text-main dark:text-mainDark transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
