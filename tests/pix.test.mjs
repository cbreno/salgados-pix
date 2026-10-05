import { test } from "node:test";
import assert from "node:assert/strict";
import { crc16, gerarPix, formatarValor, limparTexto, chaveValida, gerarCodigoPedido } from "../public/pix.js";

const base = { chave: "falcaogremiosalgados@gmail.com", nome: "Falcão Grêmio", cidade: "São Paulo", valorCentavos: 1550, txid: "JOAO1503A7" };

test("CRC16-CCITT-FALSE de payloads conhecidos", () => {
  assert.equal(crc16("123456789"), "29B1");
  // Exemplo do manual do BR Code (Banco Central)
  const exemplo = "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";
  assert.equal(crc16(exemplo), "1D3D");
});

test("payload completo e CRC final batem", () => {
  const pix = gerarPix(base);
  assert.equal(
    pix.slice(0, -4),
    "000201" + "2652" + "0014br.gov.bcb.pix" + "0130falcaogremiosalgados@gmail.com" +
      "52040000" + "5303986" + "540515.50" + "5802BR" + "5913Falcao Gremio" + "6009Sao Paulo" +
      "6214" + "0510JOAO1503A7" + "6304"
  );
  assert.equal(pix.slice(-4), crc16(pix.slice(0, -4)));
});

test("formato do valor", () => {
  assert.equal(formatarValor(1550), "15.50");
  assert.equal(formatarValor(5), "0.05");
  assert.equal(formatarValor(100000), "1000.00");
  assert.throws(() => formatarValor(0));
  assert.throws(() => formatarValor(15.5));
});

test("corte de nome (25) e cidade (15)", () => {
  const pix = gerarPix({ ...base, nome: "Maria da Conceição Albuquerque Souza", cidade: "São José dos Campos do Sul" });
  assert.match(pix, /5925Maria da Conceicao Albuqu6015Sao Jose dos Ca/);
});

test("remoção de acentos e caracteres especiais", () => {
  assert.equal(limparTexto("Ângela & Côrte-Real!", 25), "Angela CorteReal");
  assert.equal(limparTexto("Florianópolis/SC", 15), "FlorianopolisSC");
  assert.equal(limparTexto("Ação ÇÃÕ ü", 25), "Acao CAO u");
});

test("validação da chave", () => {
  for (const ok of ["a@b.com", "+5511987654321", "12345678901", "12345678000199", "123e4567-e12b-12d1-a456-426655440000"])
    assert.ok(chaveValida(ok), ok);
  for (const ruim of ["", "11987654321x", "+1555123456", "123.456.789-01", "abc"]) assert.ok(!chaveValida(ruim), ruim);
  assert.throws(() => gerarPix({ ...base, chave: "invalida" }));
});

test("txid só alfanumérico, máx. 25", () => {
  const pix = gerarPix({ ...base, txid: "pedido-#123_" + "X".repeat(30) });
  assert.match(pix, /62290525pedido123XXXXXXXXXXXXXXXX6304/);
});

test("gerarCodigoPedido", () => {
  const cod = gerarCodigoPedido("João da Silva", new Date(2026, 9, 15, 3));
  assert.match(cod, /^JOAO1503[A-Z2-9]{2}$/);
  assert.ok(gerarCodigoPedido("A".repeat(40)).length <= 25);
  assert.match(gerarCodigoPedido(""), /^PEDIDO\d{4}[A-Z2-9]{2}$/);
});
