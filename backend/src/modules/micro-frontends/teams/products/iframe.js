import { createProductList, styles } from './core.js';

// Contract: initial "props" arrive in the URL, updates and events travel via postMessage.
const SHELL_ORIGIN = 'http://localhost:4000';
const params = new URLSearchParams(location.search);

document.head.append(Object.assign(document.createElement('style'), { textContent: styles }));

const toShell = (message) => parent.postMessage(message, SHELL_ORIGIN);

const list = createProductList(document.getElementById('root'), {
  currency: params.get('currency') ?? 'INR',
  via: 'iframe + postMessage',
  onAdd: (product) => toShell({ type: 'add-to-cart', product }),
});

addEventListener('message', (event) => {
  // Any window can postMessage us, so always check who sent it.
  if (event.origin !== SHELL_ORIGIN) return;
  if (event.data?.type === 'set-currency') list.setCurrency(event.data.currency);
});

// The shell can't see our content height, so we have to report it ourselves.
new ResizeObserver(() => toShell({ type: 'resize', height: Math.ceil(document.body.getBoundingClientRect().height) })).observe(document.body);
toShell({ type: 'ready' });
