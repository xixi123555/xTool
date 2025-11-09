import { useEffect } from 'react';

type EventHandler<TPayload> = (payload: TPayload) => void;

type Unsubscribe = () => void;

export function useIpcEvent<TPayload>(channel: string, handler: EventHandler<TPayload>) {
  useEffect(() => {
    const unsubscribe: Unsubscribe | void = window.useIpcEvent?.(channel, handler);
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [channel, handler]);
}
