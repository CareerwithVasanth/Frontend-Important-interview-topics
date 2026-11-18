// '@shop/event-bus' is a bare specifier: the shell's import map decides which URL it resolves to.
// Every micro frontend that imports it gets the SAME module instance (one URL = one instance per page).
import { emit, instanceId } from '@shop/event-bus';
import { createProductList, styles } from './core.js';

// Contract: mount(element, props) → { update(props), unmount() }
export function mount(el, { currency = 'INR' } = {}) {
  // No iframe, no Shadow DOM: this <style> is global, so our h2/button rules restyle the whole page.
  const style = Object.assign(document.createElement('style'), { textContent: styles });
  style.dataset.team = 'products';
  document.head.append(style);

  const list = createProductList(el, {
    currency,
    via: `import map · bus #${instanceId}`,
    onAdd: (product) => emit('cart:add', product),
  });

  return {
    update: (props) => props.currency && list.setCurrency(props.currency),
    unmount() {
      style.remove();
      el.replaceChildren();
    },
  };
}
