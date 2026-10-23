/**
 * NIMBO — ENGINE JAVASCRIPT & CONTROLLER DO CARDÁPIO DIGITAL
 * Integração com NimboCore, renderização dinâmica por restaurante (slug),
 * bloqueio inteligente de pedidos no plano Grátis e checkout nos planos pagos.
 */

// --- RESOLUÇÃO UNIVERSAL DE DEPENDÊNCIAS (COMPATÍVEL COM FILE:// E HTTP://) ---
const NimboRestaurant = (typeof window !== 'undefined' && window.NimboRestaurant) ? window.NimboRestaurant : (typeof NimboCore !== 'undefined' ? NimboCore.NimboRestaurant : null);
const NimboMenu = (typeof window !== 'undefined' && window.NimboMenu) ? window.NimboMenu : (typeof NimboCore !== 'undefined' ? NimboCore.NimboMenu : null);
const NimboOrders = (typeof window !== 'undefined' && window.NimboOrders) ? window.NimboOrders : (typeof NimboCore !== 'undefined' ? NimboCore.NimboOrders : null);
const NimboPlans = (typeof window !== 'undefined' && window.NimboPlans) ? window.NimboPlans : (typeof NimboCore !== 'undefined' ? NimboCore.NimboPlans : null);
const NIMBO_PLANS = (typeof window !== 'undefined' && window.NIMBO_PLANS) ? window.NIMBO_PLANS : {};

// --- 1. SINTETIZADOR DE ÁUDIO WEB AUDIO API ---
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playNewOrder() {
    if (!this.enabled) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.18); // A5
      gain2.gain.setValueAtTime(0.35, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.7);
    } catch (e) {
      console.warn('Audio effect prevented:', e);
    }
  }

  playWhatsApp() {
    if (!this.enabled) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(740, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  playSuccess() {
    if (!this.enabled) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } catch (e) {}
  }
}

const sounds = new SoundEffects();
window.sounds = sounds;

// --- 2. ESTADO GLOBAL DO CARDÁPIO ---
let activeRestaurant = null;
let currentProducts = [];
let cart = [];
let currentProductInModal = null;
let selectedAddons = [];
let modalQty = 1;
let deliveryType = "delivery";
let paymentMethod = "pix";

// --- 3. INICIALIZAÇÃO DA PÁGINA ---
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('r');

  const portalEl = document.getElementById('nimbo-portal-view');
  const menuEl = document.getElementById('restaurant-menu-view');

  if (!slug) {
    // MODO 1: PORTAL INICIAL DA NIMBO
    if (portalEl) portalEl.style.display = 'block';
    if (menuEl) menuEl.style.display = 'none';
    const switcherMenuBtn = document.getElementById('switcher-menu-btn');
    if (switcherMenuBtn) switcherMenuBtn.classList.remove('active');
    return;
  }

  // MODO 2: CARDÁPIO PÚBLICO DO RESTAURANTE
  if (portalEl) portalEl.style.display = 'none';
  if (menuEl) menuEl.style.display = 'block';

  loadRestaurantMenu(slug);
});

// Carrega dados do restaurante pelo slug
function loadRestaurantMenu(slug) {
  // Se for o slug especial de demonstração
  if (slug === 'demo-b-lugar-legal') {
    activeRestaurant = NimboRestaurant.loadDemoRestaurant();
  } else {
    activeRestaurant = NimboRestaurant.getRestaurantBySlug(slug);
  }

  // Se não encontrar o restaurante
  if (!activeRestaurant) {
    renderNotFoundScreen(slug);
    return;
  }

  // Preenche dados do restaurante na tela
  populateStoreDetails(activeRestaurant);

  // Carrega produtos do restaurante
  currentProducts = NimboMenu.getProducts(activeRestaurant.id);
  renderCategories(activeRestaurant.id);
  renderProducts("todos");
  updateCartBar();
}

