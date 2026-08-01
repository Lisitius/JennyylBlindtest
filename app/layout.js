import "./globals.css";
import PiedDePage from "@/components/PiedDePage";

export const metadata = {
  title: "Blindtest de JennyyL 🐨",
  description: "Le blindtest musical de la communauté de JennyyL — devine les chansons, marque des points !",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col text-white antialiased">
        <div className="flex-1">{children}</div>
        <PiedDePage />
      </body>
    </html>
  );
}
