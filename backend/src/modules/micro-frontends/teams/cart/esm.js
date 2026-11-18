// Resolved through the shell's import map, so this is the same bus instance Team Products uses.
import { emit, instanceId, on } from '@shop/event-bus';
import { createCartStore, createCartView, styles } from './core.js';

// Contract: mount(element, props) → { update(props), unmount() }
export function mount(el, { currency = 'INR' } = {}) {
  // Global <style>: these rules also hit the shell and Team Products (light DOM, no isolation).
  const style = Object.assign(document.createElement('style'), { textContent: styles });
  style.dataset.team = 'cart';
  document.head.append(style);

  const store = createCartStore();
  const view = createCartView(el, { store, currency, via: `import map · bus #${instanceId}` });

  // Pub/sub: Team Products publishes 'cart:add', we subscribe. Neither team imports the other.
  const off = on('cart:add', (product) => store.add(product));
  const unsubscribe = store.subscribe(() => emit('cart:changed', { count: store.count }));

  return {
    update: (props) => props.currency && view.setCurrency(props.currency),
    unmount() {
      off();
      unsubscribe();
      style.remove();
      el.replaceChildren();
    },
  };
}
