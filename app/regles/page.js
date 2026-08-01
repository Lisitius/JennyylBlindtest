import Link from "next/link";

export const metadata = {
  title: "Règles et confidentialité — Blindtest de JennyyL",
};

function Section({ titre, children }) {
  return (
    <section className="mb-8 rounded-2xl bg-jenny-surface/60 p-6 ring-1 ring-jenny-line">
      <h2 className="mb-3 text-2xl font-bold text-jenny-light">{titre}</h2>
      <div className="flex flex-col gap-2 text-zinc-300">{children}</div>
    </section>
  );
}

export default function ReglesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-8 text-center text-4xl font-black">
        🐨 <span className="text-gradient">Règles & confidentialité</span>
      </h1>

      <Section titre="🎮 Les règles du jeu">
        <p>
          Le blindtest fait écouter de courts extraits musicaux. À toi de
          retrouver le titre, l'artiste et, pour les catégories Disney et Films
          & Séries, le nom du film.
        </p>
        <p>
          Plus tu réponds vite, plus tu marques de points : 10 points maximum par
          chanson, répartis entre les éléments à deviner.
        </p>
        <p>
          Les extraits proviennent de Deezer et durent 30 secondes. Ils sont
          diffusés à titre d'illustration, dans un cadre privé et non commercial.
        </p>
      </Section>

      <Section titre="🤝 Règles de bonne conduite">
        <p>• Choisis un pseudo correct : pas d'insulte, pas de contenu haineux.</p>
        <p>• Un compte par personne. Pas d'usurpation d'identité.</p>
        <p>
          • Le jeu repose sur la confiance : chercher les réponses ailleurs pendant
          une partie n'a d'intérêt pour personne.
        </p>
        <p>
          • Tout compte au comportement abusif peut être supprimé sans préavis.
        </p>
      </Section>

      <Section titre="🔒 Tes données, en clair">
        <p>
          <strong className="text-white">Ton mot de passe n'est jamais conservé.</strong>{" "}
          Seule une empreinte irréversible (un « hachage ») est stockée. Personne
          — pas même l'administrateur du site — ne peut le lire ni le retrouver.
        </p>
        <p>
          <strong className="text-white">
            Seules données personnelles conservées : ton pseudo et ton email.
          </strong>{" "}
          L'email sert uniquement à identifier ton compte. Il n'est jamais affiché
          aux autres joueurs.
        </p>
        <p>
          S'y ajoutent tes <strong className="text-white">scores et l'historique
          de tes parties</strong>, rattachés à ton compte pour afficher tes
          statistiques.
        </p>
        <p>
          <strong className="text-white">
            Aucune donnée n'est partagée, revendue ni transmise à un tiers
          </strong>
          , quel qu'il soit.
        </p>
        <p>
          <strong className="text-white">Aucun traceur publicitaire</strong>, aucun
          cookie tiers, aucune statistique de navigation. Un seul cookie
          technique : celui qui te garde connecté.
        </p>
      </Section>

      <Section titre="⚖️ Tes droits (RGPD)">
        <p>
          Depuis ta page{" "}
          <Link href="/compte" className="font-bold text-jenny-light underline">
            Compte
          </Link>{" "}
          tu peux à tout moment :
        </p>
        <p>• <strong className="text-white">Consulter</strong> l'ensemble de tes données ;</p>
        <p>• <strong className="text-white">Modifier</strong> ton pseudo et ton mot de passe ;</p>
        <p>
          • <strong className="text-white">Télécharger</strong> tes données dans un
          fichier lisible (droit à la portabilité) ;
        </p>
        <p>
          • <strong className="text-white">Supprimer ton compte</strong>. La
          suppression est immédiate et définitive : profil, historique et compte
          sont effacés, sans copie de sauvegarde.
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          Base légale du traitement : ton consentement, donné à l'inscription.
          Les données sont conservées tant que ton compte existe, et supprimées
          avec lui.
        </p>
      </Section>

      <Section titre="👶 Âge minimum">
        <p>
          Si tu as moins de 15 ans, tu dois avoir l'accord d'un parent ou d'un
          responsable légal pour créer un compte.
        </p>
      </Section>

      <Section titre="✉️ Contact">
        <p>
          Pour toute question ou demande concernant tes données, écris à :
        </p>
        <p>
          <a
            href="mailto:jennyylblindtest@protonmail.com"
            className="text-lg font-bold text-jenny-light underline"
          >
            jennyylblindtest@protonmail.com
          </a>
        </p>
        <p>
          Une réponse te sera apportée dans un délai d'un mois maximum.
        </p>
        <p className="text-sm text-zinc-500">
          Ce site est un projet personnel, non commercial, réalisé pour la
          communauté de JennyyL.
        </p>
      </Section>

      <p className="text-center">
        <Link href="/" className="text-sm text-zinc-500 underline">
          ← Retour à l'accueil
        </Link>
      </p>
    </main>
  );
}
