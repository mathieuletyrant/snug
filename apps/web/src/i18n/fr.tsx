import type { Messages } from "./en";

/** Les mots de l'app, en français. */
export const fr: Messages = {
  tag: "fr-FR",

  common: {
    cancel: "Annuler",
    back: "Retour",
    undo: "Annuler",
    copied: "Copié",
    retryNow: "Réessayer",
    somethingWrong: "Une erreur est survenue",
    tba: "À venir",
    dateTba: "Date à venir",
  },
  days: {
    today: "Aujourd'hui",
    tomorrow: "Demain",
    inDays: (n) => `Dans ${n} jours`,
  },
  nav: { home: "Accueil", library: "Bibliothèque", search: "Recherche", settings: "Réglages" },
  status: {
    watchlist: "À voir",
    watching: "En cours",
    saving: "De côté",
    paused: "En pause",
    completed: "Terminée",
    dropped: "Abandonnée",
  },

  unreachable: {
    title: "Snug est injoignable",
    body: "Le serveur ne répond pas. Nouvel essai toutes les quelques secondes…",
  },
  refreshing: "Actualisation",

  auth: {
    welcome: "Bienvenue sur Snug",
    welcomeBack: "Bon retour",
    firstRunIntro: "Créez votre compte. Vous serez l'admin de ce Snug.",
    signInIntro: "Prenez un plaid et connectez-vous.",
    name: "Nom",
    email: "E-mail",
    password: "Mot de passe",
    passwordHint: "Au moins 10 caractères",
    createAccount: "Créer le compte",
    signIn: "Se connecter",
    tooManyAttempts: "Trop d'essais, attendez une minute et réessayez",
  },
  form: {
    thisField: "Ce champ",
    required: (label) => `${label} : champ obligatoire`,
    email: "Saisissez un e-mail valide, comme vous@exemple.fr",
    minLength: (n) => `Au moins ${n} caractères`,
  },
  setup: {
    title: "Une dernière chose",
    intro: (link) => (
      <>Snug récupère les séries, affiches et épisodes sur TMDB. Créez une clé gratuite sur {link} et collez-la ici.</>
    ),
    waiting: "Votre admin n'a pas encore ajouté la clé TMDB. Revenez dans un moment.",
  },
  tmdb: {
    keyLabel: "Clé API ou jeton d'accès en lecture",
    keyPlaceholder: "eyJhbGciOi… ou 32 caractères",
    saved: "Enregistré.",
    checking: "Vérification…",
    saveKey: "Enregistrer la clé",
    language: "Langue",
    languageHint: "Pour l'app, et pour les résumés, titres d'épisodes et affiches. L'app est en français ou en anglais.",
    switching: (language) => `Passage en ${language}…`,
  },

  home: {
    greeting: { morning: "Bonjour", afternoon: "Bon après-midi", evening: "Bonne soirée" },
    emptyTitle: "Rien sur le canapé pour l'instant",
    emptyBody: "Trouvez une série, importez votre historique depuis les Réglages, ou connectez Jellyfin.",
    findSeries: "Trouver une série",
    ready: "Prêt à regarder",
    upcoming: "À venir",
    savedUp: "Prête",
    new: "Nouveau",
    left: (n) => `${n} restant${n > 1 ? "s" : ""}`,
    markWatched: (code) => `Marquer ${code} comme vu`,
    markNextWatched: "Marquer l'épisode suivant comme vu",
    watched: (code) => `${code} vu`,
    savingOut: (out, needed) => `${out}/${needed} sortis`,
    complete: (when) => `Complète ${when}`,
  },
  library: {
    title: "Bibliothèque",
    statusFilter: "Statut",
    filter: "Filtrer…",
    filterLabel: "Filtrer la bibliothèque",
    empty: (status) => `Aucune série « ${status} »`,
    toWatch: (n) => (n === 1 ? "1 épisode à regarder" : `${n} épisodes à regarder`),
    nextOn: (date) => `Prochain épisode le ${date}`,
    caughtUpUndated: "À jour, prochain épisode pas encore daté",
    changeStatus: "Changer le statut",
    movedTo: (status) => `Déplacée dans ${status}`,
  },
  search: {
    title: "Recherche",
    label: "Chercher une série",
    placeholder: "Le titre d'une série…",
    empty: "Aucune série trouvée",
  },
  series: {
    ended: "Terminée",
    airing: "En diffusion",
    at: (code) => `à ${code}`,
    startWatching: "Commencer",
    addToWatchlist: "Ajouter à « À voir »",
    season: (n) => `Saison ${n}`,
    markSeasonWatched: "Marquer la saison comme vue",
    markWatched: "Marquer comme vu",
    markUnwatched: "Marquer comme non vu",
    hiddenTitle: "Titre caché, touchez pour l'afficher",
    remove: "Retirer de la bibliothèque",
    removeTitle: (name) => `Retirer ${name} ?`,
    removeBody: "Son statut et tous les épisodes marqués comme vus sont supprimés de Snug.",
    removeConfirm: "Retirer",
    removed: "Retirée de votre bibliothèque",
    catchUpTitle: (n) => (n === 1 ? "1 épisode précédent non vu" : `${n} épisodes précédents non vus`),
    catchUpBody: "Les marquer comme vus aussi ?",
    onlyThisOne: "Seulement celui-ci",
    markAll: (n) => `Tout marquer (${n})`,
  },
  saving: {
    until: "De côté jusqu'à",
    fullSeason: "Saison complète",
    episodes: (n) => `${n} ép.`,
    ready: (n) => `Prête à enchaîner : ${n} épisodes.`,
    // No final period: a short date already ends with one ("3 déc.").
    progress: (out, needed, lastOn) => `${out} sur ${needed} sortis${lastOn ? `, le dernier le ${lastOn}` : ""}`,
  },

  settings: {
    title: "Réglages",
    sections: { general: "Général", integrations: "Intégrations", import: "Import", admin: "Admin" },
    sectionLabel: "Section des réglages",
    admin: "Admin",
    signOut: "Se déconnecter",
    display: "Affichage",
    hideUndated: "Masquer les séries sans date",
    hideUndatedHelp: "Retire de « À venir » les séries dont le prochain épisode n'a pas encore de date.",
    episodeTitles: "Titres d'épisodes",
    episodeTitlesHelp: "Floute les titres des épisodes pas encore vus, contre les spoilers. Touchez-en un pour l'afficher.",
    titleChoices: { show: "Tout afficher", hideUnwatched: "Masquer les non vus", hideAll: "Tout masquer" },
    newFirst: "Nouveaux épisodes en premier",
    newFirstHelp: "Le nouvel épisode d'une série à jour passe en tête de l'accueil, avec un badge Nouveau.",
    off: "Non",
    days: (n) => `${n} jours`,
    notifications: "Notifications",
    onThisDevice: "Sur cet appareil",
    onThisDeviceHelp: "Quand Jellyfin marque un épisode comme vu, avec la suite.",
    newEpisodes: "Nouveaux épisodes",
    newEpisodesHelp: "Quand un épisode d'une série que vous regardez sort.",
    pushUnsupported:
      "Indisponible ici. Sur iPhone, ajoutez Snug à l'écran d'accueil et ouvrez-le depuis là (HTTPS uniquement).",
    pushDenied: "Les notifications sont bloquées. Autorisez-les dans les réglages du navigateur ou du téléphone.",
    devices: (n) => (n === 1 ? "1 appareil reçoit les notifications." : `${n} appareils reçoivent les notifications.`),
    sendTest: "Envoyer un test",
    testSent: "Test envoyé",
  },
  integrations: {
    intro: "Chaque app a sa propre URL secrète. Remplacez-la avec ↻ si elle fuite.",
    howToConnect: "Comment connecter",
    copyUrl: "Copier l'URL",
    copy: (what) => `Copier ${what}`,
    replaceTitle: "Remplacer cette URL ?",
    replaceBody: "L'URL actuelle cesse de marcher. Collez la nouvelle là où vous l'utilisiez.",
    replace: "Remplacer",
    newUrl: (what) => `Nouvelle ${what}`,
    newUrlHelp: "Nouvelle URL (l'ancienne cesse de marcher)",
    jellyfin: {
      description: "Les épisodes finis dans Jellyfin sont marqués comme vus ici.",
      url: "l'URL du webhook",
      steps: [
        (b) => <>Installez le plugin {b("Webhook")} (Tableau de bord → Plugins → Catalogue) et redémarrez.</>,
        (b) => <>Plugins → Webhook → {b("Add Generic Destination")}, collez l'URL ci-dessous.</>,
        (b) => (
          <>
            Cochez {b("Playback Stop")} et {b("User Data Saved")}, choisissez votre utilisateur, cochez{" "}
            {b("Send All Properties")}, enregistrez.
          </>
        ),
      ],
      history: "Historique du webhook",
      historyFilter: "Filtre de l'historique",
      outcomes: { all: "Tout", watched: "Vus", ignored: "Ignorés", error: "Erreurs" },
      noMatch: "Rien ne correspond à ce filtre.",
      noCalls: "Aucun appel pour l'instant. Finissez un épisode dans Jellyfin pour en voir un ici.",
      showMore: (n) => `Afficher ${n} de plus`,
    },
    sonarr: {
      description: "Sonarr télécharge les séries choisies ci-dessous.",
      url: "l'URL de la liste Sonarr",
      steps: [
        (b) => <>Dans Sonarr : Settings → Import Lists → + → {b("Custom Lists")}, collez l'URL ci-dessous.</>,
        () => <>Choisissez un profil de qualité et un dossier racine, enregistrez.</>,
      ],
      toSend: "Séries à envoyer",
      toSendLabel: "Séries à envoyer à Sonarr",
      changed: "Choix modifié ? Collez la nouvelle URL dans Sonarr.",
    },
    spotarr: {
      description: "Les séries envoyées depuis Spotarr arrivent dans « À voir ».",
      url: "l'URL Spotarr",
      steps: [
        (b) => <>Dans Spotarr : Settings → Connections → {b("Snug")}, collez l'URL ci-dessous, enregistrez.</>,
        (b) => <>Ajoutez une règle avec l'action {b("Add to Snug's Watchlist")}, ou utilisez le bouton d'une série.</>,
      ],
    },
  },
  ago: {
    justNow: "à l'instant",
    minutes: (n) => `il y a ${n} min`,
    hours: (n) => `il y a ${n} h`,
  },
  import: {
    title: "Import",
    intro: (csv, template) => (
      <>
        Chargez des séries et un historique depuis un {csv} (une ligne par épisode) ou un export JSON. Rien n'est
        effacé. {template}
      </>
    ),
    template: "Télécharger le modèle CSV",
    columnsHelp: (title, tmdbId) => (
      <>
        Seul {title} ou {tmdbId} est obligatoire. Sans season/episode : ajoute juste la série.
      </>
    ),
    done: (series, watches) => `${series} séries et ${watches} épisodes vus importés.`,
    notFound: (titles) => `Introuvables sur TMDB : ${titles}. Ajoutez leur tmdb_id et réessayez.`,
    notCsvOrJson: "Ce fichier n'est ni du CSV ni du JSON",
    importing: "Import…",
    fetchingDetails: "Récupération des détails…",
    chooseFile: "Choisir un fichier",
    progressRunning: "Récupération des détails des séries…",
    progressMissing: "Il manque des détails de séries",
    progressDone: "Détails des séries récupérés",
    progressFailed: (n) => `${n} séries n'ont pas pu être récupérées ; nouvel essai automatique plus tard.`,
  },
  admin: {
    people: "Personnes",
    peopleHelp: "Les inscriptions sont fermées. Créez les comptes ici.",
    accountCreated: "Compte créé",
    seriesDetails: "Détails des séries",
    seriesDetailsHelp: "Depuis TMDB, pour tout le monde sur ce Snug.",
  },
};
