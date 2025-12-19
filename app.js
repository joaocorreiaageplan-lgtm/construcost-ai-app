const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ConstruCost AI</title>
      <style>
        body { margin: 0; font-family: Arial, sans-serif; background: #f5f5f5; }
        header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; color: white; }
        .container { flex: 1; padding: 20px; }
        iframe { width: 100%; height: calc(100vh - 140px); border: none; border-radius: 8px; }
        footer { text-align: center; padding: 20px; background: rgba(0,0,0,0.1); color: #666; }
      </style>
    </head>
    <body>
      <header><h1>🏗️ ConstruCost AI</h1><p>Gerenciador Inteligente de Orçamentos</p></header>
      <div class="container">
        <iframe src="https://ai.studio/apps/drive/1ZNP3AgCyjdqe-pI7zfzQRYv3ERoEXs9H?showPreview=true" title="ConstruCost AI"></iframe>
      </div>
      <footer><p>Powered by Google AI Studio & Cloud Run</p></footer>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`ConstruCost AI rodando em porta ${PORT}`);
});
