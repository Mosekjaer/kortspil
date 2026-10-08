import type {
  BussenLogEntry,
  Card,
  ErrorCode,
  FinishReason,
  GameId,
  PenaltyPreset,
  ProtocolErrorCode,
  Rank,
  RingOfFireView,
  Suit,
} from '@kortspil/core'

const RANK_SHORT: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
}

const RANK_NAME: Partial<Record<Rank, string>> = {
  11: 'knægt',
  12: 'dame',
  13: 'konge',
  14: 'es',
}

const SUIT_NAME: Record<Suit, string> = {
  spades: 'spar',
  hearts: 'hjerter',
  diamonds: 'ruder',
  clubs: 'klør',
}

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
}

/** "en 8'er", "et es", "en dame". */
function rankWithArticle(rank: Rank): string {
  const name = RANK_NAME[rank]
  if (!name) return `en ${rank}'er`
  return rank === 14 ? `et ${name}` : `en ${name}`
}

/** Rank label for rule lists, e.g. "Es", "8". */
function rankLabel(rank: Rank): string {
  const name = RANK_NAME[rank]
  return name ? name[0]!.toUpperCase() + name.slice(1) : String(rank)
}

const ERRORS: Record<ErrorCode, string> = {
  GAME_FINISHED: 'Spillet er slut.',
  NOT_YOUR_TURN: 'Det er ikke din tur.',
  WRONG_PHASE: 'Det kan du ikke lige nu.',
  INVALID_ACTION: 'Ugyldig handling.',
  INVALID_TARGET: 'Vælg en anden spiller.',
  INVALID_TEXT: 'Teksten skal være mellem 1 og 80 tegn.',
}

const PROTOCOL_ERRORS: Record<Exclude<ProtocolErrorCode, ErrorCode>, string> = {
  BAD_REQUEST: 'Noget gik galt. Prøv igen.',
  RATE_LIMITED: 'Lidt langsommere.',
  ROOM_NOT_FOUND: 'Rummet findes ikke. Tjek koden.',
  ROOM_FULL: 'Rummet er fuldt.',
  TOO_MANY_ROOMS: 'Der er for mange åbne rum fra dette netværk.',
  NAME_TAKEN: 'Navnet er allerede taget i rummet.',
  INVALID_TOKEN: 'Din plads i rummet findes ikke længere.',
  NOT_HOST: 'Det kan kun værten.',
  NOT_IN_ROOM: 'Du er ikke i et rum.',
  GAME_IN_PROGRESS: 'Spillet er allerede i gang.',
  GAME_NOT_SUPPORTED: 'Spillet kan ikke spilles i rum endnu.',
  PLAYER_COUNT: 'Forkert antal spillere til spillet.',
}

const FINISH: Record<FinishReason, string> = {
  deckEmpty: 'Bunken er tom.',
  fourthKing: 'Den 4. konge er trukket!',
}

const PENALTY_LABEL: Record<PenaltyPreset, string> = {
  sip: 'Tår',
  points: 'Strafpoint',
  pushups: 'Armbøjninger',
}

type Names = (id: string) => string

/** Danish genitive: "Mads'", "Saras". */
export function genitive(name: string): string {
  return /[sxz]$/i.test(name) ? `${name}'` : `${name}s`
}

