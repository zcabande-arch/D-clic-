# Déclic

Une photo toutes les heures, de 8h à 20h, partagée avec tes proches.
Chaque heure pile, un « déclic » s’ouvre : tu as 10 minutes pour envoyer ta photo à l’heure.
Les photos des autres restent floutées tant que tu n’as pas envoyé la tienne.
On gagne des points (à l’heure, combos, série de jours, tout le groupe ensemble…) et un classement départage le groupe.

C’est une vraie application web installable (PWA) avec son propre serveur :

- **Serveur Node.js** : base SQLite intégrée (`node:sqlite`), synchronisation en temps réel par WebSocket.
- **Règles d’accès côté serveur** : seuls les membres d’un groupe voient ses photos, chacun n’écrit que ses propres données, on ne peut ajouter ou retirer que soi-même d’un groupe.
- **Photos stockées sur disque** (`data/media`), mises en cache par le navigateur.
- **Rappels push** à chaque déclic (8h → 20h, dans le fuseau horaire de l’appareil).
- **Installable** sur l’écran d’accueil (Android, iPhone, ordinateur) et ouvrable hors ligne.
- **Comptes sans mot de passe** : chaque appareil reçoit un compte automatiquement. Un lien personnel (Profil › Réglages) permet d’utiliser le même compte sur un autre appareil.

## Version gratuite : GitHub Pages + Supabase

Le dossier `docs/` contient une version de Déclic qui n'a besoin d'aucun serveur :
l'interface est hébergée gratuitement par **GitHub Pages**, et les comptes, groupes et photos sont gardés par **Supabase** (offre gratuite).
Tout se configure depuis un navigateur, y compris sur iPad. Les rappels push ne sont pas disponibles dans cette version.

1. **Supabase** : crée un compte sur <https://supabase.com>, puis un projet (« New project »).
2. **Base de données** : dans *SQL Editor › New query*, colle tout le contenu de [`supabase/schema.sql`](supabase/schema.sql) et touche *Run*.
3. **Connexion sans mot de passe** : dans *Authentication › Sign In / Providers*, active *Allow anonymous sign-ins*.
4. **Réglages** : dans *Project Settings › API*, copie la *Project URL* et la clé *anon public*, et mets-les dans [`docs/config.js`](docs/config.js).
5. **GitHub Pages** : dans le dépôt GitHub, *Settings › Pages*, choisis *Deploy from a branch*, la branche de l'application et le dossier `/docs`, puis *Save*.
6. Après une minute, l'application est en ligne à l'adresse **https://zcabande-arch.github.io/D-clic-/**.

Pour inviter des proches : ouvre un groupe, touche *Inviter des proches* et envoie le lien. Ils l'ouvrent dans Safari (ou Chrome), l'ajoutent à l'écran d'accueil et rejoignent le groupe directement.

## Version avec serveur (auto-hébergée)

Le dossier `server/` et `public/` forment une version avec son propre serveur Node.js, qui ajoute les rappels push à chaque déclic.

## Lancer en local

Il faut Node.js 22.5 ou plus récent.

```bash
npm install
npm start
```

Puis ouvre <http://localhost:3000>. Pour tester à plusieurs, ouvre une deuxième fenêtre en navigation privée.

```bash
npm test   # tests d’intégration du serveur
```

## Mettre en ligne

Les notifications push, l’appareil photo et l’installation exigent **HTTPS**. N’importe quel hébergeur Node ou Docker avec un disque persistant convient (Fly.io, Render, Railway, un VPS…).

```bash
docker build -t declic .
docker run -d -p 3000:3000 -v declic-data:/data --name declic declic
```

Place un reverse proxy HTTPS devant (Caddy, Nginx, Traefik) qui transmet aussi les WebSockets (`/ws`).

### Variables d’environnement

| Variable | Rôle | Défaut |
| --- | --- | --- |
| `PORT` | Port HTTP | `3000` |
| `DATA_DIR` | Dossier de la base SQLite, des photos et des clés push | `./data` |
| `VAPID_SUBJECT` | Contact pour les services push (`mailto:…` ou `https://…`) | `mailto:declic@example.com` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Clés push. Si elles sont absentes, elles sont générées une fois et gardées dans `DATA_DIR/vapid.json`. | générées |

Sauvegarder l’application revient à sauvegarder le dossier `DATA_DIR`.

## Structure

```
server/
  index.js   serveur HTTP, API de session et push, WebSocket temps réel
  docs.js    lecture/écriture des documents et règles de sécurité
  store.js   persistance SQLite
  push.js    envoi des rappels à chaque déclic
public/
  index.html, styles.css, app.js   l’interface Déclic
  db.js      client de synchronisation (API proche de Firestore)
  sw.js      service worker : hors ligne, cache des photos, notifications
  manifest.webmanifest, icons/
test/        tests d’intégration
```
