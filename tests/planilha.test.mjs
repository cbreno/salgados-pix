import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Roda o Codigo.gs com uma planilha falsa em memória.
function carregar() {
  const linhas = [["Data", "Código", "Nome", "Itens", "Qtd", "Total (R$)", "Status", "Avisou que pagou", "Obs."]];
  const aba = {
    appendRow: (l) => linhas.push(l),
    getDataRange: () => ({ getValues: () => linhas.map((l) => [...l]) }),
    getRange: (r, c) => ({ setValue: (v) => (linhas[r - 1][c - 1] = v) }),
  };
  const ctx = {
    SpreadsheetApp: { getActive: () => ({ getSheetByName: () => aba }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: (s) => ({ setMimeType: () => JSON.parse(s) }),
    },
  };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL("../apps-script/Codigo.gs", import.meta.url), "utf8") + "\n;this.api = { doPost, texto };", ctx);
  const post = (dados) => ctx.api.doPost({ postData: { contents: JSON.stringify(dados) } });
  return { linhas, post, texto: ctx.api.texto };
}

const pedido = { acao: "novo", codigo: "JOAO1503A7", nome: "João", itens: "2x Salgado, 1x Coca lata", quantidade: 3, total: "25,50" };

test("novo pedido entra como 'Aguardando pagamento' com total numérico", () => {
  const { linhas, post } = carregar();
  assert.deepEqual(post(pedido), { ok: true });
  const [, codigo, nome, itens, qtd, total, status] = linhas[1];
  assert.deepEqual([codigo, nome, itens, qtd, total, status], ["JOAO1503A7", "João", "2x Salgado, 1x Coca lata", 3, 25.5, "Aguardando pagamento"]);
  post({ ...pedido, codigo: "ANA1", total: "1.025,50" });
  assert.equal(linhas[2][5], 1025.5);
});

test("'pagou' marca o pedido certo, sem mexer em status já alterado", () => {
  const { linhas, post } = carregar();
  post(pedido);
  post({ ...pedido, codigo: "ANA1" });
  assert.deepEqual(post({ acao: "pagou", codigo: "JOAO1503A7" }), { ok: true });
  assert.equal(linhas[1][6], "Avisou que pagou");
  assert.equal(Object.prototype.toString.call(linhas[1][7]), "[object Date]"); // Date de outro contexto (vm)
  assert.equal(linhas[2][6], "Aguardando pagamento");

  linhas[2][6] = "Pago"; // você já conferiu no banco
  post({ acao: "pagou", codigo: "ANA1" });
  assert.equal(linhas[2][6], "Pago");
  assert.equal(post({ acao: "pagou", codigo: "NAOEXISTE" }).ok, false);
});

test("rejeita pedido inválido", () => {
  const { linhas, post } = carregar();
  for (const ruim of [
    { ...pedido, codigo: "JOAO-1" },
    { ...pedido, codigo: "" },
    { ...pedido, nome: "  " },
    { ...pedido, quantidade: 0 },
    { ...pedido, quantidade: 2.5 },
    { ...pedido, total: "0,00" },
    { ...pedido, total: "abc" },
  ]) assert.equal(post(ruim).ok, false, JSON.stringify(ruim));
  assert.equal(carregar().post({ acao: "pagou", codigo: "=1+1" }).ok, false);
  assert.equal(linhas.length, 1);
});

test("texto não vira fórmula e é cortado", () => {
  const { texto } = carregar();
  assert.equal(texto('=IMPORTXML("x")', 60), `'=IMPORTXML("x")`);
  assert.equal(texto("+5511", 60), "'+5511");
  assert.equal(texto("  Ana\n\tMaria  ", 60), "Ana Maria");
  assert.equal(texto("a".repeat(80), 60).length, 60);
});