export const da = {
  appName: 'Fredagsbar Kortspil',
  errorText(code: ProtocolErrorCode): string {
    return code in ERRORS
      ? ERRORS[code as ErrorCode]
      : PROTOCOL_ERRORS[code as keyof typeof PROTOCOL_ERRORS]
  },
  back: 'Tilbage',
  cancel: 'Annullér',
  close: 'Luk',
  save: 'Gem',

  home: {
    titleTop: 'Fredags',
    titleBottom: 'bar',
    single: 'Spil på én telefon',
    create: 'Opret rum',
    join: 'Deltag i rum',
    settings: 'Indstillinger',
    multiHint: 'Rum til flere telefoner kræver internet',
  },

  ageGate: {
    title: 'Kun for 18+',
    body: 'Spillene her er drikkespil. Du skal være fyldt 18 år for at spille med alkohol.',
    responsible:
      'Spil ansvarligt. Du kan altid skifte straffen fra tår til strafpoint, armbøjninger eller noget helt fjerde.',
    toPenalty: 'Skift straf',
    confirm: 'Jeg er fyldt 18',
  },

  picker: {
    title: 'Vælg spil',
    players: (min: number, max: number) => `${min}-${max} spillere`,
    single: 'Én telefon',
    multi: 'Flere telefoner',
    comingSoon: 'Kommer snart',
  },

  games: {
    ringOfFire: {
      name: 'Ring of Fire',
      tagline: 'Træk et kort, følg reglen.',
    },
    bussen: {
      name: 'Bussen',
      tagline: 'Gæt rigtigt, ellers kører du bussen.',
    },
  } satisfies Record<GameId, { name: string; tagline: string }>,

  lobby: {
    title: 'Spillere',
    subtitle: 'Én telefon',
    namePlaceholder: 'Navn',
    add: 'Tilføj',
    remove: (name: string) => `Fjern ${name}`,
    dragHint: 'Træk i håndtaget for at ændre siddeorden. Den første starter.',
    tooFew: (min: number) => `Mindst ${min} spillere.`,
    tooMany: (max: number) => `Højst ${max} spillere.`,
    duplicate: 'Navnet er allerede med.',
    start: 'Start spillet',
    options: 'Indstillinger for spillet',
    endOnFourthKing: 'Spillet slutter ved 4. konge',
  },

  game: {
    turn: (name: string) => `Det er ${genitive(name)} tur`,
    yourTurn: 'Det er din tur',
    waitingFor: (name: string) => `Venter på ${name}`,
    actingFor: (name: string) => `Du spiller for ${name}`,
    waitForHostRestart: 'Værten kan starte et nyt spil',
    drewCard: (name: string) => `${name} trak`,
    menu: 'Menu',
    log: 'Hændelseslog',
    logEmpty: 'Intet er sket endnu.',
    activeRules: 'Aktive regler',
    noActiveRules: 'Ingen egne regler endnu.',
    quit: 'Afslut spil',
    quitConfirm: 'Vil du afslutte spillet?',
    finished: 'Spillet er slut',
    playAgain: 'Spil igen',
    toHome: 'Til forsiden',
    errors: ERRORS,
    finish: FINISH,
  },

  ringOfFire: {
    draw: 'Træk kort',
    deckCount: (n: number) => `${n} kort tilbage`,
    kings: (n: number) => `Konger: ${n}/4`,
    thumbMaster: (name: string) => `Tommelmester: ${name}`,
    questionMaster: (name: string) => `Spørgemester: ${name}`,
    mates: (a: string, b: string) => `${a} + ${b}`,
    customRules: (n: number) => `Regler: ${n}`,
    chooseMate: 'Vælg din makker',
    writeRule: 'Skriv en ny regel',
    rulePlaceholder: 'Fx: Ingen må sige "drik"',
    addRule: 'Tilføj regel',
    skip: 'Spring over',
    firstCard: 'Første spiller trækker et kort.',
    fourthKingTitle: 'Den 4. konge!',
    continue: 'Videre',
    fourthKingBody: (name: string) => `${name} drikker kongens bæger.`,
    fourthKingBodySober: (name: string, penalty: string) => `${name} tager ${penalty}.`,
    statDraws: 'Kort trukket',
    statMates: 'Makkerpar',
    statRules: 'Egne regler',
    deckLabel: 'Træk et kort. Tryk, eller svip kortet opad.',
    swipeHint: 'Tryk eller svip opad',
    rankLabel,
    logLine(entry: RingOfFireView['log'][number], names: Names): string {
      switch (entry.type) {
        case 'draw':
          return `${names(entry.playerId)} trak ${rankWithArticle(entry.card.rank)}`
        case 'mate':
          return `${names(entry.playerId)} valgte ${names(entry.targetId)} som makker`
        case 'rule':
          return `${names(entry.playerId)} lavede reglen: "${entry.text}"`
        case 'skip':
          return `${names(entry.playerId)} sprang over`
        case 'finished':
          return FINISH[entry.reason]
      }
    },
  },

  bussen: {
    roundOf: (n: number) => `Runde ${n} af 4`,
    questions: {
      1: 'Rød eller sort?',
      2: 'Højere eller lavere?',
      3: 'Indenfor eller udenfor?',
      4: 'Hvilken kulør?',
    } as Record<1 | 2 | 3 | 4, string>,
    guesses: {
      red: 'Rød',
      black: 'Sort',
      higher: 'Højere',
      lower: 'Lavere',
      inside: 'Indenfor',
      outside: 'Udenfor',
      spades: '♠ Spar',
      hearts: '♥ Hjerter',
      diamonds: '♦ Ruder',
      clubs: '♣ Klør',
    } as Record<string, string>,
    right: (name: string, penalty: string) => `${name} gættede rigtigt og deler ${penalty} ud`,
    wrong: (name: string, penalty: string) => `${name} gættede forkert og tager ${penalty}`,
    giveOut: 'Del ud',
    giveOutCount: (n: number) => `Del ud (${n})`,
    chooseShort: 'Vælg',
    givePending: (name: string, penalty: string) => `${name} har ${penalty} at dele ud`,
    chooseRecipient: (penalty: string) => `Hvem skal have ${penalty}?`,
    noRecipient: 'Ingen bestemt',
    pyramid: 'Pyramiden',
    rowValue: (penalty: string) => `Kortet er værd ${penalty}`,
    revealNext: 'Vend næste kort',
    findDriver: 'Find buschaufføren',
    waitForHost: 'Værten vender kortene',
    matches: 'Match',
    noMatches: 'Ingen har match. Vend næste kort.',
    playCard: (card: string) => `Spil ${card}`,
    hasMatch: (name: string) => `${name} har match`,
    hands: 'Hænder',
    driverTitle: (name: string) => `${name} kører bussen`,
    youDrive: 'Du kører bussen',
    driverReason: {
      cards: 'Flest kort tilbage.',
      rank: 'Lige mange kort, men højest i alt.',
      random: 'Helt lige, så kortene bestemte.',
    } as Record<'cards' | 'rank' | 'random', string>,
    busQuestion: (position: number) =>
      position === 0 ? 'Rød eller sort?' : 'Højere eller lavere?',
    busMiss: (position: number, penalty: string) =>
      `Forkert på kort ${position}. Tag ${penalty}, og start forfra.`,
    attempts: (n: number) => `Forsøg ${n}`,
    turnTitle: (name: string) => `${genitive(name)} gæt`,
    finished: (name: string) => `${name} kom af bussen`,
    statAttempts: 'Forsøg',
    statPlayed: 'Kort spillet',
    statPlayers: 'Spillere',
    logLine(entry: BussenLogEntry, names: Names, penalty: (n: number) => string): string {
      switch (entry.type) {
        case 'guess':
          return entry.correct
            ? `${names(entry.playerId)} gættede ${da.bussen.guesses[entry.guess]!.toLowerCase()} rigtigt (${da.card.label(entry.card)}) og deler ${penalty(entry.amount)} ud`
            : `${names(entry.playerId)} gættede ${da.bussen.guesses[entry.guess]!.toLowerCase()} forkert (${da.card.label(entry.card)}) og tager ${penalty(entry.amount)}`
        case 'give':
          return `${names(entry.playerId)} gav ${penalty(entry.amount)} til ${names(entry.targetId)}`
        case 'reveal':
          return `Pyramiden: ${da.card.label(entry.card)} er vendt (${penalty(entry.value)})`
        case 'match':
          return `${names(entry.playerId)} spillede ${da.card.label(entry.card)} og deler ${penalty(entry.value)} ud`
        case 'driver':
          return `${names(entry.playerId)} kører bussen`
        case 'busGuess':
          return `Bus, kort ${entry.position}: ${da.card.label(entry.card)} (${entry.correct ? 'rigtigt' : 'forkert'})`
        case 'finished':
          return `Af bussen efter ${entry.attempts} forsøg`
      }
    },
  },

  room: {
    createTitle: 'Opret rum',
    joinTitle: 'Deltag',
    yourName: 'Dit navn',
    namePlaceholder: 'Fx Mads',
    chooseGame: 'Spil',
    create: 'Opret rum',
    code: 'Rumkode',
    join: 'Deltag',
    scanOrType: 'Scan koden, eller gå ind på',
    players: (n: number) => `Spillere (${n})`,
    host: 'Vært',
    guest: 'Gæst',
    online: 'Online',
    offline: 'Offline',
    you: 'dig',
    addGuest: 'Tilføj gæst uden telefon',
    guestName: 'Gæstens navn',
    kick: (name: string) => `Smid ${name} ud`,
    start: 'Start spillet',
    waitingForHost: 'Venter på at værten starter spillet',
    leave: 'Forlad rum',
    reconnecting: 'Genforbinder…',
    connecting: 'Forbinder…',
    rejoining: 'Finder din plads i rummet…',
    closed: {
      kicked: 'Værten fjernede dig fra rummet.',
      inactive: 'Rummet blev lukket efter lang tids inaktivitet.',
      lost: 'Rummet findes ikke længere.',
    },
    offlineHint: 'Kræver internet. Én telefon virker altid.',
  },

  update: {
    available: 'Ny version klar',
    reload: 'Genindlæs',
  },

  offline: 'Ingen internetforbindelse. Rum kræver internet; én telefon virker stadig.',

  settings: {
    title: 'Indstillinger',
    penalty: 'Straf',
    penaltyHelp: 'Bruges i alle regeltekster.',
    penaltyPresets: PENALTY_LABEL,
    custom: 'Egen tekst',
    singular: 'Ental',
    plural: 'Flertal',
    feedback: 'Lyd og vibration',
    sound: 'Lyd',
    vibration: 'Vibration',
    customRules: 'Egne regler: Ring of Fire',
    responsible: 'Spil ansvarligt. Drik vand, og kør aldrig bil efter festen.',
  },

  rulesEditor: {
    title: 'Egne regler',
    help: 'Skriv {straf:2} for "2 tår". Teksten følger din straf-indstilling.',
    name: 'Navn',
    text: 'Regel',
    soberText: 'Regel når straffen ikke er tår (valgfri)',
    reset: 'Nulstil',
    resetAll: 'Nulstil alle',
    preview: 'Vises som',
    saved: 'Gemt',
    empty: 'Navn og regel må ikke være tomme.',
  },

  card: {
    label: (card: Card) => `${rankLabel(card.rank)} ${SUIT_NAME[card.suit]}`,
    short: (rank: Rank) => RANK_SHORT[rank],
    back: 'Kortets bagside',
  },
}
