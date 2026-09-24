// Prototype de la carte interactive. Les données sont dans lieux.js.
(function () {
  "use strict";

  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const body = document.body;
  // En mode relevé (?coords) les cartouches restent visibles mais inertes,
  // sinon ils captureraient les clics destinés à la mesure.
  const releve = new URLSearchParams(location.search).has("coords");

  // --- Carte -------------------------------------------------------------
  // Les lieux sont en pixels (x vers la droite, y vers le bas) ; Leaflet attend (lat, lng).
  const versLatLng = (x, y) => L.latLng(-y, x);
  const bornes = L.latLngBounds(versLatLng(0, CARTE.hauteur), versLatLng(CARTE.largeur, 0));

  const map = L.map("carte", {
    crs: L.CRS.Simple,
    zoomSnap: 0,
    zoomDelta: 0.5,
    wheelPxPerZoomLevel: 120,
    maxBounds: bornes,
    maxBoundsViscosity: 1,
    attributionControl: false,
    zoomControl: false,
    minZoom: -10,
  });
  L.control.zoom({ position: "bottomright", zoomInTitle: "Zoomer", zoomOutTitle: "Dézoomer" }).addTo(map);
  L.imageOverlay(CARTE.src, bornes).addTo(map);

  // Zoom mini : carte entière visible. Zoom maxi : 1 px de carte ≈ 1 px physique (petite marge).
  function ajusterZooms() {
    map.options.minZoom = -10;
    map.options.maxZoom = 10;
    const min = map.getBoundsZoom(bornes, false);
    const max = Math.max(Math.log2(1.5 / (window.devicePixelRatio || 1)), min + 1);
    map.options.minZoom = min;
    map.options.maxZoom = max;
    // Sans animation : un zoom animé ici interromprait le recentrage sur un lieu.
    if (map._loaded) {
      map.fire("zoomlevelschange");
      const z = map.getZoom();
      if (z < min || z > max) map.setZoom(Math.min(max, Math.max(min, z)), { animate: false });
    }
  }
  ajusterZooms();
  map.setView(bornes.getCenter(), map.getMinZoom());
  map.on("resize", ajusterZooms);

  // --- Cartouches --------------------------------------------------------
  // Le cartouche imprimé sur la carte est lui-même le bouton : pas de pastille
  // par-dessus le dessin. C'est un rectangle vectoriel, donc reprojeté à chaque
  // zoom et toujours calé sur l'image, contrairement à une icône en pixels.
  //
  // Un marqueur transparent de 44 px le double : il reçoit le focus clavier, que
  // les tracés SVG de Leaflet ne prennent pas, et sert de zone tactile quand le
  // rectangle devient trop petit pour le doigt. Voir ajusterCibles() plus bas.
  // Un focus venu d'un clic ne doit pas allumer le cartouche : sinon, fermer le
  // panneau à la croix rend le focus à la cible et le laisse teinté alors que
  // le visiteur n'y est plus. Seule une navigation au clavier le justifie, ce
  // que :focus-visible sait dire. (Repli permissif si le sélecteur manque :
  // mieux vaut un cartouche allumé à tort qu'un focus invisible.)
  const focusAuClavier = (el) => {
    try { return el.matches(":focus-visible"); } catch (e) { return true; }
  };

  const cartouches = {};
  LIEUX.forEach((lieu) => {
    const illustre = lieu.images.length > 0;
    const coins = L.latLngBounds(versLatLng(lieu.x, lieu.y + lieu.h),
                                 versLatLng(lieu.x + lieu.l, lieu.y));
    const rect = L.rectangle(coins, { className: "cartouche", interactive: !releve }).addTo(map);
    if (releve) { cartouches[lieu.id] = { rect, cible: null }; return; }

    const cible = L.marker(versLatLng(lieu.x + lieu.l / 2, lieu.y + lieu.h / 2), {
      icon: L.divIcon({
        className: "cible", iconSize: [44, 44], iconAnchor: [22, 22],
        html: '<span class="zone"></span>',
      }),
      keyboard: true,
    }).addTo(map);

    const el = cible.getElement();
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", illustre ? lieu.nom : lieu.nom + ", pas encore d'image");

    const survoler = (actif) => rect.getElement().classList.toggle("survole", actif);
    rect.on("click", () => ouvrir(lieu.id));
    rect.on("mouseover", () => survoler(true));
    rect.on("mouseout", () => survoler(false));
    cible.on("click", () => ouvrir(lieu.id));
    el.addEventListener("focus", () => survoler(focusAuClavier(el)));
    el.addEventListener("blur", () => survoler(false));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ouvrir(lieu.id); }
    });

    cartouches[lieu.id] = { rect, cible: el };
  });

  // Taille de la zone tactile de chaque cartouche. Une zone fixe de 44 px
  // déborderait sur sa voisine quand la carte est dézoomée : sur téléphone,
  // toucher Haven ouvrait Veliskyn. Elle est donc plafonnée par la distance au
  // cartouche le plus proche, ce qui la rend confortable pour les lieux isolés
  // et la réduit là où ça se bouscule — à charge pour le visiteur de zoomer.
  // En CRS.Simple, un pixel de carte vaut 2^zoom pixels d'écran.
  const voisinLePlusProche = LIEUX.map((l, i) => {
    const cx = l.x + l.l / 2, cy = l.y + l.h / 2;
    let mini = Infinity;
    LIEUX.forEach((autre, j) => {
      if (i === j) return;
      mini = Math.min(mini, Math.hypot(cx - (autre.x + autre.l / 2), cy - (autre.y + autre.h / 2)));
    });
    return mini;
  });
  function ajusterCibles() {
    const echelle = Math.pow(2, map.getZoom());
    LIEUX.forEach((lieu, i) => {
      const el = cartouches[lieu.id].cible;
      if (!el) return;
      const taille = Math.min(44, voisinLePlusProche[i] * echelle * 0.85);
      el.style.setProperty("--taille", taille.toFixed(1) + "px");
    });
  }
  if (!releve) {
    ajusterCibles();
    map.on("zoomend", ajusterCibles);
  }

  // --- Panneau -----------------------------------------------------------
  const panneau = document.getElementById("panneau");
  const titre = document.getElementById("panneau-titre");
  const galerie = panneau.querySelector(".galerie");
  const image = document.getElementById("galerie-image");
  const btnPrec = panneau.querySelector(".prec");
  const btnSuiv = panneau.querySelector(".suiv");
  const btnFermer = panneau.querySelector(".fermer");
  const compteur = panneau.querySelector(".compteur");
  const vide = panneau.querySelector(".vide");
  const btnAgrandir = panneau.querySelector(".agrandir");
  const legende = panneau.querySelector(".legende");
  const texte = panneau.querySelector(".texte");

  let lieuActif = null;
  let index = 0;
  let minuteur = null;

  function afficher(id) {
    const lieu = LIEUX.find((l) => l.id === id);
    if (!lieu) return fermer();
    if (lieu === lieuActif) return;

    if (lieuActif) cartouches[lieuActif.id].rect.getElement().classList.remove("actif");
    lieuActif = lieu;
    cartouches[id].rect.getElement().classList.add("actif");

    titre.textContent = lieu.nom;
    texte.textContent = lieu.texte || "";
    texte.hidden = !lieu.texte;

    // Un lieu sans dessin ouvre quand même son panneau : il annonce qu'il attend
    // ses images. Toute la mécanique de galerie est alors mise de côté.
    const n = lieu.images.length;
    vide.hidden = n > 0;
    image.hidden = btnAgrandir.hidden = n === 0;
    btnPrec.hidden = btnSuiv.hidden = compteur.hidden = n < 2;
    if (n) {
      montrerImage(0, false);
    } else {
      image.removeAttribute("src");
      legende.textContent = "";
      legende.hidden = true;
    }

    const dejaOuvert = body.classList.contains("ouvert");
    body.classList.add("ouvert");
    panneau.inert = false;
    panneau.focus({ preventScroll: true });

    // La carte est réduite à la zone visible une fois le panneau arrivé, puis centrée sur le lieu.
    clearTimeout(minuteur);
    if (dejaOuvert) centrer(lieu);
    else minuteur = setTimeout(() => { reduireCarte(true); centrer(lieu); }, reduit ? 0 : 320);
  }

  function fermer() {
    if (!lieuActif) return;
    clearTimeout(minuteur);
    fermerVisionneuse();
    const { rect, cible } = cartouches[lieuActif.id];
    rect.getElement().classList.remove("actif");
    const focusDansPanneau = panneau.contains(document.activeElement);
    lieuActif = null;
    reduireCarte(false);
    body.classList.remove("ouvert");
    panneau.inert = true;
    // Le focus revient sur la cible : c'est le seul élément focusable du couple.
    if (focusDansPanneau && cible) cible.focus({ preventScroll: true });
  }

  // Les bornes sont suspendues pendant le recentrage : leur recadrage animé couperait le flyTo.
  function reduireCarte(reduite) {
    if (reduite) map.setMaxBounds(null);
    body.classList.toggle("carte-reduite", reduite);
    map.invalidateSize({ pan: false });
    if (!reduite) map.setMaxBounds(bornes);
  }

  function centrer(lieu) {
    const zoom = Math.min(map.getMaxZoom(), Math.max(map.getZoom(), map.getMinZoom() + 1));
    const cible = versLatLng(lieu.x + lieu.l / 2, lieu.y + lieu.h / 2);
    map.once("moveend", () => map.setMaxBounds(bornes));
    if (reduit) map.setView(cible, zoom, { animate: false });
    else map.flyTo(cible, zoom, { duration: 0.6 });
  }

  // --- Galerie -----------------------------------------------------------
  const normaliser = (img) => (typeof img === "string" ? { src: img } : img);
  // Les noms de fichiers d'Eric contiennent des espaces : on les encode.
  const chemin = (img) => "images/" + encodeURIComponent(normaliser(img).src);

  function montrerImage(i, fondu = true) {
    const images = lieuActif.images;
    index = (i + images.length) % images.length;
    const lieu = lieuActif;
    const courante = normaliser(images[index]);
    if (!visionneuse.hidden) afficherDansVisionneuse();

    const changer = () => {
      if (lieu !== lieuActif) return;
      image.src = chemin(courante);
      image.alt = courante.legende || lieu.nom;
      legende.textContent = courante.legende || "";
      legende.hidden = !courante.legende;
      compteur.textContent = `${index + 1} / ${images.length}`;
    };
    if (fondu && !reduit) {
      image.classList.add("cache");
      setTimeout(changer, 150);
    } else {
      image.classList.remove("cache");
      changer();
    }

    // Préchargement des images voisines
    if (images.length > 1) {
      new Image().src = chemin(images[(index + 1) % images.length]);
      new Image().src = chemin(images[(index - 1 + images.length) % images.length]);
    }
  }
  image.addEventListener("load", () => image.classList.remove("cache"));

  btnPrec.addEventListener("click", () => montrerImage(index - 1));
  btnSuiv.addEventListener("click", () => montrerImage(index + 1));
  btnFermer.addEventListener("click", demanderFermeture);

  document.addEventListener("keydown", (e) => {
    if (!lieuActif) return;
    if (e.key === "Escape") {
      if (!visionneuse.hidden) fermerVisionneuse();
      else demanderFermeture();
    }
    else if (lieuActif.images.length > 1 && e.key === "ArrowRight") montrerImage(index + 1);
    else if (lieuActif.images.length > 1 && e.key === "ArrowLeft") montrerImage(index - 1);
  });

  // Swipe horizontal sur l'image, swipe vers le bas sur l'en-tête pour fermer
  function surSwipe(zone, action) {
    let depart = null;
    zone.addEventListener("touchstart", (e) => {
      depart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    zone.addEventListener("touchend", (e) => {
      if (!depart) return;
      const t = e.changedTouches[0];
      action(t.clientX - depart.x, t.clientY - depart.y);
      depart = null;
    });
  }
  surSwipe(galerie, (dx, dy) => {
    if (lieuActif && lieuActif.images.length > 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      montrerImage(index + (dx < 0 ? 1 : -1));
    }
  });
  surSwipe(panneau.querySelector(".entete"), (dx, dy) => {
    if (dy > 60 && dy > Math.abs(dx)) demanderFermeture();
  });

  // --- Visionneuse : image en grand, zoomable (Leaflet aussi) ------------
  const visionneuse = document.getElementById("visionneuse");
  const vPrec = visionneuse.querySelector(".prec");
  const vSuiv = visionneuse.querySelector(".suiv");
  const vCompteur = visionneuse.querySelector(".v-compteur");
  const vFermer = visionneuse.querySelector(".v-fermer");
  let vMap = null;
  let vCalque = null;

  function ouvrirVisionneuse() {
    if (!lieuActif || !lieuActif.images.length) return;
    visionneuse.hidden = false;
    if (!vMap) {
      vMap = L.map("visionneuse-carte", {
        crs: L.CRS.Simple,
        zoomSnap: 0,
        zoomDelta: 0.5,
        wheelPxPerZoomLevel: 120,
        maxBoundsViscosity: 1,
        attributionControl: false,
        zoomControl: false,
        keyboard: false,
      });
      L.control.zoom({ position: "bottomright", zoomInTitle: "Zoomer", zoomOutTitle: "Dézoomer" }).addTo(vMap);
    } else {
      vMap.invalidateSize();
    }
    afficherDansVisionneuse();
    vFermer.focus({ preventScroll: true });
  }

  function afficherDansVisionneuse() {
    const images = lieuActif.images;
    const src = chemin(images[index]);
    vPrec.hidden = vSuiv.hidden = vCompteur.hidden = images.length < 2;
    vCompteur.textContent = `${index + 1} / ${images.length}`;

    // La taille réelle de l'image est nécessaire pour la caler dans la visionneuse.
    const source = new Image();
    source.onload = () => {
      if (visionneuse.hidden || !lieuActif || chemin(lieuActif.images[index]) !== src) return;
      const b = L.latLngBounds([-source.naturalHeight, 0], [0, source.naturalWidth]);
      if (vCalque) vCalque.remove();
      vCalque = L.imageOverlay(src, b).addTo(vMap);
      vMap.setMaxBounds(null);
      vMap.options.minZoom = -10;
      vMap.options.maxZoom = 10;
      const min = vMap.getBoundsZoom(b, false);
      vMap.options.minZoom = min;
      vMap.options.maxZoom = Math.max(1, min + 1); // jusqu'à 2× la taille réelle
      vMap.setView(b.getCenter(), min, { animate: false });
      vMap.setMaxBounds(b);
    };
    source.src = src;
  }

  function fermerVisionneuse() {
    if (visionneuse.hidden) return;
    visionneuse.hidden = true;
    if (lieuActif) panneau.focus({ preventScroll: true });
  }

  image.addEventListener("click", ouvrirVisionneuse);
  panneau.querySelector(".agrandir").addEventListener("click", ouvrirVisionneuse);
  vFermer.addEventListener("click", fermerVisionneuse);
  vPrec.addEventListener("click", () => montrerImage(index - 1));
  vSuiv.addEventListener("click", () => montrerImage(index + 1));

  // --- URL : #id du lieu, le bouton retour ferme le panneau --------------
  function ouvrir(id) {
    if (lieuActif) history.replaceState({ lieu: id }, "", "#" + id);
    else history.pushState({ lieu: id }, "", "#" + id);
    afficher(id);
  }

  function demanderFermeture() {
    if (history.state && history.state.lieu) {
      history.back(); // popstate s'occupe de fermer
    } else {
      history.replaceState(null, "", location.pathname + location.search);
      fermer();
    }
  }

  function synchroniser() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) afficher(id);
    else fermer();
  }
  window.addEventListener("popstate", synchroniser);
  window.addEventListener("hashchange", synchroniser);
  synchroniser();

  // --- Aide au relevé : index.html?coords --------------------------------
  // Deux clics sur les coins opposés d'un cartouche donnent la ligne à coller
  // dans lieux.js. Deux clics plutôt qu'un cerné à la souris : le glisser sert
  // déjà à déplacer la carte.
  if (new URLSearchParams(location.search).has("coords")) {
    const boite = document.getElementById("coords");
    const apercu = L.rectangle(L.latLngBounds(versLatLng(0, 0), versLatLng(0, 0)),
                               { className: "apercu-releve", interactive: false });
    let premier = null;
    boite.hidden = false;
    map.on("click", (e) => {
      const p = { x: Math.round(e.latlng.lng), y: Math.round(-e.latlng.lat) };
      if (!premier) {
        premier = p;
        boite.textContent = `coin posé en ${p.x}, ${p.y} — cliquez le coin opposé`;
        return;
      }
      const x = Math.min(premier.x, p.x), y = Math.min(premier.y, p.y);
      const l = Math.abs(p.x - premier.x), h = Math.abs(p.y - premier.y);
      premier = null;
      apercu.setBounds(L.latLngBounds(versLatLng(x, y + h), versLatLng(x + l, y))).addTo(map);
      const txt = `x: ${x}, y: ${y}, l: ${l}, h: ${h}`;
      boite.textContent = txt;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(txt).then(() => { boite.textContent = txt + " (copié)"; }, () => {});
      }
    });
  }
})();