// Tela de restaurante não encontrado
function renderNotFoundScreen(slug) {
  const container = document.getElementById('menu-view-container');
  if (!container) return;
  container.innerHTML = `
    <div style="text-align: center; padding: 80px 24px; background: white; min-height: 100vh;">
      <div style="font-size: 56px; margin-bottom: 16px;">🔍</div>
      <h2 style="font-size: 22px; font-weight: 800; color: #0F172A;">Restaurante não encontrado</h2>
      <p style="font-size: 14px; color: #64748B; margin: 10px auto 28px; max-width: 440px;">
        O cardápio com o identificador "<strong>${slug}</strong>" não está disponível ou foi alterado.
      </p>
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <a href="index.html" class="btn-nimbo-secondary" style="padding: 12px 24px; font-size: 14px; color: #0F172A; border-color: #CBD5E1;">
          ← Página Inicial
        </a>
        <a href="login.html?mode=register" class="btn-nimbo-primary" style="padding: 12px 24px; font-size: 14px;">
          🚀 Criar Meu Cardápio Grátis
        </a>
      </div>
    </div>
  `;
}

// Preenche dados da loja no cardápio
function populateStoreDetails(store) {
  document.title = `${store.name} | Cardápio Digital Oficial`;
  const metaDesc = document.getElementById('page-meta-desc');
  if (metaDesc) metaDesc.content = store.tagline || `Cardápio digital oficial de ${store.name}`;

  document.getElementById('store-name-title').textContent = store.name;
  document.getElementById('store-tagline-text').textContent = store.tagline || 'Cardápio Digital';
  document.getElementById('store-desc-text').textContent = store.description || '';
  document.getElementById('store-footer-name').textContent = `${store.name} • Cardápio Digital`;

  // Avatar / Logo
  const avatarEl = document.getElementById('store-avatar-element');
  if (store.avatar) {
    avatarEl.innerHTML = `<img src="${store.avatar}" alt="${store.name}" style="width:100%;height:100%;border-radius:12px;object-fit:cover;">`;
  } else {
    avatarEl.textContent = '🍽️';
  }

  // Capa
  const coverEl = document.getElementById('store-cover-box');
  if (store.cover) {
    coverEl.style.backgroundImage = `url(${store.cover})`;
    coverEl.style.backgroundSize = 'cover';
    coverEl.style.backgroundPosition = 'center';
  }

  // Meta pills
  document.getElementById('meta-delivery').textContent = store.deliveryFee > 0 
    ? `🛵 Entrega R$ ${store.deliveryFee.toFixed(2).replace('.', ',')}` 
    : '🛵 Entrega Grátis';

  // Verificação de Status Aberto / Fechado em tempo real
  const isOpen = checkIsOpenNow(store.businessHours);
  const statusBadge = document.getElementById('store-status-badge');
  const statusText = document.getElementById('store-status-text');

  if (isOpen) {
    statusBadge.className = 'store-status-badge open';
    statusText.textContent = 'Aberto Agora';
  } else {
    statusBadge.className = 'store-status-badge closed';
    statusBadge.style.background = 'rgba(239, 68, 68, 0.9)';
    statusText.textContent = 'Fechado no Momento';
  }

  // Badge do Plano
  const planBadge = document.getElementById('meta-plan-badge');
  if (store.plan === 'free') {
    planBadge.textContent = 'Cardápio Oficial';
    planBadge.title = 'Cardápio digital gratuito e permanente';
  } else {
    planBadge.textContent = 'Pedidos Online Ativos';
    planBadge.style.background = 'rgba(184, 243, 107, 0.2)';
    planBadge.style.color = '#15803D';
  }
}

// Verifica se o restaurante está aberto no dia e hora atual
function checkIsOpenNow(businessHours) {
  if (!businessHours) return true;
  const daysKeys = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const now = new Date();
  const todayKey = daysKeys[now.getDay()];
  const todaySchedule = businessHours[todayKey];

  if (!todaySchedule || !todaySchedule.open) return false;

  const currentHourMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = (todaySchedule.start || "18:00").split(':').map(Number);
  const [endH, endM] = (todaySchedule.end || "23:00").split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;

  // Se fechar após a meia-noite (ex: 01:00)
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return currentHourMinutes >= startMinutes && currentHourMinutes <= endMinutes;
}

