import { NextResponse } from "next/server";
import { db, auth } from "@/lib/supabase";
import { creerJetonReinit } from "@/lib/reset";
import { envoyerEmail, emailReinitialisation, emailConfigure } from "@/lib/email";

export const dynamic = "force-dynamic";

// Limite : 3 demandes par email toutes les 15 minutes.
const demandes = new Map();
function tropDeDemandes(email) {
  const maintenant = Date.now();
  const liste = (demandes.get(email) || []).filter((t) => maintenant - t < 15 * 60 * 1000);
  if (liste.length >= 3) return true;
  liste.push(maintenant);
  demandes.set(email, liste);
  return false;
}

export async function POST(req) {
  let c;
  try {
    c = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const email = String(c.email || "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email obligatoire." }, { status: 400 });
  }

  // Réponse volontairement identique dans tous les cas : on ne révèle jamais
  // si une adresse possède un compte ou non.
  const reponseNeutre = NextResponse.json({
    ok: true,
    message:
      "Si un compte existe avec cette adresse, un email vient d'être envoyé.",
  });

  if (tropDeDemandes(email)) return reponseNeutre;

  // Sans service d'emailing configuré, on utilise l'envoi intégré de Supabase.
  // Il fonctionne mais reste bridé à quelques emails par heure : à réserver
  // aux tests, et à remplacer par Brevo pour un usage réel.
  if (!emailConfigure()) {
    const redirection = `${req.nextUrl.origin}/reinitialiser`;
    await auth(`/recover?redirect_to=${encodeURIComponent(redirection)}`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return reponseNeutre;
  }

  // Recherche du compte
  const rech = await auth(
    `/admin/users?filter=${encodeURIComponent(email)}`,
    {},
    true
  );
  const utilisateur = (rech.body?.users || []).find(
    (u) => (u.email || "").toLowerCase() === email
  );
  if (!utilisateur) return reponseNeutre;

  const prof = await db(`/profiles?id=eq.${utilisateur.id}&select=pseudo,prefs`);
  const profil = Array.isArray(prof.body) ? prof.body[0] : null;
  if (!profil) return reponseNeutre;

  const jeton = await creerJetonReinit(utilisateur.id, profil.prefs);
  if (!jeton) return reponseNeutre;

  const lien = `${req.nextUrl.origin}/reinitialiser?jeton=${encodeURIComponent(jeton)}`;
  const { html, texte } = emailReinitialisation({ pseudo: profil.pseudo, lien });

  await envoyerEmail({
    destinataire: email,
    sujet: "🐨 Réinitialise ton mot de passe — Blindtest de JennyyL",
    html,
    texte,
  });

  return reponseNeutre;
}
