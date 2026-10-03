/* ---------- Référentiel d'ingrédients ----------
   q = quantité du conditionnement, u = unité, p = prix du conditionnement (€), pl = basique du placard */
const A='Fruits & légumes',B='Boucherie & poisson',C='Crèmerie & frais',E='Épicerie',S='Surgelés',P='Boulangerie';
const AISLES=[A,B,C,E,S,P];
const ING_DEFAULT={
 oignon:{n:'Oignons',a:A,q:1000,u:'g',p:1.49},
 ail:{n:'Ail',a:A,q:30,u:'gousse',p:1.49},
 carotte:{n:'Carottes',a:A,q:1000,u:'g',p:1.29},
 courgette:{n:'Courgettes',a:A,q:1000,u:'g',p:2.49},
 poivron:{n:'Poivrons',a:A,q:3,u:'pièce',p:2.49},
 tomate:{n:'Tomates',a:A,q:1000,u:'g',p:2.79},
 pdt:{n:'Pommes de terre',a:A,q:2500,u:'g',p:3.29},
 champi:{n:'Champignons de Paris',a:A,q:500,u:'g',p:2.59},
 brocoli:{n:'Brocoli',a:A,q:500,u:'g',p:1.89},
 citron:{n:'Citrons',a:A,q:4,u:'pièce',p:1.59},
 salade:{n:'Salade',a:A,q:1,u:'pièce',p:0.99},
 poireau:{n:'Poireaux',a:A,q:1000,u:'g',p:2.29},
 aubergine:{n:'Aubergines',a:A,q:500,u:'g',p:1.99},
 patdouce:{n:'Patates douces',a:A,q:1000,u:'g',p:2.99},
 persil:{n:'Persil (bouquet)',a:A,q:1,u:'pièce',p:0.99},
 poulet:{n:'Filets de poulet',a:B,q:500,u:'g',p:6.49},
 boeuf:{n:'Bœuf haché 5 %',a:B,q:500,u:'g',p:5.99},
 lardons:{n:'Lardons',a:B,q:200,u:'g',p:1.79},
 saumon:{n:'Pavés de saumon',a:B,q:250,u:'g',p:5.49},
 jambon:{n:'Jambon blanc',a:B,q:4,u:'tranche',p:2.29},
 saucisse:{n:'Saucisses de Toulouse',a:B,q:400,u:'g',p:3.89},
 oeuf:{n:'Œufs',a:C,q:12,u:'pièce',p:3.39},
 creme:{n:'Crème fraîche',a:C,q:200,u:'ml',p:1.09},
 lait:{n:'Lait demi-écrémé',a:C,q:1000,u:'ml',p:1.05},
 beurre:{n:'Beurre',a:C,q:250,u:'g',p:2.49,pl:1},
 emmental:{n:'Emmental râpé',a:C,q:200,u:'g',p:1.89},
 parmesan:{n:'Parmesan',a:C,q:100,u:'g',p:2.39},
 feta:{n:'Feta',a:C,q:200,u:'g',p:2.19},
 mozza:{n:'Mozzarella',a:C,q:125,u:'g',p:0.95},
 chevre:{n:'Bûche de chèvre',a:C,q:180,u:'g',p:2.29},
 tofu:{n:'Tofu ferme',a:C,q:250,u:'g',p:2.29},
 brisee:{n:'Pâte brisée',a:C,q:1,u:'pièce',p:0.99},
 pizza:{n:'Pâte à pizza',a:C,q:1,u:'pièce',p:1.39},
 pates:{n:'Pâtes',a:E,q:500,u:'g',p:0.95},
 riz:{n:'Riz basmati',a:E,q:1000,u:'g',p:2.19},
 semoule:{n:'Semoule',a:E,q:500,u:'g',p:1.09},
 lcorail:{n:'Lentilles corail',a:E,q:500,u:'g',p:1.89},
 lvertes:{n:'Lentilles vertes',a:E,q:500,u:'g',p:1.69},
 pchiche:{n:'Pois chiches (boîte)',a:E,q:400,u:'g',p:0.95},
 hrouge:{n:'Haricots rouges (boîte)',a:E,q:400,u:'g',p:0.95},
 tconc:{n:'Tomates concassées',a:E,q:400,u:'g',p:0.89},
 coco:{n:'Lait de coco',a:E,q:400,u:'ml',p:1.45},
 thon:{n:'Thon au naturel',a:E,q:140,u:'g',p:1.59},
 tortilla:{n:'Tortillas',a:E,q:8,u:'pièce',p:1.59},
 huile:{n:"Huile d'olive",a:E,q:750,u:'ml',p:6.49,pl:1},
 curry:{n:'Curry en poudre',a:E,q:40,u:'g',p:1.59,pl:1},
 soja:{n:'Sauce soja',a:E,q:250,u:'ml',p:1.79,pl:1},
 bouillon:{n:'Bouillon de légumes',a:E,q:10,u:'cube',p:1.19,pl:1},
 cabillaud:{n:'Dos de cabillaud',a:S,q:400,u:'g',p:4.99},
 epinards:{n:'Épinards hachés',a:S,q:750,u:'g',p:1.79},
 ppois:{n:'Petits pois',a:S,q:450,u:'g',p:1.29},
 painmie:{n:'Pain de mie',a:P,q:500,u:'g',p:1.49}
};