// Renderiza abas de categorias
function renderCategories(restaurantId) {
  const nav = document.getElementById('categories-nav-bar');
  if (!nav) return;
  nav.innerHTML = '<button class="cat-btn active" onclick="filterCategory(\'todos\', this)">🔥 Todos</button>';

  const categories = NimboMenu.getCategories(restaurantId);
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.textContent = cat.name;
    btn.onclick = () => filterCategory(cat.slug, btn);
    nav.appendChild(btn);
  });
}

// Filtra categorias
window.filterCategory = function(catSlug, btnElement) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  renderProducts(catSlug);
};

// Renderiza produtos na vitrine
function renderProducts(filterCat = "todos") {
  const grid = document.getElementById('products-grid');
  const emptyView = document.getElementById('products-empty-view');
  if (!grid) return;

  grid.innerHTML = "";

  if (currentProducts.length === 0) {
    grid.style.display = 'none';
    if (emptyView) emptyView.style.display = 'block';
    return;
  }

  grid.style.display = 'grid';
  if (emptyView) emptyView.style.display = 'none';

  const filtered = filterCat === "todos"
    ? currentProducts
    : currentProducts.filter(p => p.category === filterCat || (filterCat === "destaques" && p.isPopular));

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #94A3B8; font-size: 14px;">
        Nenhum item nesta categoria.
      </div>
    `;
    return;
  }

  filtered.forEach(product => {
    const card = document.createElement('div');
    card.className = `product-card ${product.isAvailable ? '' : 'paused'}`;
    card.onclick = () => {
      if (product.isAvailable) openProductModal(product);
    };

    const imgUrl = product.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80';
    const statusBadge = product.isAvailable 
      ? '<span class="product-add-badge">+ Adicionar</span>' 
      : '<span style="font-size: 11px; color: #EF4444; font-weight: 700; background: #FEE2E2; padding: 2px 8px; border-radius: 4px;">Esgotado</span>';

    card.innerHTML = `
      <div class="product-info">
        <div>
          <h4 class="product-title">${product.name}</h4>
          <p class="product-desc">${product.description || ''}</p>
        </div>
        <div class="product-price-row">
          <div class="product-price">
            R$ ${product.price.toFixed(2).replace('.', ',')}
          </div>
          ${statusBadge}
        </div>
      </div>
      <img src="${imgUrl}" alt="${product.name}" class="product-image" loading="lazy">
    `;
    grid.appendChild(card);
  });
}

// Modal de Produto & Adicionais
window.openProductModal = function(product) {
  sounds.init();
  currentProductInModal = product;
  selectedAddons = [];
  modalQty = 1;

  const modalImg = document.getElementById('modal-img');
  if (product.image) {
    modalImg.src = product.image;
    modalImg.style.display = 'block';
  } else {
    modalImg.style.display = 'none';
  }

  document.getElementById('modal-title').textContent = product.name;
  document.getElementById('modal-desc').textContent = product.description || '';
  document.getElementById('modal-qty').textContent = modalQty;
  document.getElementById('modal-obs').value = "";

  // Render Adicionais
  const addonsContainer = document.getElementById('modal-addons-container');
  addonsContainer.innerHTML = "";

  if (product.addons && product.addons.length > 0) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'addon-group';
    groupDiv.innerHTML = `<label style="font-size: 13px; font-weight: 700; color: #0F172A; margin-bottom: 8px; display: block;">Adicionais e Opcionais</label>`;

    product.addons.forEach(addon => {
      const row = document.createElement('div');
      row.className = 'addon-item';
      row.innerHTML = `
        <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
          <input type="checkbox" onchange="toggleAddon('${addon.id}', ${addon.price}, '${addon.name}', this)">
          <span>${addon.name}</span>
        </label>
        <span style="font-weight: 700; font-size: 13px; color: #16A34A;">+ R$ ${addon.price.toFixed(2).replace('.', ',')}</span>
      `;
      groupDiv.appendChild(row);
    });

    addonsContainer.appendChild(groupDiv);
  }

  updateModalPrice();
  document.getElementById('product-modal').classList.add('active');
};

window.closeProductModal = function() {
  document.getElementById('product-modal').classList.remove('active');
};

window.toggleAddon = function(addonId, price, name, checkbox) {
  if (checkbox.checked) {
    selectedAddons.push({ id: addonId, price, name });
  } else {
    selectedAddons = selectedAddons.filter(a => a.id !== addonId);
  }
  updateModalPrice();
};

window.changeModalQty = function(delta) {
  modalQty = Math.max(1, modalQty + delta);
  document.getElementById('modal-qty').textContent = modalQty;
  updateModalPrice();
};

function updateModalPrice() {
  if (!currentProductInModal) return;
  const addonsTotal = selectedAddons.reduce((acc, a) => acc + a.price, 0);
  const unitPrice = currentProductInModal.price + addonsTotal;
  const totalPrice = unitPrice * modalQty;

  document.getElementById('modal-price-display').textContent = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
  document.getElementById('modal-btn-total').textContent = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
}

window.addCurrentToCart = function() {
  sounds.playSuccess();
  const obs = document.getElementById('modal-obs').value.trim();

  cart.push({
    productId: currentProductInModal.id,
    name: currentProductInModal.name,
    basePrice: currentProductInModal.price,
    addons: [...selectedAddons],
    addonsTotal: selectedAddons.reduce((acc, a) => acc + a.price, 0),
    quantity: modalQty,
    obs: obs
  });

  closeProductModal();
  updateCartBar();
};

// Barra de Carrinho Flutuante
function updateCartBar() {
  const bar = document.getElementById('floating-cart');
  if (!bar) return;
  const countEl = document.getElementById('cart-count');
  const totalEl = document.getElementById('cart-total');

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cart.reduce((acc, item) => acc + (item.basePrice + item.addonsTotal) * item.quantity, 0);

  if (totalItems > 0) {
    bar.classList.remove('hidden');
    countEl.textContent = totalItems;
    totalEl.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  } else {
    bar.classList.add('hidden');
  }
}

window.openCartModal = function() {
  if (cart.length === 0) return;
  renderCartItemsList();
  document.getElementById('cart-modal').classList.add('active');
};

window.closeCartModal = function() {
  document.getElementById('cart-modal').classList.remove('active');
};

function renderCartItemsList() {
  const container = document.getElementById('cart-items-list');
  container.innerHTML = "";

  let subtotal = 0;
  cart.forEach((item, index) => {
    const itemTotal = (item.basePrice + item.addonsTotal) * item.quantity;
    subtotal += itemTotal;

    const div = document.createElement('div');
    div.className = 'addon-item';
    div.style.padding = '12px 0';

    const addonsListText = item.addons.length > 0 
      ? `<div style="font-size:11px; color:#16A34A; margin-top:2px;">+ ${item.addons.map(a => a.name).join(', ')}</div>` 
      : '';
      
    const obsText = item.obs 
      ? `<div style="font-size:11px; color:#64748B; font-style:italic;">Obs: ${item.obs}</div>` 
      : '';

    div.innerHTML = `
      <div style="flex:1;">
        <div style="font-weight:700; font-size:14px;">${item.quantity}x ${item.name}</div>
        ${addonsListText}
        ${obsText}
      </div>
      <div style="text-align:right;">
        <div style="font-weight:800; font-size:14px; color:var(--brand-orange)">R$ ${itemTotal.toFixed(2).replace('.', ',')}</div>
        <button onclick="removeCartItem(${index})" style="background:none; border:none; color:#EF4444; font-size:11px; cursor:pointer; font-weight:700; margin-top:4px;">Remover</button>
      </div>
    `;
    container.appendChild(div);
  });

  const deliveryFee = activeRestaurant ? activeRestaurant.deliveryFee || 0 : 0;
  const deliveryTax = deliveryType === "delivery" ? deliveryFee : 0;
  const grandTotal = subtotal + deliveryTax;

  document.getElementById('cart-subtotal-val').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  document.getElementById('cart-delivery-val').textContent = deliveryTax > 0 ? `R$ ${deliveryTax.toFixed(2).replace('.', ',')}` : "Grátis";
  document.getElementById('cart-grandtotal-val').textContent = `R$ ${grandTotal.toFixed(2).replace('.', ',')}`;

  // Ajusta o texto do botão baseado no plano
  const btnAdvance = document.getElementById('btn-cart-advance');
  if (activeRestaurant && activeRestaurant.plan === 'free') {
    btnAdvance.textContent = "📱 Enviar Pedido via WhatsApp ➔";
    btnAdvance.style.background = "#25D366";
    btnAdvance.style.color = "white";
  } else {
    btnAdvance.textContent = "Avançar para Entrega e Pagamento ➔";
    btnAdvance.style.background = "var(--nimbo-lime)";
    btnAdvance.style.color = "var(--nimbo-navy)";
  }
}

window.removeCartItem = function(index) {
  cart.splice(index, 1);
  if (cart.length === 0) {
    closeCartModal();
  } else {
    renderCartItemsList();
  }
  updateCartBar();
};

// REGRA CRÍTICA: O Momento do Avanço na Sacola
// Se o restaurante estiver no plano Grátis -> abre modal consultivo com envio pelo WhatsApp
// Se o restaurante estiver no plano Essencial/Pro -> avança para o checkout real
window.handleCartAdvance = function() {
  closeCartModal();

  if (activeRestaurant && activeRestaurant.plan === 'free') {
    // Restaurante no Plano Grátis: Cardápio Consultivo
    openFreePlanModal();
    return;
  }

  // Restaurante no Plano Essencial ou Pro: Checkout Real
  document.getElementById('menu-view-container').style.display = 'none';
  document.getElementById('checkout-view-container').style.display = 'block';
  updateCheckoutTotals();
};

window.openFreePlanModal = function() {
  document.getElementById('modal-free-plan-info').style.display = 'flex';
};

window.closeFreePlanModal = function() {
  document.getElementById('modal-free-plan-info').style.display = 'none';
};

// Envio Direto via WhatsApp no Plano Grátis
window.sendOrderViaWhatsAppDirect = function() {
  closeFreePlanModal();

  const subtotal = cart.reduce((acc, item) => acc + (item.basePrice + item.addonsTotal) * item.quantity, 0);
  const itemsText = cart.map(it => {
    const addonsStr = it.addons.length > 0 ? ` (+ ${it.addons.map(a => a.name).join(', ')})` : '';
    const obsStr = it.obs ? ` (Obs: ${it.obs})` : '';
    return `• ${it.quantity}x ${it.name}${addonsStr}${obsStr}`;
  }).join('\n');

  const text = `Olá! Montei meu pedido pelo cardápio digital da *${activeRestaurant.name}*:\n\n${itemsText}\n\n*Total Estimado:* R$ ${subtotal.toFixed(2).replace('.', ',')}\n\nPoderia confirmar a disponibilidade para entrega?`;

  const phone = (activeRestaurant.whatsapp || activeRestaurant.phone || '').replace(/\D/g, '');
  const waUrl = phone 
    ? `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;

  window.open(waUrl, '_blank');
};

