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
    const { sessionId, userName, couponCode = '' } = JSON.parse(event.body || '{}');

    if (!sessionId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'sessionId obrigatório' }) };
    }

    const baseAmount = money(process.env.RASTREIONE_PAYMENT_AMOUNT || 89.99);
    const coupon = findCoupon(couponCode);
    const hasCoupon = String(couponCode || '').trim().length > 0;

    if (hasCoupon && !coupon) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Cupom inválido ou expirado' }),
      };
    }

    const discountPercent = coupon ? clampDiscount(coupon.discount) : 0;
    const finalAmount = money(baseAmount * (1 - discountPercent / 100));

    if (coupon && (discountPercent >= 100 || finalAmount <= 0)) {
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: true,
          freeAccess: true,
          couponCode: coupon.code,
          discountPercent: 100,
          baseAmount,
          finalAmount: 0,
        }),
      };
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
          description: 'Relatório completo com síntese clínica, gráfico radar e PDF para download',
          unit_price: finalAmount,
          quantity: 1,
          currency_id: 'BRL',
        },
      ],
      payer: {
        name: userName || 'Usuário',
      },
      external_reference: sessionId,
      back_urls: {
        success: `${siteUrl}/?status=approved&session_id=${encodeURIComponent(sessionId)}`,
        failure: `${siteUrl}/?status=failure&session_id=${encodeURIComponent(sessionId)}`,
        pending: `${siteUrl}/?status=pending&session_id=${encodeURIComponent(sessionId)}`,
      },
      auto_return: 'approved',
      statement_descriptor: 'RASTREIONEURO',
      metadata: {
        coupon_code: coupon ? coupon.code : null,
        discount_percent: discountPercent,
        base_amount: baseAmount,
        final_amount: finalAmount,
      },
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
        couponCode: coupon ? coupon.code : null,
        discountPercent,
        baseAmount,
        finalAmount,
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

function money(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 89.99;
  return Math.round(parsed * 100) / 100;
}

function clampDiscount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
}

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

function findCoupon(inputCode) {
  const code = normalizeCode(inputCode);
  if (!code) return null;
  return getCoupons().find(coupon => normalizeCode(coupon.code) === code) || null;
}

function getCoupons() {
  const raw = process.env.RASTREIONE_COUPONS || process.env.RASTREIONEURO_COUPONS || '';
  if (!raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map(item => ({ code: normalizeCode(item.code), discount: clampDiscount(item.discount) }))
        .filter(item => item.code && item.discount > 0);
    }
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed)
        .map(([code, discount]) => ({ code: normalizeCode(code), discount: clampDiscount(discount) }))
        .filter(item => item.code && item.discount > 0);
    }
  } catch {}

  return raw
    .split(',')
    .map(part => {
      const [code, discount] = part.split(':');
      return { code: normalizeCode(code), discount: clampDiscount(discount) };
    })
    .filter(item => item.code && item.discount > 0);
}

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
