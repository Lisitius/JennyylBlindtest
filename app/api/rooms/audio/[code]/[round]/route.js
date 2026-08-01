import { NextResponse } from "next/server";
import { profilConnecte } from "@/lib/roles";
import { salonParCode } from "@/lib/rooms";

export const dynamic = "force-dynamic";

// Relais audio : le navigateur reçoit le son sans jamais voir le lien Deezer.
// Sinon, un joueur curieux pourrait retrouver le titre dans les outils réseau.
export async function GET(_req, { params }) {
  const moi = await profilConnecte();
  if (!moi) return new NextResponse("Non connecté.", { status: 401 });

  const salon = await salonParCode(String(params.code || "").toUpperCase());
  if (!salon) return new NextResponse("Salon introuvable.", { status: 404 });

  const indice = parseInt(params.round, 10);
  // On ne sert que la manche en cours : impossible d'écouter en avance.
  if (indice !== salon.round_index) {
    return new NextResponse("Manche indisponible.", { status: 403 });
  }

  const morceau = (salon.tracks || [])[indice];
  if (!morceau?.preview) return new NextResponse("Pas d'extrait.", { status: 404 });

  const amont = await fetch(morceau.preview, { cache: "no-store" });
  if (!amont.ok || !amont.body) {
    return new NextResponse("Extrait indisponible.", { status: 502 });
  }

  return new NextResponse(amont.body, {
    headers: {
      "Content-Type": amont.headers.get("content-type") || "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
