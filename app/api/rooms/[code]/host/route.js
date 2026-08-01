import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { profilConnecte } from "@/lib/roles";
import {
  salonParCode,
  lancerManche,
  champsADeviner,
  repartition,
} from "@/lib/rooms";

export const dynamic = "force-dynamic";

const maj = (roomId, champs) =>
  db(`/rooms?id=eq.${roomId}`, {
    method: "PATCH",
    body: JSON.stringify({ ...champs, updated_at: new Date().toISOString() }),
  });

// --- Actions réservées à l'animatrice du salon ---
export async function POST(req, { params }) {
  const moi = await profilConnecte();
  if (!moi)
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  const salon = await salonParCode(String(params.code || "").toUpperCase());
  if (!salon)
    return NextResponse.json({ error: "Salon introuvable." }, { status: 404 });

  // Vérification côté serveur : seul le créateur du salon commande.
  if (salon.host_id !== moi.userId) {
    return NextResponse.json({ error: "Action réservée à l'animatrice." }, { status: 403 });
  }

  let c;
  try {
    c = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  switch (c.action) {
    // ---- Démarrer la partie ----
    case "demarrer": {
      if (salon.status !== "lobby")
        return NextResponse.json({ error: "Partie déjà lancée." }, { status: 400 });
      await lancerManche(salon, 0);
      return NextResponse.json({ ok: true });
    }

    // ---- Chanson suivante (clic manuel) ----
    case "suivante": {
      const total = (salon.tracks || []).length;
      if (salon.round_index + 1 >= total) {
        await maj(salon.id, { status: "ended" });
        return NextResponse.json({ ok: true, termine: true });
      }
      await lancerManche(salon, salon.round_index + 1);
      return NextResponse.json({ ok: true });
    }

    // ---- Pause / reprise ----
    case "pause": {
      if (salon.status !== "playing")
        return NextResponse.json({ error: "Rien à mettre en pause." }, { status: 400 });
      const restant = Math.max(
        0,
        new Date(salon.round_ends_at).getTime() - Date.now()
      );
      await maj(salon.id, {
        status: "paused",
        settings: { ...salon.settings, restantMs: restant },
      });
      return NextResponse.json({ ok: true });
    }
    case "reprendre": {
      if (salon.status !== "paused")
        return NextResponse.json({ error: "La partie n'est pas en pause." }, { status: 400 });
      const restant = salon.settings?.restantMs ?? 10000;
      await maj(salon.id, {
        status: "playing",
        round_ends_at: new Date(Date.now() + restant).toISOString(),
      });
      return NextResponse.json({ ok: true });
    }

    // ---- Réglages en cours de partie ----
    case "autoNext":
      await maj(salon.id, { auto_next: Boolean(c.valeur) });
      return NextResponse.json({ ok: true, autoNext: Boolean(c.valeur) });

    case "verrouiller":
      await maj(salon.id, { locked: Boolean(c.valeur) });
      return NextResponse.json({ ok: true, verrouille: Boolean(c.valeur) });

    case "hoteJoue":
      await maj(salon.id, { host_plays: Boolean(c.valeur) });
      return NextResponse.json({ ok: true, hoteJoue: Boolean(c.valeur) });

    // ---- Exclure un joueur ----
    case "exclure": {
      if (!c.userId)
        return NextResponse.json({ error: "Joueur inconnu." }, { status: 400 });
      if (c.userId === salon.host_id)
        return NextResponse.json({ error: "Tu ne peux pas t'exclure." }, { status: 400 });
      await db(`/room_players?room_id=eq.${salon.id}&user_id=eq.${c.userId}`, {
        method: "PATCH",
        body: JSON.stringify({ kicked: true }),
      });
      return NextResponse.json({ ok: true });
    }

    // ---- Valider une réponse à la main ----
    case "accepter": {
      const { answerId, partie } = c;
      if (!answerId || !["titre", "artiste", "film"].includes(partie))
        return NextResponse.json({ error: "Réponse ou champ invalide." }, { status: 400 });

      const ar = await db(`/room_answers?id=eq.${answerId}&select=*`);
      const reponse = Array.isArray(ar.body) ? ar.body[0] : null;
      if (!reponse || reponse.room_id !== salon.id)
        return NextResponse.json({ error: "Réponse introuvable." }, { status: 404 });

      const jr = await db(
        `/room_players?room_id=eq.${salon.id}&user_id=eq.${reponse.user_id}&select=*`
      );
      const joueur = Array.isArray(jr.body) ? jr.body[0] : null;
      if (!joueur)
        return NextResponse.json({ error: "Joueur introuvable." }, { status: 404 });

      const trouve = joueur.found || {};
      if (trouve[partie])
        return NextResponse.json({ error: "Déjà trouvé." }, { status: 400 });

      const morceau = (salon.tracks || [])[reponse.round_index];
      const bareme = repartition(
        champsADeviner(salon.settings?.mode || "full", morceau)
      );
      // Validation manuelle : on accorde la valeur pleine du champ.
      const points = bareme[partie] || 0;
      trouve[partie] = true;

      await db(`/room_players?room_id=eq.${salon.id}&user_id=eq.${reponse.user_id}`, {
        method: "PATCH",
        body: JSON.stringify({ score: (joueur.score || 0) + points, found: trouve }),
      });
      await db(`/room_answers?id=eq.${answerId}`, {
        method: "PATCH",
        body: JSON.stringify({ accepte: true, partie, points }),
      });
      return NextResponse.json({ ok: true, points });
    }

    // ---- Terminer ----
    case "terminer":
      await maj(salon.id, { status: "ended" });
      return NextResponse.json({ ok: true });

    default:
      return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }
}
