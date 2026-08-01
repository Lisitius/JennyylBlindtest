import { NextResponse } from "next/server";
import { createUser, deleteUser, db, verifyPassword } from "@/lib/supabase";
import { createSessionCookie } from "@/lib/session";
import {
  validerPseudo,
  validerEmail,
  validerMotDePasse,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req) {
  let corps;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const pseudo = (corps.pseudo || "").trim();
  const email = (corps.email || "").trim().toLowerCase();
  const motDePasse = corps.motDePasse || "";

  // Validation
  const erreur =
    validerPseudo(pseudo) || validerEmail(email) || validerMotDePasse(motDePasse);
  if (erreur) return NextResponse.json({ error: erreur }, { status: 400 });

  if (!corps.conditions) {
    return NextResponse.json(
      { error: "Tu dois accepter les règles et la politique de confidentialité." },
      { status: 400 }
    );
  }

  // Pseudo déjà pris ?
  const dejaPris = await db(
    `/profiles?pseudo=eq.${encodeURIComponent(pseudo)}&select=id`
  );
  if (dejaPris.ok && Array.isArray(dejaPris.body) && dejaPris.body.length) {
    return NextResponse.json(
      { error: "Ce pseudo est déjà utilisé." },
      { status: 409 }
    );
  }

  // Création du compte (email marqué comme validé : aucun email envoyé)
  const creation = await createUser({ email, password: motDePasse, pseudo });
  if (!creation.ok) {
    const msg = String(creation.body?.msg || creation.body?.error_description || "");
    if (/already|registered|exists/i.test(msg)) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Impossible de créer le compte. Réessaie dans un instant." },
      { status: 502 }
    );
  }

  const userId = creation.body?.id;

  // Le tout premier compte créé devient administrateur : c'est lui qui
  // pourra ensuite donner les droits d'animatrice depuis la page /admin.
  const existants = await db("/profiles?select=id&limit=1");
  const premierCompte =
    existants.ok && Array.isArray(existants.body) && existants.body.length === 0;

  // Profil (pseudo + rôle + préférences)
  const profil = await db("/profiles", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id: userId,
      pseudo,
      ...(premierCompte ? { role: "admin" } : {}),
    }),
  });
  if (!profil.ok) {
    // On annule la création pour ne pas laisser un compte sans profil.
    await deleteUser(userId);
    const detail = String(profil.body?.message || "");
    if (
      /relation .* does not exist/i.test(detail) ||
      /could not find the table/i.test(detail)
    ) {
      return NextResponse.json(
        {
          error:
            "La base de données n'est pas encore initialisée (tables manquantes).",
        },
        { status: 503 }
      );
    }
    if (/duplicate key/i.test(detail)) {
      return NextResponse.json(
        { error: "Ce pseudo est déjà utilisé." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Impossible de créer le profil." },
      { status: 502 }
    );
  }

  // Connexion immédiate
  const connexion = await verifyPassword({ email, password: motDePasse });
  if (!connexion.ok) {
    return NextResponse.json({ ok: true, connecte: false });
  }

  const reponse = NextResponse.json({ ok: true, pseudo });
  reponse.cookies.set(await createSessionCookie(userId));
  return reponse;
}
