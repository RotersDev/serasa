// API routes da Vercel (serverless functions)
// As chaves de API agora estão protegidas no servidor
const API_BASE = '/api';

let currentTransactionId = null;
let statusCheckInterval = null;

// Formatação de valores
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatDate(dateString) {
  if (!dateString) {
    return 'Não disponível';
  }

  try {
    const date = new Date(dateString);

    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      console.warn('Data inválida:', dateString);
      return 'Data inválida';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    console.error('Erro ao formatar data:', error, dateString);
    return 'Data inválida';
  }
}

// Limpar apenas números
function cleanNumber(value) {
  return value.replace(/\D/g, '');
}

function setupInputMasks() {
  const phoneInput = document.getElementById('customer-phone');
  const documentInput = document.getElementById('customer-document');
  const amountInput = document.getElementById('amount');

  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      e.target.value = cleanNumber(e.target.value);
    });
  }

  if (documentInput) {
    documentInput.addEventListener('input', (e) => {
      e.target.value = cleanNumber(e.target.value);
      if (e.target.value.length > 11) {
        e.target.value = e.target.value.slice(0, 11);
      }
    });
  }

  if (amountInput) {
    amountInput.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      if (value < 0) e.target.value = '';
    });
  }
}

// Gerar dados aleatórios para o pagamento
function generateRandomPaymentData() {
  const names = ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Souza', 'Julia Lima', 'Roberto Alves', 'Fernanda Rocha'];
  const emails = ['joao@email.com', 'maria@email.com', 'pedro@email.com', 'ana@email.com', 'carlos@email.com', 'julia@email.com'];
  const items = ['Consulta de CPF', 'Consulta de CNPJ', 'Relatório de Crédito', 'Análise de Score', 'Consulta Serasa', 'Serviço Premium'];

  // Gerar CPF aleatório (11 dígitos)
  const cpf = Math.floor(10000000000 + Math.random() * 90000000000).toString();

  // Gerar telefone aleatório (11 dígitos)
  const phone = Math.floor(10000000000 + Math.random() * 90000000000).toString();

  // Valor padrão fixo
  const amount = 68.92; // R$ 68,92

  return {
    amount: amount,
    itemTitle: items[Math.floor(Math.random() * items.length)],
    customerName: names[Math.floor(Math.random() * names.length)],
    customerEmail: emails[Math.floor(Math.random() * emails.length)],
    customerPhone: phone,
    customerDocument: cpf
  };
}

// Criar venda via API route da Vercel (protege a API Key)
async function createSale(paymentData) {
  // Se paymentData é FormData (formulário), converter
  let amount, itemTitle, customerName, customerEmail, customerPhone, customerDocument;

  if (paymentData instanceof FormData) {
    amount = parseFloat(paymentData.get('amount'));
    itemTitle = paymentData.get('item-title');
    customerName = paymentData.get('customer-name');
    customerEmail = paymentData.get('customer-email');
    customerPhone = cleanNumber(paymentData.get('customer-phone'));
    customerDocument = cleanNumber(paymentData.get('customer-document'));
  } else {
    // É um objeto com dados
    amount = typeof paymentData.amount === 'string' ? parseFloat(paymentData.amount) : paymentData.amount;
    itemTitle = paymentData.itemTitle;
    customerName = paymentData.customerName;
    customerEmail = paymentData.customerEmail;
    customerPhone = paymentData.customerPhone;
    customerDocument = paymentData.customerDocument;
  }

  const payload = {
    amount: amount,
    itemTitle: itemTitle,
    customerName: customerName,
    customerEmail: customerEmail,
    customerPhone: customerPhone,
    customerDocument: customerDocument
  };

  try {
    const response = await fetch(`${API_BASE}/create-sale`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Verificar se a resposta é JSON antes de fazer parse
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Resposta não é JSON:', text);
      throw new Error('Resposta inválida do servidor');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao criar venda');
    }

    return data;
  } catch (error) {
    console.error('Erro ao criar venda:', error);
    throw error;
  }
}

