import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { profilConnecte, estAdmin, ROLES } from "@/lib/roles";

export const dynamic = "force-dynamic";

// --- Liste des comptes (réservé aux admins) ---
export async function GET() {
  const moi = await profilConnecte();
  if (!moi || !estAdmin(moi.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const r = await db("/profiles?select=id,pseudo,role,created_at&order=created_at.asc");
  return NextResponse.json({
    moi: { userId: moi.userId, pseudo: moi.pseudo },
    comptes: Array.isArray(r.body) ? r.body : [],
  });
}

// --- Changer le rôle d'un compte (réservé aux admins) ---
export async function PATCH(req) {
  const moi = await profilConnecte();
  if (!moi || !estAdmin(moi.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  let corps;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { userId, role } = corps;
  if (!userId || !ROLES.includes(role)) {
    return NextResponse.json({ error: "Rôle inconnu." }, { status: 400 });
  }

  // Sécurité : on ne peut pas se retirer soi-même les droits d'admin,
  // sinon plus personne ne peut en attribuer.
  if (userId === moi.userId && role !== "admin") {
    return NextResponse.json(
      { error: "Tu ne peux pas retirer tes propres droits d'administrateur." },
      { status: 400 }
    );
  }

  const maj = await db(`/profiles?id=eq.${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  if (!maj.ok) {
    return NextResponse.json(
      { error: "Impossible de modifier le rôle." },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true, role });
}
