// Crée un nouveau code d'accès pour Phase Gym et affiche son empreinte.
// Usage : node vente/outils/nouveau-code.mjs            (code tiré au hasard)
//         node vente/outils/nouveau-code.mjs PG-XXXX-XXXX-XXXX
// Ensuite : ajoute l'empreinte dans ACCESS_HASHES (docs/phase/app.js). Garde l'ancienne pour que les acheteuses
// déjà servies puissent encore entrer leur code ; retire-la seulement si le code a fuité.
// Puis refais le PDF avec ce code (pdf-acheteuse.mjs) et remplace-le dans l'annonce Etsy.
import crypto from "crypto";
const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans 0/O, 1/I/L, pour éviter les confusions
const pick = () => A[crypto.randomInt(A.length)];
const code = process.argv[2] || "PG-" + [0, 1, 2].map(() => Array.from({ length: 4 }, pick).join("")).join("-");
const n = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
if (n.length < 8) { console.error("Code trop court (8 caractères minimum)."); process.exit(1); }
const hash = crypto.createHash("sha256").update("phase-gym:" + n).digest("hex");
console.log("Code      :", code);
console.log("Empreinte :", hash);
