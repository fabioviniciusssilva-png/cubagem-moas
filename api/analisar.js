export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({error:'Method not allowed'}); return; }

  try {
    const { imageBase64, mediaType } = req.body;
    if (!imageBase64 || !mediaType) {
      res.status(400).json({error:'imageBase64 e mediaType sao obrigatorios'});
      return;
    }

    const prompt = 'Analise a foto de caixas ou pallet. Retorne APENAS este JSON sem texto extra: {"C":60,"L":40,"A":30,"qtd":1,"conf":"alta","obs":"motivo"} onde C=comprimento L=largura A=altura em CENTIMETROS inteiros. Se houver etiqueta com medidas use-as. Pallet padrao=120x100cm de base. qtd=numero de caixas iguais.';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) { res.status(500).json({error: data.error.message}); return; }

    const block = data.content && data.content.find(b => b.type === 'text');
    const txt = block ? block.text.trim() : '';
    const m = txt.match(/\{[^{}]*\}/);
    if (!m) { res.status(422).json({error:'IA nao retornou dimensoes validas'}); return; }

    const parsed = JSON.parse(m[0]);
    res.status(200).json(parsed);

  } catch(err) {
    res.status(500).json({error: err.message || 'Erro interno'});
  }
}