// Consultar status da transação via API route da Vercel
async function checkTransactionStatus(transactionId) {
  try {
    const response = await fetch(`${API_BASE}/check-status?transactionId=${encodeURIComponent(transactionId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Verificar se a resposta é JSON antes de fazer parse
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Resposta não é JSON:', text);
      throw new Error('Resposta inválida do servidor');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao consultar status');
    }

    return data;
  } catch (error) {
    console.error('Erro ao consultar status:', error);
    throw error;
  }
}

// Exibir QR Code e dados do pagamento
function displayPaymentData(paymentData, transactionData) {
  // Debug: verificar dados recebidos
  console.log('Payment Data recebido:', paymentData);
  console.log('Transaction Data recebido:', transactionData);

  // Verificar se paymentData existe
  if (!paymentData) {
    console.error('paymentData é null ou undefined!');
    alert('Erro: Dados de pagamento não recebidos. Verifique o console para mais detalhes.');
    return;
  }

  const qrcodeSection = document.getElementById('qrcode-section');
  const paymentFormSection = document.getElementById('payment-form-section');
  const qrcodeImage = document.getElementById('qrcode-image') || document.getElementById('qrcode-image');
  const qrcodeLoading = document.getElementById('qrcode-loading');
  const pixCode = document.getElementById('pix-code');
  const paymentAmount = document.getElementById('payment-amount');
  const transactionId = document.getElementById('transaction-id');
  const expiresAt = document.getElementById('expires-at');

  // Ocultar formulário e exibir QR Code
  paymentFormSection.style.display = 'none';
  qrcodeSection.style.display = 'block';

  // Preencher dados
  const serviceNameEl = document.getElementById('service-name');
  if (serviceNameEl) {
    serviceNameEl.textContent = 'Serasa Limpa Nome';
  }

  // Sempre mostrar R$ 68,92 (valor fixo)
  paymentAmount.textContent = 'R$ 68,92';
  transactionId.textContent = transactionData.transactionId || '-';

  // Exibir tempo de expiração fixo
  expiresAt.textContent = '15 minutos';

  // Exibir QR Code
  console.log('Verificando QR Code no paymentData:', {
    hasQrCodeBase64: !!paymentData?.qrCodeBase64,
    hasQrCode: !!paymentData?.qrCode,
    paymentDataKeys: paymentData ? Object.keys(paymentData) : 'paymentData é null/undefined'
  });

  // Tentar diferentes formatos de QR Code
  let qrCodeImageSrc = null;
  let pixCodeString = null;

  // Prioridade: copyPaste > qrCode > qrCodeBase64
  // Primeiro, identificar qual campo contém o código PIX válido
  if (paymentData?.copyPaste) {
    pixCodeString = paymentData.copyPaste;
    console.log('Usando copyPaste para gerar QR Code');
  } else if (paymentData?.qrCode) {
    pixCodeString = paymentData.qrCode;
    console.log('Usando qrCode para gerar QR Code');
  } else if (paymentData?.qrCodeBase64) {
    // Verificar se qrCodeBase64 é realmente uma imagem ou o código PIX
    if (paymentData.qrCodeBase64.startsWith('data:image')) {
      // É uma imagem base64 válida
      qrCodeImageSrc = paymentData.qrCodeBase64;
      console.log('Usando qrCodeBase64 como imagem');
    } else if (paymentData.qrCodeBase64.startsWith('000201')) {
      // É o código PIX, não uma imagem
      pixCodeString = paymentData.qrCodeBase64;
      console.log('qrCodeBase64 contém código PIX, gerando QR Code...');
    } else {
      // Tentar como base64 de imagem (mas provavelmente não vai funcionar)
      // Por segurança, tratar como código PIX se não começar com data:image
      pixCodeString = paymentData.qrCodeBase64;
      console.log('Tratando qrCodeBase64 como código PIX');
    }
  }

  // Se temos o código PIX, gerar QR Code usando API externa
  if (pixCodeString && !qrCodeImageSrc) {
    qrCodeImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCodeString)}`;
    console.log('Gerando QR Code a partir do código PIX');
  }

  if (qrCodeImageSrc) {
    qrcodeImage.src = qrCodeImageSrc;
    qrcodeImage.style.display = 'block';
    qrcodeLoading.style.display = 'none';

    // Verificar se a imagem carregou
    qrcodeImage.onload = () => {
      console.log('QR Code carregado com sucesso');
      if (qrcodeLoading) {
        qrcodeLoading.style.display = 'none';
      }
    };

    qrcodeImage.onerror = () => {
      console.error('Erro ao carregar QR Code');
      if (qrcodeLoading) {
        const loadingText = qrcodeLoading.querySelector('.loading-text');
        if (loadingText) {
          loadingText.textContent = 'Erro ao carregar QR Code. Use o código PIX abaixo.';
        } else {
          qrcodeLoading.innerHTML = '<p class="loading-text">Erro ao carregar QR Code. Use o código PIX abaixo.</p>';
        }
      }
      qrcodeImage.style.display = 'none';
    };
  } else {
    if (qrcodeLoading) {
      qrcodeLoading.innerHTML = `
        <div class="loading-spinner" style="border-top-color: #ef4444;"></div>
        <p class="loading-text">QR Code não disponível. Use o código PIX abaixo.</p>
      `;
    }
    console.warn('QR Code não encontrado no paymentData');
  }

  // Preencher código PIX
  if (paymentData?.copyPaste) {
    pixCode.value = paymentData.copyPaste;
    console.log('Código PIX (copyPaste) preenchido');
  } else if (paymentData?.qrCode) {
    pixCode.value = paymentData.qrCode;
    console.log('Código PIX (qrCode) preenchido');
  } else {
    console.warn('Nenhum código PIX encontrado no paymentData');
    pixCode.value = 'Código PIX não disponível';
  }

  // Scroll para o QR Code
  qrcodeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Atualizar status do pagamento
function updatePaymentStatus(status) {
  const statusBadge = document.querySelector('.status-badge');
  const statusText = statusBadge.querySelector('span:last-child');
  const statusIcon = statusBadge.querySelector('.status-icon');

  statusBadge.className = 'status-badge';

  switch (status) {
    case 'PAID':
      statusBadge.classList.add('status-paid');
      statusIcon.textContent = '✅';
      statusText.textContent = 'Pagamento confirmado!';
      stopStatusCheck();
      break;
    case 'PENDING':
      statusBadge.classList.add('status-pending');
      statusIcon.textContent = '⏳';
      statusText.textContent = 'Aguardando pagamento';
      break;
    case 'CANCELLED':
      statusBadge.classList.add('status-cancelled');
      statusIcon.textContent = '❌';
      statusText.textContent = 'Pagamento cancelado/expirado';
      stopStatusCheck();
      break;
    case 'REFUNDED':
      statusBadge.classList.add('status-refunded');
      statusIcon.textContent = '↩️';
      statusText.textContent = 'Pagamento estornado';
      stopStatusCheck();
      break;
  }
}

// Iniciar verificação automática de status
function startStatusCheck(transactionId) {
  stopStatusCheck(); // Limpar intervalo anterior se existir

  statusCheckInterval = setInterval(async () => {
    try {
      const response = await checkTransactionStatus(transactionId);
      if (response.success && response.data) {
        updatePaymentStatus(response.data.status);

        if (response.data.status === 'PAID') {
          stopStatusCheck();
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  }, 5000); // Verificar a cada 5 segundos
}

// Parar verificação de status
function stopStatusCheck() {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
    statusCheckInterval = null;
  }
}

// Copiar código PIX
function setupCopyButton() {
  const btnCopy = document.getElementById('btn-copy');
  const pixCode = document.getElementById('pix-code');

  if (btnCopy && pixCode) {
    btnCopy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pixCode.value);
        btnCopy.textContent = 'Copiado!';
        btnCopy.classList.add('copied');
        setTimeout(() => {
          btnCopy.textContent = 'Copiar';
          btnCopy.classList.remove('copied');
        }, 2000);
      } catch (error) {
        // Fallback para navegadores antigos
        pixCode.select();
        document.execCommand('copy');
        btnCopy.textContent = 'Copiado!';
        setTimeout(() => {
          btnCopy.textContent = 'Copiar';
        }, 2000);
      }
    });
  }
}