window.backToMenu = function() {
  document.getElementById('checkout-view-container').style.display = 'none';
  document.getElementById('tracking-view-container').style.display = 'none';
  document.getElementById('menu-view-container').style.display = 'block';
};

// Checkout & Tipos de Entrega
window.setDeliveryType = function(type) {
  deliveryType = type;
  document.querySelectorAll('.delivery-type-selector .type-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.querySelector(`.type-tab[data-type="${type}"]`);
  if (activeTab) activeTab.classList.add('active');

  document.getElementById('address-fields-group').style.display = type === 'delivery' ? 'block' : 'none';
  document.getElementById('mesa-field-group').style.display = type === 'mesa' ? 'block' : 'none';

  updateCheckoutTotals();
};

window.setPaymentMethod = function(method) {
  paymentMethod = method;
  document.querySelectorAll('.pay-opt').forEach(p => p.classList.remove('active'));
  const activeOpt = document.querySelector(`.pay-opt[data-method="${method}"]`);
  if (activeOpt) activeOpt.classList.add('active');

  document.getElementById('pix-details-box').style.display = method === 'pix' ? 'block' : 'none';
};

function updateCheckoutTotals() {
  const subtotal = cart.reduce((acc, item) => acc + (item.basePrice + item.addonsTotal) * item.quantity, 0);
  const deliveryFee = activeRestaurant ? activeRestaurant.deliveryFee || 0 : 0;
  const deliveryTax = deliveryType === "delivery" ? deliveryFee : 0;
  const total = subtotal + deliveryTax;

  document.getElementById('checkout-subtotal').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  document.getElementById('checkout-delivery').textContent = deliveryTax > 0 
    ? `R$ ${deliveryTax.toFixed(2).replace('.', ',')}` 
    : "Grátis (Retirada/Mesa)";
  document.getElementById('checkout-total').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

  // Atualiza código PIX
  const pixKey = activeRestaurant ? activeRestaurant.pixKey || 'pix@nimbo.app' : 'pix@nimbo.app';
  const pixCode = `00020126580014BR.GOV.BCB.PIX0114${pixKey}520400005303986540${total.toFixed(2)}5802BR5913${activeRestaurant ? activeRestaurant.name.substring(0, 13) : 'Nimbo'}6009Sao Paulo62070503***6304E8A2`;
  const pixInput = document.getElementById('pix-copia-cola-text');
  if (pixInput) pixInput.value = pixCode;
}

window.copyPixCode = function() {
  const input = document.getElementById('pix-copia-cola-text');
  if (!input) return;
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    sounds.playWhatsApp();
    const btn = document.querySelector('.btn-copy-pix');
    const oldText = btn.textContent;
    btn.textContent = "✅ Copiado!";
    setTimeout(() => { btn.textContent = oldText; }, 2000);
  });
};