/* ---------- Ingrédients supplémentaires ---------- */
Object.assign(ING_DEFAULT,{
 chou_fleur:{n:'Chou-fleur',a:A,q:1,u:'pièce',p:2.49},
 concombre:{n:'Concombre',a:A,q:1,u:'pièce',p:0.89},
 avocat:{n:'Avocats',a:A,q:2,u:'pièce',p:2.29},
 butternut:{n:'Courge butternut',a:A,q:1200,u:'g',p:2.29},
 endive:{n:'Endives',a:A,q:1000,u:'g',p:2.49},
 echalote:{n:'Échalotes',a:A,q:250,u:'g',p:1.49},
 gingembre:{n:'Gingembre frais',a:A,q:100,u:'g',p:0.89},
 coriandre:{n:'Coriandre (bouquet)',a:A,q:1,u:'pièce',p:0.99},
 basilic:{n:'Basilic (pot)',a:A,q:1,u:'pièce',p:1.29},
 ciboulette:{n:'Ciboulette (bouquet)',a:A,q:1,u:'pièce',p:0.99},
 menthe:{n:'Menthe (bouquet)',a:A,q:1,u:'pièce',p:1.19},
 citronvert:{n:'Citrons verts',a:A,q:3,u:'pièce',p:1.49},
 roquette:{n:'Roquette',a:A,q:125,u:'g',p:1.39},
 mache:{n:'Mâche',a:A,q:150,u:'g',p:1.49},
 pousses:{n:"Pousses d'épinards",a:A,q:120,u:'g',p:1.49},
 tomcerise:{n:'Tomates cerises',a:A,q:250,u:'g',p:1.69},
 radis:{n:'Radis (botte)',a:A,q:1,u:'pièce',p:1.19},
 betterave:{n:'Betteraves cuites',a:A,q:500,u:'g',p:1.29},
 dinde:{n:'Escalopes de dinde',a:B,q:400,u:'g',p:5.49},
 porc:{n:'Filet mignon de porc',a:B,q:500,u:'g',p:7.90},
 merguez:{n:'Merguez',a:B,q:360,u:'g',p:3.79},
 chorizo:{n:'Chorizo',a:B,q:100,u:'g',p:1.79},
 crevettes:{n:'Crevettes cuites décortiquées',a:B,q:200,u:'g',p:4.49},
 ricotta:{n:'Ricotta',a:C,q:250,u:'g',p:1.99},
 cheddar:{n:'Cheddar en tranches',a:C,q:200,u:'g',p:2.19},
 reblochon:{n:'Reblochon',a:C,q:450,u:'g',p:4.99},
 cremeliquide:{n:'Crème liquide',a:C,q:200,u:'ml',p:1.19},
 yaourt:{n:'Yaourt à la grecque',a:C,q:500,u:'g',p:1.89},
 fromageblanc:{n:'Fromage blanc',a:C,q:500,u:'g',p:1.49},
 gnocchis:{n:'Gnocchis',a:C,q:500,u:'g',p:1.49},
 ravioli:{n:'Ravioli frais',a:C,q:250,u:'g',p:2.29},
 feuilletee:{n:'Pâte feuilletée',a:C,q:1,u:'pièce',p:1.09},
 galettes:{n:'Galettes de blé noir',a:C,q:6,u:'pièce',p:2.29},
 quinoa:{n:'Quinoa',a:E,q:400,u:'g',p:2.99},
 boulgour:{n:'Boulgour',a:E,q:500,u:'g',p:1.49},
 nouilles:{n:'Nouilles chinoises',a:E,q:250,u:'g',p:1.29},
 vermicelles:{n:'Nouilles de riz',a:E,q:250,u:'g',p:1.59},
 polenta:{n:'Polenta',a:E,q:500,u:'g',p:1.39},
 mais:{n:'Maïs (boîte)',a:E,q:285,u:'g',p:0.99},
 olives:{n:'Olives noires',a:E,q:150,u:'g',p:1.59},
 pesto:{n:'Pesto',a:E,q:190,u:'g',p:1.89},
 sardines:{n:"Sardines à l'huile",a:E,q:135,u:'g',p:1.39},
 cacahuetes:{n:'Cacahuètes',a:E,q:200,u:'g',p:1.49},
 sesame:{n:'Graines de sésame',a:E,q:100,u:'g',p:1.39},
 farine:{n:'Farine',a:E,q:1000,u:'g',p:0.95,pl:1},
 moutarde:{n:'Moutarde',a:E,q:370,u:'g',p:1.29,pl:1},
 vinaigre:{n:'Vinaigre balsamique',a:E,q:500,u:'ml',p:1.49,pl:1},
 paprika:{n:'Paprika',a:E,q:40,u:'g',p:1.49,pl:1},
 cumin:{n:'Cumin',a:E,q:40,u:'g',p:1.49,pl:1},
 hverts:{n:'Haricots verts',a:S,q:1000,u:'g',p:2.29},
 poissonpane:{n:'Colin pané',a:S,q:400,u:'g',p:3.49},
 painburger:{n:'Pains burger',a:P,q:4,u:'pièce',p:1.49},
 baguette:{n:'Baguette',a:P,q:1,u:'pièce',p:0.99},
 paincomplet:{n:'Pain complet',a:P,q:500,u:'g',p:1.99}
});
/* ---------- Recettes (quantités pour 1 personne) ---------- */
const RECIPES=[
 {id:'carbo',n:'Pâtes carbonara',e:'🍝',t:20,m:'v',i:{pates:100,lardons:50,oeuf:1,parmesan:15},s:["Cuire les pâtes al dente dans l'eau salée.","Faire dorer les lardons à sec dans une poêle.","Battre les œufs avec le parmesan et du poivre.","Hors du feu, mélanger pâtes, lardons et œufs avec un peu d'eau de cuisson."]},
 {id:'bolo',n:'Pâtes bolognaise',e:'🍝',t:35,m:'v',i:{pates:100,boeuf:100,tconc:130,oignon:40,carotte:40,ail:1,huile:5},s:["Faire revenir oignon, ail et carotte hachés dans l'huile.","Ajouter le bœuf et le faire dorer.","Verser les tomates, saler, poivrer et laisser mijoter 20 min.","Servir sur les pâtes cuites."]},
 {id:'dahl',n:'Dahl de lentilles corail',e:'🍛',t:30,m:'g',i:{lcorail:70,coco:100,tconc:100,oignon:40,ail:1,curry:3,riz:60},s:["Faire revenir oignon et ail, ajouter le curry.","Ajouter lentilles, tomates, lait de coco et 150 ml d'eau par personne.","Cuire 20 min à feu doux en remuant.","Servir avec le riz."]},
 {id:'pcoco',n:'Poulet coco-curry',e:'🍛',t:30,m:'v',i:{poulet:120,coco:100,poivron:0.5,oignon:40,curry:3,riz:75},s:["Couper le poulet en dés et le faire dorer.","Ajouter oignon et poivron émincés, puis le curry.","Verser le lait de coco et mijoter 15 min.","Servir avec le riz."]},
 {id:'chili',n:'Chili con carne',e:'🌶️',t:40,m:'v',i:{boeuf:100,hrouge:120,tconc:130,oignon:40,poivron:0.5,riz:60},s:["Faire revenir oignon et poivron.","Ajouter le bœuf et le faire dorer.","Ajouter tomates et haricots égouttés, épicer et mijoter 25 min.","Servir avec le riz."]},
 {id:'tortilla',n:'Tortilla de patatas',e:'🥔',t:35,m:'g',i:{oeuf:2,pdt:200,oignon:40,huile:15},s:["Couper pommes de terre et oignon en fines lamelles.","Les cuire à feu doux dans l'huile 15 min.","Mélanger aux œufs battus, saler.","Cuire à la poêle 5 min de chaque côté."]},
 {id:'qlorraine',n:'Quiche lorraine',e:'🥧',t:50,m:'v',i:{brisee:0.25,lardons:50,oeuf:1,creme:50,lait:50,emmental:25},s:["Préchauffer le four à 180 °C et étaler la pâte dans un moule.","Faire dorer les lardons.","Battre œufs, crème et lait, ajouter lardons et fromage.","Verser sur la pâte et cuire 35 min."]},
 {id:'qpoireau',n:'Quiche poireaux-chèvre',e:'🥧',t:50,m:'g',i:{brisee:0.25,poireau:120,chevre:40,oeuf:1,creme:50},s:["Préchauffer le four à 180 °C.","Faire fondre les poireaux émincés 10 min à la poêle.","Battre œufs et crème, ajouter les poireaux.","Verser sur la pâte, ajouter le chèvre en rondelles et cuire 35 min."]},
 {id:'saumon',n:'Saumon, riz et brocoli',e:'🐟',t:25,m:'p',i:{saumon:125,riz:75,brocoli:150,citron:0.25,soja:10},s:["Cuire le riz.","Cuire le brocoli à la vapeur 8 min.","Saisir le saumon 4 min de chaque côté.","Arroser de sauce soja et de citron."]},
 {id:'cabillaud',n:'Cabillaud et purée maison',e:'🐟',t:35,m:'p',i:{cabillaud:130,pdt:250,lait:60,beurre:10,citron:0.25},s:["Cuire les pommes de terre épluchées 20 min à l'eau.","Les écraser avec le lait chaud et le beurre.","Cuire le cabillaud à la poêle 4 min par face.","Servir avec un filet de citron."]},
 {id:'gratcourg',n:'Gratin de courgettes',e:'🥒',t:45,m:'g',i:{courgette:250,oeuf:1,creme:50,emmental:30,ail:1},s:["Préchauffer le four à 200 °C.","Couper les courgettes en rondelles et les faire revenir avec l'ail.","Les mettre dans un plat, couvrir du mélange œufs-crème.","Parsemer d'emmental et cuire 25 min."]},
 {id:'ratatouille',n:'Ratatouille et semoule',e:'🍆',t:50,m:'g',i:{courgette:120,aubergine:120,poivron:0.5,tomate:120,oignon:40,ail:1,huile:10,semoule:70},s:["Couper tous les légumes en dés.","Faire revenir oignon et ail dans l'huile, ajouter aubergine et poivron.","Ajouter courgette et tomates, mijoter 30 min.","Servir avec la semoule gonflée à l'eau chaude."]},
 {id:'couscous',n:'Couscous aux pois chiches',e:'🥘',t:40,m:'g',i:{semoule:80,pchiche:120,carotte:80,courgette:100,oignon:40,tconc:80,bouillon:0.5},s:["Faire revenir l'oignon, ajouter carottes et courgettes en tronçons.","Ajouter tomates, pois chiches, bouillon et 200 ml d'eau par personne.","Mijoter 25 min.","Servir avec la semoule."]},
 {id:'fajitas',n:'Fajitas au poulet',e:'🌯',t:25,m:'v',i:{tortilla:2,poulet:110,poivron:0.5,oignon:40,emmental:20},s:["Émincer poulet, poivron et oignon.","Faire sauter le tout 10 min à feu vif, assaisonner.","Chauffer les tortillas.","Garnir et parsemer de fromage."]},
 {id:'wraps',n:'Wraps thon-crudités',e:'🌯',t:10,m:'p',i:{tortilla:2,thon:70,tomate:80,salade:0.15,creme:20},s:["Égoutter le thon et le mélanger à la crème.","Couper tomates et salade.","Garnir les tortillas et les rouler."]},
 {id:'nicoise',n:'Salade façon niçoise',e:'🥗',t:25,m:'p',i:{thon:70,oeuf:1,pdt:150,tomate:100,salade:0.2,huile:10},s:["Cuire les pommes de terre 20 min et les œufs 9 min.","Couper tomates, pommes de terre et œufs.","Mélanger avec la salade et le thon.","Assaisonner d'huile, sel, poivre."]},
 {id:'cantonais',n:'Riz cantonais',e:'🍚',t:20,m:'v',i:{riz:75,oeuf:1,jambon:1,ppois:50,oignon:20,soja:10},s:["Cuire le riz (idéalement la veille).","Faire une omelette fine et la couper en lanières.","Faire sauter le riz avec oignon, petits pois et jambon en dés.","Ajouter l'omelette et la sauce soja."]},
 {id:'soupepoireau',n:'Soupe poireaux-pommes de terre',e:'🥣',t:35,m:'g',i:{poireau:150,pdt:150,bouillon:0.5,creme:20},s:["Émincer les poireaux, couper les pommes de terre.","Couvrir d'eau avec le bouillon et cuire 25 min.","Mixer et ajouter la crème."]},
 {id:'pateschampi',n:'Pâtes crème-champignons',e:'🍄',t:20,m:'g',i:{pates:100,champi:120,creme:50,ail:1,parmesan:10},s:["Cuire les pâtes.","Faire sauter les champignons émincés avec l'ail.","Ajouter la crème et laisser réduire 3 min.","Mélanger aux pâtes et parsemer de parmesan."]},
 {id:'saucisses',n:'Saucisses aux lentilles',e:'🌭',t:40,m:'v',i:{saucisse:130,lvertes:70,carotte:60,oignon:30},s:["Faire dorer les saucisses.","Ajouter oignon et carottes en rondelles.","Ajouter les lentilles et 3 fois leur volume d'eau.","Cuire 25 min à couvert."]},
 {id:'patdouce',n:'Patates douces rôties, feta et pois chiches',e:'🍠',t:40,m:'g',i:{patdouce:250,pchiche:80,feta:50,huile:10,citron:0.25},s:["Préchauffer le four à 200 °C.","Couper les patates douces en cubes, mélanger avec pois chiches et huile.","Rôtir 30 min.","Émietter la feta et arroser de citron."]},
 {id:'shakshuka',n:'Shakshuka',e:'🍳',t:25,m:'g',i:{oeuf:2,tconc:200,poivron:0.5,oignon:40,ail:1,feta:20},s:["Faire revenir oignon, ail et poivron.","Ajouter les tomates et mijoter 10 min.","Creuser des puits et y casser les œufs.","Couvrir 6 min, parsemer de feta."]},
 {id:'tofu',n:'Tofu sauté aux légumes',e:'🥢',t:25,m:'g',i:{tofu:125,riz:75,brocoli:100,carotte:60,soja:15,ail:1},s:["Cuire le riz.","Couper le tofu en dés et le faire dorer.","Ajouter brocoli et carottes émincés, faire sauter 6 min.","Déglacer à la sauce soja."]},
 {id:'parmentier',n:'Hachis parmentier',e:'🥘',t:55,m:'v',i:{boeuf:110,pdt:250,lait:60,beurre:10,oignon:30,emmental:20},s:["Cuire les pommes de terre et en faire une purée avec lait et beurre.","Faire revenir oignon et bœuf.","Dans un plat : viande puis purée, parsemer d'emmental.","Gratiner 20 min à 200 °C."]},
 {id:'pizza',n:'Pizza jambon-champignons',e:'🍕',t:25,m:'v',i:{pizza:0.5,tconc:60,mozza:60,jambon:1,champi:40},s:["Préchauffer le four à 220 °C.","Étaler la pâte et la napper de tomates.","Garnir de jambon, champignons et mozzarella.","Cuire 12 à 15 min."]},
 {id:'croque',n:'Croque-monsieur et salade',e:'🥪',t:15,m:'v',i:{painmie:100,jambon:1,emmental:30,beurre:10,salade:0.15},s:["Beurrer les tranches de pain.","Garnir de jambon et d'emmental.","Cuire 10 min au four à 200 °C ou à la poêle.","Servir avec la salade."]},
 {id:'veloute',n:'Velouté carottes-coco',e:'🥕',t:30,m:'g',i:{carotte:200,coco:50,oignon:30,bouillon:0.5},s:["Faire revenir l'oignon.","Ajouter carottes en rondelles, bouillon et eau à hauteur.","Cuire 20 min, ajouter le lait de coco et mixer."]},
 {id:'pouletpdt',n:'Poulet et pommes de terre rôties',e:'🍗',t:45,m:'v',i:{poulet:130,pdt:250,ail:1,huile:10,persil:0.1},s:["Préchauffer le four à 200 °C.","Couper les pommes de terre en quartiers, les huiler.","Ajouter le poulet et l'ail, enfourner 35 min.","Parsemer de persil."]},
 {id:'epinards',n:'Œufs cocotte aux épinards',e:'🥬',t:25,m:'g',i:{epinards:150,oeuf:2,creme:40,emmental:20},s:["Faire décongeler les épinards à la poêle.","Ajouter la crème et laisser réduire.","Casser les œufs dessus, parsemer d'emmental.","Couvrir 6 min."]},
 {id:'steak',n:'Steak haché et potatoes',e:'🍔',t:30,m:'v',i:{boeuf:125,pdt:250,huile:15,salade:0.1},s:["Préchauffer le four à 210 °C.","Couper les pommes de terre en quartiers, huiler, saler.","Cuire 25 min.","Cuire les steaks à la poêle 3 min par face."]}
];

