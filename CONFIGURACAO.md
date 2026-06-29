# RastreioNeuro – Guia de Configuração e Deploy

**rastreioneuro.com.br**

Siga este guia passo a passo. Não é necessário saber programar — cada etapa está explicada em detalhes.

---

## Estrutura dos arquivos

```
rastreio-ran/
├── index.html                          ← O site inteiro (front-end)
├── netlify.toml                        ← Configuração do Netlify
├── package.json                        ← Dependências Node.js
├── netlify/
│   └── functions/
│       ├── analyze.js                  ← Análise por IA (OpenAI)
│       ├── create-payment.js           ← Cria pagamento (Mercado Pago)
│       └── verify-payment.js           ← Verifica pagamento
└── CONFIGURACAO.md                     ← Este arquivo
```

> **Domínio já adquirido:** `rastreioneuro.com.br` (registro.br)

---

## ETAPA 1 — Criar conta no GitHub e subir os arquivos

1. Acesse **github.com** e crie uma conta gratuita (se ainda não tiver)
2. Clique em **"New repository"** (botão verde no canto superior direito)
3. Nome do repositório: `rastreio-ran` (ou qualquer nome)
4. Deixe como **Public** e clique em **"Create repository"**
5. Na tela seguinte, clique em **"uploading an existing file"**
6. Arraste a **pasta rastreio-ran inteira** (ou selecione todos os arquivos)
7. Clique em **"Commit changes"**

---

## ETAPA 2 — Conectar ao Netlify

1. Acesse **netlify.com** e faça login com sua conta GitHub
2. Clique em **"Add new site" → "Import an existing project"**
3. Escolha **GitHub** e autorize o acesso
4. Selecione o repositório `rastreio-ran`
5. As configurações de build serão detectadas automaticamente (via `netlify.toml`)
6. Clique em **"Deploy site"**

O Netlify vai gerar uma URL temporária tipo `ran-abc123.netlify.app`. Você pode personalizar depois.

---

## ETAPA 3 — Obter sua chave da API da OpenAI

Esta é a chave para a análise de IA do relatório.

1. Acesse **platform.openai.com** e crie ou acesse sua conta
2. Vá em **"API keys"**
3. Clique em **"Create new secret key"**
4. Dê um nome (ex: "RastreioNeuro") e clique para criar
5. **COPIE a chave agora** — ela começa com `sk-...` e não será mostrada novamente
6. Guarde em local seguro

---

## ETAPA 4 — Obter sua chave do Mercado Pago

1. Acesse **mercadopago.com.br** e faça login na sua conta
2. Vá em: **Seu Perfil → "Seu negócio" → "Configurações" → "Credenciais"**
   - Ou acesse diretamente: `mercadopago.com.br/developers/panel/app`
3. Clique em **"Criar aplicação"**
   - Nome: `RAN Rastreio` (qualquer nome)
   - Produto: **Checkout Pro**
   - Clique em **"Criar aplicação"**
4. Dentro da aplicação criada, clique em **"Credenciais de produção"**
5. Você verá dois campos:
   - **Public Key** — começa com `APP_USR-...`
   - **Access Token** — começa com `APP_USR-...` (mais longo)
6. **COPIE o Access Token** — é este que você vai usar

> **Nota sobre modo teste:** Durante os testes, use as "Credenciais de teste/sandbox". Troque para produção quando for ao ar de verdade.

---

## ETAPA 5 — Configurar as variáveis de ambiente no Netlify

Com as duas chaves em mãos:

1. No Netlify, vá em: **Site → "Site configuration" → "Environment variables"**
2. Clique em **"Add a variable"** para cada variável abaixo:

| Nome da variável | Valor |
|-----------------|-------|
| `OPENAI_API_KEY` | Sua chave da OpenAI (começa com `sk-`) |
| `OPENAI_MODEL` | Opcional. Se não preencher, o site usa `gpt-5.5` |
| `MERCADOPAGO_ACCESS_TOKEN` | Seu Access Token do Mercado Pago |
| `SITE_URL` | `https://rastreioneuro.com.br` (ou a URL temporária do Netlify) |

3. Após adicionar todas, clique em **"Save"**
4. Vá em **"Deploys" → "Trigger deploy" → "Deploy site"** para o site recarregar com as novas variáveis

---

## ETAPA 6 — Personalizar domínio (opcional mas recomendado)

### Opção A — Usar seu domínio rastreioneuro.com.br (recomendado)

Você já tem o domínio! Siga estes passos:

1. No Netlify, vá em **"Domain management" → "Add custom domain"**
2. Digite `rastreioneuro.com.br` e confirme
3. O Netlify vai mostrar os **nameservers** (servidores DNS) que você precisa configurar
4. Acesse **registro.br/painel/dominios** → clique em `rastreioneuro.com.br` → **"Editar DNS"**
5. Substitua os nameservers atuais pelos que o Netlify indicar (normalmente são algo como `dns1.p01.nsone.net`)
6. Aguarde até 24h para propagar — geralmente é mais rápido

### Opção B — Subdomínio gratuito no Netlify (enquanto configura o DNS)
Vá em **"Domain management" → "Options" → "Edit site name"** e escolha um nome temporário como `rastreioneuro.netlify.app`

---

## ETAPA 7 — Adicionar botão no seu site Wix

1. No Wix, edite a página onde quer adicionar o acesso ao RAN
2. Adicione um botão (ex: "Fazer Rastreio Completo")
3. No link do botão, coloque a URL do seu site RAN (ex: `https://ran.netlify.app`)
4. Marque "Abrir em nova aba"

---

## Testando o pagamento (antes de ir ao ar)

Para testar sem cobrar de verdade:

1. No painel do Mercado Pago, use as **credenciais de sandbox** (teste) no lugar das credenciais de produção
2. Use os [cartões de teste do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/your-integrations/test/cards):
   - Cartão aprovado: `5031 4332 1540 6351` | CVV: `123` | Validade: qualquer data futura

---

## Custos estimados (por mês)

| Serviço | Custo |
|---------|-------|
| Netlify (Starter) | Gratuito |
| GitHub | Gratuito |
| OpenAI API | Varia conforme o modelo escolhido e o tamanho das respostas |
| Mercado Pago | 4,99% + R$ 0,49 por transação aprovada |
| Domínio .com.br | ~R$ 40/ano (opcional) |

Para cada R$ 89,99 recebido, a taxa final depende do meio de pagamento e do prazo de recebimento escolhido no Mercado Pago.

---

## Dúvidas frequentes

**P: E se a análise de IA falhar?**
R: O sistema tem um fallback automático — ele gera um texto padrão baseado nos percentuais, sem depender da API.

**P: Os dados dos usuários ficam salvos onde?**
R: Apenas no navegador do próprio usuário (localStorage). Nenhum dado pessoal vai para servidores.

**P: Posso mudar o preço?**
R: Sim. Em `index.html`, procure por `89.99` e troque pelo valor desejado. Em `create-payment.js`, o valor vem do front-end.

**P: E se o usuário fechar o navegador após pagar?**
R: Os dados ficam em localStorage. Se o usuário voltar ao site no mesmo navegador/dispositivo e clicar de novo no link de pagamento aprovado, o sistema vai recuperar os dados e mostrar o relatório.

---

## Suporte

Em caso de dúvidas técnicas, envie email para: neuropsicologaalinevicente@gmail.com
