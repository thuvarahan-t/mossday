import { useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';

type FabHandler = () => void;
type FabRegistry = { register: (handler: FabHandler) => () => void; run: () => void };

const FabActionContext = createContext<FabRegistry | null>(null);

/**
 * The tab bar's "+" does something different on every tab (spec §4). The focused screen
 * registers its handler; the FAB simply runs whichever handler is current.
 */
export function FabActionProvider({ children }: { children: ReactNode }) {
  const current = useRef<FabHandler | null>(null);
  const registry = useMemo<FabRegistry>(() => ({
    register: (handler) => {
      current.current = handler;
      return () => {
        if (current.current === handler) current.current = null;
      };
    },
    run: () => current.current?.(),
  }), []);
  return <FabActionContext.Provider value={registry}>{children}</FabActionContext.Provider>;
}

function useRegistry() {
  const registry = useContext(FabActionContext);
  if (!registry) throw new Error('FAB actions require a FabActionProvider.');
  return registry;
}

/** Call from a tab screen: `handler` runs when the FAB is tapped while that screen is focused. */
export function useFabAction(handler: FabHandler) {
  const { register } = useRegistry();
  useFocusEffect(useCallback(() => register(handler), [register, handler]));
}

export function useRunFabAction() {
  return useRegistry().run;
}
