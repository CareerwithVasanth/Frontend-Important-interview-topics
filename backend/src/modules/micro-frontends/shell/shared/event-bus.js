// A tiny pub/sub bus owned by the shell. The import map maps '@shop/event-bus' to this URL, so every
// micro frontend that imports it shares one instance (ES modules are singletons per URL, per page).
const target = new EventTarget();

export const instanceId = Math.random().toString(36).slice(2, 7);

export function emit(type, detail) {
  target.dispatchEvent(new CustomEvent(type, { detail }));
}

export function on(type, handler) {
  const listener = (event) => handler(event.detail);
  target.addEventListener(type, listener);
  return () => target.removeEventListener(type, listener);
}
