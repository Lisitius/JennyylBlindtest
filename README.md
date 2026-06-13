# 🎧 Jennyyl Blindtest

Jeu de blindtest musical dans le navigateur, propulsé par les extraits de
**Deezer**. Aucun compte, aucune clé API, aucun abonnement : on ouvre le site
et on joue.

## Comment jouer

1. Choisis un **thème** (Années 70 à 2010, Pop, Rock, Metal, Rap FR, Variété
   FR, Disney, Films, Électro, Latino, Reggae, K-Pop, Jazz…) ou **recherche**
   un artiste / une playlist.
2. Écoute l'extrait (30 secondes par titre) et tape le titre de la chanson.
3. Plus tu réponds vite, plus tu marques de points (**10 points** maximum,
   **1 point** minimum).
4. À la fin : ton score, le détail des titres et les boutons Rejouer / Changer.

La validation des réponses est souple : majuscules, accents et petits mots
(le, la, the…) sont ignorés, et les petites fautes de frappe passent.

## Lancer le site en local

Prérequis : [Node.js](https://nodejs.org) (version 18 ou supérieure).

```bash
npm install      # à faire une seule fois
npm run dev      # démarre le site
```

Puis ouvre **http://127.0.0.1:3000** dans ton navigateur.

## Stack technique

- [Next.js 14](https://nextjs.org) (App Router) + React
- [Tailwind CSS](https://tailwindcss.com)
- [API publique Deezer](https://developers.deezer.com/api) pour les extraits
  audio (appelée côté serveur via des API Routes)

> Le dossier `spotify-backup/` contient une ancienne version connectée à
> Spotify, abandonnée car l'API Spotify est désormais verrouillée pour les
> nouvelles applications.
