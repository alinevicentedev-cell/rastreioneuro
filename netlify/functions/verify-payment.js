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
    const { paymentId, sessionId } = JSON.parse(event.body || '{}');

    if (!paymentId && !sessionId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'paymentId ou sessionId obrigatório' }) };
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'MERCADOPAGO_ACCESS_TOKEN não configurado' }) };
    }

    // Consulta detalhes do pagamento na API do MP
    const payment = paymentId
      ? await getMPPayment(paymentId, accessToken)
      : await findApprovedPaymentByReference(sessionId, accessToken);

    if (!payment) {
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: false,
          status: 'not_found',
          statusDetail: 'Pagamento aprovado ainda não encontrado para esta sessão.',
        }),
      };
    }

    if (sessionId && payment.external_reference && payment.external_reference !== sessionId) {
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: false,
          status: 'reference_mismatch',
          statusDetail: 'O pagamento não pertence a esta sessão.',
        }),
      };
    }

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

function findApprovedPaymentByReference(sessionId, accessToken) {
  return new Promise((resolve, reject) => {
    const query = `/v1/payments/search?external_reference=${encodeURIComponent(sessionId)}&sort=date_created&criteria=desc`;
    const options = {
      hostname: 'api.mercadopago.com',
      path: query,
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
            return;
          }

          const payments = Array.isArray(parsed.results) ? parsed.results : [];
          const approved = payments.find(payment => payment.status === 'approved');
          resolve(approved || payments[0] || null);
        } catch (e) {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}
