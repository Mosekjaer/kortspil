export * from './types.js'
export {
  BUS_LENGTH,
  PYRAMID_SIZE,
  PYRAMID_VALUES,
  bussen,
  chooseDriver,
  decksFor,
  isDealGuessCorrect,
} from './rules.js'
import { DEFAULT_PENALTY } from '../../text/penalty.js'
import type { BussenOptions } from './types.js'

export const DEFAULT_BUSSEN_OPTIONS: BussenOptions = { penalty: DEFAULT_PENALTY }
