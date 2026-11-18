import { createCartStore, createCartView, styles } from './core.js';

// Contract: a Custom Element with a public method (add) and an attribute (currency) going in,
// and a 'cart-change' DOM event coming out.
class TeamCart extends HTMLElement {
  static observedAttributes = ['currency'];
  #store = createCartStore();
  #view;

  connectedCallback() {
    if (this.#view) return;
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${styles}</style><div></div>`;
    this.#view = createCartView(shadow.querySelector('div'), {
      store: this.#store,
      currency: this.getAttribute('currency') ?? 'INR',
      via: 'Web Component',
    });
    this.#store.subscribe((store) =>
      this.dispatchEvent(new CustomEvent('cart-change', { detail: { count: store.count }, bubbles: true, composed: true })),
    );
  }

  attributeChangedCallback(name, _old, value) {
    if (name === 'currency') this.#view?.setCurrency(value);
  }

  add(product) {
    this.#store.add(product);
  }
}

if (!customElements.get('team-cart')) customElements.define('team-cart', TeamCart);
