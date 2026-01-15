// Helper para carregar configurações do config.json ou variáveis de ambiente
const fs = require('fs');
const path = require('path');

let config = {};

// Tentar carregar do config.json (desenvolvimento local)
try {
  const configPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(configPath)) {
    const configFile = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configFile);
    console.log('✅ Configurações carregadas do config.json');
  }
} catch (error) {
  console.warn('⚠️  Não foi possível carregar config.json, usando variáveis de ambiente');
}

// Função para obter uma configuração (prioriza variável de ambiente, depois config.json)
function getConfig(key) {
  // Prioridade: variável de ambiente > config.json
  return process.env[key] || config[key] || null;
}

// Função para obter array de URLs do Pushcut
function getPushUrls() {
  const envUrls = process.env.PUSH_URLS;
  if (envUrls) {
    return envUrls.split(',').map(url => url.trim()).filter(url => url);
  }

  // Se tiver no config.json como array
  if (config.PUSH_URLS && Array.isArray(config.PUSH_URLS)) {
    return config.PUSH_URLS;
  }

  return [];
}

module.exports = {
  getConfig,
  getPushUrls,
  config // Exportar config completo se necessário
};



