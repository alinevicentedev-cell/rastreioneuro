// ================================================================
// verify-payment.js — Netlify Function
// Verifica com o Mercado Pago se um pagamento foi aprovado
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
    const { paymentId } = JSON.parse(event.body || '{}');

    if (!paymentId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'paymentId obrigatório' }) };
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'MERCADOPAGO_ACCESS_TOKEN não configurado' }) };
    }

    // Consulta detalhes do pagamento na API do MP
    const payment = await getMPPayment(paymentId, accessToken);

    if (payment.status === 'approved') {
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: true,
          paymentId: payment.id,
          externalReference: payment.external_reference,
          amount: payment.transaction_amount,
        }),
      };
    } else {
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: false,
          status: payment.status,
          statusDetail: payment.status_detail,
        }),
      };
    }

  } catch (err) {
    console.error('verify-payment.js error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao verificar pagamento', details: err.message }),
    };
  }
};

function getMPPayment(paymentId, accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.mercadopago.com',
      path: `/v1/payments/${paymentId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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
    req.end();
  });
}