// Finalizar Pedido no Checkout (Válido para Essencial e Pro)
window.submitOrder = function() {
  const clientName = document.getElementById('client-name').value.trim() || "Cliente Nimbo";
  const clientPhone = document.getElementById('client-phone').value.trim() || "(00) 00000-0000";

  let addressText = "";
  if (deliveryType === "delivery") {
    const street = document.getElementById('client-address').value.trim() || "Endereço não informado";
    const comp = document.getElementById('client-comp').value.trim() || "";
    addressText = `${street} ${comp ? `(${comp})` : ''}`;
  } else if (deliveryType === "mesa") {
    const mesa = document.getElementById('client-mesa').value.trim() || "Balcão";
    addressText = `Mesa ${mesa} (Salão)`;
  } else {
    addressText = "Retirada no Balcão";
  }

  const subtotal = cart.reduce((acc, item) => acc + (item.basePrice + item.addonsTotal) * item.quantity, 0);
  const deliveryFee = activeRestaurant ? activeRestaurant.deliveryFee || 0 : 0;
  const deliveryTax = deliveryType === "delivery" ? deliveryFee : 0;
  const total = subtotal + deliveryTax;

  try {
    const newOrder = NimboOrders.createOrder(activeRestaurant.id, {
      customer: clientName,
      phone: clientPhone,
      type: deliveryType,
      address: addressText,
      items: JSON.parse(JSON.stringify(cart)),
      deliveryFee: deliveryTax,
      subtotal: subtotal,
      total: total,
      paymentMethod: paymentMethod
    });

    sounds.playNewOrder();
    cart = [];
    updateCartBar();

    // Exibe tela de rastreamento
    document.getElementById('checkout-view-container').style.display = 'none';
    document.getElementById('tracking-view-container').style.display = 'block';

    document.getElementById('tracking-order-num').textContent = `Pedido #${newOrder.orderNumber}`;
    document.getElementById('tracking-order-total').textContent = `Total: R$ ${total.toFixed(2).replace('.', ',')}`;
    document.getElementById('tracking-eta-val').textContent = `Previsão estimada: ${activeRestaurant.eta || '30-45 min'}`;

  } catch (err) {
    alert(err.message);
  }
};
