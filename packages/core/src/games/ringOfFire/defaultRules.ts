import type { RingOfFireOptions, RuleSet } from './types.js'
import { DEFAULT_PENALTY } from '../../text/penalty.js'

export const DEFAULT_RULES: RuleSet = {
  14: {
    name: 'Vandfald',
    text: 'Alle drikker samtidig. Du må først stoppe, når personen før dig stopper.',
    soberText: 'Alle tager {straf:1}.',
  },
  2: { name: 'Dig', text: 'Vælg en, der tager {straf:2}.' },
  3: { name: 'Mig', text: 'Du tager {straf:3}.' },
  4: { name: 'Gulv', text: 'Sidste til at røre gulvet tager {straf:1}.' },
  5: {
    name: 'Tommelmester',
    text: 'Når du lægger tommelen på bordet, skal alle gøre det samme. Sidste tager {straf:1}.',
  },
  6: {
    name: 'Jeg har aldrig',
    text: 'Alle holder 3 fingre op og siger skiftevis "jeg har aldrig…". Først uden fingre tager {straf:2}.',
  },
  7: { name: 'Himmel', text: 'Sidste til at pege op tager {straf:1}.' },
  8: {
    name: 'Makker',
    text: 'Vælg en makker. Når en af jer tager straf, gør den anden det også.',
  },
  9: {
    name: 'Rim',
    text: 'Sig et ord. Alle skal skiftevis rime på det. Den, der går i stå, tager {straf:1}.',
  },
  10: {
    name: 'Kategori',
    text: 'Vælg en kategori. Alle nævner skiftevis noget i den. Den, der går i stå, tager {straf:1}.',
  },
  11: { name: 'Ny regel', text: 'Lav en regel, der gælder resten af spillet.' },
  12: { name: 'Spørgemester', text: 'Svarer nogen på et spørgsmål fra dig, tager de {straf:1}.' },
  13: {
    name: 'Kongens bæger',
    text: 'Hæld lidt af din drink i bægeret. Den, der trækker 4. konge, drikker det.',
    soberText: 'Den, der trækker 4. konge, tager {straf:5}.',
  },
}

export const DEFAULT_OPTIONS: RingOfFireOptions = {
  rules: DEFAULT_RULES,
  penalty: DEFAULT_PENALTY,
  endOnFourthKing: true,
}

export const MAX_CUSTOM_RULE_LENGTH = 80
