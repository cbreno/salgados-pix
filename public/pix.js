// BR Code (EMV QRCPS-MPM) do Pix estático com valor.

const campo = (id, valor) => id + String(valor.length).padStart(2, "0") + valor;

export const limparTexto = (texto, max) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();

export function crc16(texto) {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function chaveValida(chave) {
  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(chave) && chave.length <= 77 || // e-mail
    /^\+55\d{10,11}$/.test(chave) || // telefone
    /^(\d{11}|\d{14})$/.test(chave) || // CPF / CNPJ
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chave) // aleatória
  );
}

export function formatarValor(centavos) {
  if (!Number.isInteger(centavos) || centavos <= 0) throw new Error("valorCentavos deve ser inteiro positivo");
  return `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, "0")}`;
}

export function gerarPix({ chave, nome, cidade, valorCentavos, txid }) {
  chave = String(chave ?? "").trim();
  if (!chaveValida(chave)) throw new Error("Chave Pix inválida");
  const nomeLimpo = limparTexto(nome, 25);
  const cidadeLimpa = limparTexto(cidade, 15);
  if (!nomeLimpo || !cidadeLimpa) throw new Error("Nome e cidade são obrigatórios");
  const txidLimpo = String(txid ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";

  const payload =
    campo("00", "01") +
    campo("26", campo("00", "br.gov.bcb.pix") + campo("01", chave)) +
    campo("52", "0000") +
    campo("53", "986") +
    campo("54", formatarValor(valorCentavos)) +
    campo("58", "BR") +
    campo("59", nomeLimpo) +
    campo("60", cidadeLimpa) +
    campo("62", campo("05", txidLimpo)) +
    "6304";
  return payload + crc16(payload);
}

export function gerarCodigoPedido(nome, agora = new Date()) {
  const primeiro = limparTexto(nome, 99).split(" ")[0].replace(/[^A-Za-z]/g, "").toUpperCase() || "PEDIDO";
  const dd = String(agora.getDate()).padStart(2, "0");
  const hh = String(agora.getHours()).padStart(2, "0");
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I para facilitar a leitura
  const sufixo = Array.from({ length: 2 }, () => abc[Math.floor(Math.random() * abc.length)]).join("");
  return primeiro.slice(0, 19) + dd + hh + sufixo;
}
