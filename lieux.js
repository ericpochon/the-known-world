// Données de la carte. Ce fichier est la seule chose à modifier pour ajouter,
// déplacer ou illustrer un lieu : ni app.js ni index.html n'ont à bouger.
//
// CARTE
//   src     chemin de l'image de fond
//   largeur / hauteur   sa taille réelle en pixels (à corriger si Eric la redessine)
//
// UN LIEU = UN CARTOUCHE IMPRIMÉ SUR LA CARTE
//   Chaque entrée décrit le rectangle du cartouche. C'est lui qui se survole et
//   se clique : il n'y a pas de pastille par-dessus le dessin.
//
//   id      identifiant court, en minuscules, sans accent ni espace.
//           Il sert d'ancre dans l'adresse : …/index.html#kelvin
//           Une fois publié, ne plus le changer : les liens partagés casseraient.
//   nom     le nom affiché, écrit comme sur la carte.
//   x, y    coin HAUT-GAUCHE du cartouche, en pixels sur l'image de fond,
//           origine en haut à gauche.
//   l, h    largeur et hauteur du cartouche, en pixels.
//   images  les dessins du lieu, dans l'ordre d'affichage. Le chemin part de
//           images/ ; les espaces et majuscules du nom de fichier sont permis.
//             images: []                                → « Pas encore d'image »
//             images: ["Kelvin 1.png", "Kelvin 2.png"]  → galerie de deux dessins
//             images: [{ src: "Kelvin 1.png", legende: "La halle" }]  → avec légende
//   texte   facultatif : un paragraphe affiché sous les images.
//
// RELEVER x, y, l ET h SANS SE FATIGUER
//   Ouvrir index.html?coords puis tracer un rectangle à la souris par-dessus le
//   cartouche : la ligne « x: …, y: …, l: …, h: … » s'affiche en haut à gauche
//   et part dans le presse-papiers. Il n'y a plus qu'à la coller ici.
//
// ORDRE
//   Les lieux sont rangés du nord au sud. C'est seulement pour la lecture :
//   l'ordre n'a aucun effet sur l'affichage.

const CARTE = { src: "images/map.png", largeur: 5000, hauteur: 3601 };

const LIEUX = [
  { id: "republic-of-darokin", nom: "Republic of Darokin", x: 1229, y: 287, l: 754, h: 103, images: [] },
  { id: "selenica", nom: "Selenica", x: 2748, y: 299, l: 280, h: 83, images: ["Selenica 1.png"] },
  { id: "emirates-of-ylaruam", nom: "Emirates of Ylaruam", x: 4261, y: 311, l: 435, h: 200, images: ["Emirates 1.png", "Emirates 2.png", "Emirates 3.png", "Emirates 4.png"] },
  { id: "reedle", nom: "Reedle", x: 3005, y: 888, l: 240, h: 82, images: ["Reedle.png"] },
  { id: "altan-tepes", nom: "Altan Tepes", x: 3347, y: 867, l: 340, h: 238, images: ["Altan Tepes 1.png", "Altan Tepes 2.png", "Altan Tepes 3.png"] },
  { id: "grand-duchy-of-karameikos", nom: "Grand Duchy of Karameikos", x: 1373, y: 1304, l: 1076, h: 103, images: [] },
  { id: "drazhevo", nom: "Drazhevo", x: 3583, y: 1455, l: 309, h: 82, images: ["Drazhevo.png"] },
  { id: "the-hill", nom: "The Hill", x: 3290, y: 1484, l: 240, h: 82, images: ["The Hill 1.png", "The Hill 2.png"] },
  { id: "guidos-fort", nom: "Guido’s Fort", x: 3075, y: 1583, l: 393, h: 83, images: ["Guidos fort 1.png", "Guidos fort 4.png"] },
  { id: "empire-of-thyatis", nom: "Empire of Thyatis", x: 4037, y: 1580, l: 685, h: 103, images: [] },
  { id: "threshold", nom: "Threshold", x: 2208, y: 1619, l: 326, h: 83, images: ["Threshold 1.png", "Threshold 2.png"] },
  { id: "penhaligon", nom: "Penhaligon", x: 2660, y: 1651, l: 339, h: 83, images: ["penhaligon 1.png", "penhaligon 2.png"] },
  { id: "korizhan", nom: "Korizhan", x: 3629, y: 1768, l: 290, h: 82, images: ["Korizhan 1.png", "Korizhan 2.png"] },
  { id: "highforge", nom: "Highforge", x: 2292, y: 1951, l: 329, h: 84, images: [] },
  { id: "haven", nom: "Haven", x: 3492, y: 2007, l: 262, h: 83, images: ["Haven 1.png", "Haven 2.png", "Haven 3.png"] },
  { id: "ilyakana", nom: "Ilyakana", x: 3012, y: 2051, l: 277, h: 82, images: ["Ilyakana 1.png", "Ilyakana 2.png"] },
  { id: "kelvin", nom: "Kelvin", x: 2488, y: 2114, l: 204, h: 84, images: ["Kelvin 1.png", "Kelvin 2.png", "Kelvin 3.png"] },
  { id: "veliskyn", nom: "Veliskyn", x: 3351, y: 2118, l: 290, h: 82, images: ["Veliskyn.png"] },
  { id: "rifllian", nom: "Rifllian", x: 2183, y: 2131, l: 235, h: 84, images: [] },
  { id: "sukiskyn", nom: "Sukiskyn", x: 2844, y: 2151, l: 298, h: 83, images: [] },
  { id: "koriszegy", nom: "Koriszegy", x: 1343, y: 2235, l: 330, h: 83, images: [] },
  { id: "segenyev", nom: "Segenyev", x: 3193, y: 2246, l: 309, h: 82, images: ["Segenyev 1.png", "Segenyev 2.png"] },
  { id: "luln", nom: "Luln", x: 1015, y: 2267, l: 156, h: 84, images: [] },
  { id: "radlebb", nom: "Radlebb", x: 1227, y: 2463, l: 263, h: 84, images: [] },
  { id: "fort-doom", nom: "Fort Doom", x: 795, y: 2467, l: 331, h: 83, images: [] },
  { id: "volaga-river", nom: "Volaga River", x: 2355, y: 2511, l: 263, h: 161, images: ["Volaga River 1.png"] },
  { id: "rugalov", nom: "Rugalov", x: 3675, y: 2719, l: 281, h: 83, images: [] },
  { id: "krakatos", nom: "Krakatos", x: 2043, y: 2783, l: 288, h: 83, images: [] },
  { id: "specularum", nom: "Specularum", x: 1870, y: 2907, l: 436, h: 83, images: [] },
  { id: "sea-of-dread", nom: "Sea of Dread", x: 1744, y: 3219, l: 414, h: 83, images: [] },
];
