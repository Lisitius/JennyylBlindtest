import Link from "next/link";

export const metadata = {
  title: "Règles, confidentialité et mentions légales — Blindtest de JennyyL",
};

function Section({ titre, children, id }) {
  return (
    <section
      id={id}
      className="mb-8 rounded-2xl bg-jenny-surface/60 p-6 ring-1 ring-jenny-line"
    >
      <h2 className="mb-3 text-2xl font-bold text-jenny-light">{titre}</h2>
      <div className="flex flex-col gap-2 text-zinc-300">{children}</div>
    </section>
  );
}

// Sous-titre à l'intérieur d'une section
function Titre({ children }) {
  return (
    <h3 className="mt-4 text-lg font-bold text-white first:mt-0">{children}</h3>
  );
}

function Ligne({ label, children }) {
  return (
    <p>
      <strong className="text-white">{label} :</strong> {children}
    </p>
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

      {/* ============ MENTIONS LÉGALES DÉTAILLÉES ============ */}
      <div id="mentions-legales" className="mb-8 mt-16 scroll-mt-6 text-center">
        <h2 className="text-3xl font-black">
          ⚖️ <span className="text-gradient">Mentions légales</span>
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Version détaillée · Dernière mise à jour : 1er août 2026
        </p>
      </div>

      <Section titre="1. Éditeur du site" id="editeur">
        <Ligne label="Nom du service">Jennyyl-blindtest</Ligne>
        <Ligne label="Responsable de la publication">Popiette</Ligne>
        <Ligne label="Contact">
          <a
            href="mailto:jennyylblindtest@protonmail.com"
            className="font-bold text-jenny-light underline"
          >
            jennyylblindtest@protonmail.com
          </a>
        </Ligne>
        <Ligne label="Nature du service">
          Site de jeu (blindtest musical) à but non lucratif, sans publicité,
          sans vente et sans collecte de paiement. Il est édité par un
          particulier, à titre de loisir, pour la communauté de la streameuse
          JennyyL.
        </Ligne>
        <p className="text-sm text-zinc-400">
          Conformément à l'article 6 III-2 de la loi n° 2004-575 du 21 juin 2004
          pour la confiance dans l'économie numérique (LCEN), l'éditeur non
          professionnel peut ne pas rendre publiques ses coordonnées postales,
          à condition de les avoir communiquées à l'hébergeur. L'adresse
          électronique ci-dessus permet de le contacter directement.
        </p>
      </Section>

      <Section titre="2. Hébergement" id="hebergement">
        <Titre>Site web (partie visible)</Titre>
        <Ligne label="Hébergeur">Vercel Inc.</Ligne>
        <Ligne label="Adresse">
          340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis
        </Ligne>
        <Ligne label="Site">
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-jenny-light underline"
          >
            vercel.com
          </a>
        </Ligne>

        <Titre>Base de données et comptes</Titre>
        <Ligne label="Hébergeur">Supabase, Inc.</Ligne>
        <Ligne label="Adresse">
          970 Toa Payoh North #07-04, Singapour 318992
        </Ligne>
        <Ligne label="Site">
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-jenny-light underline"
          >
            supabase.com
          </a>
        </Ligne>
        <Ligne label="Localisation des données">
          Londres, Royaume-Uni (région <em>eu-west-2</em>) — pays reconnu comme
          offrant un niveau de protection adéquat par la Commission européenne.
        </Ligne>

        <Titre>Extraits musicaux</Titre>
        <p>
          Les extraits sonores sont fournis à la demande par l'API publique de{" "}
          <strong className="text-white">Deezer</strong> (Deezer S.A., 24 rue de
          Calais, 75009 Paris, France). Ils ne sont ni copiés, ni stockés, ni
          rediffusés par ce site.
        </p>
      </Section>

      <Section titre="3. Propriété intellectuelle" id="propriete">
        <Titre>Le site</Titre>
        <p>
          Le code, la conception, les textes et l'organisation du jeu sont la
          propriété de l'éditeur du site. Toute reproduction ou réutilisation
          sans autorisation préalable est interdite.
        </p>

        <Titre>Les musiques</Titre>
        <p>
          Les extraits musicaux sont diffusés via l'
          <strong className="text-white">API publique de Deezer</strong>, dans
          les conditions prévues par ce service. Il s'agit d'extraits courts
          (environ 30 secondes), lus en flux et jamais téléchargeables.
        </p>
        <p>
          <strong className="text-white">
            Ce site n'héberge, ne stocke et ne distribue aucun fichier musical.
          </strong>{" "}
          Les œuvres, enregistrements, titres, noms d'artistes et pochettes
          restent la propriété exclusive de leurs auteurs, interprètes,
          producteurs et ayants droit respectifs.
        </p>

        <Titre>Marques et œuvres citées</Titre>
        <p>
          Les noms de films, de studios (notamment Disney, Pixar), de séries,
          d'artistes et de labels cités le sont uniquement à des fins
          d'identification, dans le cadre d'un jeu de reconnaissance musicale.
          Toutes les marques citées appartiennent à leurs propriétaires
          respectifs.
        </p>
        <p className="font-semibold text-white">
          Ce site n'est affilié, sponsorisé ni approuvé par Deezer, Disney, ni
          par aucun label, studio, ayant droit ou plateforme mentionnés.
        </p>

        <Titre>Le nom et l'univers de JennyyL</Titre>
        <p>
          Le pseudonyme, le logo, la mascotte et l'identité visuelle de JennyyL
          sont utilisés avec son accord et demeurent sa propriété. Tous droits
          réservés.
        </p>
      </Section>

      <Section titre="4. Données personnelles (RGPD)" id="donnees">
        <p>
          Traitement conforme au Règlement (UE) 2016/679 (RGPD) et à la loi
          « Informatique et Libertés » du 6 janvier 1978 modifiée.
        </p>

        <Titre>Responsable de traitement</Titre>
        <p>
          Popiette, joignable à{" "}
          <a
            href="mailto:jennyylblindtest@protonmail.com"
            className="font-bold text-jenny-light underline"
          >
            jennyylblindtest@protonmail.com
          </a>
          . Compte tenu de la nature et du volume du traitement, aucun délégué à
          la protection des données (DPO) n'est désigné.
        </p>

        <Titre>Données collectées</Titre>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-400">
                <th className="py-2 pr-4">Donnée</th>
                <th className="py-2 pr-4">Pourquoi</th>
                <th className="py-2">Conservation</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-t border-jenny-line">
                <td className="py-2 pr-4 font-semibold text-white">Pseudo</td>
                <td className="py-2 pr-4">
                  T'identifier dans le jeu et les classements
                </td>
                <td className="py-2">Durée de vie du compte</td>
              </tr>
              <tr className="border-t border-jenny-line">
                <td className="py-2 pr-4 font-semibold text-white">Email</td>
                <td className="py-2 pr-4">
                  Identifier ton compte et permettre la réinitialisation du mot
                  de passe. Jamais affiché aux autres joueurs.
                </td>
                <td className="py-2">Durée de vie du compte</td>
              </tr>
              <tr className="border-t border-jenny-line">
                <td className="py-2 pr-4 font-semibold text-white">
                  Mot de passe
                </td>
                <td className="py-2 pr-4">
                  Te connecter. <strong>Jamais conservé en clair</strong> : seule
                  une empreinte irréversible (hachage) est stockée. Personne ne
                  peut le lire, pas même l'éditeur.
                </td>
                <td className="py-2">Durée de vie du compte</td>
              </tr>
              <tr className="border-t border-jenny-line">
                <td className="py-2 pr-4 font-semibold text-white">
                  Parties jouées
                </td>
                <td className="py-2 pr-4">
                  Afficher ton historique et tes statistiques
                </td>
                <td className="py-2">Durée de vie du compte</td>
              </tr>
              <tr className="border-t border-jenny-line">
                <td className="py-2 pr-4 font-semibold text-white">
                  Salons multijoueur
                </td>
                <td className="py-2 pr-4">
                  Faire fonctionner une partie entre plusieurs joueurs
                </td>
                <td className="py-2">
                  Supprimés automatiquement après 10 minutes d'inactivité
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-zinc-400">
          Aucune autre donnée n'est collectée : ni adresse IP conservée, ni
          profilage, ni géolocalisation, ni données bancaires, ni données
          sensibles au sens de l'article 9 du RGPD.
        </p>

        <Titre>Base légale</Titre>
        <p>
          Le traitement repose sur ton <strong className="text-white">consentement</strong>{" "}
          (article 6.1.a du RGPD), donné lors de la création du compte par
          acceptation explicite des présentes conditions. Ce consentement peut
          être retiré à tout moment en supprimant ton compte.
        </p>

        <Titre>Destinataires et sous-traitants</Titre>
        <p>
          Tes données ne sont{" "}
          <strong className="text-white">ni vendues, ni louées, ni échangées</strong>,
          et ne sont transmises à aucun tiers à des fins commerciales. Seuls
          interviennent les prestataires techniques strictement nécessaires :
        </p>
        <p>
          • <strong className="text-white">Vercel Inc.</strong> — hébergement du
          site
          <br />• <strong className="text-white">Supabase, Inc.</strong> —
          hébergement de la base de données et gestion des comptes
          <br />• <strong className="text-white">Brevo (Sendinblue SAS)</strong>{" "}
          — envoi de l'email de réinitialisation de mot de passe, le cas échéant
        </p>

        <Titre>Lieu d'hébergement et transferts</Titre>
        <p>
          <strong className="text-white">
            Les données de compte (pseudo, email, mot de passe haché, historique
            de parties) sont stockées à Londres, au Royaume-Uni
          </strong>{" "}
          (région <em>eu-west-2</em> de Supabase). Le Royaume-Uni bénéficie d'une
          décision d'adéquation de la Commission européenne : les transferts vers
          ce pays sont autorisés sans formalité supplémentaire, le niveau de
          protection étant reconnu comme équivalent à celui du RGPD.
        </p>
        <p>
          L'hébergeur du site (Vercel Inc.) est établi aux États-Unis. Les
          transferts éventuels vers ce pays sont encadrés par les{" "}
          <strong className="text-white">clauses contractuelles types</strong> de
          la Commission européenne et, le cas échéant, par le{" "}
          <em>EU-U.S. Data Privacy Framework</em>. Les politiques de
          confidentialité de ces prestataires sont consultables sur leurs sites
          respectifs.
        </p>

        <Titre>Sécurité</Titre>
        <p>
          Les échanges sont chiffrés (HTTPS). Les mots de passe sont hachés de
          manière irréversible. L'accès à la base est restreint au serveur du
          site et protégé par des clés secrètes. La session est maintenue par un
          cookie signé, inaccessible aux scripts de la page.
        </p>
        <p className="text-sm text-zinc-400">
          Aucun système n'étant infaillible, l'éditeur s'engage à informer les
          personnes concernées et la CNIL en cas de violation de données
          présentant un risque, dans les délais prévus par le RGPD.
        </p>

        <Titre>Tes droits</Titre>
        <p>
          Tu disposes des droits d'<strong className="text-white">accès</strong>,{" "}
          <strong className="text-white">rectification</strong>,{" "}
          <strong className="text-white">effacement</strong>,{" "}
          <strong className="text-white">portabilité</strong>,{" "}
          <strong className="text-white">limitation</strong> et{" "}
          <strong className="text-white">opposition</strong>, ainsi que du droit
          de retirer ton consentement à tout moment.
        </p>
        <p>
          La plupart s'exercent directement depuis ta page{" "}
          <Link href="/compte" className="font-bold text-jenny-light underline">
            Compte
          </Link>{" "}
          : modification du pseudo et du mot de passe, téléchargement de tes
          données dans un fichier lisible, et suppression définitive du compte.
          Pour toute autre demande, écris à l'adresse de contact ; une réponse
          te sera apportée dans un délai maximum d'un mois.
        </p>

        <Titre>Réclamation</Titre>
        <p>
          Si tu estimes que tes droits ne sont pas respectés, tu peux introduire
          une réclamation auprès de la CNIL — 3 place de Fontenoy, TSA 80715,
          75334 Paris Cedex 07 —{" "}
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-jenny-light underline"
          >
            www.cnil.fr
          </a>
          .
        </p>

        <Titre>Mineurs</Titre>
        <p>
          En France, la création d'un compte par un mineur de moins de 15 ans
          requiert l'autorisation d'un titulaire de l'autorité parentale
          (article 45 de la loi Informatique et Libertés). Tout compte signalé
          comme appartenant à un mineur non autorisé sera supprimé sur simple
          demande à l'adresse de contact.
        </p>
      </Section>

      <Section titre="5. Cookies" id="cookies">
        <p>
          Ce site utilise{" "}
          <strong className="text-white">
            un seul cookie, strictement nécessaire à son fonctionnement
          </strong>{" "}
          :
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-400">
                <th className="py-2 pr-4">Nom</th>
                <th className="py-2 pr-4">Rôle</th>
                <th className="py-2">Durée</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-jenny-line">
                <td className="py-2 pr-4 font-semibold text-white">
                  bt_session
                </td>
                <td className="py-2 pr-4">
                  Te garder connecté d'une page à l'autre
                </td>
                <td className="py-2">30 jours</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Ce cookie est <strong className="text-white">technique</strong> : il ne
          sert ni à la publicité, ni au suivi, ni à la mesure d'audience. À ce
          titre, il est exempté du consentement préalable prévu à l'article 82
          de la loi Informatique et Libertés — aucun bandeau cookies n'est donc
          nécessaire.
        </p>
        <p>
          Le site utilise également le{" "}
          <strong className="text-white">stockage local</strong> de ton
          navigateur pour mémoriser tes préférences de jeu (volume, morceaux déjà
          entendus). Ces informations restent sur ton appareil, ne sont jamais
          transmises et peuvent être effacées en vidant les données du site.
        </p>
        <p className="font-semibold text-white">
          Aucun cookie tiers, aucun cookie publicitaire, aucun traceur.
        </p>
      </Section>

      <Section titre="6. Mesure d'audience" id="audience">
        <p>
          <strong className="text-white">
            Aucun outil de mesure d'audience n'est installé sur ce site.
          </strong>{" "}
          Ni Google Analytics, ni Matomo, ni aucune solution équivalente. Aucune
          statistique de navigation, aucun profil de visiteur, aucun suivi
          inter-sites.
        </p>
        <p className="text-sm text-zinc-400">
          Les hébergeurs peuvent, pour leurs besoins techniques propres et leur
          sécurité, journaliser des informations de connexion (adresse IP,
          horodatage) selon leurs propres politiques, sans que l'éditeur y ait
          accès ni les exploite. Si une mesure d'audience venait à être ajoutée,
          la présente page serait mise à jour et, si la loi l'exige, ton
          consentement serait recueilli au préalable.
        </p>
      </Section>

      <Section titre="7. Limitation de responsabilité" id="responsabilite">
        <p>
          Le site est proposé{" "}
          <strong className="text-white">« en l'état »</strong>, gratuitement et
          sans garantie de disponibilité. L'accès peut être interrompu à tout
          moment, notamment pour maintenance, mise à jour, ou en cas de
          défaillance des services tiers dont il dépend (Deezer, Vercel,
          Supabase).
        </p>
        <p>
          L'éditeur ne saurait être tenu responsable :
        </p>
        <p>
          • des interruptions, lenteurs ou dysfonctionnements du service ;
          <br />• de la perte de données liée à une défaillance technique ou à la
          suppression d'un compte ;
          <br />• de l'indisponibilité, de l'inexactitude ou du contenu des
          extraits musicaux fournis par Deezer ;
          <br />• des contenus saisis par les utilisateurs (pseudos, réponses) ;
          <br />• des dommages indirects résultant de l'utilisation du site.
        </p>
        <p>
          Les informations affichées pendant le jeu (titres, artistes, films)
          proviennent des données de Deezer et peuvent comporter des erreurs ou
          des approximations. Elles n'ont aucune valeur de référence.
        </p>
        <p>
          L'utilisateur s'engage à ne pas perturber le service, à ne pas tenter
          d'y accéder de manière frauduleuse et à respecter les autres joueurs.
          Tout compte contrevenant peut être suspendu ou supprimé sans préavis.
        </p>
      </Section>

      <Section titre="8. Intelligence artificielle" id="ia">
        <p>
          Par transparence :{" "}
          <strong className="text-white">
            le code de ce site a été écrit avec l'assistance d'une intelligence
            artificielle
          </strong>
          , sous la direction et la responsabilité de l'éditeur.
        </p>
        <p>
          En revanche, <strong className="text-white">aucune intelligence
          artificielle n'intervient dans le fonctionnement du site</strong> :
        </p>
        <p>
          • aucune donnée personnelle n'est transmise à un service
          d'intelligence artificielle ;
          <br />• aucune donnée d'utilisateur n'est utilisée pour entraîner un
          modèle, ni par l'éditeur, ni par un tiers ;
          <br />• aucune décision automatisée produisant des effets juridiques ou
          significatifs n'est prise à ton égard, au sens de l'article 22 du RGPD ;
          <br />• aucun contenu n'est généré automatiquement pendant les parties :
          les questions proviennent uniquement du catalogue Deezer, et la
          correction des réponses repose sur une comparaison de texte classique.
        </p>
        <p className="text-sm text-zinc-400">
          Si un usage d'intelligence artificielle venait à être introduit dans le
          service, cette page serait mise à jour et l'information portée à la
          connaissance des utilisateurs, conformément au règlement européen sur
          l'intelligence artificielle (RIA / AI Act).
        </p>
      </Section>

      <Section titre="9. Signalement et retrait de contenu" id="signalement">
        <p>
          Ce site respecte les droits des auteurs et des ayants droit. Si vous
          estimez qu'un contenu diffusé porte atteinte à vos droits — œuvre
          musicale, marque, image, nom — vous pouvez en demander le retrait par
          simple message à{" "}
          <a
            href="mailto:jennyylblindtest@protonmail.com"
            className="font-bold text-jenny-light underline"
          >
            jennyylblindtest@protonmail.com
          </a>
          .
        </p>
        <p>
          Toute demande motivée sera traitée{" "}
          <strong className="text-white">dans les meilleurs délais</strong>, et le
          contenu concerné retiré sans discussion préalable. Le service étant
          gratuit et non commercial, aucune contestation ne sera opposée à une
          demande émanant d'un ayant droit.
        </p>
      </Section>

      <Section titre="10. Droit applicable" id="droit">
        <p>
          Les présentes mentions sont soumises au{" "}
          <strong className="text-white">droit français</strong>. En cas de
          litige, une solution amiable sera recherchée en priorité, par
          l'intermédiaire de l'adresse de contact. À défaut d'accord, les
          tribunaux français sont seuls compétents.
        </p>
        <p>
          L'éditeur se réserve le droit de modifier les présentes mentions à tout
          moment. La version applicable est celle publiée sur cette page à la
          date de consultation. En cas de modification substantielle touchant au
          traitement des données personnelles, les utilisateurs inscrits en
          seront informés.
        </p>
      </Section>

      <p className="mb-8 text-center text-xs text-zinc-600">
        Jennyyl-blindtest · Site non commercial · Tous droits réservés à JennyyL
      </p>

      <p className="text-center">
        <Link href="/" className="text-sm text-zinc-500 underline">
          ← Retour à l'accueil
        </Link>
      </p>
    </main>
  );
}
