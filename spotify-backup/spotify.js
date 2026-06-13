import { getToken } from "next-auth/jwt";

// Cache en mémoire des tokens rafraîchis (le JWT cookie n'est pas réécrit
// depuis un route handler, donc on garde le token frais ici par utilisateur).
const refreshCache = new Map();

async function refreshAccessToken(refreshToken) {
  const cached = refreshCache.get(refreshToken);
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.accessToken;
  }
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  refreshCache.set(refreshToken, {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
  return data.access_token;
}

export async function getAccessToken(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return null;
  if (token.accessToken && token.expiresAt && Date.now() < token.expiresAt - 60_000) {
    return token.accessToken;
  }
  if (token.refreshToken) {
    const refreshed = await refreshAccessToken(token.refreshToken);
    if (refreshed) return refreshed;
  }
  return token.accessToken ?? null;
}

export async function spotifyFetch(req, path, init = {}) {
  const accessToken = await getAccessToken(req);
  if (!accessToken) {
    return { status: 401, body: { error: "not_authenticated" } };
  }
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (res.status === 204) return { status: 204, body: null };
  let body = null;
  try {
    body = await res.json();
  } catch {
    // certaines réponses Spotify n'ont pas de corps JSON
  }
  return { status: res.status, body };
}
