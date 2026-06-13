import "./globals.css";

export const metadata = {
  title: "Blindtest 🎧",
  description: "Devine les chansons, marque des points !",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-zinc-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
