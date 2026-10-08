// Controle de pedidos dos Salgados.
// Cole este arquivo no Apps Script da planilha (Extensões → Apps Script), rode "configurar"
// uma vez e publique como App da Web. Passo a passo no README.

const ABA = "Pedidos";
const COLUNAS = ["Data", "Código", "Nome", "Itens", "Qtd", "Total (R$)", "Status", "Avisou que pagou", "Obs."];
const COL = { codigo: 2, status: 7, avisou: 8 };
const STATUS = ["Aguardando pagamento", "Avisou que pagou", "Pago", "Entregue", "Cancelado"];
const CORES = {
  "Aguardando pagamento": "#FFF3BF",
  "Avisou que pagou": "#FFD8A8",
  "Pago": "#B2F2BB",
  "Entregue": "#E9ECEF",
  "Cancelado": "#FFC9C9",
};

// ponytail: a URL do script é pública (está no site), então qualquer um pode criar pedido falso.
// Eles só aparecem como "Aguardando pagamento"; "Pago" quem marca é você, depois de ver o Pix no banco.
function doPost(e) {
  let dados;
  try {
    dados = JSON.parse(e.postData.contents);
  } catch (err) {
    return resposta({ ok: false, erro: "JSON inválido" });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const aba = SpreadsheetApp.getActive().getSheetByName(ABA) || configurar();
    if (dados.acao === "pagou") return resposta(marcarAvisou(aba, dados.codigo));

    const p = validarPedido(dados);
    if (!p) return resposta({ ok: false, erro: "Pedido inválido" });
    aba.appendRow([new Date(), p.codigo, p.nome, p.itens, p.quantidade, p.total, STATUS[0], "", ""]);
    return resposta({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function validarPedido(d) {
  const codigo = String(d.codigo || "");
  const nome = texto(d.nome, 60);
  const quantidade = Number(d.quantidade);
  const total = Number(String(d.total || "").replace(/\./g, "").replace(",", ".")); // "1.025,50" → 1025.5
  const ok = /^[A-Za-z0-9]{1,25}$/.test(codigo) && nome !== "" &&
    Number.isInteger(quantidade) && quantidade >= 1 && quantidade <= 200 &&
    total > 0 && total <= 10000;
  return ok ? { codigo, nome, itens: texto(d.itens, 300), quantidade, total } : null;
}

// Corta, tira quebras de linha e impede que o texto vire fórmula na planilha (ex.: "=IMPORTXML(...)").
function texto(valor, max) {
  const s = String(valor || "").replace(/\s+/g, " ").trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function marcarAvisou(aba, codigo) {
  if (!/^[A-Za-z0-9]{1,25}$/.test(String(codigo || ""))) return { ok: false, erro: "Código inválido" };
  const linhas = aba.getDataRange().getValues();
  for (let i = linhas.length - 1; i >= 1; i--) {
    if (linhas[i][COL.codigo - 1] !== codigo) continue;
    aba.getRange(i + 1, COL.avisou).setValue(new Date());
    if (linhas[i][COL.status - 1] === STATUS[0]) aba.getRange(i + 1, COL.status).setValue(STATUS[1]);
    return { ok: true };
  }
  return { ok: false, erro: "Pedido não encontrado" };
}

function resposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Rode uma vez pelo editor (selecione "configurar" e clique em Executar). Pode rodar de novo sem perder dados.
function configurar() {
  const ss = SpreadsheetApp.getActive();
  const aba = ss.getSheetByName(ABA) || ss.insertSheet(ABA, 0);

  aba.getRange(1, 1, 1, COLUNAS.length).setValues([COLUNAS])
    .setFontWeight("bold").setBackground("#FFC93C").setFontColor("#2B2118");
  aba.setFrozenRows(1);
  aba.getRange("A2:A").setNumberFormat("dd/MM HH:mm");
  aba.getRange("H2:H").setNumberFormat("dd/MM HH:mm");
  aba.getRange("F2:F").setNumberFormat("R$ #,##0.00");
  aba.getRange("G2:G").setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUS, true).setAllowInvalid(false).build()
  );
  aba.setConditionalFormatRules(STATUS.map((s) =>
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=$G2="${s}"`)
      .setBackground(CORES[s])
      .setRanges([aba.getRange("A2:I")])
      .build()
  ));
  aba.setColumnWidth(3, 160);
  aba.setColumnWidth(4, 240);
  aba.setColumnWidth(7, 170);

  const resumo = ss.getSheetByName("Resumo") || ss.insertSheet("Resumo");
  const p = "Pedidos!";
  resumo.getRange("A1:B7").setValues([
    ["Resumo", ""],
    ["Pedidos hoje (sem cancelados)", `=SUMPRODUCT((INT(${p}A2:A)=TODAY())*(${p}B2:B<>"")*(${p}G2:G<>"Cancelado"))`],
    ["Recebido hoje (Pago + Entregue)", `=SUMPRODUCT((INT(${p}A2:A)=TODAY())*((${p}G2:G="Pago")+(${p}G2:G="Entregue"))*${p}F2:F)`],
    ["Avisaram que pagaram (conferir no banco)", `=COUNTIF(${p}G2:G,"Avisou que pagou")`],
    ["Aguardando pagamento", `=COUNTIF(${p}G2:G,"Aguardando pagamento")`],
    ["Pagos, falta entregar", `=COUNTIF(${p}G2:G,"Pago")`],
    ["Recebido no total (Pago + Entregue)", `=SUMIF(${p}G2:G,"Pago",${p}F2:F)+SUMIF(${p}G2:G,"Entregue",${p}F2:F)`],
  ]);
  resumo.getRange("A1").setFontWeight("bold").setFontSize(14);
  resumo.getRange("B3").setNumberFormat("R$ #,##0.00");
  resumo.getRange("B7").setNumberFormat("R$ #,##0.00");
  resumo.setColumnWidth(1, 300);

  return aba;
}
