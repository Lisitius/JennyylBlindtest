import "./globals.css";

export const metadata = {
  title: "Blindtest de JennyyL 🐨",
  description: "Le blindtest musical de la communauté de JennyyL — devine les chansons, marque des points !",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="min-h-screen text-white antialiased">{children}</body>
    </html>
  );
}
