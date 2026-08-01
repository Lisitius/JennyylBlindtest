// Rôles et vérifications d'accès.
// Toute action sensible passe par ici : le serveur ne fait jamais confiance
// à ce que le navigateur prétend être.
import { currentUserId } from "@/lib/session";
import { db } from "@/lib/supabase";

export const ROLES = ["joueur", "animateur", "admin"];

// Petit écusson affiché à côté du pseudo.
export const ECUSSON = {
  admin: { icone: "🛡️", nom: "Admin" },
  animateur: { icone: "🎤", nom: "Animateur" },
  joueur: { icone: "", nom: "Joueur" },
};

export function peutAnimer(role) {
  return role === "animateur" || role === "admin";
}

export function estAdmin(role) {
  return role === "admin";
}

// Renvoie { userId, pseudo, role } du joueur connecté, ou null.
export async function profilConnecte() {
  const userId = await currentUserId();
  if (!userId) return null;
  const r = await db(`/profiles?id=eq.${userId}&select=pseudo,role`);
  const p = Array.isArray(r.body) ? r.body[0] : null;
  if (!p) return null;
  return { userId, pseudo: p.pseudo, role: p.role || "joueur" };
}
