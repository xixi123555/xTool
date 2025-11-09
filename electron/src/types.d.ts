declare global {
  interface Window {
    api: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      on: (channel: string, listener: (...args: unknown[]) => void) => () => void;
    };
    useIpcEvent: <TPayload = unknown>(
      channel: string,
      handler: (payload: TPayload) => void
    ) => () => void;
  }
}

export {};
