// Gestion de la session : un cookie signé, illisible et non modifiable par le
// navigateur. Il ne contient que l'identifiant du compte, aucune donnée
// personnelle et surtout aucun mot de passe.
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "bt_session";
const DUREE_JOURS = 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET manquant");
  return new TextEncoder().encode(s);
}

export async function createSessionCookie(userId) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DUREE_JOURS}d`)
    .sign(secret());

  return {
    name: COOKIE,
    value: token,
    httpOnly: true, // inaccessible au JavaScript de la page
    sameSite: "lax", // protège contre les requêtes venues d'autres sites
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DUREE_JOURS * 24 * 60 * 60,
  };
}

export function clearedSessionCookie() {
  return {
    name: COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

// Renvoie l'identifiant du joueur connecté, ou null.
export async function currentUserId() {
  try {
    const token = cookies().get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret());
    return payload.sub || null;
  } catch {
    return null; // cookie absent, expiré ou falsifié
  }
}
