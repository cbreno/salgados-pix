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
