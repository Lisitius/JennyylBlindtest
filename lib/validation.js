// Règles de saisie, partagées entre le formulaire et le serveur.
// Le serveur revalide toujours : ne jamais faire confiance au navigateur.

export const PSEUDO_MIN = 3;
export const PSEUDO_MAX = 20;
export const MDP_MIN = 8;

export function validerPseudo(pseudo) {
  const p = (pseudo || "").trim();
  if (p.length < PSEUDO_MIN)
    return `Le pseudo doit faire au moins ${PSEUDO_MIN} caractères.`;
  if (p.length > PSEUDO_MAX)
    return `Le pseudo ne doit pas dépasser ${PSEUDO_MAX} caractères.`;
  if (!/^[\p{L}\p{N} _.-]+$/u.test(p))
    return "Le pseudo ne peut contenir que des lettres, chiffres, espaces, _ . -";
  return null;
}

export function validerEmail(email) {
  const e = (email || "").trim();
  if (!e) return "L'email est obligatoire.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e))
    return "Cet email ne semble pas valide.";
  return null;
}

export function validerMotDePasse(mdp) {
  const m = mdp || "";
  if (m.length < MDP_MIN)
    return `Le mot de passe doit faire au moins ${MDP_MIN} caractères.`;
  if (!/[a-zA-Z]/.test(m) || !/[0-9]/.test(m))
    return "Le mot de passe doit contenir au moins une lettre et un chiffre.";
  return null;
}