/* ---------- Recettes supplémentaires (avec équipement intégré) ---------- */
const PL_=['plaques'],MO=['plaques','microondes'],FO=['four','airfryer'];
RECIPES.push(
 {id:'bowlquinoa',n:'Buddha bowl au quinoa',e:'🥗',t:25,m:'g',i:{quinoa:70,pchiche:100,avocat:0.5,carotte:60,concombre:0.25,sesame:5,citron:0.25},eq:[MO],us:['Casserole ou bol','Saladier'],s:["Cuire le quinoa 12 min à l'eau (ou au micro-ondes).","Râper la carotte, couper concombre et avocat.","Disposer le tout avec les pois chiches égouttés.","Arroser de citron et parsemer de sésame."]},
 {id:'taboule',n:'Taboulé de boulgour',e:'🥗',t:20,m:'g',i:{boulgour:70,tomate:100,concombre:0.25,menthe:0.15,persil:0.15,citron:0.5,huile:15},eq:[MO],us:['Saladier','Casserole ou bol'],s:["Cuire le boulgour 10 min et le laisser refroidir.","Couper tomates et concombre en petits dés.","Ciseler menthe et persil.","Mélanger avec citron, huile, sel et poivre."]},
 {id:'nouillescrev',n:'Nouilles sautées aux crevettes',e:'🍜',t:20,m:'p',i:{nouilles:80,crevettes:80,poivron:0.5,carotte:50,soja:15,gingembre:5,ail:1},eq:[PL_],us:['Wok ou poêle','Casserole'],s:["Cuire les nouilles selon le paquet.","Faire sauter poivron et carotte émincés avec ail et gingembre.","Ajouter crevettes et nouilles.","Déglacer à la sauce soja."]},
 {id:'padthai',n:'Pad thaï au poulet',e:'🍜',t:30,m:'v',i:{vermicelles:80,poulet:100,oeuf:1,cacahuetes:15,citronvert:0.5,soja:15,echalote:20,coriandre:0.1},eq:[PL_],us:['Wok ou poêle','Saladier'],s:["Réhydrater les nouilles de riz dans l'eau chaude.","Faire dorer le poulet en lanières avec l'échalote.","Pousser sur le côté, brouiller l'œuf, ajouter nouilles et soja.","Servir avec cacahuètes concassées, coriandre et citron vert."]},
 {id:'galettes',n:'Galettes complètes',e:'🥞',t:15,m:'v',i:{galettes:2,jambon:1,oeuf:1,emmental:30,beurre:5,salade:0.1},eq:[PL_],us:['Poêle ou crêpière'],s:["Chauffer une galette beurrée dans la poêle.","Casser l'œuf au centre, ajouter jambon et emmental.","Replier les bords quand le blanc est cuit.","Servir avec la salade."]},
 {id:'burger',n:'Burger maison',e:'🍔',t:20,m:'v',i:{painburger:1,boeuf:125,cheddar:25,tomate:60,salade:0.1,oignon:20},eq:[PL_],us:['Poêle'],s:["Former un steak et le cuire 3 min par face.","Poser le cheddar dessus en fin de cuisson.","Toaster les pains.","Monter avec salade, tomate et oignon."]},
 {id:'gnocchipesto',n:'Gnocchis poêlés au pesto',e:'🍝',t:15,m:'g',i:{gnocchis:200,pesto:30,tomcerise:80,parmesan:10},eq:[PL_],us:['Poêle'],s:["Faire dorer les gnocchis à la poêle 8 min.","Ajouter les tomates cerises coupées en deux.","Hors du feu, mélanger avec le pesto.","Parsemer de parmesan."]},
 {id:'ravioli',n:'Ravioli tomate-basilic',e:'🍝',t:15,m:'g',i:{ravioli:125,tconc:100,basilic:0.15,parmesan:10,ail:1},eq:[PL_],us:['Casserole','Petite casserole'],s:["Faire chauffer les tomates avec l'ail 8 min.","Cuire les ravioli 3 min à l'eau bouillante.","Mélanger avec la sauce.","Ajouter basilic et parmesan."]},
 {id:'tartiflette',n:'Tartiflette',e:'🧀',t:50,m:'v',i:{pdt:250,reblochon:110,lardons:50,oignon:40,cremeliquide:40},eq:[['four'],PL_],us:['Casserole','Poêle','Plat à gratin'],s:["Cuire les pommes de terre 15 min et les couper en rondelles.","Faire revenir oignon et lardons.","Mélanger dans le plat avec la crème, poser le reblochon coupé en deux.","Cuire 25 min à 200 °C."]},
 {id:'choufleur',n:'Chou-fleur rôti au curry, sauce yaourt',e:'🥦',t:40,m:'g',i:{chou_fleur:0.35,pchiche:80,curry:3,huile:10,yaourt:60,citron:0.25},eq:[FO],us:['Plaque à rôtir','Bol'],s:["Préchauffer à 200 °C.","Détailler le chou-fleur, mélanger avec pois chiches, huile et curry.","Rôtir 30 min.","Servir avec le yaourt citronné."]},
 {id:'filetmignon',n:'Filet mignon moutarde et haricots verts',e:'🥩',t:35,m:'v',i:{porc:150,hverts:150,moutarde:10,cremeliquide:40,echalote:15},eq:[PL_],us:['Sauteuse','Casserole'],s:["Couper le filet mignon en médaillons et les dorer.","Ajouter l'échalote, puis crème et moutarde ; mijoter 10 min.","Cuire les haricots verts 10 min à l'eau.","Servir ensemble."]},
 {id:'couscousmerguez',n:'Couscous merguez',e:'🌭',t:40,m:'v',i:{merguez:120,semoule:80,courgette:100,carotte:80,pchiche:80,tconc:80,bouillon:0.5,cumin:2},eq:[PL_],us:['Cocotte','Poêle','Saladier'],s:["Faire revenir carottes et courgettes avec le cumin.","Ajouter tomates, pois chiches, bouillon et eau, mijoter 25 min.","Griller les merguez à la poêle.","Servir avec la semoule."]},
 {id:'paella',n:'Paella express chorizo-crevettes',e:'🥘',t:35,m:'v',i:{riz:80,chorizo:25,crevettes:60,poivron:0.5,ppois:40,tconc:80,paprika:2,oignon:30},eq:[PL_],us:['Sauteuse'],s:["Faire revenir oignon, poivron et chorizo.","Ajouter riz, paprika, tomates et 2 fois le volume d'eau.","Cuire 18 min à couvert.","Ajouter crevettes et petits pois 3 min avant la fin."]},
 {id:'tartsardines',n:'Tartines sardines-citron et crudités',e:'🐟',t:10,m:'p',i:{paincomplet:100,sardines:70,citron:0.25,radis:0.25,mache:40},eq:[],us:['Planche','Bol'],s:["Écraser les sardines avec un filet de citron.","Tartiner sur le pain.","Couper les radis en rondelles.","Servir avec la mâche."]},
 {id:'saladelentilles',n:'Salade de lentilles, œuf mollet',e:'🥗',t:30,m:'g',i:{lvertes:70,echalote:15,moutarde:5,vinaigre:10,oeuf:1,carotte:40,huile:10},eq:[PL_],us:['Casserole','Petite casserole','Saladier'],s:["Cuire les lentilles 20 min.","Cuire l'œuf 6 min, le passer sous l'eau froide.","Faire une vinaigrette moutarde, vinaigre, huile.","Mélanger lentilles, carotte râpée et échalote ; poser l'œuf."]},
 {id:'butternut',n:'Velouté de butternut',e:'🎃',t:35,m:'g',i:{butternut:300,oignon:30,bouillon:0.5,cremeliquide:30},eq:[PL_,['mixeur']],us:['Faitout'],s:["Éplucher et couper la courge en cubes.","Faire revenir l'oignon, ajouter courge, bouillon et eau à hauteur.","Cuire 25 min.","Mixer avec la crème."]},
 {id:'poissonpane',n:'Poisson pané et haricots verts',e:'🐟',t:25,m:'p',i:{poissonpane:130,hverts:150,citron:0.25,beurre:5},eq:[FO,MO],us:['Plaque à rôtir','Casserole ou bol'],s:["Cuire le poisson pané au four ou à l'airfryer 15 min.","Cuire les haricots verts 10 min (eau ou micro-ondes).","Ajouter une noisette de beurre.","Servir avec du citron."]},
 {id:'dinde',n:'Dinde à la moutarde et riz',e:'🍗',t:25,m:'v',i:{dinde:130,moutarde:10,cremeliquide:50,riz:75,champi:60},eq:[PL_],us:['Poêle','Casserole'],s:["Cuire le riz.","Dorer la dinde en lanières.","Ajouter champignons, crème et moutarde ; mijoter 8 min.","Servir avec le riz."]},
 {id:'burritobowl',n:'Burrito bowl végé',e:'🌯',t:20,m:'g',i:{riz:70,hrouge:100,mais:60,avocat:0.5,cheddar:20,citronvert:0.25,tomate:60,cumin:1},eq:[MO],us:['Casserole ou bol','Saladier'],s:["Cuire le riz.","Réchauffer haricots et maïs avec le cumin.","Couper tomate et avocat.","Assembler dans un bol, ajouter cheddar et citron vert."]},
 {id:'polenta',n:'Polenta crémeuse aux champignons',e:'🍄',t:25,m:'g',i:{polenta:70,lait:150,champi:120,parmesan:15,ail:1,beurre:10},eq:[PL_],us:['Casserole','Poêle'],s:["Porter le lait et autant d'eau à ébullition.","Verser la polenta en pluie, remuer 5 min.","Faire sauter les champignons à l'ail.","Servir la polenta avec parmesan et champignons."]},
 {id:'oeufsbrouilles',n:'Œufs brouillés et tartines',e:'🍳',t:10,m:'g',i:{oeuf:3,ciboulette:0.15,paincomplet:80,beurre:10,tomcerise:60},eq:[MO],us:['Poêle ou bol'],s:["Battre les œufs avec sel et poivre.","Cuire à feu doux en remuant (ou 2 × 40 s au micro-ondes en mélangeant).","Ajouter la ciboulette.","Servir avec les tartines et les tomates cerises."]},
 {id:'patategarnie',n:'Pomme de terre garnie thon-ciboulette',e:'🥔',t:15,m:'p',i:{pdt:300,thon:60,fromageblanc:80,ciboulette:0.15,salade:0.1},eq:[['microondes','four','airfryer']],us:['Assiette','Bol'],s:["Piquer la pomme de terre et la cuire 8 à 10 min au micro-ondes (ou 45 min au four).","Mélanger thon, fromage blanc et ciboulette.","Ouvrir la pomme de terre et garnir.","Servir avec la salade."]},
 {id:'poke',n:'Poké bowl crevettes-avocat',e:'🍣',t:20,m:'p',i:{riz:75,crevettes:80,avocat:0.5,concombre:0.25,mais:40,sesame:5,soja:15},eq:[MO],us:['Casserole ou bol','Saladier'],s:["Cuire le riz et le laisser tiédir.","Couper avocat et concombre.","Disposer crevettes, légumes et maïs sur le riz.","Arroser de soja et parsemer de sésame."]},
 {id:'patesthon',n:'Pâtes thon-tomate-olives',e:'🍝',t:20,m:'p',i:{pates:100,thon:70,tconc:130,olives:20,ail:1,huile:5},eq:[PL_],us:['Casserole','Sauteuse'],s:["Cuire les pâtes.","Faire chauffer tomates et ail 10 min.","Ajouter thon émietté et olives.","Mélanger aux pâtes."]},
 {id:'quesadillas',n:'Quesadillas haricots-maïs-cheddar',e:'🫓',t:15,m:'g',i:{tortilla:2,cheddar:40,hrouge:80,mais:50,poivron:0.25},eq:[['plaques','four','airfryer']],us:['Poêle'],s:["Écraser grossièrement les haricots.","Garnir une moitié de tortilla : haricots, maïs, poivron, cheddar.","Replier et dorer 3 min par face.","Couper en triangles."]},
 {id:'papillote',n:'Saumon en papillote aux poireaux',e:'🐟',t:25,m:'p',i:{saumon:125,poireau:120,cremeliquide:30,citron:0.25,riz:60},eq:[['four','microondes'],MO],us:['Papier cuisson','Plat'],s:["Émincer finement les poireaux.","Poser poireaux, saumon, crème et citron sur du papier cuisson, fermer.","Cuire 15 min à 200 °C (ou 4 min au micro-ondes).","Servir avec le riz."]},
 {id:'endives',n:'Endives au jambon gratinées',e:'🥬',t:45,m:'v',i:{endive:250,jambon:1,lait:120,beurre:10,farine:10,emmental:25},eq:[['four'],PL_],us:['Casserole','Plat à gratin'],s:["Cuire les endives 10 min à l'eau et bien les égoutter.","Faire une béchamel : beurre, farine, puis lait en fouettant.","Rouler les endives dans le jambon, napper de béchamel et d'emmental.","Gratiner 20 min à 200 °C."]},
 {id:'panini',n:'Panini pesto-mozzarella',e:'🥖',t:15,m:'g',i:{baguette:0.5,pesto:20,mozza:60,tomate:60,roquette:20},eq:[['four','airfryer','plaques']],us:['Plaque ou poêle'],s:["Ouvrir la baguette et la tartiner de pesto.","Garnir de tomate et de mozzarella.","Cuire 8 min au four ou presser à la poêle.","Ajouter la roquette."]},
 {id:'feuillete',n:'Feuilleté chèvre-épinards',e:'🥐',t:35,m:'g',i:{feuilletee:0.25,pousses:60,chevre:40,ricotta:50,salade:0.1},eq:[['four']],us:['Plaque à rôtir','Saladier'],s:["Préchauffer à 200 °C.","Mélanger ricotta, épinards hachés et chèvre émietté.","Garnir la pâte, replier en chausson.","Cuire 20 min ; servir avec la salade."]},
 {id:'betterave',n:'Salade betterave, feta et roquette',e:'🥗',t:10,m:'g',i:{betterave:120,feta:40,roquette:30,vinaigre:10,huile:10,baguette:0.25},eq:[],us:['Saladier'],s:["Couper la betterave en dés.","Émietter la feta.","Mélanger avec la roquette.","Assaisonner de vinaigre et d'huile ; servir avec du pain."]}
);
/* m : 'g' = végétarien, 'p' = poisson, 'v' = viande */
/* ---------- Équipements ----------
   eq : liste de besoins ; chaque besoin est satisfait par l'un des appareils listés */
