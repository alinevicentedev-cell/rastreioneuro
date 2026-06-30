# RastreioNeuro - Guia de Configuracao e Deploy

Dominio principal: `rastreioneuro.com.br`

Repositorio GitHub: `alinevicentedev-cell/rastreioneuro`

Este projeto esta pronto para publicar na Netlify com:

- site estatico em `index.html`;
- funcoes serverless em `netlify/functions`;
- pagamento via Mercado Pago;
- sintese clinica automatizada via OpenAI;
- formulario de suporte compativel com Netlify Forms.

Importante: o relatorio e um rastreio baseado em autorrelato estruturado segundo DSM-5-TR e CID-11. Ele nao substitui avaliacao clinica, diagnostico medico, avaliacao neuropsicologica ou atendimento de urgencia.

---

## 1. Estrutura dos arquivos

```text
rastreioneuro/
  index.html
  netlify.toml
  package.json
  CONFIGURACAO.md
  netlify/
    functions/
      analyze.js
      create-payment.js
      verify-payment.js
```

O que cada arquivo faz:

- `index.html`: site completo, questionario, previa, paywall, relatorio, PDF e Word.
- `netlify.toml`: configuracao de deploy da Netlify.
- `package.json`: dependencias usadas pelas funcoes.
- `analyze.js`: gera a sintese clinica com OpenAI.
- `create-payment.js`: cria o checkout do Mercado Pago.
- `verify-payment.js`: verifica se o pagamento foi aprovado.

---

## 2. Publicar pela Netlify

1. Acesse `https://app.netlify.com`.
2. Clique em **Add new site**.
3. Escolha **Import an existing project**.
4. Selecione **GitHub**.
5. Escolha o repositorio `alinevicentedev-cell/rastreioneuro`.
6. Confira as configuracoes:
   - Base directory: deixe vazio.
   - Build command: deixe vazio.
   - Publish directory: `.`
   - Functions directory: `netlify/functions`
7. Clique em **Deploy site**.

A Netlify vai gerar uma URL temporaria. Depois voce conecta o dominio `rastreioneuro.com.br`.

---

## 3. Configurar a OpenAI

1. Acesse `https://platform.openai.com`.
2. Entre na sua conta.
3. Verifique se a conta tem billing/creditos ativos.
4. Va em **API keys**.
5. Clique em **Create new secret key**.
6. Copie a chave. Ela comeca com `sk-`.
7. Na Netlify, va em:
   **Site configuration** > **Environment variables**.
8. Adicione:

| Variavel | Valor |
|---|---|
| `OPENAI_API_KEY` | sua chave da OpenAI |
| `OPENAI_MODEL` | opcional. Se ficar vazio, usa `gpt-5.5` |

Depois de salvar as variaveis, va em **Deploys** > **Trigger deploy** > **Deploy site**.

Observacao: se o modelo escolhido nao estiver disponivel na sua conta, coloque outro modelo disponivel em `OPENAI_MODEL` e publique novamente.

---

## 4. Configurar o Mercado Pago

1. Acesse `https://www.mercadopago.com.br/developers/panel/app`.
2. Clique em **Criar aplicacao**.
3. Nome sugerido: `RastreioNeuro`.
4. Produto: **Checkout Pro**.
5. Depois de criar, abra a aplicacao.
6. Va em **Credenciais**.
7. Para testes, copie o **Access Token de teste**.
8. Para vender de verdade, use o **Access Token de producao**.

Na Netlify, adicione:

| Variavel | Valor |
|---|---|
| `MERCADOPAGO_ACCESS_TOKEN` | Access Token do Mercado Pago |
| `SITE_URL` | `https://rastreioneuro.com.br` ou a URL temporaria da Netlify |

O site cria automaticamente o checkout de R$ 89,99 e retorna para o relatorio quando o pagamento e aprovado.

### Teste do pagamento

1. Use credenciais de teste/sandbox do Mercado Pago.
2. Publique o site novamente na Netlify.
3. Faca um rastreio completo.
4. Clique para desbloquear o relatorio.
5. Use os cartoes de teste indicados pela documentacao do Mercado Pago.
6. Quando tudo estiver funcionando, troque para as credenciais de producao.

---

## 5. Configurar dominio

1. Na Netlify, va em **Domain management**.
2. Clique em **Add custom domain**.
3. Digite `rastreioneuro.com.br`.
4. A Netlify vai informar os nameservers.
5. Acesse o painel do `registro.br`.
6. Entre no dominio `rastreioneuro.com.br`.
7. Troque os nameservers pelos indicados pela Netlify.
8. Aguarde a propagacao. Pode levar ate 24 horas.

---

## 6. Formulario de suporte

O formulario de suporte ja esta preparado para Netlify Forms.

Depois do deploy:

1. Acesse o painel do site na Netlify.
2. Va em **Forms**.
3. Envie uma mensagem de teste pelo site.
4. Confirme se a mensagem aparece no painel.

Voce tambem pode configurar notificacoes por e-mail dentro da Netlify.

---

## 7. Fluxo do cliente

1. A pessoa informa nome ou pseudonimo, data de nascimento e autodescricao.
2. Responde 77 perguntas de rastreio.
3. O sistema calcula 13 indicadores.
4. A pessoa ve apenas uma previa limitada.
5. Para ver todas as porcentagens, sintese clinica, graficos e baixar PDF/Word, ela paga R$ 89,99.
6. Apos pagamento aprovado, o relatorio completo e liberado.

---

## 8. Checklist antes de vender

- `OPENAI_API_KEY` configurada na Netlify.
- `MERCADOPAGO_ACCESS_TOKEN` configurado na Netlify.
- `SITE_URL` configurada com a URL correta.
- Deploy novo feito depois de salvar as variaveis.
- Pagamento testado em sandbox.
- Pagamento testado em producao com valor real baixo, se possivel.
- Formulario de suporte testado.
- Dominio conectado e com HTTPS ativo.
- Aviso de que nao e diagnostico mantido no site e no PDF.

---

## 9. Custos

| Servico | Observacao |
|---|---|
| GitHub | gratuito para repositorio publico |
| Netlify | plano gratuito pode ser suficiente no inicio |
| OpenAI | varia conforme modelo, tamanho das respostas e volume de uso |
| Mercado Pago | cobra taxa por transacao aprovada |
| Dominio | pago no registro.br |

Para cada venda de R$ 89,99, o valor liquido depende da taxa do Mercado Pago e do prazo de recebimento escolhido.

---

## 10. Suporte tecnico

E-mail de suporte: `neuropsicologaalinevicente@gmail.com`

