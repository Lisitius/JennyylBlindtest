// Mots parasites ignorés lors de la comparaison (articles FR/EN).
const STOP_WORDS = new Set([
  "le", "la", "les", "l", "un", "une", "des", "de", "du", "d",
  "the", "a", "an",
]);

// Minuscules + suppression des accents et de la ponctuation.
function basicNormalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’`´]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalize(str) {
  const tokens = basicNormalize(str)
    .split(" ")
    .filter((t) => t && !STOP_WORDS.has(t));
  return tokens.join(" ");
}

// Nettoie un titre Spotify : "Song - Remastered 2011 (feat. X)" -> "Song"
export function cleanTitle(title) {
  let t = title || "";
  t = t.split(" - ")[0];
  t = t.replace(/\(.*?\)/g, " ");
  t = t.replace(/\[.*?\]/g, " ");
  return t.trim() || title || "";
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[n];
}

export function isCorrectAnswer(answer, title) {
  let a = normalize(answer);
  let t = normalize(cleanTitle(title));
  // Si le titre n'est composé que de mots parasites ("The A"), on garde tout.
  if (!t) {
    a = basicNormalize(answer);
    t = basicNormalize(cleanTitle(title));
  }
  if (!a || !t) return false;
  if (a === t) return true;
  // Tolérance aux petites fautes de frappe.
  const tolerance = t.length >= 10 ? 2 : t.length >= 5 ? 1 : 0;
  return levenshtein(a, t) <= tolerance;
}
