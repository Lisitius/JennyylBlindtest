// Jetons de réinitialisation de mot de passe.
//
// Le lien envoyé par email contient un jeton signé, valable 30 minutes.
// Pour qu'il ne serve qu'UNE fois, il embarque un "numéro de série" (nonce)
// enregistré sur le profil : on le change dès que le jeton est utilisé, ce qui
// rend l'ancien lien inutilisable. Aucune table supplémentaire n'est requise.
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/supabase";

const DUREE = "30m";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET manquant");
  return new TextEncoder().encode(s);
}

function nouveauNonce() {
  return (
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
}

// Prépare un jeton et enregistre son numéro de série sur le profil.
export async function creerJetonReinit(userId, prefs = {}) {
  const nonce = nouveauNonce();
  const maj = await db(`/profiles?id=eq.${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ prefs: { ...(prefs || {}), resetNonce: nonce } }),
  });
  if (!maj.ok) return null;

  return new SignJWT({ typ: "reset", n: nonce })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(DUREE)
    .sign(secret());
}

// Vérifie le jeton : signature, expiration, et numéro de série encore valide.
export async function verifierJetonReinit(jeton) {
  try {
    const { payload } = await jwtVerify(jeton, secret());
    if (payload.typ !== "reset" || !payload.sub) return null;

    const r = await db(`/profiles?id=eq.${payload.sub}&select=pseudo,prefs`);
    const profil = Array.isArray(r.body) ? r.body[0] : null;
    if (!profil) return null;

    // Lien déjà utilisé (ou remplacé par une demande plus récente).
    if (!profil.prefs?.resetNonce || profil.prefs.resetNonce !== payload.n) {
      return null;
    }
    return { userId: payload.sub, pseudo: profil.pseudo, prefs: profil.prefs };
  } catch {
    return null; // jeton absent, expiré ou falsifié
  }
}

// Invalide le lien après usage.
export async function consommerJeton(userId, prefs) {
  const restant = { ...(prefs || {}) };
  delete restant.resetNonce;
  await db(`/profiles?id=eq.${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ prefs: restant }),
  });
}