const EQUIP={plaques:{n:'Plaques de cuisson',e:'🔥'},four:{n:'Four',e:'♨️'},mixeur:{n:'Mixeur',e:'🌀'},airfryer:{n:'Airfryer',e:'💨'},microondes:{n:'Micro-ondes',e:'⏲️'}};
const FOUR=['four','airfryer'];
const EQ_MAP={
 carbo:[['plaques']],bolo:[['plaques']],dahl:[['plaques']],pcoco:[['plaques']],chili:[['plaques']],
 tortilla:[['plaques']],qlorraine:[['four'],['plaques']],qpoireau:[['four'],['plaques']],
 saumon:[['plaques']],cabillaud:[['plaques']],gratcourg:[['four'],['plaques']],ratatouille:[['plaques']],
 couscous:[['plaques']],fajitas:[['plaques']],wraps:[],nicoise:[['plaques']],cantonais:[['plaques']],
 soupepoireau:[['plaques'],['mixeur']],pateschampi:[['plaques']],saucisses:[['plaques']],
 patdouce:[FOUR],shakshuka:[['plaques']],tofu:[['plaques']],parmentier:[['four'],['plaques']],
 pizza:[['four']],croque:[['four','airfryer','plaques']],veloute:[['plaques'],['mixeur']],
 pouletpdt:[FOUR],epinards:[['plaques','microondes']],steak:[FOUR,['plaques']]
};
const US_MAP={
 carbo:['Casserole','Poêle','Saladier'],bolo:['Casserole','Sauteuse'],dahl:['Cocotte','Casserole'],
 pcoco:['Sauteuse','Casserole'],chili:['Cocotte','Casserole'],tortilla:['Poêle','Saladier'],
 qlorraine:['Moule à tarte','Poêle','Saladier'],qpoireau:['Moule à tarte','Poêle','Saladier'],
 saumon:['Casserole','Poêle','Panier vapeur (ou casserole)'],cabillaud:['Casserole','Poêle','Presse-purée'],
 gratcourg:['Poêle','Plat à gratin','Saladier'],ratatouille:['Cocotte','Casserole'],couscous:['Cocotte','Saladier'],
 fajitas:['Poêle'],wraps:['Saladier'],nicoise:['Casserole','Saladier'],cantonais:['Casserole','Poêle ou wok'],
 soupepoireau:['Faitout'],pateschampi:['Casserole','Poêle'],saucisses:['Cocotte'],patdouce:['Plaque à rôtir'],
 shakshuka:['Sauteuse avec couvercle'],tofu:['Casserole','Poêle ou wok'],
 parmentier:['Casserole','Poêle','Plat à gratin','Presse-purée'],pizza:['Plaque à rôtir','Rouleau à pâtisserie'],
 croque:['Plaque à rôtir ou poêle'],veloute:['Faitout'],pouletpdt:['Plat à gratin'],
 epinards:['Sauteuse avec couvercle'],steak:['Plaque à rôtir','Poêle']
};
RECIPES.forEach(r=>{r.eq=r.eq||EQ_MAP[r.id]||[];r.us=r.us||US_MAP[r.id]||[];});
const hasEquip=r=>r.eq.every(g=>g.some(x=>st.settings.equip.includes(x)));
const eqLabel=r=>r.eq.length?r.eq.map(g=>g.map((x,j)=>j?EQUIP[x].n.toLowerCase():EQUIP[x].n).join(' ou ')).join(', '):'Aucun appareil';
const eqIcons=r=>r.eq.map(g=>(g.find(x=>st.settings.equip.includes(x))&&EQUIP[g.find(x=>st.settings.equip.includes(x))].e)||EQUIP[g[0]].e).join('');
const dislikedIn=r=>Object.keys(r.i).filter(k=>st.settings.dislikes.includes(k));
const liked=r=>!st.settings.banned.includes(r.id)&&!dislikedIn(r).length;
const RBYID=Object.fromEntries(RECIPES.map(r=>[r.id,r]));

/* ---------- Recettes ajoutées (photo d'une recette) ----------
   Gardées dans ce navigateur, et dans la base quand on partage Popote à plusieurs (foyer.js).
   Les nouveaux ingrédients qu'elles apportent sont ajoutés au référentiel (marqués x). */
const MINE_KEY='popote-recettes';
const UNITS=['g','ml','pièce','gousse','tranche','cube'];
const clean=(v,max)=>String(v==null?'':v).replace(/[<>"`\\]/g,'').replace(/\s+/g,' ').trim().slice(0,max||200);
const posNum=(v,max)=>{const n=Number(v);return isFinite(n)&&n>0&&n<=max?n:0};
/* Vérifie une recette venue de la base ou de la lecture d'une photo ; renvoie une recette utilisable ou null. */
function checkRecipe(raw){
  if(!raw||typeof raw!=='object'||!/^u[a-z0-9-]{3,40}$/.test(raw.id||''))return null;
  const ing={};
  for(const k in (raw.ing||{})){const g=raw.ing[k];
    if(!/^x_[a-z0-9_]{1,40}$/.test(k)||!g||ING_DEFAULT[k]&&!ING_DEFAULT[k].x)continue;
    const n=clean(g.n,60),q=posNum(g.q,100000),p=Number(g.p);
    if(!n||!q||!AISLES.includes(g.a)||!UNITS.includes(g.u)||!(p>=0&&p<1000))continue;
    ing[k]={n,a:g.a,q,u:g.u,p:Math.round(p*100)/100,x:1};if(g.pl)ing[k].pl=1;}
  const i={};
  for(const k in (raw.i||{})){const q=posNum(raw.i[k],5000);if(q&&(ING_DEFAULT[k]&&!ING_DEFAULT[k].x||ing[k]))i[k]=Math.round(q*100)/100;}
  if(!Object.keys(i).length)return null;
  const eq=Array.isArray(raw.eq)?raw.eq.map(g=>Array.isArray(g)?g.filter(x=>EQUIP[x]):[]).filter(g=>g.length).slice(0,4):[];
  const list=(a,n,max)=>Array.isArray(a)?a.map(x=>clean(x,max)).filter(Boolean).slice(0,n):[];
  const s=list(raw.s,25,600);
  return {id:raw.id,n:clean(raw.n,80)||'Recette maison',e:clean(raw.e,8)||'🍽️',t:Math.round(Math.min(600,Math.max(5,Number(raw.t)||30))),
    m:['g','p','v'].includes(raw.m)?raw.m:'v',i,ing,eq,us:list(raw.us,8,60),s:s.length?s:['Suivre la recette d\'origine.'],
    mine:1,by:clean(raw.by,60),from:clean(raw.from,120)};
}
/* Remplace toutes les recettes ajoutées par cette liste (et met la liste de côté pour la prochaine ouverture). */
function setCustomRecipes(list){
  for(let j=RECIPES.length-1;j>=0;j--)if(RECIPES[j].mine){delete RBYID[RECIPES[j].id];RECIPES.splice(j,1);}
  for(const k in ING_DEFAULT)if(ING_DEFAULT[k].x)delete ING_DEFAULT[k];
  const ok=[];
  (list||[]).forEach(raw=>{const r=checkRecipe(raw);if(!r||RBYID[r.id])return;
    for(const k in r.ing)if(!ING_DEFAULT[k])ING_DEFAULT[k]=r.ing[k];
    RECIPES.push(r);RBYID[r.id]=r;ok.push(raw);});
  try{localStorage.setItem(MINE_KEY,JSON.stringify(ok));}catch(e){}
  return ok;
}
function customRecipes(){try{return JSON.parse(localStorage.getItem(MINE_KEY)||'[]')}catch(e){return []}}
setCustomRecipes(customRecipes());
const DAYS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const MEAL_LBL={midi:'Midi',soir:'Soir'};

/* ---------- État ---------- */
const KEY='semainier-v1';
let st={settings:{budget:60,pers:2,days:7,meals:['midi','soir'],diet:'tout',tmax:0,placard:false,equip:['plaques','four','mixeur','microondes']},plan:null,over:{},checked:{}};
try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s&&s.settings)st=Object.assign(st,s);}catch(e){}
if(!Array.isArray(st.settings.equip))st.settings.equip=['plaques','four','mixeur','microondes'];
if(!Array.isArray(st.settings.dislikes))st.settings.dislikes=[];
if(!st.settings.theme)st.settings.theme='auto';
function applyTheme(){const t=st.settings.theme,r=document.documentElement;
  if(t==='auto')r.removeAttribute('data-theme');else r.setAttribute('data-theme',t);
  const dark=t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);
  const b=document.getElementById('themeBtn');if(b){b.textContent=dark?'☀️':'🌙';b.setAttribute('aria-label',dark?'Passer en mode clair':'Passer en mode sombre');}
  document.querySelectorAll('[data-theme-set]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.themeSet===t));}
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme)}catch(e){}
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const pd=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const addD=(d,n)=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()+n);return x};
const dd=(a,b)=>Math.round((pd(b)-pd(a))/864e5);
const TODAY=iso(new Date());
const MAXD=14;
if(!st.settings.start||!st.settings.end){st.settings.start=TODAY;st.settings.end=iso(addD(new Date(),Math.max(1,st.settings.days||7)-1));}
function syncDays(){st.settings.days=dd(st.settings.start,st.settings.end)+1}
syncDays();
let calMonth=pd(st.settings.start);calMonth.setDate(1);
let calPending=false;
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const fmt=(s,o)=>pd(s).toLocaleDateString('fr-FR',o);
const dayLabel=i=>cap(addD(pd(st.settings.start),i).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'short'}));
function periodTxt(short){const s=st.settings;
  if(s.start===s.end)return cap(fmt(s.start,{weekday:short?'short':'long',day:'numeric',month:'short'}));
  return (short?'':'Du ')+fmt(s.start,{weekday:'short',day:'numeric',month:'short'})+(short?' → ':' au ')+fmt(s.end,{weekday:'short',day:'numeric',month:'short'});}
function renderCal(){
  const s=st.settings,y=calMonth.getFullYear(),m=calMonth.getMonth();
  const first=new Date(y,m,1),off=(first.getDay()+6)%7,nd=new Date(y,m+1,0).getDate();
  const thisMonth=new Date();thisMonth.setDate(1);
  const canPrev=true;
  let g='<div class="calgrid">'+['L','M','M','J','V','S','D'].map(x=>`<div class="wd">${x}</div>`).join('');
  for(let i=0;i<off;i++)g+='<div></div>';
  for(let d=1;d<=nd;d++){
    const k=iso(new Date(y,m,d));
    const has=st.byDate&&st.byDate[k]&&Object.keys(st.byDate[k]).length;
    const cls=[k>=s.start&&k<=s.end?'in':'',k===s.start?'st':'',k===s.end?'en':'',k===TODAY?'today':'',has?'has':'',k<TODAY?'past':''].join(' ');
    g+=`<button class="cd ${cls}" data-date="${k}" aria-label="${cap(fmt(k,{weekday:'long',day:'numeric',month:'long'}))}" aria-pressed="${k>=s.start&&k<=s.end}"><span>${d}</span></button>`;
  }
  g+='</div>';
  $('#cal').innerHTML=`<div class="calhd"><button class="calnav" data-calnav="-1" ${canPrev?'':'disabled'} aria-label="Mois précédent">‹</button><b>${cap(calMonth.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}))}</b><button class="calnav" data-calnav="1" aria-label="Mois suivant">›</button></div>${g}
    <div class="calsum"><span>${periodTxt(false)}</span><em>${s.days} jour${s.days>1?'s':''}</em></div>
    <p class="calhint">${calPending?'Touche maintenant le dernier jour.':'Touche le premier jour, puis le dernier (14 jours max). Un point orange = des repas prévus.'}</p>`;
}
function setRange(a,b){st.settings.start=a;st.settings.end=b;syncDays();calMonth=pd(a);calMonth.setDate(1);calPending=false;}
if(!Array.isArray(st.settings.banned))st.settings.banned=[];
function save(){try{writeBack();}catch(e){}try{localStorage.setItem(KEY,JSON.stringify(st));}catch(e){}if(window.popoteSync)window.popoteSync();}

/* ---------- Magasins ----------
   Coefficients estimés à partir des écarts moyens publiés en 2026 (UFC-Que Choisir et relevés de prix) :
   1 = prix moyens du référentiel. Les hard-discounters sont surtout moins chers sur l'épicerie et la crèmerie. */
