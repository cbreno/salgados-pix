# Salgados do Grêmio

Site estático (HTML, CSS e JS puros) para vender salgados e Coca lata com pagamento via Pix.

## Rodar localmente

Módulos ES não funcionam abrindo o arquivo direto (`file://`), então é preciso um servidor local. Na pasta do projeto:

```sh
python -m http.server 8000 -d public
# ou
npx serve public
```

Depois abra http://localhost:8000 (ou o endereço que o `serve` mostrar).

## Mudar preços, chave Pix, etc.

Tudo fica em `public/config.js`. Os preços estão em **centavos**:

```js
{ id: "salgado", nome: "Salgado", preco: 1000, curto: ["salgado", "salgados"] }, // R$ 10,00
{ id: "coca", nome: "Coca lata", preco: 550, curto: ["Coca", "Cocas"] },          // R$ 5,50
```

Para adicionar um produto, inclua mais uma linha na lista `produtos` com um `id` único. `curto` (singular e plural) aparece no resumo, ex.: "2 salgados + 1 Coca".

## Cartaz para imprimir

Abra `/cartaz.html` **no endereço publicado** (ex.: https://salgados-pix.vercel.app/cartaz.html) e clique em "Imprimir cartaz" (A4, margens: nenhuma). O QR aponta para o endereço onde o cartaz foi aberto; para fixar outro, preencha `urlSite` no `config.js`.

## Controle de pedidos (Google Planilhas)

Cada "Gerar Pix" vira uma linha na planilha com status **Aguardando pagamento**. Quando o cliente toca em "Já paguei", o status muda para **Avisou que pagou**. Você confere o Pix no banco (o código do pedido aparece como identificador) e muda para **Pago** e depois **Entregue**. A aba **Resumo** mostra os pedidos e o valor recebido no dia.

Configuração (uma vez só):

1. Crie uma planilha em https://sheets.new.
2. Abra **Extensões → Apps Script**, apague o conteúdo e cole o arquivo `apps-script/Codigo.gs`. Salve.
3. Na barra de cima, escolha a função `configurar` e clique em **Executar**. Autorize com a sua conta (em "app não verificado", clique em *Avançado → Acessar*). Isso cria as abas **Pedidos** e **Resumo**.
4. Clique em **Implantar → Nova implantação**, tipo **App da Web**:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
5. Copie a URL que termina em `/exec`, cole em `urlPlanilha` no `public/config.js`, faça commit e push.

Se mudar o `Codigo.gs` depois, vá em **Implantar → Gerenciar implantações → editar → Nova versão** para a URL continuar a mesma.

Testes do script: `node --test tests/planilha.test.mjs`.
