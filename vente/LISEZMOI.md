# Vendre Phase Gym sur Etsy

Ce dossier contient tout ce qu'il faut pour vendre l'app.

| Élément | Où |
| --- | --- |
| Fiche Etsy (titre, description, mots-clés, prix, messages) | [`fiche-etsy.md`](fiche-etsy.md) |
| Images de l'annonce (3000 × 2250), logo et bannière de la boutique | [`images/`](images) |
| PDF livré aux acheteuses (lien + code) | `prive/Phase-Gym-acces.pdf`, **jamais dans Git** (ignoré par `.gitignore`) |
| Livre PDF « Bouge avec ton cycle » (49 exercices, code couleur cycle et humeurs) | `prive/Phase-Gym-livre-exercices.pdf`, refait avec `node vente/outils/livre.mjs http://localhost:8766/phase/ vente/prive/Phase-Gym-livre-exercices.pdf` (contenu dans `outils/livre-donnees.mjs`) |
| Outils pour refaire tout ça | [`outils/`](outils) |

## Comment l'accès est protégé

- L'app complète (`docs/phase/`) demande un **code d'accès** à la première ouverture sur chaque appareil.
  Le code est dans le PDF vendu sur Etsy. Dans l'app, il n'y a que son empreinte (SHA-256) : le code lui-même
  n'apparaît nulle part dans le dépôt.
- La **démo** (`…/phase/?demo`, ou « Voir la démo » sur l'écran du code) reste libre : c'est ta vitrine.
- Les personnes qui avaient déjà un profil avant la mise en place du code ne sont pas bloquées.

**Limite honnête :** l'app tourne entièrement dans le navigateur. Quelqu'un qui s'y connaît peut lire le code source
public et contourner le verrou. Ça suffit pour éviter le partage facile du lien, pas pour arrêter une personne
déterminée. Pour aller plus loin, il faudrait un dépôt privé et un hébergement (Netlify, Cloudflare Pages) avec une
vraie vérification côté serveur.

## Changer de code (si le code a circulé)

1. `node vente/outils/nouveau-code.mjs` : tire un nouveau code et affiche son empreinte.
2. Ajoute l'empreinte dans `ACCESS_HASHES` (`docs/phase/app.js`). Retire l'ancienne seulement si elle a fuité :
   les acheteuses déjà servies devront alors recevoir le nouveau PDF.
3. `node vente/outils/pdf-acheteuse.mjs https://zcabande-arch.github.io/D-clic-/phase/ <nouveau code> vente/prive/Phase-Gym-acces.pdf`
4. Remplace le PDF dans l'annonce Etsy.

## Refaire les images (après une mise à jour de l'app)

```bash
python3 -m http.server 8766 --directory docs &
node vente/outils/captures.mjs http://localhost:8766/phase/ /tmp/captures
node vente/outils/images-etsy.mjs http://localhost:8766/phase/ /tmp/captures vente/images
```

Il faut Node.js et Playwright (`npm i playwright`), et `qrcode-generator` pour le QR code du PDF.

## Une fois l'annonce publiée

Mets le lien de l'annonce dans `ETSY_URL` (`docs/phase/app.js`) : un bouton « Acheter l'app sur Etsy » apparaîtra
sur l'écran du code et dans la démo.

## Avant de publier

- [ ] Ouvrir le lien du PDF sur ton téléphone, entrer le code : l'app doit s'ouvrir.
- [ ] Vérifier que « Phase Gym » n'est pas déjà une marque déposée (base des marques de l'INPI).
- [ ] Cocher la case « IA générative » dans l'annonce.
- [ ] Remplir le message automatique aux acheteuses (dans `fiche-etsy.md`).
- [ ] Vérifier les règles actuelles d'Etsy pour les produits numériques (centre d'aide vendeurs).
