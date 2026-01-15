const BLACKCAT_API_BASE = 'https://api.blackcatpagamentos.online/api';

// Carregar configurações
let getConfig;
try {
  const configLoader = require('../config-loader');
  getConfig = configLoader.getConfig;
} catch (e) {
  // Fallback para variáveis de ambiente apenas
  getConfig = (key) => process.env[key] || null;
}

module.exports = async function handler(req, res) {
  // Configurar CORS básico
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder a preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apenas aceitar GET
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  // Verificar API Key (do config.json ou variável de ambiente)
  const apiKey = getConfig('BLACKCAT_API_KEY');
  if (!apiKey) {
    console.error('BLACKCAT_API_KEY não configurada');
    return res.status(500).json({
      success: false,
      message: 'API Key não configurada. Configure no config.json ou variável de ambiente BLACKCAT_API_KEY'
    });
  }

  try {
    const { transactionId } = req.query;

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'transactionId é obrigatório' });
    }

    // Sanitização do transactionId
    if (typeof transactionId !== 'string' || transactionId.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(transactionId)) {
      return res.status(400).json({ success: false, message: 'transactionId inválido' });
    }

    // Chamar API BlackCat
    const response = await fetch(`${BLACKCAT_API_BASE}/sales/${transactionId}/status`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro na API BlackCat:', data);
      return res.status(response.status).json({
        success: false,
        message: data.message || 'Erro ao consultar status'
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
}