const STORES={
 moy:{n:'Prix moyens',t:'Référence',f:{}},
 lidl:{n:'Lidl',t:'Hard-discount',f:{[A]:.95,[B]:.96,[C]:.90,[E]:.88,[S]:.92,[P]:.90}},
 leclerc:{n:'E.Leclerc',t:'Hyper / super',f:{[A]:.96,[B]:.95,[C]:.95,[E]:.95,[S]:.95,[P]:.96}},
 aldi:{n:'Aldi',t:'Hard-discount',f:{[A]:.97,[B]:.98,[C]:.89,[E]:.90,[S]:.94,[P]:.92}},
 inter:{n:'Intermarché',t:'Hyper / super',f:{[A]:.98,[B]:.97,[C]:.985,[E]:.985,[S]:.985,[P]:.985}},
 superu:{n:'Super U',t:'Hyper / super',f:{[A]:.98,[B]:.98,[C]:.99,[E]:.99,[S]:.99,[P]:.99}},
 carrefour:{n:'Carrefour',t:'Hyper / super',f:{[A]:1.03,[B]:1.04,[C]:1.04,[E]:1.04,[S]:1.04,[P]:1.04}},
 auchan:{n:'Auchan',t:'Hyper / super',f:{[A]:1.07,[B]:1.08,[C]:1.08,[E]:1.08,[S]:1.08,[P]:1.08}},
 monop:{n:'Monoprix',t:'Centre-ville',f:{[A]:1.18,[B]:1.18,[C]:1.18,[E]:1.2,[S]:1.18,[P]:1.18}},
 proxi:{n:'Supérette de quartier',t:'Proximité',f:{[A]:1.2,[B]:1.22,[C]:1.22,[E]:1.24,[S]:1.22,[P]:1.2}}
};
const SKEYS=Object.keys(STORES).filter(k=>k!=='moy');
if(!st.settings.store||!STORES[st.settings.store])st.settings.store='moy';
if(!Array.isArray(st.settings.stores))st.settings.stores=SKEYS.slice();
const sf=(sid,a)=>(STORES[sid]&&STORES[sid].f[a])||1;
const ING=id=>{const d=ING_DEFAULT[id],o=st.over[id]||{};return Object.assign({},d,{p:d.p*sf(st.settings.store,d.a)},o)};
/* Total estimé de la liste dans un magasin donné (prix de référence × coefficient du rayon) */
function storeTotals(n,sid){const by={};let t=0;
  for(const k in n){const d=ING_DEFAULT[k],o=st.over[k]||{},q=o.q||d.q,packs=Math.ceil(n[k]/q-1e-9);
    const c=packs*(o.p!=null?o.p:d.p)*sf(sid,d.a);by[d.a]=(by[d.a]||0)+c;t+=c;}
  return {t,by};}
const eur=v=>v.toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
const counted=id=>st.settings.placard||!ING_DEFAULT[id].pl;
const PL={pièce:'pièces',gousse:'gousses',tranche:'tranches',cube:'cubes'};
function fq(q,u){
  if(u==='g')return q>=1000?(Math.round(q/100)/10).toString().replace('.',',')+' kg':Math.round(q)+' g';
  if(u==='ml')return q>=1000?(Math.round(q/100)/10).toString().replace('.',',')+' L':(q>=100?Math.round(q/10)+' cl':Math.round(q)+' ml');
  const r=Math.round(q*10)/10;return r.toString().replace('.',',')+' '+(r>1?(PL[u]||u):u);
}
const packLbl=g=>fq(g.q,g.u);

/* ---------- Calculs ---------- */
function slotsCount(){return st.settings.days*st.settings.meals.length}
function eligible(){
  const s=st.settings;
  return RECIPES.filter(r=>{
    if(s.diet==='veg'&&r.m!=='g')return false;
    if(s.tmax&&r.t>s.tmax)return false;
    if(!hasEquip(r))return false;
    if(!liked(r))return false;
    return true;
  });
}
function needsOf(ids){
  const n={},p=st.settings.pers;
  ids.forEach(id=>{if(!id)return;const r=RBYID[id];for(const k in r.i){if(!counted(k))continue;n[k]=(n[k]||0)+r.i[k]*p;}});
  return n;
}
function cost(n){let t=0;for(const k in n){const g=ING(k);t+=Math.ceil(n[k]/g.q-1e-9)*g.p;}return t}
function marginal(n,r){
  let d=0;const p=st.settings.pers;
  for(const k in r.i){if(!counted(k))continue;const g=ING(k),b=n[k]||0,a=b+r.i[k]*p;
    d+=(Math.ceil(a/g.q-1e-9)-Math.ceil(b/g.q-1e-9))*g.p;}
  return d;
}
function addNeeds(n,r){const p=st.settings.pers;for(const k in r.i){if(!counted(k))continue;n[k]=(n[k]||0)+r.i[k]*p;}}
function portionCost(r){let t=0;for(const k in r.i){if(!counted(k))continue;const g=ING(k);t+=r.i[k]*g.p/g.q;}return t}

function meatPenalty(r,counts){
  if(st.settings.diet!=='flexi'||r.m!=='v')return 0;
  return 4+(counts.__meat||0)*3;
}
function generate(){
  const s=st.settings,N=slotsCount(),M=s.meals.length;
  const prev=(st.plan&&st.plan.length===N)?st.plan:null;
  const pool=eligible();
  if(!pool.length){st.plan=Array.from({length:N},()=>({r:null,l:false}));return}
  let best=null,bestObj=Infinity;
  for(let a=0;a<350;a++){
    const plan=Array.from({length:N},(_,i)=>prev&&prev[i].l&&prev[i].r?{r:prev[i].r,l:true}:{r:null,l:false});
    const n={},counts={};
    plan.forEach(x=>{if(x.r){addNeeds(n,RBYID[x.r]);counts[x.r]=(counts[x.r]||0)+1;if(RBYID[x.r].m==='v')counts.__meat=(counts.__meat||0)+1;}});
    for(let i=0;i<N;i++){
      if(plan[i].r)continue;
      const day=Math.floor(i/M);
      const sameDay=plan.slice(day*M,day*M+M).map(x=>x.r);
      const prevR=i>0?plan[i-1].r:null;
      let cands=pool.filter(r=>(counts[r.id]||0)<2&&!sameDay.includes(r.id)&&r.id!==prevR);
      if(!cands.length)cands=pool;
      let pick=null,ps=Infinity;
      for(const r of cands){
        const sc=marginal(n,r)*(0.45+Math.random()*1.1)+(counts[r.id]?2.5:0)+meatPenalty(r,counts)+Math.random()*1.6;
        if(sc<ps){ps=sc;pick=r;}
      }
      plan[i].r=pick.id;addNeeds(n,pick);counts[pick.id]=(counts[pick.id]||0)+1;if(pick.m==='v')counts.__meat=(counts.__meat||0)+1;
    }
    const total=cost(n),distinct=Object.keys(counts).filter(k=>k!=='__meat').length;
    const obj=Math.max(0,total-s.budget)*25+total*0.12-distinct*1.3;
    if(obj<bestObj){bestObj=obj;best=plan;}
  }
  st.plan=best;st.checked={};setMeta();
}
function reroll(i){
  const ids=st.plan.map((x,j)=>j===i?null:x.r);
  const n=needsOf(ids);const counts={};ids.forEach(id=>{if(id)counts[id]=(counts[id]||0)+1});
  const cur=st.plan[i].r;
  let cands=eligible().filter(r=>r.id!==cur&&(counts[r.id]||0)<2);
  if(!cands.length)return;
  let pick=null,ps=Infinity;
  for(const r of cands){const sc=marginal(n,r)*(0.4+Math.random()*1.2)+(counts[r.id]?2:0)+Math.random()*2;if(sc<ps){ps=sc;pick=r;}}
  st.plan[i].r=pick.id;
}

