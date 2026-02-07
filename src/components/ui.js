export function render(html) {
  const app = document.getElementById("app");
  app.innerHTML = html;
}

export function qs(sel, root = document) {
  return root.querySelector(sel);
}

export function qsa(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}
