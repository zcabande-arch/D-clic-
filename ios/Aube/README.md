# Aube : l'app iPhone

Le réveil Aube devient une vraie app iPhone. Elle garde la même interface que la page web
(`Resources/index.html`), et elle peut maintenant **sonner avec l'aube même quand l'écran est verrouillé**.

## Ce qui change par rapport à la page web

- **Le son de la nuit est joué par l'app, pas par la page.** Elle tourne en arrière-plan, comme une app de musique.
  Le son pour s'endormir baisse doucement, puis c'est le silence. Le son de l'aube commence presque inaudible
  et monte jusqu'au volume choisi à l'heure du réveil. Tout ça continue quand l'écran est verrouillé.
- **Une vraie alarme en secours à l'heure du réveil.** Sur iOS 26 et plus, l'app programme une alarme système (AlarmKit).
  Elle sonne même en mode silencieux et allume l'écran avec un bouton « Arrêter », qui coupe aussi le son de l'aube.
  Avant iOS 26, quelques notifications sonores arrivent juste après l'heure du réveil.
- **Arrêter depuis l'écran verrouillé :** à l'aube ou pendant la sonnerie, le bouton pause du lecteur
  sur l'écran verrouillé arrête le réveil. Pendant la nuit, il coupe seulement le son pour s'endormir.
- **Option « Voir la lumière de l'aube » :** l'écran reste allumé toute la nuit pour voir la lueur monter
  (téléphone branché). Sans cette option, tu verrouilles et seul le son te réveille.
- Le réveil s'arrête tout seul après 30 minutes s'il n'est pas arrêté.

À savoir : le son de l'aube suit le volume du téléphone. Monte-le avant de dormir. L'alarme système, elle, sonne fort dans tous les cas.
Si une autre app prend le son pendant la nuit (musique, appel), l'aube peut être coupée : c'est l'alarme de secours qui sonne alors.

## Installer l'app sur ton iPhone

Chaque modification de `ios/Aube` est compilée sur un Mac de GitHub
(onglet **Actions › App iPhone Aube**). Le résultat **Aube-iPhone** contient :

- `Aube-projet-xcode.zip` : le projet Xcode prêt à ouvrir ;
- `Aube-non-signe.ipa` : l'app compilée, pas encore signée.

**Avec un Mac** (le plus simple, gratuit) :
1. Installe Xcode depuis l'App Store.
2. Ouvre `Aube.xcodeproj` (dans le zip, ou après `brew install xcodegen && xcodegen` dans `ios/Aube`).
3. Dans *Signing & Capabilities*, choisis ton identifiant Apple comme *Team* (change l'identifiant `app.aube.reveil` s'il est refusé).
4. Branche l'iPhone, choisis-le en haut, puis ▶. Sur l'iPhone : *Réglages › Général › VPN et gestion de l'appareil* pour faire confiance au développeur.

Avec un identifiant Apple gratuit, l'app doit être réinstallée tous les 7 jours. Avec un compte développeur (99 €/an), elle tient un an et peut passer par TestFlight.

**Avec un PC Windows :** installe `Aube-non-signe.ipa` avec Sideloadly ou AltStore, qui la signent avec ton identifiant Apple.

## Fichiers

- `Sources/AlarmEngine.swift` : la nuit en arrière-plan (session audio, écran verrouillé, reprise après un appel).
- `Sources/NightSynth.swift` : les sons (pluie, vagues, oiseaux, carillon), fabriqués comme dans la page web.
- `Sources/AlarmScheduler.swift` : l'alarme système de secours, ou les notifications.
- `Sources/WebContainer.swift` : affiche l'interface et la relie à l'app.
- `tools/make_assets.py` : refait les sons de l'alarme (30 s) et l'icône.