/* ---------- Rendu ---------- */
const $=s=>document.querySelector(s);
function renderSettings(){
  const s=st.settings;
  $('#budget').value=s.budget;$('#budgetOut').textContent=s.budget+' €';
  $('#persOut').textContent=s.pers;
  renderCal();
  document.querySelectorAll('[data-meal]').forEach(b=>b.setAttribute('aria-pressed',s.meals.includes(b.dataset.meal)));
  document.querySelectorAll('[data-diet]').forEach(b=>b.setAttribute('aria-pressed',s.diet===b.dataset.diet));
  document.querySelectorAll('[data-tmax]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.tmax===s.tmax));
  $('#placard').checked=s.placard;
  $('#storeChips').innerHTML=Object.keys(STORES).map(k=>`<button class="chip" data-store="${k}" aria-pressed="${s.store===k}">${STORES[k].n}</button>`).join('');
  $('#sumLine').textContent=(s.store!=='moy'?STORES[s.store].n+' · ':'')+s.budget+' € · '+s.pers+' pers. · '+periodTxt(true)+' · '+s.meals.map(m=>MEAL_LBL[m].toLowerCase()).join(' + ')+(s.diet==='veg'?' · végé':s.diet==='flexi'?' · peu de viande':'');
  $('#equipChips').innerHTML=Object.keys(EQUIP).map(k=>`<button class="chip" data-eq="${k}" aria-pressed="${s.equip.includes(k)}">${EQUIP[k].e} ${EQUIP[k].n}</button>`).join('');
  const dl=s.dislikes.map(k=>`<button class="chip no" data-undis="${k}" aria-label="Retirer ${ING_DEFAULT[k].n}">${ING_DEFAULT[k].n} ✕</button>`).join('')
    +s.banned.map(id=>`<button class="chip no" data-unban="${id}" aria-label="Retirer ${RBYID[id].n}">${RBYID[id].e} ${RBYID[id].n} ✕</button>`).join('');
  $('#dislikeChips').innerHTML=dl+'<button class="chip add" id="openDislikes">+ Ajouter un aliment</button>';
  const nb=eligible().length,el=$('#eligCount');
  el.textContent=nb?nb+' recette'+(nb>1?'s':'')+' possible'+(nb>1?'s':'')+' avec tes réglages.':'Aucune recette possible avec ces réglages : ajoute un équipement ou élargis le temps.';
  el.classList.toggle('bad',nb<4);
}
function hasPlan(){return !!(st.plan&&st.plan.length===slotsCount())}
function filledIds(){return hasPlan()?st.plan.filter(x=>x.r).map(x=>x.r):[]}
function planValid(){return hasPlan()&&filledIds().length>0}
function emptyPlan(){st.plan=Array.from({length:slotsCount()},()=>({r:null,l:false}));setMeta();st.checked={};}
/* Garde les plats choisis quand on change la période ou les repas */
/* Les repas sont mémorisés jour par jour : on peut revenir sur une semaine passée ou future */
function writeBack(){
  if(!st.plan||!st.planMeta)return;
  const m=st.planMeta,M=m.meals.length;if(!st.byDate)st.byDate={};
  st.plan.forEach((x,i)=>{const k=iso(addD(pd(m.start),Math.floor(i/M))),ml=m.meals[i%M];
    if(x&&x.r)(st.byDate[k]=st.byDate[k]||{})[ml]={r:x.r,l:!!x.l};
    else if(st.byDate[k]){delete st.byDate[k][ml];if(!Object.keys(st.byDate[k]).length)delete st.byDate[k];}});
}
function loadPlan(){
  const s=st.settings,M=s.meals.length,N=slotsCount();let any=false;
  const plan=Array.from({length:N},(_,i)=>{const k=iso(addD(pd(s.start),Math.floor(i/M))),e=st.byDate&&st.byDate[k]&&st.byDate[k][s.meals[i%M]];
    if(e&&RBYID[e.r]){any=true;return {r:e.r,l:e.l}}return {r:null,l:false}});
  st.plan=any?plan:null;setMeta();
}
function setMeta(){st.planMeta={start:st.settings.start,meals:[...st.settings.meals],n:slotsCount()}}
function ensurePlan(){
  const s=st.settings;
  if(!st.byDate){st.byDate={};
    if(st.plan&&st.plan.length){if(!st.planMeta)st.planMeta={start:s.start,meals:[...s.meals]};writeBack();}}
  const m=st.planMeta;
  if(m&&m.start===s.start&&m.meals.join()===s.meals.join()&&m.n===slotsCount()&&(!st.plan||st.plan.length===slotsCount()))return;
  writeBack();loadPlan();st.checked={};save();
}
const slotLabel=i=>{const M=st.settings.meals.length;return cap(addD(pd(st.settings.start),Math.floor(i/M)).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'}))+' · '+MEAL_LBL[st.settings.meals[i%M]].toLowerCase()};
function fillEmpty(){
  if(!hasPlan())emptyPlan();
  const keep=st.plan.map(x=>!!x.l),had=st.plan.map(x=>!!x.r);
  st.plan.forEach(x=>{if(x.r)x.l=true});
  const chk=st.checked;generate();st.checked=chk;
  st.plan.forEach((x,i)=>{x.l=had[i]?keep[i]:false});
}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(toast.tm);toast.tm=setTimeout(()=>t.classList.remove('on'),1800)}
let fresh=false;
const SHORT={[A]:'Légumes',[B]:'Viande & poisson',[C]:'Crèmerie',[E]:'Épicerie',[S]:'Surgelés',[P]:'Pain'};
const ACOL={[A]:'var(--c4)',[B]:'var(--c3)',[C]:'var(--c2)',[E]:'var(--c1)',[S]:'var(--c5)',[P]:'var(--c6)'};
function renderStrip(){
  const s=st.settings;let h='';
  const pn=$('#pastnote');
  if(pn)pn.innerHTML=s.end<TODAY?`<div class="pastnote"><span>📖 Période passée · ${periodTxt(false).toLowerCase()}</span><button class="linkbtn" data-quick="7">Revenir à aujourd'hui</button></div>`:'';
  for(let d=0;d<s.days;d++){
    const dt=addD(pd(s.start),d),k=iso(dt);
    const wd=cap(dt.toLocaleDateString('fr-FR',{weekday:'short'}).replace('.',''));
    h+=`<button class="${k===TODAY?'today':''}" data-goto="${d}" aria-label="${dayLabel(d)}"><span class="wd">${wd}</span><span class="n">${dt.getDate()}</span></button>`;
  }
  $('#strip').innerHTML=h;
  const hr=new Date().getHours();$('#hello').textContent=(hr<5||hr>=18?'Bonsoir':'Bonjour')+(window.popoteName?' '+window.popoteName:'')+' 👋';
}
function renderWeek(){
  const s=st.settings;
  renderStrip();
  if(!eligible().length&&!planValid()){$('#gauge').innerHTML='';$('#week').innerHTML='<div class="empty"><span class="big">🧑‍🍳</span>Aucune recette ne correspond à ton équipement et à ton temps max. Active un appareil de plus pour composer ta semaine.</div>';return}
  if(!hasPlan()){
    $('#gauge').innerHTML='';
    $('#week').innerHTML=`<div class="startcard">
      <div class="big">🍽️</div><h3>Comment on fait cette semaine ?</h3>
      <p>Choisis tes plats toi-même ou laisse-moi proposer un menu dans ton budget. Dans les deux cas, la liste de courses se fait toute seule.</p>
      <button class="shopline" data-askstoreopen>🛒 Courses ${st.settings.store==='moy'?'<b>magasin non choisi</b>':'chez <b>'+STORES[st.settings.store].n+'</b>'} · Changer</button>
      <button class="go" data-manual>Je choisis mes plats</button>
      <button class="soft-btn" data-auto>Propose-moi un menu</button></div>`;
    return;
  }
  const nFill=filledIds().length,nEmpty=st.plan.length-nFill;
  if(!nFill){
    $('#gauge').innerHTML=`<div class="startcard slim"><h3>À toi de jouer 👇</h3><p>Touche une case vide pour choisir un plat. Ton budget et ta liste de courses se calculent au fur et à mesure.</p>
      <button class="soft-btn" data-fill>Remplir automatiquement</button></div>
      <div class="sechd"><h3>Au menu</h3><span>${periodTxt(true)}</span></div>`;
  }
  const n=needsOf(st.plan.map(x=>x.r)),total=cost(n);
  const meals=nFill,pct=Math.min(100,total/s.budget*100),over=total>s.budget;
  let used=0;st.plan.forEach(x=>{if(x.r)used+=portionCost(RBYID[x.r])*s.pers});
  const left=Math.max(0,total-used);
  const by={};for(const k in n){const g=ING(k);by[g.a]=(by[g.a]||0)+Math.ceil(n[k]/g.q-1e-9)*g.p;}
  const aisles=AISLES.filter(a=>by[a]).sort((x,y)=>by[y]-by[x]).slice(0,4);
  const mx=Math.max(...aisles.map(a=>by[a]));
  if(nFill)$('#gauge').innerHTML=`<div class="total ${over?'over':''}" role="status">
      <div class="big">${eur(total)}</div>
      <p>${over?'<b>'+eur(total-s.budget)+' au-dessus</b> de ton budget de '+eur(s.budget):'<b>Il te reste '+eur(s.budget-total)+'</b> sur '+eur(s.budget)}</p>
      <div class="pbar"><i style="width:${pct}%"></i></div>
    </div>
    ${over?`<p class="warn">Baisse le nombre de repas, passe en végétarien ou remplace les plats les plus chers.</p>`:''}
    <div class="card bars"><h3>Où part ton budget</h3><p class="s">Les rayons qui coûtent le plus cette période</p>
      <div class="cols">${aisles.map(a=>`<div class="col"><div class="trk"><i style="height:${Math.max(30,by[a]/mx*100)}%;background:${ACOL[a]}">${Math.round(by[a]/total*100)}%</i></div><span>${SHORT[a]}</span></div>`).join('')}</div>
    </div>
    <div class="stats">
      <div class="stat"><b>${eur(total/(meals*s.pers))}</b><small>par portion</small></div>
      <div class="stat"><b>${meals*s.pers}</b><small>portions</small></div>
      <div class="stat"><b>${eur(left)}</b><small>de restes</small></div>
    </div>
    ${nEmpty?`<button class="go" data-fill style="margin-top:12px">Compléter les ${nEmpty} case${nEmpty>1?'s':''} vide${nEmpty>1?'s':''}</button>`:''}
    <div class="btnrow"><button class="ghost" id="regen">🎲 Autres idées</button><button class="ghost" data-clear>Vider la semaine</button></div>
    <p class="hint" style="text-align:center">Les plats que tu as choisis toi-même 🔒 sont gardés.</p>
    <div class="sechd"><h3>Au menu</h3><span>${periodTxt(true)}</span></div>`;
  const M=s.meals.length;let h=`<div class="days ${fresh?'fresh':''}">`;fresh=false;
  for(let d=0;d<s.days;d++){
    let dc=0;for(let m=0;m<M;m++){const id=st.plan[d*M+m].r;if(id)dc+=portionCost(RBYID[id])*s.pers;}
    h+=`<div class="day" id="day-${d}"><div class="dayhd"><h3>${dayLabel(d)}</h3>${dc?`<span>${eur(dc)}</span>`:''}</div>`;
    for(let m=0;m<M;m++){
      const i=d*M+m,x=st.plan[i],r=RBYID[x.r];
      if(!r){h+=`<button class="meal emptyslot" data-pick="${i}"><span class="tile plus" aria-hidden="true">+</span><span class="info"><span class="when">${MEAL_LBL[s.meals[m]]}</span><span class="name">Choisir un plat</span></span><span></span></button>`;continue}
      h+=`<div class="meal"><div class="tile k-${r.m}" aria-hidden="true">${r.e}</div>
        <div class="info"><div class="when">${MEAL_LBL[s.meals[m]]}</div>
        <button class="name" data-open="${i}">${r.n}</button>
        <div class="det">${r.t} min · ${eur(portionCost(r))}/pers. · ${eqIcons(r)}</div>${!hasEquip(r)?'<span class="flag">Équipement manquant · à remplacer</span>':liked(r)?'':'<span class="flag">À remplacer</span>'}</div>
        <div class="acts"><button class="ib" data-lock="${i}" aria-pressed="${x.l}" aria-label="${x.l?'Déverrouiller':'Garder'} ce repas" title="Garder ce repas">${x.l?'🔒':'🔓'}</button>
        <button class="ib" data-reroll="${i}" aria-label="Proposer une autre recette" title="Autre recette">🎲</button></div></div>`;
    }
    h+='</div>';
  }
  $('#week').innerHTML=h+'</div>';
}
let showStorePick=false;
function renderStores(n){
  const s=st.settings,list=s.stores.filter(k=>STORES[k]);
  if(!list.length)list.push(...SKEYS);
  const rows=list.map(k=>({k,...storeTotals(n,k)})).sort((a,b)=>a.t-b.t);
  const cur=storeTotals(n,s.store).t,best=rows[0];
  // meilleur duo de magasins (rayon par rayon)
  let duo=null;
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
    const a=rows[i],b=rows[j];let t=0;const pickA=[],pickB=[];
    for(const ai in a.by){if(a.by[ai]<=b.by[ai]){t+=a.by[ai];pickA.push(ai)}else{t+=b.by[ai];pickB.push(ai)}}
    if(pickA.length&&pickB.length&&(!duo||t<duo.t))duo={t,a:a.k,b:b.k,pa:pickA,pb:pickB};
  }
  const gainDuo=duo?best.t-duo.t:0;
  const sh=a=>SHORT[a].toLowerCase();
  let h=`<div class="card stores"><div class="sthd"><div><h3>Où acheter moins cher</h3><p class="s">Ta liste estimée dans chaque enseigne</p></div><button class="linkbtn" data-storepick>${showStorePick?'OK':'Mes magasins'}</button></div>`;
  if(showStorePick){
    h+=`<p class="hint" style="margin-top:0">Garde seulement les enseignes près de chez toi :</p><div class="chips" style="margin:8px 0 6px">${SKEYS.map(k=>`<button class="chip" data-mystore="${k}" aria-pressed="${s.stores.includes(k)}">${STORES[k].n}</button>`).join('')}</div>`;
  }
  h+='<div class="srows">'+rows.map((r,i)=>{const d=r.t-cur,sel=r.k===s.store;
    return `<button class="srow ${i===0?'best':''} ${sel?'sel':''}" data-store="${r.k}" aria-pressed="${sel}">
      <span class="av">${STORES[r.k].n.replace('E.','').charAt(0)}</span>
      <span class="sn">${STORES[r.k].n}${i===0?'<em>Le moins cher</em>':''}<small>${STORES[r.k].t}${sel?' · ton magasin':''}</small></span>
      <span class="st">${eur(r.t)}<small class="${d<-0.005?'pos':d>0.005?'neg':''}">${Math.abs(d)<0.005?(sel?'—':'='):(d<0?'−':'+')+eur(Math.abs(d))}</small></span></button>`}).join('')+'</div>';
  if(duo&&gainDuo>=1.5){
    h+=`<div class="duo"><b>Astuce 2 magasins : ${eur(gainDuo)} de plus économisés</b><p>${cap(duo.pa.map(sh).join(', '))} chez ${STORES[duo.a].n}, ${duo.pb.map(sh).join(', ')} chez ${STORES[duo.b].n} : ${eur(duo.t)} au total.</p></div>`;
  }
  if(cur-best.t>0.5&&s.store!==best.k)h+=`<button class="go" data-store="${best.k}" style="margin-top:12px">Passer chez ${STORES[best.k].n} (−${eur(cur-best.t)})</button>`;
  h+=`<p class="hint">Estimation basée sur les écarts de prix moyens entre enseignes relevés en 2026. Les prix varient d'un magasin à l'autre, et l'assortiment des hard-discounters est plus restreint. Touche une enseigne pour en faire ton magasin.</p></div>`;
  return h;
}
function renderTicket(){
  const s=st.settings;
  if(!planValid()){$('#ticket').innerHTML='<div class="empty"><span class="big">🛒</span>Choisis au moins un plat dans l\'onglet Semaine, la liste apparaîtra ici.</div>';return}
  const n=needsOf(st.plan.map(x=>x.r));
  const by={};let total=0,nb=0,done=0;
  for(const k in n){const g=ING(k),packs=Math.ceil(n[k]/g.q-1e-9),pr=packs*g.p;total+=pr;nb++;if(st.checked[k])done++;(by[g.a]=by[g.a]||[]).push({k,g,need:n[k],packs,pr});}
  const nf=filledIds().length,ne=st.plan.length-nf;
  let h=`<div class="shophd"><div class="big">${eur(total)}</div><p>${nf} repas · <b>${done}/${nb}</b> articles cochés</p>${ne?`<p class="hint">${ne} case${ne>1?'s':''} encore vide${ne>1?'s':''} dans ta semaine.</p>`:''}
    <div class="pbar"><i style="width:${nb?done/nb*100:0}%"></i></div></div>`;
  h+=renderStores(n);
  AISLES.forEach(a=>{if(!by[a])return;
    const sub=by[a].reduce((t,o)=>t+o.pr,0);
    h+=`<div class="aislecard"><h4>${a}<span>${eur(sub)}</span></h4>`;
    by[a].sort((x,y)=>x.g.n.localeCompare(y.g.n)).forEach(o=>{
      const dn=!!st.checked[o.k];
      h+=`<label class="it ${dn?'done':''}"><input type="checkbox" data-check="${o.k}" ${dn?'checked':''}>
        <span class="lbl">${o.packs} × ${o.g.n}<small>${packLbl(o.g)} · besoin ${fq(o.need,o.g.u)}</small></span><span class="pr">${eur(o.pr)}</span></label>`;
    });
    h+='</div>';
  });
  const diff=s.budget-total;
  h+=`<div class="sumcard"><div class="l t"><span>Total</span><span>${eur(total)}</span></div>
    <div class="l"><span>Budget</span><span>${eur(s.budget)}</span></div>
    <div class="l"><span>${diff>=0?'Économie':'Dépassement'}</span><span class="${diff>=0?'pos':'neg'}">${eur(Math.abs(diff))}</span></div>
    ${s.placard?'':'<p class="hint">Huile, beurre, épices, soja et bouillon non comptés.</p>'}</div>
    <div class="btnrow"><button class="ghost" id="copyList">${navigator.share?'Envoyer la liste':'Copier la liste'}</button><button class="ghost" id="uncheck">Tout décocher</button></div>`;
  $('#ticket').innerHTML=h;
}
function renderRecipes(){
  const doable=RECIPES.filter(hasEquip),hidden=RECIPES.length-doable.length;
  const rc=$('#rcount');if(rc)rc.textContent=doable.length;
  const rn=$('#rhidden');if(rn)rn.innerHTML=hidden?`${hidden} recette${hidden>1?'s':''} masquée${hidden>1?'s':''} car il te manque un équipement. <button class="linkbtn" data-goequip>Modifier mon équipement</button>`:'';
  const q=norm(($('#rsearch')&&$('#rsearch').value||'').trim());
  const list=doable.filter(r=>!q||norm(r.n).includes(q)||Object.keys(r.i).some(k=>norm(ING_DEFAULT[k].n).includes(q)));
  if(!list.length){$('#rlist').innerHTML='<p class="hint">Aucune recette ne correspond.</p>';return}
  $('#rlist').innerHTML=list.sort((a,b)=>portionCost(a)-portionCost(b)).map(r=>`<button class="rcard k-${r.m} ${liked(r)?'':'off'}" data-recipe="${r.id}"><span class="em" aria-hidden="true">${r.e}</span><span class="tx"><b>${r.n}</b><small>${r.t} min · ${eqIcons(r)}${r.m==='g'?' · végé':''}${liked(r)?'':' · 👎'}</small><span class="price">${eur(portionCost(r))} / pers.</span></span></button>`).join('');
}
function renderIngredients(){
  $('#icount').textContent=Object.keys(ING_DEFAULT).length;
  const q=($('#isearch').value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  let h='';
  AISLES.forEach(a=>{
    const rows=Object.keys(ING_DEFAULT).filter(k=>ING_DEFAULT[k].a===a&&ING_DEFAULT[k].n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(q));
    if(!rows.length)return;
    h+=`<tr class="grp"><td colspan="4">${a}</td></tr>`;
    rows.forEach(k=>{const g=ING(k);
      const ppu=(g.u==='g'||g.u==='ml')?eur(g.p/g.q*1000)+(g.u==='g'?' / kg':' / L'):eur(g.p/g.q)+' / '+g.u;
      h+=`<tr><td>${g.n}${g.pl?'<span class="tag">placard</span>':''}</td>
        <td><input type="number" min="1" step="any" value="${g.q}" data-iq="${k}" aria-label="Conditionnement ${g.n}"><span class="u">${g.u}</span></td>
        <td><input type="number" min="0" step="0.01" value="${g.p}" data-ip="${k}" aria-label="Prix ${g.n}"><span class="u">€</span></td>
        <td class="ppu">${ppu}</td></tr>`;});
  });
  $('#itable').innerHTML=h||'<tr><td colspan="4">Aucun ingrédient ne correspond.</td></tr>';
}
function renderAll(){ensurePlan();renderSettings();renderWeek();renderTicket();renderRecipes();}

/* ---------- Modale recette ---------- */
const dlg=$('#dlg');
function openRecipe(id,slot){
  const r=RBYID[id],p=st.settings.pers;
  let h=`<div class="hero k-${r.m}"><button class="close" data-close aria-label="Fermer">✕</button><div class="bigem" aria-hidden="true">${r.e}</div><h2>${r.n}</h2>
    <div class="meta">${r.t} min · ${p} pers. · ${eur(portionCost(r)*p)} au total</div>${r.mine?`<div class="meta" style="margin-top:4px">📸 Recette ajoutée${r.by?' par '+r.by:''}</div>`:''}</div>
    <h3 style="margin-top:18px;margin-bottom:0">Équipement</h3>
    <div class="eqline">${r.eq.length?r.eq.map(g=>`<span>${g.map(x=>EQUIP[x].e+' '+EQUIP[x].n).join(' ou ')}</span>`).join(''):'<span>Aucun appareil</span>'}</div>
    <div class="eqline">${r.us.map(u=>`<span>${u}</span>`).join('')}</div>
    ${hasEquip(r)?'':'<p class="hint bad">Il te manque un appareil pour cette recette.</p>'}
    <h3 style="margin-top:18px;margin-bottom:0">Ingrédients</h3><ul>`;
  for(const k in r.i){const g=ING(k);h+=`<li><span>${g.n}${counted(k)?'':' <span class="tag">placard</span>'}${st.settings.dislikes.includes(k)?' <span class="flag">👎</span>':''}</span><span>${fq(r.i[k]*p,g.u)}</span></li>`;}
  const banned=st.settings.banned.includes(r.id);
  h+=`</ul><h3>Préparation</h3><ol>${r.s.map(x=>`<li>${x}</li>`).join('')}</ol>
    <button class="banbtn ${banned?'on':''}" data-ban="${r.id}" data-slot="${slot==null?'':slot}">${banned?'👎 Recette exclue — la réintégrer':(slot!=null?'👎 Je n\'aime pas — ne plus la proposer et la remplacer':'👎 Je n\'aime pas — ne plus la proposer')}</button>`;
  if(r.mine)h+=`<button class="banbtn" data-fy="delrecipe" data-arg="${r.id}" style="background:var(--field);color:var(--ink)">Supprimer cette recette</button>`;
  if(slot!=null){
    h=h.replace('<h3 style="margin-top:18px;margin-bottom:0">Équipement</h3>',`<div class="slotacts"><button class="go" data-pick="${slot}">Changer de plat</button><button class="ghost" data-remove="${slot}">Retirer</button></div><h3 style="margin-top:18px;margin-bottom:0">Équipement</h3>`);
  }else{
    const N=slotsCount(),plan=hasPlan()?st.plan:null;
    let chips='';for(let i=0;i<N;i++){const cur=plan&&plan[i].r?RBYID[plan[i].r]:null;
      chips+=`<button class="chip ${cur?'':'free'}" data-addto="${i}:${id}" title="${cur?'Remplace '+cur.n:'Case libre'}">${slotLabel(i)}${cur?' '+cur.e:''}</button>`;}
    h=h.replace('<h3 style="margin-top:18px;margin-bottom:0">Équipement</h3>',`<h3 style="margin-top:18px;margin-bottom:6px">Ajouter à ma semaine</h3><div class="chips addto">${chips}</div><h3 style="margin-top:18px;margin-bottom:0">Équipement</h3>`);
  }
  $('#dlgBody').innerHTML=h;
  if(!dlg.open)dlg.showModal();
  $('#dlgBody').scrollTop=0;dlg.scrollTop=0;
}

const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
let dq='';
function openDislikes(){
  dq='';
  $('#dlgBody').innerHTML=`<div class="hd plain" style="margin:0"><div><h2>Ce qu'on n'aime pas</h2><div style="color:var(--soft)">Les recettes qui contiennent ces aliments ne seront plus proposées.</div></div><button class="close" data-close aria-label="Fermer">✕</button></div>
    <div class="dsearch"><input class="search" id="dsearch" type="search" placeholder="Chercher un aliment (ex. champignon, poisson…)" aria-label="Chercher un aliment" autocomplete="off"></div>
    <div id="dlist"></div>`;
  renderDList();
  if(!dlg.open)dlg.showModal();
  dlg.scrollTop=0;
}
function renderDList(){
  const s=st.settings,q=norm(dq.trim());let h='',found=0;
  if(s.dislikes.length&&!q){
    h+=`<div class="dgroup">Déjà exclus</div><div class="chips">`+s.dislikes.map(k=>`<button class="chip no" data-dis="${k}" aria-pressed="true">👎 ${ING_DEFAULT[k].n}</button>`).join('')+'</div>';
  }
  AISLES.forEach(a=>{
    const ks=Object.keys(ING_DEFAULT).filter(k=>ING_DEFAULT[k].a===a&&(!q||norm(ING_DEFAULT[k].n).includes(q)||norm(a).includes(q))).sort((x,y)=>ING_DEFAULT[x].n.localeCompare(ING_DEFAULT[y].n));
    if(!ks.length)return;found+=ks.length;
    h+=`<div class="dgroup">${a}</div><div class="chips">`+ks.map(k=>{const on=s.dislikes.includes(k);
      return `<button class="chip ${on?'no':''}" data-dis="${k}" aria-pressed="${on}">${on?'👎 ':''}${ING_DEFAULT[k].n}</button>`}).join('')+'</div>';
  });
  if(!found)h+=`<p class="hint" style="margin-top:14px">Aucun aliment ne correspond à « ${dq.replace(/</g,'&lt;')} ».</p>`;
  const nb=eligible().length;
  h+=`<p class="hint ${nb<4?'bad':''}" style="margin-top:16px">${nb} recette${nb>1?'s':''} encore possible${nb>1?'s':''} sur ${RECIPES.length}.</p><button class="go" data-close style="margin-top:8px">Valider</button>`;
  $('#dlist').innerHTML=h;
}

let pq='',pf='all',pslot=0;
function openPicker(i){
  pslot=i;pq='';pf='all';
  $('#dlgBody').innerHTML=`<div class="hd plain" style="margin:0"><div><h2>Choisir un plat</h2><div style="color:var(--soft)">${cap(dayLabel(Math.floor(i/st.settings.meals.length)))} · ${MEAL_LBL[st.settings.meals[i%st.settings.meals.length]]}</div></div><button class="close" data-close aria-label="Fermer">✕</button></div>
    <div class="dsearch"><input class="search" id="psearch" type="search" placeholder="Chercher un plat ou un ingrédient…" aria-label="Chercher un plat" autocomplete="off">
    <div class="chips pfil">${[['all','Tout'],['g','Végé'],['p','Poisson'],['v','Viande'],['fast','Rapide']].map(([k,l])=>`<button class="chip" data-pf="${k}" aria-pressed="${k==='all'}">${l}</button>`).join('')}</div></div>
    <div id="plist"></div>`;
  renderPList();
  if(!dlg.open)dlg.showModal();
  dlg.scrollTop=0;
}
function renderPList(){
  const q=norm(pq.trim()),ids=st.plan?st.plan.map((x,j)=>j===pslot?null:x.r):[],n=needsOf(ids);
  const counts={};ids.forEach(id=>{if(id)counts[id]=(counts[id]||0)+1});
  let list=eligible().filter(r=>(!q||norm(r.n).includes(q)||Object.keys(r.i).some(k=>norm(ING_DEFAULT[k].n).includes(q)))
    &&(pf==='all'||(pf==='fast'?r.t<=20:r.m===pf)));
  list=list.map(r=>({r,d:marginal(n,r)})).sort((a,b)=>a.d-b.d);
  document.querySelectorAll('[data-pf]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.pf===pf));
  $('#plist').innerHTML=list.length?'<div class="pick">'+list.map(o=>`<button data-choose="${pslot}:${o.r.id}"><span class="pt k-${o.r.m}" aria-hidden="true">${o.r.e}</span><span>${o.r.n}${counts[o.r.id]?` <span class="tag">déjà ×${counts[o.r.id]}</span>`:''}<br><small style="color:var(--soft)">${o.r.t} min · ${eur(portionCost(o.r))}/pers.</small></span><span class="d ${o.d<=0.005?'cheap':''}">${o.d<=0.005?'Inclus':'+'+eur(o.d)}</span></button>`).join('')+'</div><p class="hint">Le montant indique ce que le plat ajoute à tes courses. « Inclus » : tu as déjà tout grâce aux autres plats.</p>'
    :'<p class="hint" style="margin-top:14px">Aucun plat ne correspond.</p>';
}

function openStoreAsk(){
  const s=st.settings;s.storeAsked=true;save();
  const row=(k,n,t,av)=>`<button class="srow ${s.store===k?'sel':''}" data-askstore="${k}"><span class="av">${av}</span><span class="sn">${n}<small>${t}</small></span><span></span></button>`;
  $('#dlgBody').innerHTML=`<div class="hd plain" style="margin:0"><div><h2>Où fais-tu tes courses ?</h2><div style="color:var(--soft)">Les prix et ton budget s'adaptent à ton magasin. Tu pourras le changer quand tu veux.</div></div><button class="close" data-close aria-label="Fermer">✕</button></div>
    <div class="srows" style="margin-top:16px">${SKEYS.map(k=>row(k,STORES[k].n,STORES[k].t,STORES[k].n.replace('E.','').charAt(0))).join('')}${row('moy','Je ne sais pas / plusieurs','On utilise les prix moyens','?')}</div>`;
  if(!dlg.open)dlg.showModal();
  dlg.scrollTop=0;
}

/* ---------- Événements ---------- */
document.addEventListener('click',e=>{
  const t=e.target.closest('button,[data-check]');if(!t)return;
  const d=t.dataset;
  if(d.tab){
    document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',b===t));
    ['semaine','courses','recettes','ingredients'].forEach(v=>$('#v-'+v).classList.toggle('hidden',v!==d.tab));
    $('.hero-top').classList.toggle('hidden',d.tab!=='semaine');
    if(d.tab==='ingredients')renderIngredients();
    window.scrollTo(0,0);return;
  }
  if(d.step){const[k,v]=d.step.split(':');const s=st.settings;s[k]=Math.min(k==='pers'?8:7,Math.max(1,s[k]+ +v));save();renderAll();return}
  if(d.meal){const s=st.settings,m=d.meal;if(s.meals.includes(m)){if(s.meals.length>1)s.meals=s.meals.filter(x=>x!==m);}else s.meals=['midi','soir'].filter(x=>x===m||s.meals.includes(x));save();renderAll();return}
  if(d.diet){st.settings.diet=d.diet;save();renderAll();return}
  if(d.date){const s=st.settings,k=d.date;
    if(!calPending||k<s.start){s.start=s.end=k;calPending=true;}
    else{const mx=iso(addD(pd(s.start),MAXD-1));s.end=k>mx?mx:k;calPending=false;}
    syncDays();save();renderAll();return}
  if(d.calnav){calMonth=new Date(calMonth.getFullYear(),calMonth.getMonth()+ +d.calnav,1);renderCal();return}
  if(d.quick){const t0=new Date(),wd=(t0.getDay()+6)%7;let a,b;
    if(d.quick==='7'){a=t0;b=addD(t0,6);}
    else if(d.quick==='week'){a=t0;b=addD(t0,6-wd);}
    else if(d.quick==='next'){a=addD(t0,7-wd);b=addD(a,6);}
    else if(d.quick==='last'){a=addD(t0,-wd-7);b=addD(a,6);}
    else{a=wd>=5?t0:addD(t0,5-wd);b=addD(t0,6-wd);}
    setRange(iso(a),iso(b));save();renderAll();return}
  if(d.themeSet){st.settings.theme=d.themeSet;save();applyTheme();return}
  if(t.id==='themeBtn'){const dark=document.documentElement.getAttribute('data-theme')==='dark'||(!document.documentElement.getAttribute('data-theme')&&matchMedia('(prefers-color-scheme: dark)').matches);st.settings.theme=dark?'light':'dark';save();applyTheme();return}
  if(t.id==='fab'){document.querySelector('[data-tab="semaine"]').click();
    if(!eligible().length){$('#setBox').open=true;$('#setBox').scrollIntoView({behavior:'smooth'});return}
    if(hasPlan()&&st.plan.some(x=>!x.r)&&filledIds().length){fillEmpty();fresh=true;save();renderAll();toast('Cases vides complétées');return}
    generate();fresh=true;save();renderAll();$('#setBox').open=false;$('#gauge').scrollIntoView({behavior:'smooth',block:'start'});return}
  if(d.goto!==undefined){const el=document.getElementById('day-'+d.goto);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});else{$('#setBox').open=true;}return}
  if(d.manual!==undefined){emptyPlan();save();$('#setBox').open=false;renderAll();$('#week').scrollIntoView({behavior:'smooth',block:'start'});return}
  if(d.auto!==undefined){generate();fresh=true;save();$('#setBox').open=false;renderAll();return}
  if(d.fill!==undefined){fillEmpty();fresh=true;save();renderAll();toast('Cases vides complétées');return}
  if(d.clear!==undefined){if(t.dataset.sure){emptyPlan();save();renderAll();toast('Semaine vidée');}else{t.dataset.sure='1';t.textContent='Sûr ? Toucher encore';setTimeout(()=>{if(t.isConnected){delete t.dataset.sure;t.textContent='Vider la semaine';}},2500);}return}
  if(d.pick!==undefined){openPicker(+d.pick);return}
  if(d.pf){pf=d.pf;renderPList();return}
  if(d.choose){const[i,id]=d.choose.split(':');st.plan[+i]={r:id,l:true};save();dlg.close();renderAll();toast(RBYID[id].n+' ajouté');return}
  if(d.remove!==undefined){st.plan[+d.remove]={r:null,l:false};save();dlg.close();renderAll();return}
  if(d.addto){const[i,id]=d.addto.split(':');if(!hasPlan())emptyPlan();st.plan[+i]={r:id,l:true};save();renderAll();openRecipe(id,null);toast('Ajouté : '+slotLabel(+i));return}
  if(d.store){st.settings.store=d.store;save();renderAll();toast('Prix ajustés : '+STORES[d.store].n);return}
  if(d.storepick!==undefined){showStorePick=!showStorePick;renderTicket();return}
  if(d.mystore){const s=st.settings;s.stores=s.stores.includes(d.mystore)?s.stores.filter(x=>x!==d.mystore):s.stores.concat(d.mystore);if(!s.stores.length)s.stores=[d.mystore];save();renderTicket();return}
  if(d.goequip!==undefined){document.querySelector('[data-tab="semaine"]').click();$('#setBox').open=true;setTimeout(()=>$('#equipChips').scrollIntoView({behavior:'smooth',block:'center'}),50);return}
  if(d.askstore){st.settings.store=d.askstore;st.settings.storeAsked=true;save();dlg.close();renderAll();toast(d.askstore==='moy'?'Prix moyens utilisés':'Prix ajustés : '+STORES[d.askstore].n);return}
  if(d.askstoreopen!==undefined){openStoreAsk();return}
  if(t.id==='openDislikes'){openDislikes();return}
  if(d.dis){const s=st.settings;s.dislikes=s.dislikes.includes(d.dis)?s.dislikes.filter(x=>x!==d.dis):s.dislikes.concat(d.dis);save();renderAll();renderDList();return}
  if(d.undis){st.settings.dislikes=st.settings.dislikes.filter(x=>x!==d.undis);save();renderAll();return}
  if(d.unban){st.settings.banned=st.settings.banned.filter(x=>x!==d.unban);save();renderAll();return}
  if(d.ban){const s=st.settings,id=d.ban;
    if(s.banned.includes(id)){s.banned=s.banned.filter(x=>x!==id);save();renderAll();openRecipe(id,d.slot===''?null:+d.slot);return}
    s.banned.push(id);
    if(d.slot!==''&&st.plan){reroll(+d.slot);}
    save();renderAll();dlg.close();return}
  if(d.eq){const s=st.settings;s.equip=s.equip.includes(d.eq)?s.equip.filter(x=>x!==d.eq):s.equip.concat(d.eq);save();renderAll();return}
  if(d.tmax!==undefined){st.settings.tmax=+d.tmax;save();renderAll();return}
  if(t.id==='generate'||t.id==='regen'){generate();fresh=true;save();renderAll();$('#setBox').open=false;$('#gauge').scrollIntoView({behavior:'smooth',block:'start'});return}
  if(d.open!==undefined){openRecipe(st.plan[+d.open].r,+d.open);return}
  if(d.lock!==undefined){const x=st.plan[+d.lock];x.l=!x.l;save();renderWeek();return}
  if(d.reroll!==undefined){reroll(+d.reroll);save();renderAll();return}
  if(d.replace){const[i,id]=d.replace.split(':');st.plan[+i]={r:id,l:true};save();renderAll();openRecipe(id,+i);return}
  if(d.recipe){openRecipe(d.recipe,null);return}
  if(d.close!==undefined){dlg.close();return}
  if(t.id==='uncheck'){st.checked={};save();renderTicket();return}
  if(t.id==='copyList'){
    const n=needsOf(st.plan.map(x=>x.r));let txt='Liste de courses\n';
    AISLES.forEach(a=>{const ks=Object.keys(n).filter(k=>ING(k).a===a);if(!ks.length)return;txt+='\n'+a+'\n';ks.forEach(k=>{const g=ING(k);txt+='- '+Math.ceil(n[k]/g.q-1e-9)+' × '+g.n+' ('+packLbl(g)+')\n';});});
    if(navigator.share){navigator.share({title:'Liste de courses',text:txt}).catch(()=>{});return}
    const done=()=>{t.textContent='Liste copiée';setTimeout(()=>t.textContent='Copier la liste',1600)};
    try{navigator.clipboard.writeText(txt).then(done,()=>{t.textContent='Copie impossible'});}catch(err){t.textContent='Copie impossible'}
    return;
  }
  if(t.id==='resetPrices'){st.over={};save();renderIngredients();renderAll();return}
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.dataset.check){st.checked[t.dataset.check]=t.checked;save();renderTicket();return}
  if(t.id==='placard'){st.settings.placard=t.checked;save();renderAll();return}
  if(t.dataset.iq||t.dataset.ip){
    const k=t.dataset.iq||t.dataset.ip,v=parseFloat(t.value);
    if(!(v>0)&&!(t.dataset.ip&&v===0)){renderIngredients();return}
    st.over[k]=Object.assign({},st.over[k]||{},t.dataset.iq?{q:v}:{p:v});
    save();renderIngredients();renderAll();
  }
});
$('#budget').addEventListener('input',e=>{st.settings.budget=+e.target.value;$('#budgetOut').textContent=e.target.value+' €';save();renderWeek();renderTicket();});
$('#isearch').addEventListener('input',renderIngredients);
document.addEventListener('input',e=>{if(e.target.id==='dsearch'){dq=e.target.value;renderDList();}if(e.target.id==='psearch'){pq=e.target.value;renderPList();}});
$('#rsearch').addEventListener('input',renderRecipes);
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});

