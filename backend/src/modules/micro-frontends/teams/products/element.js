import { createProductList, styles } from './core.js';

// Contract: a Custom Element. Data goes in through attributes/properties ("props down"),
// and comes out as DOM events ("events up").
class TeamProducts extends HTMLElement {
  static observedAttributes = ['currency'];
  #list;

  connectedCallback() {
    if (this.#list) return;
    // Shadow DOM: our styles can't leak out, and the shell's styles can't leak in.
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${styles}</style><div></div>`;
    this.#list = createProductList(shadow.querySelector('div'), {
      currency: this.getAttribute('currency') ?? 'INR',
      via: 'Web Component',
      // composed: true lets the event cross the shadow boundary so the shell can hear it.
      onAdd: (product) => this.dispatchEvent(new CustomEvent('add-to-cart', { detail: product, bubbles: true, composed: true })),
    });
  }

  attributeChangedCallback(name, _old, value) {
    if (name === 'currency') this.#list?.setCurrency(value);
  }
}

// The custom element registry is global: two teams defining the same tag name would throw.
if (!customElements.get('team-products')) customElements.define('team-products', TeamProducts);
