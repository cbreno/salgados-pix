// Compartilhado entre o site (app.js) e o cartaz (cartaz.html).

export const brl = (centavos) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const svg = (corpo) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${corpo}</svg>`;

export const ICONES = {
  salgado: svg('<path d="M12 3c-3 4-7 8.5-7 12a7 7 0 0 0 14 0c0-3.5-4-8-7-12z"/><path d="M9 16c1 1.2 5 1.2 6 0"/>'),
  coca: svg('<path d="M7 5h10l1 2v12l-1 2H7l-1-2V7z"/><path d="M6 9h12M6 17h12M10 3h4"/>'),
};