applyTheme();
renderAll();
$('#setBox').open=false;
if(!st.settings.storeAsked)setTimeout(openStoreAsk,350);
document.body.insertAdjacentHTML('beforeend','<div class="toast" id="toast" role="status"></div>');

/* ---------- État partagé (utilisé par foyer.js) ----------
   Tout est partagé, sauf l'apparence et la question du magasin, propres à chaque téléphone. */
function fixState(){
  const s=st.settings;
  if(!Array.isArray(s.equip))s.equip=['plaques','four','mixeur','microondes'];
  if(!Array.isArray(s.dislikes))s.dislikes=[];
  s.dislikes=s.dislikes.filter(k=>ING_DEFAULT[k]);
  if(!Array.isArray(s.banned))s.banned=[];
  if(!Array.isArray(s.meals)||!s.meals.length)s.meals=['midi','soir'];
  if(!s.theme)s.theme='auto';
  if(!s.start||!s.end){s.start=TODAY;s.end=iso(addD(new Date(),6));}
  syncDays();
  if(!s.store||!STORES[s.store])s.store='moy';
  if(!Array.isArray(s.stores))s.stores=SKEYS.slice();
  for(const k in st.over)if(!ING_DEFAULT[k])delete st.over[k];
  if(!st.checked||typeof st.checked!=='object')st.checked={};
  // Un plat dont la recette a été supprimée libère sa case.
  if(Array.isArray(st.plan))st.plan.forEach(x=>{if(x&&x.r&&!RBYID[x.r]){x.r=null;x.l=false;}});
}
function sharedState(){const c=JSON.parse(JSON.stringify(st));delete c.settings.theme;delete c.settings.storeAsked;return c}
function applyShared(data){
  if(!data||!data.settings)return;
  const keep={theme:st.settings.theme,storeAsked:st.settings.storeAsked};
  st=Object.assign({plan:null,planMeta:null,byDate:{},over:{},checked:{}},data);
  st.settings=Object.assign({},data.settings,keep);
  fixState();
  calMonth=pd(st.settings.start);calMonth.setDate(1);calPending=false;
  window.popoteApplying=true;
  try{renderAll();if($('#v-ingredients')&&!$('#v-ingredients').classList.contains('hidden'))renderIngredients();}
  finally{window.popoteApplying=false;}
  try{localStorage.setItem(KEY,JSON.stringify(st));}catch(e){}
}

/* ---------- Application installée ---------- */
// Ouverte sans réseau grâce au service worker.
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
// Une app installée reste ouverte des jours : au changement de date, on repart sur « aujourd'hui ».
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&iso(new Date())!==TODAY)location.reload();});
