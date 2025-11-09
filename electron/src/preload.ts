import { contextBridge, ipcRenderer } from 'electron';

type Listener = (...args: unknown[]) => void;

type Subscription = () => void;

function createSubscription(channel: string, listener: Listener): Subscription {
  const subscription = (_event: unknown, ...payload: unknown[]) => listener(...payload);
  ipcRenderer.on(channel, subscription);
  return () => ipcRenderer.removeListener(channel, subscription);
}

// Debug: mark preload initialized
console.log('[preload] initializing');

contextBridge.exposeInMainWorld('api', {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: Listener): Subscription => createSubscription(channel, listener),
});

contextBridge.exposeInMainWorld(
  'useIpcEvent',
  (channel: string, listener: Listener): Subscription => createSubscription(channel, listener),
);

// Debug: verify exposure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
console.log('[preload] api exposed?', typeof (globalThis as any).api);
