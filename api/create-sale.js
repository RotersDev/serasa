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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder a preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apenas aceitar POST
  if (req.method !== 'POST') {
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
    const { amount, itemTitle, customerName, customerEmail, customerPhone, customerDocument } = req.body;

    // Validações e sanitização
    if (!amount || amount <= 0 || !isFinite(amount) || amount > 1000000) {
      return res.status(400).json({ success: false, message: 'Valor inválido' });
    }

    if (!customerName || !customerEmail || !customerPhone || !customerDocument) {
      return res.status(400).json({ success: false, message: 'Dados do cliente incompletos' });
    }

    // Sanitização básica
    if (typeof customerName !== 'string' || customerName.length > 200) {
      return res.status(400).json({ success: false, message: 'Nome inválido' });
    }

    if (typeof customerEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) || customerEmail.length > 200) {
      return res.status(400).json({ success: false, message: 'Email inválido' });
    }

    if (typeof customerPhone !== 'string' || customerPhone.length > 20) {
      return res.status(400).json({ success: false, message: 'Telefone inválido' });
    }

    if (typeof customerDocument !== 'string' || customerDocument.length > 20) {
      return res.status(400).json({ success: false, message: 'Documento inválido' });
    }

    // Converter para centavos
    const amountInCents = Math.round(amount * 100);

    // Limpar números
    const cleanNumber = (value) => String(value).replace(/\D/g, '');

    const payload = {
      amount: amountInCents,
      currency: 'BRL',
      paymentMethod: 'pix',
      items: [
        {
          title: itemTitle || 'Serviço',
          unitPrice: amountInCents,
          quantity: 1,
          tangible: false
        }
      ],
      customer: {
        name: customerName,
        email: customerEmail,
        phone: cleanNumber(customerPhone),
        document: {
          number: cleanNumber(customerDocument),
          type: 'cpf'
        }
      },
      pix: {
        expiresInDays: 1
      }
    };

    // Chamar API BlackCat
    const response = await fetch(`${BLACKCAT_API_BASE}/sales/create-sale`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro na API BlackCat:', data);
      return res.status(response.status).json({
        success: false,
        message: data.message || 'Erro ao criar venda'
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

