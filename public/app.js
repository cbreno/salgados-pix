import { nomeLoja, chavePix, nomeRecebedor, cidadeRecebedor, whatsapp, urlPlanilha, produtos } from "./config.js";
import { gerarPix, gerarCodigoPedido } from "./pix.js";
import { brl, svg, ICONES } from "./comum.js";

const MAX = 20;
const $ = (s) => document.querySelector(s);
const MENOS = svg('<path d="M5 12h14"/>');
const MAIS = svg('<path d="M12 5v14M5 12h14"/>');

const qtd = Object.fromEntries(produtos.map((p) => [p.id, 0]));
const cor = (p) => (ICONES[p.id] ? `cor-${p.id}` : "cor-padrao");
const itens = () => produtos.filter((p) => qtd[p.id] > 0);
const total = () => itens().reduce((soma, p) => soma + p.preco * qtd[p.id], 0);
const rotulo = (p) => (p.curto ?? [p.nome, p.nome])[qtd[p.id] > 1 ? 1 : 0];
const resumo = () => itens().map((p) => `${qtd[p.id]} ${rotulo(p)}`).join(" + ");
const primeiroNome = (nome) => nome.trim().split(/\s+/)[0];
const valor = (centavos) => (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const textoItens = () => itens().map((p) => `${qtd[p.id]}x ${p.nome}`).join(", ");

const CHAVE_NOME = "salgados.nome";
const lembrar = (nome) => { try { localStorage.setItem(CHAVE_NOME, nome); } catch {} };
const lembrado = () => { try { return localStorage.getItem(CHAVE_NOME) ?? ""; } catch { return ""; } };

// Apps Script: text/plain evita o preflight de CORS
async function registrar({ codigo, nome, itens, quantidade, total }) {
  if (!urlPlanilha) throw new Error("urlPlanilha vazia");
  const resp = await fetch(urlPlanilha, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ codigo, nome, itens, quantidade, total: valor(total) }),
    signal: AbortSignal.timeout?.(15000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
}

// Loja e selos do hero
document.title = `${nomeLoja} | Salgado + Coca no Pix`;
document.querySelectorAll("[data-loja]").forEach((el) => (el.textContent = nomeLoja));
for (const id of ["salgado", "coca"]) {
  const p = produtos.find((x) => x.id === id);
  const selo = $(`#selo-${id}`);
  if (!p) selo.hidden = true;
  else {
    selo.querySelector("span").textContent = p.nome;
    selo.querySelector("strong").textContent = brl(p.preco);
  }
}

// Cartões de preço e linhas do pedido
$("#cartoes-precos").innerHTML = produtos
  .map((p) => `
    <article class="preco-cartao ${cor(p)}">
      <span class="icone">${ICONES[p.id] ?? ICONES.salgado}</span>
      <h3>${p.nome}</h3>
      <p class="preco">${brl(p.preco)}</p>
    </article>`)
  .join("");

$("#linhas").innerHTML = produtos
  .map((p) => `
    <div class="linha ${cor(p)}">
      <div>
        <span class="linha-nome">${p.nome}</span>
        <span class="linha-preco">${brl(p.preco)}</span>
      </div>
      <div class="stepper">
        <button type="button" data-id="${p.id}" data-delta="-1" aria-label="Tirar 1 ${p.nome}">${MENOS}</button>
        <output id="qtd-${p.id}" aria-live="polite" aria-label="Quantidade de ${p.nome}">0</output>
        <button type="button" data-id="${p.id}" data-delta="1" aria-label="Adicionar 1 ${p.nome}">${MAIS}</button>
      </div>
    </div>`)
  .join("");

const nomeInput = $("#nome");
const gerarBtn = $("#gerar");
const dica = $("#dica");

function atualizar() {
  for (const p of produtos) {
    $(`#qtd-${p.id}`).textContent = qtd[p.id];
    $(`[data-id="${p.id}"][data-delta="-1"]`).disabled = qtd[p.id] <= 0;
    $(`[data-id="${p.id}"][data-delta="1"]`).disabled = qtd[p.id] >= MAX;
  }
  $("#resumo").textContent = resumo() || "Nenhum item ainda";
  $("#total").textContent = brl(total());
  const pronto = nomeInput.value.trim() !== "" && total() > 0;
  gerarBtn.disabled = !pronto;
  dica.hidden = pronto;
  dica.textContent = "Coloque seu nome e pelo menos 1 item";
}

$("#linhas").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;
  const { id, delta } = btn.dataset;
  qtd[id] = Math.min(MAX, Math.max(0, qtd[id] + Number(delta)));
  atualizar();
});
nomeInput.addEventListener("input", atualizar);
nomeInput.value = lembrado();

