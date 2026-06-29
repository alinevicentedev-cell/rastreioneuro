// ================================================================
// create-payment.js — Netlify Function
// Cria preferência de pagamento no Mercado Pago (Checkout Pro)
// ================================================================

const https = require('https');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const { sessionId, userName, amount = 89.99 } = JSON.parse(event.body || '{}');

    if (!sessionId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'sessionId obrigatório' }) };
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'MERCADOPAGO_ACCESS_TOKEN não configurado' }) };
    }

    // URL base do site (configurada como variável de ambiente no Netlify)
    const inferredUrl = event.headers.origin || (event.headers.host ? `https://${event.headers.host}` : '');
    const siteUrl = (process.env.SITE_URL || inferredUrl).replace(/\/$/, '');

    // Monta o body da preferência
    const preference = {
      items: [
        {
          title: 'RastreioNeuro – Rastreio para Avaliação Neuropsicológica',
          description: 'Relatório completo com análise de IA, gráfico radar e PDF para download',
          unit_price: Number(amount),
          quantity: 1,
          currency_id: 'BRL',
        },
      ],
      payer: {
        name: userName || 'Usuário',
      },
      external_reference: sessionId,
      back_urls: {
        success: `${siteUrl}/?status=approved`,
        failure: `${siteUrl}/?status=failure`,
        pending: `${siteUrl}/?status=pending`,
      },
      auto_return: 'approved',
      statement_descriptor: 'RASTREIONEURO',
      // Expira em 24h
      expires: true,
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    // Chama API do Mercado Pago
    const mpResponse = await callMercadoPago('/checkout/preferences', 'POST', preference, accessToken, sessionId);
    const checkoutUrl = accessToken.startsWith('TEST-')
      ? (mpResponse.sandbox_init_point || mpResponse.init_point)
      : mpResponse.init_point;

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: mpResponse.id,
        init_point: checkoutUrl,
        sandbox_init_point: mpResponse.sandbox_init_point, // URL de teste
      }),
    };

  } catch (err) {
    console.error('create-payment.js error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao criar pagamento', details: err.message }),
    };
  }
};

// Utilitário: chama a API REST do Mercado Pago
function callMercadoPago(path, method, body, accessToken, idempotencyKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const options = {
      hostname: 'api.mercadopago.com',
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Idempotency-Key': `ran-${idempotencyKey || Date.now()}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`MP API error ${res.statusCode}: ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}
