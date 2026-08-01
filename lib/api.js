// Appels au serveur depuis le navigateur.
// Un serveur en panne renvoie parfois une page vide au lieu de JSON : sans
// précaution, on obtient l'erreur illisible "unexpected end of data".
// Ce module traduit toujours la situation en message compréhensible.

function messageSelonCode(status) {
  if (status === 500)
    return "Le serveur a rencontré un problème. S'il vient d'être mis en ligne, sa configuration est peut-être incomplète.";
  if (status === 502 || status === 503 || status === 504)
    return "Le serveur ne répond pas pour le moment. Réessaie dans un instant.";
  if (status === 404) return "Page ou service introuvable.";
  if (status === 429) return "Trop de tentatives. Patiente un instant.";
  return `Erreur inattendue (code ${status}).`;
}

export async function appelJson(url, options = {}) {
  let reponse;
  try {
    reponse = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
  } catch {
    throw new Error("Connexion au serveur impossible. Vérifie ton accès internet.");
  }

  const texte = await reponse.text();
  let donnees = null;
  if (texte) {
    try {
      donnees = JSON.parse(texte);
    } catch {
      donnees = null; // le serveur a renvoyé autre chose que du JSON
    }
  }

  if (!reponse.ok) {
    throw new Error(donnees?.error || messageSelonCode(reponse.status));
  }
  if (donnees === null) {
    throw new Error(messageSelonCode(reponse.status || 500));
  }
  return donnees;
}

export function postJson(url, corps) {
  return appelJson(url, { method: "POST", body: JSON.stringify(corps) });
}
