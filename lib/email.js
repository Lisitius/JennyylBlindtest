// Envoi d'emails via Brevo (offre gratuite : ~300 emails/jour).
// Uniquement côté serveur : la clé ne doit jamais partir vers le navigateur.

const API = "https://api.brevo.com/v3/smtp/email";

export function emailConfigure() {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
}

export async function envoyerEmail({ destinataire, sujet, html, texte }) {
  if (!emailConfigure()) {
    return { ok: false, raison: "non_configure" };
  }
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: process.env.BREVO_SENDER_EMAIL,
          name: process.env.BREVO_SENDER_NAME || "Blindtest de JennyyL",
        },
        to: [{ email: destinataire }],
        subject: sujet,
        htmlContent: html,
        ...(texte ? { textContent: texte } : {}),
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[email] echec Brevo", res.status, detail.slice(0, 300));
      return { ok: false, raison: "envoi_refuse", status: res.status };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] erreur reseau", e?.message);
    return { ok: false, raison: "reseau" };
  }
}

// Gabarit de l'email de réinitialisation, aux couleurs du site.
export function emailReinitialisation({ pseudo, lien }) {
  const html = `
<div style="background:#140f24;padding:32px 16px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#211a38;border-radius:16px;padding:32px;color:#e9e4f8">
    <p style="font-size:40px;margin:0 0 8px">🐨</p>
    <h1 style="margin:0 0 16px;font-size:24px;color:#c9b6f7">Nouveau mot de passe</h1>
    <p style="margin:0 0 16px;line-height:1.6">
      Bonjour <strong>${pseudo || ""}</strong>, tu as demandé à réinitialiser
      le mot de passe de ton compte Blindtest.
    </p>
    <p style="margin:0 0 24px;line-height:1.6">
      Clique sur le bouton ci-dessous. Ce lien est valable <strong>30 minutes</strong>
      et ne fonctionne qu'une seule fois.
    </p>
    <p style="text-align:center;margin:0 0 24px">
      <a href="${lien}" style="display:inline-block;background:linear-gradient(90deg,#a78bee,#ec9bd6);color:#fff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:999px">
        Choisir un nouveau mot de passe
      </a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#9d95b8;line-height:1.6">
      Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :<br>
      <span style="color:#c9b6f7;word-break:break-all">${lien}</span>
    </p>
    <p style="margin:24px 0 0;font-size:13px;color:#9d95b8;line-height:1.6">
      Tu n'as rien demandé ? Ignore simplement cet email : ton mot de passe
      reste inchangé.
    </p>
  </div>
</div>`;
  const texte = `Bonjour ${pseudo || ""},

Tu as demandé à réinitialiser le mot de passe de ton compte Blindtest.
Ouvre ce lien (valable 30 minutes, utilisable une seule fois) :

${lien}

Tu n'as rien demandé ? Ignore cet email, ton mot de passe reste inchangé.`;
  return { html, texte };
}