// Handler do formulário
function setupPaymentForm() {
  const paymentForm = document.getElementById('payment-form');
  const btnSubmit = document.getElementById('btn-submit');
  const btnText = btnSubmit.querySelector('.btn-text');
  const btnLoader = btnSubmit.querySelector('.btn-loader');

  if (paymentForm) {
    paymentForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(paymentForm);

      // Validações
      const amount = parseFloat(formData.get('amount'));
      if (!amount || amount <= 0) {
        alert('Por favor, informe um valor válido');
        return;
      }

      // Desabilitar botão e mostrar loading
      btnSubmit.disabled = true;
      btnText.style.display = 'none';
      btnLoader.style.display = 'inline';

      try {
        const response = await createSale(formData);

        if (response.success && response.data) {
          currentTransactionId = response.data.transactionId;
          displayPaymentData(response.data.paymentData, response.data);
          updatePaymentStatus(response.data.status);
          startStatusCheck(currentTransactionId);
        } else {
          throw new Error(response.message || 'Erro ao processar pagamento');
        }
      } catch (error) {
        alert('Erro ao processar pagamento: ' + error.message);
        console.error('Erro:', error);
      } finally {
        // Reabilitar botão
        btnSubmit.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
      }
    });
  }
}

// Gerar pagamento automático ao carregar a página
async function generateAutomaticPayment() {
  const qrcodeSection = document.getElementById('qrcode-section');
  const qrcodeLoading = document.getElementById('qrcode-loading');

  // Mostrar seção de QR Code com loading
  if (qrcodeSection) {
    qrcodeSection.style.display = 'block';
  }
  if (qrcodeLoading) {
    qrcodeLoading.innerHTML = `
      <div class="loading-spinner"></div>
      <p class="loading-text">Gerando pagamento...</p>
    `;
  }

  try {
    // Gerar dados aleatórios
    const randomData = generateRandomPaymentData();
    console.log('Dados aleatórios gerados:', randomData);

    // Criar venda
    const response = await createSale(randomData);

    if (response.success && response.data) {
      currentTransactionId = response.data.transactionId;
      displayPaymentData(response.data.paymentData, response.data);
      updatePaymentStatus(response.data.status);
      startStatusCheck(currentTransactionId);
    } else {
      throw new Error(response.message || 'Erro ao processar pagamento');
    }
  } catch (error) {
    console.error('Erro ao gerar pagamento automático:', error);
    if (qrcodeLoading) {
      qrcodeLoading.innerHTML = `
        <div class="loading-spinner" style="border-top-color: #ef4444;"></div>
        <p class="loading-text">Erro ao gerar pagamento: ${error.message}</p>
      `;
    }
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  setupInputMasks();
  setupPaymentForm();
  setupCopyButton();

  // Gerar pagamento automático ao carregar
  generateAutomaticPayment();
});