// Troca de telas dentro do cartão
const vistas = { pedido: $("#vista-pedido"), pagamento: $("#vista-pagamento"), ok: $("#vista-ok") };
function mostrar(nome) {
  for (const [k, el] of Object.entries(vistas)) el.hidden = k !== nome;
  $("#pedido").scrollIntoView({ block: "start" });
  vistas[nome].querySelector("h2").focus({ preventScroll: true });
}

let pedido = null;

$("#vista-pedido").addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = nomeInput.value.trim();
  if (!nome || total() === 0) return;

  const codigo = gerarCodigoPedido(nome);
  let pix;
  try {
    pix = gerarPix({ chave: chavePix, nome: nomeRecebedor, cidade: cidadeRecebedor, valorCentavos: total(), txid: codigo });
  } catch (err) {
    dica.hidden = false;
    dica.textContent = "Não deu para gerar o Pix. Avise a loja.";
    console.error(err);
    return;
  }
  const atual = (pedido = {
    nome, codigo, pix, total: total(), itens: textoItens(),
    quantidade: itens().reduce((soma, p) => soma + qtd[p.id], 0),
  });
  lembrar(nome);

  const aviso = $("#aviso");
  aviso.hidden = true;
  registrar(atual).catch((err) => {
    console.warn("Pedido não registrado:", err);
    if (pedido === atual) aviso.hidden = false; // ignora resposta de um pedido anterior
  });

  $("#pag-nome").textContent = nome;
  $("#pag-itens").replaceChildren(
    ...itens().map((p) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${qtd[p.id]}× ${p.nome}</span><span>${brl(p.preco * qtd[p.id])}</span>`;
      return li;
    })
  );
  $("#pag-total").textContent = brl(pedido.total);
  $("#pag-codigo").textContent = codigo;
  $("#copia-cola").value = pix;

  const qrEl = $("#qr");
  qrEl.hidden = !window.qrcode; // sem a biblioteca (CDN fora do ar), fica só o copia e cola
  if (window.qrcode) {
    const qr = window.qrcode(0, "M");
    qr.addData(pix);
    qr.make();
    qrEl.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true, title: "QR code do Pix" });
  }
  mostrar("pagamento");
});

// Copiar código
const copiarTexto = $("#copiar-texto");
let copiarTimer;
$("#copiar").addEventListener("click", async () => {
  const campo = $("#copia-cola");
  try {
    await navigator.clipboard.writeText(campo.value);
  } catch {
    campo.select();
    document.execCommand("copy");
  }
  copiarTexto.textContent = "Copiado!";
  clearTimeout(copiarTimer);
  copiarTimer = setTimeout(() => (copiarTexto.textContent = "Copiar código"), 2000);
});
$("#copia-cola").addEventListener("focus", (e) => e.target.select());

$("#voltar").addEventListener("click", () => mostrar("pedido"));

$("#ja-paguei").addEventListener("click", () => {
  const msg = `Olá! Sou ${pedido.nome} e paguei R$ ${valor(pedido.total)} por ${pedido.itens}. Pedido ${pedido.codigo}.`;
  window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  $("#ok-nome").textContent = primeiroNome(pedido.nome);
  mostrar("ok");
});

atualizar();
