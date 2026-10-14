# Prompt réutilisable : préparer une nouvelle app à la vente sur Etsy

Copie le bloc ci-dessous dans une nouvelle conversation avec Claude Code (dans le dépôt D-clic-), et remplace ce qui est entre crochets.

```
Je veux vendre mon application [NOM DE L'APP] sur Etsy. Elle est dans [dossier, ex. docs/mon-app/, OU je joins le fichier HTML].
Elle sert à [ce que fait l'app en une phrase], pour [public visé].
Prix que j'imagine : [ex. 9,90 €, ou « conseille-moi »]. Ma boutique Etsy : [nom de la boutique, ou « à créer »].
[Facultatif : je veux aussi vendre un PDF bonus / un guide sur …]

Fais tout ce qu'il faut pour que ça puisse se vendre, en suivant ce qui a déjà été fait pour Phase Gym (dossier vente/ et vente/LISEZMOI.md) :

1. L'APP
   - Vérifie qu'elle est une vraie app installable (PWA : manifest, icônes, service worker, marche hors ligne), propre sur téléphone
     (rien de décalé, champs en 16 px, thème clair/sombre si pertinent), avec un parcours d'accueil à la première ouverture.
   - Ajoute un écran de code d'accès à la première ouverture, comme Phase Gym : seule l'empreinte SHA-256 du code va dans le dépôt,
     jamais le code. Garde une démo libre (?demo) qui sert de vitrine.
   - Ajoute dans les réglages : conditions d'utilisation, confidentialité, sauvegarde/restauration des données.
   - Teste tout de bout en bout (Playwright) et montre-moi des captures.

2. LES FICHIERS À VENDRE (jamais dans Git : dossier vente/prive/, ignoré)
   - Le PDF d'accès livré aux acheteurs : lien, QR code, code d'accès, installation iPhone / Android / ordinateur, premiers pas,
     contact, avertissements utiles.
   - [Si demandé] le PDF bonus, illustré, au même style que l'app.

3. L'ANNONCE ETSY (dans un fichier vente/fiche-etsy-[nom].md, prêt à copier-coller)
   - Nom de boutique (si à créer) + titre de boutique, annonce, « À propos », politiques (produit numérique).
   - Titre de l'annonce (≤ 140 caractères, vérifie la longueur), 13 mots-clés (≤ 20 caractères chacun, vérifie),
     sans noms de marques déposées.
   - Description complète, prix conseillé (compare avec des annonces Etsy similaires, calcule ce qu'il me reste après les frais),
     promo de lancement, FAQ, message automatique après achat, réponses prêtes pour la messagerie.
   - Les réglages : « Moi », « Produit fini », type Numérique, catégorie, quels fichiers joindre, et rappelle-moi de cocher
     la case IA générative si une IA a servi.

4. LES VISUELS
   - 8 images d'annonce 3000 × 2250 (format 4:3), la première étant la miniature, faites à partir de vraies captures de l'app.
   - Logo 500 × 500 et bannière 3360 × 840 si la boutique est nouvelle.
   - Une vidéo verticale de 30 s (TikTok/Reels) et une carrée de 15 s (pour l'annonce Etsy), sans son.

5. À LA FIN
   - Commite et pousse tout sauf les fichiers privés, puis envoie-moi : les PDF à joindre, les 8 images dans l'ordre,
     le logo, la bannière, les vidéos et la fiche.
   - Donne-moi les étapes Etsy dans l'ordre, très simplement, et dis-moi honnêtement les limites (protection du code,
     règles Etsy à vérifier, santé/juridique si le sujet s'y prête).

Explique-moi tout en français simple, sans jargon. Si une info te manque, pose-moi la question avant de commencer.
```

## Astuces

- **Dessins** : si tu veux des illustrations « vraies personnes », génère une planche avec ChatGPT (fond uni blanc ou gris, le nom écrit sous chaque dessin) et envoie-la : Claude découpe et relie chaque dessin à son élément.
- **Un produit à la fois** : publie, récolte 5 à 10 avis, puis lance le suivant.
- **Même boutique** : toutes tes apps peuvent aller dans la même boutique si elles visent le même public ; sinon, crée une boutique par thème.
