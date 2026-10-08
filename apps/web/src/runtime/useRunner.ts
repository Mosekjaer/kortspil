import { useSyncExternalStore } from 'react'
import type { Runner } from './runner'

export function useRunner<View, Action>(runner: Runner<View, Action>) {
  const view = useSyncExternalStore(runner.subscribe, runner.getView)
  const status = useSyncExternalStore(runner.subscribe, runner.getStatus)
  return { view, status, dispatch: runner.dispatch }
}
