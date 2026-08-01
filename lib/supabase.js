// Accès à Supabase — UNIQUEMENT côté serveur.
// La clé "service_role" ne doit jamais partir vers le navigateur : toutes les
// fonctions de ce fichier sont appelées depuis les routes API du site.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function supabaseConfigured() {
  return Boolean(URL && SERVICE_KEY && ANON_KEY);
}

// Liste les réglages absents. Utile après une mise en ligne : les clés ne sont
// jamais versionnées, il faut donc les saisir chez l'hébergeur.
export function configManquante() {
  const manquantes = [];
  if (!URL) manquantes.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!ANON_KEY) manquantes.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!SERVICE_KEY) manquantes.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!process.env.SESSION_SECRET) manquantes.push("SESSION_SECRET");
  return manquantes;
}

// Réponse claire quand le site n'est pas configuré, au lieu d'un plantage.
export function reponseConfigManquante() {
  const manquantes = configManquante();
  if (!manquantes.length) return null;
  console.error("[config] variables absentes :", manquantes.join(", "));
  return {
    error:
      "Le site n'est pas complètement configuré : les comptes sont indisponibles. (Réglages manquants côté hébergeur.)",
    manquantes,
  };
}

// --- Base de données (tables profiles / games) ---
export async function db(path, init = {}) {
  const res = await fetch(`${URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

// --- Comptes (Supabase Auth) ---
// `admin` = true pour les opérations réservées au serveur (créer, supprimer…).
export async function auth(path, init = {}, admin = false) {
  const key = admin ? SERVICE_KEY : ANON_KEY;
  const res = await fetch(`${URL}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: key,
      ...(admin ? { Authorization: `Bearer ${key}` } : {}),
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}

// Crée un compte avec l'email déjà validé (pas d'email de confirmation à
// envoyer, donc aucun service d'emailing nécessaire).
export async function createUser({ email, password, pseudo }) {
  return auth(
    "/admin/users",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { pseudo },
      }),
    },
    true
  );
}

// Vérifie un couple email / mot de passe. C'est Supabase qui compare
// l'empreinte du mot de passe : le mot de passe en clair n'est jamais stocké.
export async function verifyPassword({ email, password }) {
  return auth("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function deleteUser(userId) {
  return auth(`/admin/users/${userId}`, { method: "DELETE" }, true);
}

export async function updateUser(userId, payload) {
  return auth(
    `/admin/users/${userId}`,
    { method: "PUT", body: JSON.stringify(payload) },
    true
  );
}

export async function getUser(userId) {
  return auth(`/admin/users/${userId}`, {}, true);
}
