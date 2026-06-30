// ================================================================
// analyze.js - Netlify Function
// Gera a analise do rastreio com OpenAI Responses API
// ================================================================

const OpenAI = require('openai');

const DISORDERS = {
  tdah: 'Transtorno do Deficit de Atencao e Hiperatividade',
  tea: 'Transtorno do Espectro Autista',
  ah: 'Altas Habilidades / Superdotacao',
  tag: 'Transtorno de Ansiedade Generalizada',
  panic: 'Transtorno do Panico',
  agor: 'Agorafobia',
  tas: 'Transtorno de Ansiedade Social',
  toc: 'Transtorno Obsessivo-Compulsivo',
  dep: 'Transtornos Depressivos',
  bipolar: 'Transtornos Bipolares e Relacionados',
  cyclo: 'Transtorno Ciclotimico',
  tpb: 'Transtorno de Personalidade Borderline',
  tpoc: 'Transtorno de Personalidade Obsessivo-Compulsiva',
};

const REQUIRED_IDS = Object.keys(DISORDERS);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const body = JSON.parse(event.body || '{}');
    const payload = buildPayload(body);

    if (!payload) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Dados do rastreio incompletos' }),
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OPENAI_API_KEY nao configurada' }),
      };
    }

    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL || 'gpt-5.5';

    const response = await client.responses.create({
      model,
      instructions: [
        'Voce apoia a elaboracao de uma sintese de rastreio neuropsicologico baseada em autorrelato.',
        'Escreva em portugues do Brasil, com tom clinico, acolhedor, especifico e profissional.',
        'A devolutiva publica deve informar que o rastreio e estruturado segundo DSM-5-TR e CID-11.',
        'Nao mencione IA, inteligencia artificial, modelo, OpenAI, algoritmo ou automacao no texto entregue.',
        'Nunca afirme diagnostico. Use termos como indicadores, sinais, rastreio, hipoteses a investigar e recomendacao de avaliacao profissional.',
        'Nao diga que a pessoa tem um transtorno. Diga que as respostas sugerem maior ou menor presenca de caracteristicas associadas.',
        'Diferencie criterios por inicio, duracao, curso, padrao episodico, persistencia, multiplos contextos e prejuizo funcional.',
        'Para TDAH e TEA, valorize inicio no periodo do desenvolvimento e presenca em diferentes contextos.',
        'Para bipolaridade e ciclotimia, valorize episodio, energia aumentada, sono reduzido, duracao, alternancia e diferencie de reatividade emocional de personalidade.',
        'Para ansiedade, diferencie preocupacao generalizada, ataques de panico, agorafobia e medo de avaliacao social.',
        'Para TOC, diferencie obsessao/compulsao de perfeccionismo de personalidade.',
        'Se houver conteudo de sofrimento intenso, autolesao ou risco, recomende buscar ajuda profissional imediata e suporte de emergencia.',
        'Cada texto deve ter entre 110 e 170 palavras, mencionar a porcentagem recebida, principais sinais marcados, pontos diferenciais e proximos passos.',
      ].join(' '),
      input: buildPrompt(payload),
      text: {
        format: {
          type: 'json_schema',
          name: 'rastreioneuro_analysis',
          strict: true,
          schema: buildSchema(),
        },
      },
      max_output_tokens: 5200,
    });

    const text = extractResponseText(response);
    const parsed = JSON.parse(text);

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizeAnalysis(parsed)),
    };
  } catch (err) {
    console.error('analyze.js error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao gerar analise', details: err.message }),
    };
  }
};

function buildPayload(body) {
  if (!body || typeof body !== 'object' || !body.scores) return null;

  const scores = {};
  for (const id of REQUIRED_IDS) {
    const value = Number(body.scores[id] || 0);
    scores[id] = Math.max(0, Math.min(100, Math.round(value)));
  }

  return {
    name: String(body.name || 'Pessoa avaliada').slice(0, 80),
    description: String(body.description || '').slice(0, 3000),
    scores,
    answers: Array.isArray(body.answers) ? body.answers.slice(0, 120) : [],
  };
}

function buildPrompt(payload) {
  const scores = REQUIRED_IDS
    .map((id) => `- ${DISORDERS[id]} (${id}): ${payload.scores[id]}%`)
    .join('\n');

  const answers = payload.answers
    .filter((item) => item && item.d && item.r)
    .map((item) => `- ${DISORDERS[item.d] || item.d} | ${item.cat || 'Sem categoria'} | ${item.type || 'freq'}: "${item.q || ''}" -> ${item.r}`)
    .join('\n');

  return [
    `Nome ou pseudonimo: ${payload.name}`,
    `Autodescricao: ${payload.description || 'Nao informada.'}`,
    '',
    'Percentuais calculados pelo questionario:',
    scores,
    '',
    'Respostas do questionario:',
    answers || 'Nao informadas.',
    '',
    'Tarefa: gere um texto individual para cada indicador. O texto deve ser especifico, clinico e util para levar a um neuropsicologo, psiquiatra, neurologista ou medico especialista. Inclua o que favorece a hipotese, o que precisa ser diferenciado e quais informacoes profissionais deveriam ser investigadas. Reforce que o resultado e um rastreio, nao um diagnostico.',
  ].join('\n');
}

function buildSchema() {
  const properties = {};
  for (const id of REQUIRED_IDS) properties[id] = { type: 'string' };

  return {
    type: 'object',
    additionalProperties: false,
    required: ['analysis'],
    properties: {
      analysis: {
        type: 'object',
        additionalProperties: false,
        required: REQUIRED_IDS,
        properties,
      },
    },
  };
}

function extractResponseText(response) {
  if (response.output_text) return response.output_text;

  const parts = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) parts.push(content.text);
      if (content.type === 'text' && content.text) parts.push(content.text);
    }
  }
  return parts.join('\n');
}

function normalizeAnalysis(parsed) {
  const analysis = parsed && parsed.analysis ? parsed.analysis : {};
  for (const id of REQUIRED_IDS) {
    if (!analysis[id]) {
      analysis[id] = `O indicador de ${DISORDERS[id]} foi calculado, mas a sintese textual nao foi concluida. Recomenda-se interpretar o percentual como parte de um rastreio inicial, sem valor diagnostico, e levar o resultado para avaliacao profissional.`;
    }
  }
  return { analysis };
}
