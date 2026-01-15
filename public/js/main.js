const yearEl = document.getElementById('y');
if (yearEl) yearEl.textContent = new Date().getFullYear();
const today = new Date().toLocaleDateString('pt-BR');
['d1','d2','d3'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.textContent = today;
});

const open = (id) => document.getElementById(id).showModal();

function setupModalLinks() {
  const modalLinks = {
    'btn-priv': 'dlg-priv',
    'btn-termos': 'dlg-termos',
    'btn-mais': 'dlg-mais'
  };

  Object.keys(modalLinks).forEach(btnId => {
    const element = document.getElementById(btnId);
    if (element) {
      element.addEventListener('click', e => {
        e.preventDefault();
        open(modalLinks[btnId]);
      });
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupModalLinks);
} else {
  setupModalLinks();
}

(function() {
  var baseUrl = 'https://type.atendimentoexpresso1.shop/central2';
  var params = window.__QS_SNAPSHOT__ || window.location.search || "";
  var iframe = document.getElementById('typebot-iframe');
  if (iframe) {
    iframe.src = baseUrl + params;
  }
})();

