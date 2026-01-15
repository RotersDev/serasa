const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

// ===== Carregar configurações =====
const { getPushUrls } = require('./config-loader');
const PUSH_URLS = getPushUrls();

// Dispara a notificação SEM bloquear a resposta do site.
// Importante: disparamos apenas quando for uma página HTML (pra não notificar em cada CSS/JS/imagem).
function triggerPushcutOncePerRequest() {
  try {
    PUSH_URLS.forEach(url => {
      https.get(url, (r) => { r.resume(); }).on('error', () => {});
    });
  } catch (_) {}


}


const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Função handler para Vercel (serverless) e servidor local
function handleRequest(req, res) {
  // Remove query string e hash
  const urlPath = req.url.split('?')[0].split('#')[0];

  // Proteção contra path traversal (Directory Traversal) - apenas bloquear se tiver .. no meio
  if (urlPath.includes('../') || urlPath.includes('..\\')) {
    res.writeHead(302, { 'Location': '/atendimento.html' });
    res.end();
    return;
  }

  let filePath;

  // Ignorar rotas da API (tratadas pelas serverless functions)
  if (urlPath.startsWith('/api/')) {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404 - Rota da API não encontrada</h1>', 'utf-8');
    return;
  }

  // Assets em public/ - prioridade para arquivos estáticos (DEVE ser a primeira verificação)
  if (urlPath.startsWith('/public/')) {
    filePath = '.' + urlPath;
    console.log(`Servindo arquivo estático: ${urlPath} -> ${filePath}`);
  }
  // Assets antigos (compatibilidade) -> public/
  else if (urlPath.startsWith('/css/') || urlPath.startsWith('/js/')) {
    filePath = './public' + urlPath;
  }
  // Favicon - ignorar ou redirecionar
  else if (urlPath === '/favicon.ico') {
    res.writeHead(204); // No Content
    res.end();
    return;
  }
  // Rota raiz -> redirecionar para atendimento
  else if (urlPath === '/' || urlPath === '/index.html') {
    filePath = './pages/atendimento.html';
  }
  // Páginas permitidas - DEVE vir ANTES da verificação genérica de .html
  else if (urlPath === '/payments' || urlPath === '/payments.html') {
    filePath = './pages/payments.html';
  }
  else if (urlPath === '/atendimento' || urlPath === '/atendimento.html') {
    filePath = './pages/atendimento.html';
  }
  // Outras páginas HTML -> redirecionar para atendimento
  else if (urlPath.endsWith('.html') && !urlPath.startsWith('/pages/') && !urlPath.startsWith('/public/')) {
    // Redirecionar para atendimento.html
    res.writeHead(302, { 'Location': '/atendimento.html' });
    res.end();
    return;
  }
  // Outros arquivos estáticos em pages/
  else if (urlPath.startsWith('/pages/')) {
    filePath = '.' + urlPath;
  }
  // Qualquer outra rota -> redirecionar para atendimento
  else {
    // Redirecionar para atendimento.html
    res.writeHead(302, { 'Location': '/atendimento.html' });
    res.end();
    return;
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  // Normalizar o caminho - garantir que seja relativo ao __dirname
  // Remove o ./ inicial se existir
  let cleanPath = filePath.replace(/^\.\//, '');
  // Garantir que não comece com /
  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1);
  }
  const normalizedPath = path.join(__dirname, cleanPath);

  // Debug: log do caminho
  console.log(`Tentando acessar: ${urlPath} -> ${filePath} -> ${cleanPath} -> ${normalizedPath} (__dirname: ${__dirname})`);

  // Verificar se o arquivo existe antes de tentar ler
  if (!fs.existsSync(normalizedPath)) {
    console.error(`❌ Arquivo não existe: ${normalizedPath}`);
  } else {
    console.log(`✅ Arquivo existe: ${normalizedPath}`);
  }

  fs.readFile(normalizedPath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        console.error(`Arquivo não encontrado: ${normalizedPath} (URL: ${urlPath}, filePath: ${filePath})`);
        // Se for arquivo estático (CSS/JS), retornar 404
        if (urlPath.startsWith('/public/') || urlPath.startsWith('/css/') || urlPath.startsWith('/js/')) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 - Arquivo não encontrado');
        }
        // Se for payments.html, retornar 404 (não redirecionar)
        else if (urlPath === '/payments' || urlPath === '/payments.html') {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end('<h1>404 - Página de pagamentos não encontrada</h1>');
        }
        // Outros casos, redirecionar para atendimento.html
        else {
          res.writeHead(302, { 'Location': '/atendimento.html' });
          res.end();
        }
        return;
      } else {
        console.error(`Erro ao ler arquivo: ${error.code} - ${normalizedPath} (URL: ${urlPath})`);
        // Se for arquivo estático, retornar 500
        if (urlPath.startsWith('/public/') || urlPath.startsWith('/css/') || urlPath.startsWith('/js/')) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end(`Erro do servidor: ${error.code}`);
        }
        // Se for payments.html, retornar 500 (não redirecionar)
        else if (urlPath === '/payments' || urlPath === '/payments.html') {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`<h1>500 - Erro ao carregar página de pagamentos</h1><p>${error.code}</p>`);
        }
        // Outros casos, redirecionar
        else {
          res.writeHead(302, { 'Location': '/atendimento.html' });
          res.end();
        }
        return;
      }
    } else {
      // Se for HTML, consideramos "entrada no site" e disparamos a notificação
      if (contentType === 'text/html') {
        triggerPushcutOncePerRequest();
      }

      // Headers para arquivos estáticos
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      };

      // Headers específicos para CSS
      if (extname === '.css') {
        headers['Content-Type'] = 'text/css; charset=utf-8';
        headers['Cache-Control'] = 'public, max-age=31536000, immutable';
        console.log(`✅ Servindo CSS: ${urlPath} (${content.length} bytes)`);
      }
      // Headers específicos para JS
      else if (extname === '.js') {
        headers['Content-Type'] = 'text/javascript; charset=utf-8';
        headers['Cache-Control'] = 'public, max-age=31536000, immutable';
        console.log(`✅ Servindo JS: ${urlPath} (${content.length} bytes)`);
      }
      // Headers para HTML
      else if (extname === '.html') {
        headers['Content-Type'] = 'text/html; charset=utf-8';
        headers['Cache-Control'] = 'no-cache';
      }
      // Headers para outros arquivos
      else {
        headers['Content-Type'] = contentType;
        headers['Cache-Control'] = 'no-cache';
      }

      res.writeHead(200, headers);
      res.end(content, 'utf-8');
    }
  });
}

// Para Vercel: exportar como serverless function
if (typeof module !== 'undefined' && module.exports) {
  module.exports = handleRequest;
}

// Para desenvolvimento local: criar servidor HTTP
if (require.main === module) {
  const server = http.createServer(handleRequest);
  server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

