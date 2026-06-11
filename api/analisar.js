const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({error:'Method not allowed'}); return; }

  try {
    const { imageBase64, mediaType } = req.body;
    if (!imageBase64 || !mediaType) {
      res.status(400).json({error:'imageBase64 e mediaType obrigatorios'});
      return;
    }

    const AKEY = process.env.ANTHROPIC_API_KEY;
    if (!AKEY) { res.status(500).json({error:'API key nao configurada'}); return; }

    const prompt = 'Analise a foto. Retorne APENAS JSON: {"C":60,"L":40,"A":30,"qtd":1,"conf":"alta","obs":"motivo"} onde C=comprimento L=largura A=altura em CENTIMETROS. Se houver etiqueta com medidas, use-as. Pallet padrao=120x100cm.';

    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: prompt }
        ]
      }]
    });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'x-api-key': AKEY,
          'anthropic-version': '2023-06-01'
        }
      };
      const reqHttp = https.request(options, (resp) => {
        let data = '';
        resp.on('data', (chunk) => { data += chunk; });
        resp.on('end', () => { resolve(data); });
      });
      reqHttp.on('error', reject);
      reqHttp.write(body);
      reqHttp.end();
    });

    const data = JSON.parse(result);
    if (data.error) { res.status(500).json({error: data.error.message || 'Erro da API'}); return; }

    const block = data.content && data.content.find(b => b.type === 'text');
    const txt = block ? block.text.trim() : '';
    const m = txt.match(/{[^{}]*}/);
    if (!m) { res.status(422).json({error: 'IA nao retornou dimensoes. Tente foto mais proxima.'}); return; }

    const parsed = JSON.parse(m[0]);
    res.status(200).json(parsed);

  } catch(err) {
    res.status(500).json({error: err.message || 'Erro interno'});
  }
};
