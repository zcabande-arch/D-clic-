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

## Take Out : la liste de courses partagée

Le dossier `docs/courses/` contient une deuxième application, **Take Out** : la liste de courses partagée en direct
avec sa famille, sa coloc, sa moitié ou ses amis, et ce qu'il y a déjà dans la cuisine. Elle utilise le même projet Supabase
et le même hébergement que Déclic.

- **Accueil** : « C'est pour qui ? » (famille, coloc, couple, amis), puis le profil (prénom + emoji) et la création de la liste.
- **Listes partagées** : on envoie le lien d'invitation ou le code à 6 caractères, et les autres rejoignent la liste.
  On peut en avoir plusieurs (la famille, la coloc…).
- **Quatre onglets** dans la barre du bas, avec un bouton « + » au centre : *Courses*, *Cuisine*, *Bilan* et *Nous* (membres, listes, compte).
- **Bilan** : un cercle montre la part de chaque type de nourriture dans ce que vous achetez (en nombre d'articles cochés),
  avec un petit mot sur vos habitudes. Plus bas, côté budget : si on note les prix en cochant, le total, qui a payé quoi,
  et qui doit combien à qui pour partager à parts égales. On peut aussi ajouter une dépense à la main (ticket de caisse, marché…).
- **Liste de courses** et **cuisine** :
  Un article coché sur la liste est rangé dans la cuisine ; dans la cuisine, « Presque fini » le signale aux autres
  (il est proposé en haut de la liste de courses) et « Fini » le remet sur la liste.
- **Synchronisation en direct**, avec qui a ajouté ou acheté quoi, et **marche sans réseau** (au fond du magasin) :
  les changements partent au retour de la connexion.
- **Saisie rapide** : « 2 paquets de pâtes » ou « lait x3 » remplissent la quantité, le rayon est deviné (et retenu quand on le corrige),
  les articles déjà achetés sont proposés en suggestion. Tri par rayon (illustré) et priorité, filtre par magasin, « Annuler », envoi de la liste par message.
- **Sauvegarde du compte sans e-mail** : dans *Nous › Sauvegarder mon compte*, on crée un code de sauvegarde
  (`XXXX-XXXX-XXXX-XXXX`) et un lien personnel à s'envoyer. Sur un autre téléphone, on ouvre le lien ou on tape le code
  dans « J'ai déjà un compte ». Le compte et le code sont les mêmes que ceux de Déclic.

Les illustrations au trait de Take Out sont décrites dans `docs/courses/illus/LICENCE.txt`.

### Mise en route (une seule fois)

1. **Base** : dans Supabase › *SQL Editor › New query*, colle tout le contenu de [`supabase/courses.sql`](supabase/courses.sql) et touche *Run*.
   (Après une mise à jour de l'application, relance-le : il ne fait qu'ajouter ce qui manque.)
2. Une fois GitHub Pages actif (voir plus haut), l'application est en ligne à l'adresse **https://zcabande-arch.github.io/D-clic-/courses/**.
   Ouvre-la dans Safari (ou Chrome) et ajoute-la à l'écran d'accueil.

Pour l'essayer sans toucher à la base : **…/courses/?demo** (données gardées dans le navigateur, un membre fictif, code de sauvegarde `DEMO-2345-6789-ABCD`).

## Popote : les repas de la semaine au budget

Le dossier `docs/popote/` contient une troisième application, **Popote** : on fixe un budget, la période,
le nombre de personnes et ses goûts, et l'app compose les repas (midi et/ou soir) qui tiennent dans le budget, avec la liste de courses.

- **Semaine** : réglages (budget, période sur le calendrier, personnes, régime, temps en cuisine, équipement, ce qu'on n'aime pas, magasin),
  puis « Composer ma semaine » (bouton « + »). On peut garder un plat, en tirer un autre ou le choisir soi-même.
- **Recettes** : toutes les recettes avec leur coût par portion.
- **Courses** : la liste par rayon, arrondie aux conditionnements, à cocher dans le magasin ; comparaison du total entre enseignes ; envoi de la liste par message.
- **Aliments** : les prix et conditionnements, modifiables pour coller à son magasin.
- **À plusieurs** (bouton 👥 en haut) : chacun a son profil (prénom + emoji), on crée « notre Popote » et on invite les autres
  par lien ou par code à 6 caractères. Tout le monde voit et modifie le même semainier en direct : réglages, repas, cases cochées, prix.
  Les foyers sont ceux de Take Out (même code, mêmes personnes, la liste de courses Take Out va avec). Le code de sauvegarde du compte est commun aux trois applications.
- **Ajouter une recette** (onglet Recettes) : on prend en photo une recette imprimée (livre, fiche, capture d'écran, jusqu'à 4 photos)
  ou on colle son texte. Le texte est lu **sur le téléphone, gratuitement** (Tesseract, sans compte ni clé), puis Popote repère le nom,
  le nombre de personnes, le temps, les ingrédients (reliés aux aliments connus, ou ajoutés avec un prix estimé) et les étapes.
  On vérifie, on corrige si besoin, et elle rejoint les recettes du foyer. Le texte manuscrit se lit mal : sur iPhone, copier le texte
  de la photo (appui long dans Photos) puis « Coller le texte » donne souvent un meilleur résultat.

Seul (sans foyer), tout reste sur le téléphone et l'app marche sans réseau. À plusieurs, les changements faits sans réseau partent au retour de la connexion.
Elle est en ligne à l'adresse **https://zcabande-arch.github.io/D-clic-/popote/** : ouvre-la dans Safari (ou Chrome) et ajoute-la à l'écran d'accueil.

### Mise en route du partage (une seule fois)

Take Out doit être installé (`supabase/courses.sql`). Puis dans Supabase › *SQL Editor › New query*, colle tout le contenu de
[`supabase/popote.sql`](supabase/popote.sql) et touche *Run*. C'est tout : le partage tient dans l'offre gratuite de Supabase,
et la lecture des recettes ne coûte rien.

## Phase Gym : la muscu qui suit le cycle

Le dossier `docs/phase/` contient une quatrième application, **Phase Gym** : des séances de salle construites chaque jour
selon le cycle, l'énergie et la forme du jour.

- **À la première ouverture**, une série de questions crée le profil : prénom, objectif, niveau, caractère à la salle,
  séances par semaine, durée, zones à travailler, salle et équipement, mode de contraception (aucune, préservatif,
  méthode naturelle, stérilet au cuivre ou hormonal, pilule combinée ou progestative, anneau, patch, implant, injection),
  cycle, poids, ambiance (thème). Avec une méthode qui bloque l'ovulation, l'app se base sur le ressenti du jour plutôt que sur les phases,
  et l'onglet Cycle explique ce que change la méthode choisie (modifiable dans Profil).
  « Voir un exemple d'abord » ouvre un profil fictif (aussi via **…/phase/?demo**).
- **Séance** : 10 petites questions (heure, temps dispo, humeur, énergie, sommeil, corps, stress, envie, affluence, repas),
  puis la séance avec les charges, le minuteur de repos et la progression automatique. Une carte explique pourquoi on
  ressent cette humeur, selon la phase du jour.
- **Noter sa propre séance** (« Tu as fait ta propre séance ? » sur l'accueil, « J'ai fait autrement » pendant une séance
  proposée, ou « + Noter une séance » dans *Bilan*) : on choisit ses exercices dans la liste (recherche, filtres par zone,
  « Mes exos »), on en crée avec son propre nom, on ajoute du cardio en minutes, puis on note les séries (kg × reps).
  Le jour peut être changé pour une séance oubliée. Le brouillon est gardé si on quitte l'app. À l'enregistrement, la séance
  rejoint l'historique et le bilan, et les charges servent de point de départ aux prochaines séances.
- **Exercices et machines qu'on n'aime pas** : bouton « Je n'aime pas cet exercice » pendant la séance (il est remplacé
  tout de suite par une autre version, les séries déjà notées restent), ou liste à cocher dans *Profil*. Ils ne sont plus jamais proposés.
- **Cycle** : cadran du cycle, courbe des hormones (œstrogènes, progestérone), « pourquoi tu ressens ça » phase par phase
  (sérotonine, dopamine, alloprégnanolone, prostaglandines, température…), tes humeurs selon tes phases, et les sources.
- **Bilan** : séances, effort, kilos gagnés, progression par exercice, énergie selon la phase, historique.
- **Réglages** (bouton en haut à gauche) : thème Auto / Sombre / Clair, couleur d'accent, refaire les questions de profil,
  sauvegarde dans un fichier et restauration, tout effacer.

Tout reste sur le téléphone (aucun compte, aucune base à installer) et l'app marche sans réseau.
Elle est en ligne à l'adresse **https://zcabande-arch.github.io/D-clic-/phase/** : ouvre-la dans Safari (ou Chrome) et ajoute-la à l'écran d'accueil.

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
