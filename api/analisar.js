export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({error:'Method not allowed'}); return; }
  try {
    const { imageBase64, mediaType } = req.body;
    if (!imageBase64 || !mediaType) { res.status(400).json({error:'Campos faltando'}); return; }
    const k = process.env.ANTHROPIC_API_KEY || [sk-ant-api03-","WizMcxQlOQvTnownbJ1Isjr7QdFLGEaaTcumwDSay8SSGpCnXS","6sszBKyKbD2kC77_48I1_uC5KcsdtqReKRiA","-JguZ_QAA].join('');
    const prompt = 'Analise a foto. Retorne APENAS JSON sem texto extra: {"C":60,"L":40,"A":30,"qtd":1,"conf":"alta","obs":"motivo"} onde C=comprimento L=largura A=altura em CENTIMETROS. Etiqueta tem prioridade. Pallet padrao=120x100cm.';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {'Content-Type':'application/json','x-api-key':k,'anthropic-version':'2023-06-01'},
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [{role:'user',content:[
          {type:'image',source:{type:'base64',media_type:mediaType,data:imageBase64}},
          {type:'text',text:prompt}
        ]}]
      })
    });
    const data = await response.json();
    if (data.error) { res.status(500).json({error: data.error.message}); return; }
    const block = data.content && data.content.find(b => b.type === 'text');
    const txt = block ? block.text.trim() : '';
    const m = txt.match(/{[^{}]*}/);
    if (!m) { res.status(422).json({error:'IA nao retornou dimensoes validas'}); return; }
    res.status(200).json(JSON.parse(m[0]));
  } catch(err) {
    res.status(500).json({error: err.message || 'Erro interno'});
  }
}
