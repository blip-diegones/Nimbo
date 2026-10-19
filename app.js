/* ==========================================================================
   NIMBO - ENGINE JAVASCRIPT
   Sincronização em tempo real: Cardápio + WhatsApp Bot + Gestor KDS
   ========================================================================== */

// --- 1. SINTETIZADOR DE ÁUDIO WEB AUDIO API (Sons Nativos sem dependência externa) ---
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

  // Sino duplo da cozinha de novo pedido (estilo iFood / Anota AI)
  playNewOrder() {
    if (!this.enabled) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      
      // Tom 1
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

      // Tom 2 (mais agudo)
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

  // Notificação suave do WhatsApp
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

  // Sucesso de PIX / Pedido Concluído
  playSuccess() {
    if (!this.enabled) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
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

// --- 2. BASE DE DADOS DO RESTAURANTE & CARDÁPIO ---
const STORE_DATA = {
  name: "B Lugar Legal",
  tagline: "Hambúrgueres Artesanais, Porções & Sucos Naturais",
  avatar: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=250&q=80",
  cover: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80",
  whatsapp: "5511987654321",
  pixKey: "blugarlegal@pix.com.br",
  deliveryFee: 6.00,
  minOrder: 15.00,
  eta: "30-45 min",
  rating: "4.9 (1.4k+)",
  isOpen: true
};

const PRODUCTS = [
  {
    id: 1,
    category: "lanches",
    name: "X Burger Especial",
    description: "Pão brioche quentinho selado na manteiga, hambúrguer bovino artesanal 160g, queijo cheddar cremoso e maionese verde da casa.",
    price: 18.00,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80",
    isPopular: true,
    addons: [
      { id: "ovo", name: "Ovo caipira frito na chapa", price: 3.00 },
      { id: "bacon", name: "Fatias de Bacon Crocante", price: 4.50 },
      { id: "cheddar", name: "Cheddar cremoso extra", price: 4.00 },
      { id: "cebola", name: "Cebola caramelizada", price: 3.50 }
    ]
  },
  {
    id: 2,
    category: "lanches",
    name: "Smash Bacon Duplo",
    description: "2 carnes smash 90g com crostinha crocante na chapa, queijo prato derretido, dobro de bacon artesanal e molho barbecue rústico.",
    price: 26.00,
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=500&q=80",
    isPopular: true,
    addons: [
      { id: "ovo", name: "Ovo caipira frito na chapa", price: 3.00 },
      { id: "bacon", name: "Fatias de Bacon Crocante", price: 4.50 },
      { id: "cheddar", name: "Cheddar cremoso extra", price: 4.00 },
      { id: "maionese", name: "Maionese verde da casa (pote 50ml)", price: 2.50 }
    ]
  },
  {
    id: 3,
    category: "lanches",
    name: "Monster Cheddar Egg",
    description: "Pão australiano tostado, burger 180g alto e suculento, piscina de cheddar melt, ovo frito no ponto perfeito e picles artesanal.",
    price: 29.90,
    image: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=500&q=80",
    isPopular: false,
    addons: [
      { id: "bacon", name: "Fatias de Bacon Crocante", price: 4.50 },
      { id: "cebola", name: "Cebola caramelizada", price: 3.50 },
      { id: "carne", name: "Burger extra 180g", price: 9.00 }
    ]
  },
  {
    id: 4,
    category: "porcoes",
    name: "Batata Frita Rústica com Alecrim",
    description: "Porção generosa de batatas rústicas douradas com corte grosso, temperadas com sal marinho, alecrim fresco e páprica defumada.",
    price: 16.00,
    image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=500&q=80",
    isPopular: true,
    addons: [
      { id: "cheddar_bacon", name: "Cobertura de Cheddar & Bacon picado", price: 7.00 },
      { id: "maionese", name: "Maionese verde da casa (pote 50ml)", price: 2.50 }
    ]
  },
  {
    id: 5,
    category: "bebidas",
    name: "Coca-Cola Zero 350ml",
    description: "Lata geladíssima.",
    price: 6.00,
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=80",
    isPopular: true,
    addons: []
  },
  {
    id: 6,
    category: "bebidas",
    name: "Suco Natural de Laranja 500ml",
    description: "Suco natural espremido na hora, 100% fruta sem adição de água.",
    price: 9.50,
    image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=500&q=80",
    isPopular: false,
    addons: []
  },
  {
    id: 7,
    category: "sobremesas",
    name: "Brownie Artesanal com Nutella",
    description: "Brownie com casquinha crocante e interior denso de chocolate belga, coberto com farta camada de Nutella original.",
    price: 14.00,
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=500&q=80",
    isPopular: true,
    addons: []
  }
];

// --- 3. ESTADO GLOBAL DA APLICAÇÃO ---
let cart = [];
let currentProductInModal = null;
let selectedAddons = [];
let modalQty = 1;
let deliveryType = "delivery"; // delivery | retirada | mesa
let paymentMethod = "pix"; // pix | dinheiro | cartao

// Carrega pedidos salvos (suporta transição de chaves)
let orders = JSON.parse(localStorage.getItem('nimbo_orders') || localStorage.getItem('anotazap_orders')) || [
  {
    id: 21,
    time: "22:45",
    customer: "Fernanda Costa",
    phone: "(11) 97123-4567",
    type: "delivery",
    address: "Av. Paulista, 1000 - Apto 82, Bela Vista",
    items: [
      { name: "Smash Bacon Duplo", qty: 1, price: 26.00, addons: ["Fatias de Bacon Crocante"] },
      { name: "Coca-Cola Zero 350ml", qty: 1, price: 6.00, addons: [] }
    ],
    deliveryFee: 6.00,
    total: 36.50,
    paymentMethod: "pix",
    status: "done" // new | prep | route | done
  }
];

let nextOrderNumber = parseInt(localStorage.getItem('anotazap_next_num') || "22");

// Histórico de mensagens do WhatsApp simulado
let whatsappMessages = [
  {
    sender: "client",
    text: "Boa note meus amigos, estão trabalhando?",
    time: "23:22"
  },
  {
    sender: "bot",
    text: "🍔 Diego, que saudade! Faz tempo desde seu último pedido 😄\nVolte a matar a fome com a gente!\n👉 Abra o cardápio e peça agora! 🔥\nhttps://app.anota.ai/m/sgAyaFWRw",
    time: "23:22",
    hasLink: true
  },
  {
    sender: "bot",
    text: "Estamos sempre abertos.",
    time: "23:22"
  }
];

// --- 4. INICIALIZAÇÃO & ROUTING DE TELAS ---
document.addEventListener('DOMContentLoaded', () => {
  initDockNavigation();
  renderProducts();
  renderKdsBoard();
  renderWhatsAppChat();
  updateCartBar();
  initLandingCalculator();
  initSoundToggle();
});

// Navegação entre os 4 Módulos pelo Dock
function initDockNavigation() {
  const buttons = document.querySelectorAll('.dock-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      sounds.init();
      const targetView = btn.dataset.view;
      
      // Update buttons
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update views
      document.querySelectorAll('.view-container').forEach(view => {
        view.classList.remove('active');
      });
      const activeContainer = document.getElementById(`view-${targetView}`);
      if (activeContainer) {
        activeContainer.classList.add('active');
      }
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function initSoundToggle() {
  const soundBtn = document.getElementById('sound-toggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      sounds.init();
      sounds.enabled = !sounds.enabled;
      if (sounds.enabled) {
        soundBtn.classList.remove('muted');
        soundBtn.innerHTML = `🔊 <span>Som Ligado</span>`;
        sounds.playWhatsApp();
      } else {
        soundBtn.classList.add('muted');
        soundBtn.innerHTML = `🔇 <span>Mudo</span>`;
      }
    });
  }
}

// Alternar visão programaticamente
window.switchModuleView = function(viewName) {
  const btn = document.querySelector(`.dock-btn[data-view="${viewName}"]`);
  if (btn) btn.click();
};

// --- 5. RENDERIZAÇÃO DO CARDÁPIO & PRODUTOS ---
function renderProducts(filterCat = "todos") {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  
  grid.innerHTML = "";
  
  const filtered = filterCat === "todos" 
    ? PRODUCTS 
    : PRODUCTS.filter(p => p.category === filterCat || (filterCat === "destaques" && p.isPopular));

  filtered.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = () => openProductModal(product);
    
    card.innerHTML = `
      <div class="product-info">
        <div>
          <h4 class="product-title">${product.name}</h4>
          <p class="product-desc">${product.description}</p>
        </div>
        <div class="product-price-row">
          <div class="product-price">
            <span class="from-text">a partir de</span> R$ ${product.price.toFixed(2).replace('.', ',')}
          </div>
          <span class="product-add-badge">+ Adicionar</span>
        </div>
      </div>
      <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">
    `;
    grid.appendChild(card);
  });
}

// Categorias Horizontais
window.filterCategory = function(catName, btnElement) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  renderProducts(catName);
};

// --- 6. MODAL DE PRODUTO & ADICIONAIS ---
function openProductModal(product) {
  sounds.init();
  currentProductInModal = product;
  selectedAddons = [];
  modalQty = 1;
  
  document.getElementById('modal-img').src = product.image;
  document.getElementById('modal-title').textContent = product.name;
  document.getElementById('modal-desc').textContent = product.description;
  document.getElementById('modal-qty').textContent = modalQty;
  document.getElementById('modal-obs').value = "";
  
  // Render Addons
  const addonsContainer = document.getElementById('modal-addons-container');
  addonsContainer.innerHTML = "";
  
  if (product.addons && product.addons.length > 0) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'addon-group';
    groupDiv.innerHTML = `
      <div class="addon-group-title">
        <span>Turbine seu pedido (Opcionais)</span>
        <span class="addon-group-tag">Escolha até ${product.addons.length}</span>
      </div>
    `;
    
    product.addons.forEach(addon => {
      const itemRow = document.createElement('div');
      itemRow.className = 'addon-item';
      itemRow.dataset.addonId = addon.id;
      itemRow.onclick = () => toggleAddon(addon, itemRow);
      
      itemRow.innerHTML = `
        <div class="addon-left">
          <div class="addon-check">✓</div>
          <span class="addon-name">${addon.name}</span>
        </div>
        <span class="addon-price">+ R$ ${addon.price.toFixed(2).replace('.', ',')}</span>
      `;
      groupDiv.appendChild(itemRow);
    });
    
    addonsContainer.appendChild(groupDiv);
  }
  
  updateModalPrice();
  document.getElementById('product-modal').classList.add('active');
}

window.closeProductModal = function() {
  document.getElementById('product-modal').classList.remove('active');
};

function toggleAddon(addon, element) {
  const index = selectedAddons.findIndex(a => a.id === addon.id);
  if (index >= 0) {
    selectedAddons.splice(index, 1);
    element.classList.remove('selected');
  } else {
    selectedAddons.push(addon);
    element.classList.add('selected');
  }
  updateModalPrice();
}

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

// --- 7. BARRA FLUTUANTE DE CARRINHO & MODAL DE SACOLA ---
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
  
  const deliveryTax = deliveryType === "delivery" ? STORE_DATA.deliveryFee : 0;
  const grandTotal = subtotal + deliveryTax;
  
  document.getElementById('cart-subtotal-val').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  document.getElementById('cart-delivery-val').textContent = deliveryTax > 0 ? `R$ ${deliveryTax.toFixed(2).replace('.', ',')}` : "Grátis";
  document.getElementById('cart-grandtotal-val').textContent = `R$ ${grandTotal.toFixed(2).replace('.', ',')}`;
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

window.goToCheckout = function() {
  closeCartModal();
  document.getElementById('menu-view-container').style.display = 'none';
  document.getElementById('checkout-view-container').style.display = 'block';
  updateCheckoutTotals();
};

window.backToMenu = function() {
  document.getElementById('checkout-view-container').style.display = 'none';
  document.getElementById('menu-view-container').style.display = 'block';
};

// --- 8. TELA DE CHECKOUT & PIX AUTOMÁTICO ---
window.setDeliveryType = function(type) {
  deliveryType = type;
  document.querySelectorAll('.delivery-type-selector .type-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.querySelector(`.type-tab[data-type="${type}"]`);
  if (activeTab) activeTab.classList.add('active');
  
  // Exibe ou oculta campos
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
  document.getElementById('troco-field-group').style.display = method === 'dinheiro' ? 'block' : 'none';
};

function updateCheckoutTotals() {
  const subtotal = cart.reduce((acc, item) => acc + (item.basePrice + item.addonsTotal) * item.quantity, 0);
  const deliveryTax = deliveryType === "delivery" ? STORE_DATA.deliveryFee : 0;
  const total = subtotal + deliveryTax;
  
  document.getElementById('checkout-subtotal').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  document.getElementById('checkout-delivery').textContent = deliveryTax > 0 ? `R$ ${deliveryTax.toFixed(2).replace('.', ',')}` : "Grátis (Retirada/Mesa)";
  document.getElementById('checkout-total').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
  
  // Atualiza código PIX Copia e Cola
  const pixCode = `00020126580014BR.GOV.BCB.PIX0114blugarlegal@zap520400005303986540${total.toFixed(2)}5802BR5913B Lugar Legal6009Sao Paulo62070503***6304E8A2`;
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

// --- 9. FINALIZAR PEDIDO (DISPARA ECOSSISTEMA COMPLETO) ---
window.submitOrder = function() {
  const clientName = document.getElementById('client-name').value.trim() || "Diego";
  const clientPhone = document.getElementById('client-phone').value.trim() || "(11) 98765-4321";
  
  let addressText = "";
  if (deliveryType === "delivery") {
    const street = document.getElementById('client-address').value.trim() || "Rua Padre João Manoel, 154 - Carioca";
    const comp = document.getElementById('client-comp').value.trim() || "Frente";
    addressText = `${street} ${comp ? `(${comp})` : ''}`;
  } else if (deliveryType === "mesa") {
    const mesa = document.getElementById('client-mesa').value.trim() || "05";
    addressText = `Mesa ${mesa} (Salão)`;
  } else {
    addressText = "Retirada no Balcão";
  }

  const subtotal = cart.reduce((acc, item) => acc + (item.basePrice + item.addonsTotal) * item.quantity, 0);
  const deliveryTax = deliveryType === "delivery" ? STORE_DATA.deliveryFee : 0;
  const total = subtotal + deliveryTax;

  const orderNum = nextOrderNumber++;
  localStorage.setItem('anotazap_next_num', nextOrderNumber.toString());

  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newOrder = {
    id: orderNum,
    time: timeString,
    customer: clientName,
    phone: clientPhone,
    type: deliveryType,
    address: addressText,
    items: JSON.parse(JSON.stringify(cart)),
    deliveryFee: deliveryTax,
    total: total,
    paymentMethod: paymentMethod,
    status: "new" // Recém chegado na cozinha!
  };

  // 1. Salva no banco de pedidos
  orders.unshift(newOrder);
  localStorage.setItem('anotazap_orders', JSON.stringify(orders));

  // 2. Dispara som de novo pedido da cozinha (ding duplo)
  sounds.playNewOrder();

  // 3. Adiciona mensagem automática idêntica à Anota AI no WhatsApp do cliente
  addAnotaAiOrderMessageToWhatsApp(newOrder);

  // 4. Atualiza o painel KDS da cozinha
  renderKdsBoard();

  // 5. Limpa carrinho e mostra tela de Rastreio ao Vivo do Cliente
  cart = [];
  updateCartBar();
  showOrderTrackingScreen(newOrder);
};

// Mensagem Oficial da Anota AI gerada para o WhatsApp
function addAnotaAiOrderMessageToWhatsApp(order) {
  const itemsText = order.items.map(it => {
    const addonsStr = it.addons.length > 0 ? ` (+ ${it.addons.map(a => a.name).join(', ')})` : '';
    return `➡️ ${it.quantity}x ${it.name}${addonsStr}`;
  }).join('\n');

  const payText = order.paymentMethod === 'pix' 
    ? '🟢 PIX (Pago via QR Code)' 
    : order.paymentMethod === 'dinheiro' 
      ? '💵 Dinheiro (não precisa de troco)' 
      : '💳 Cartão na Maquininha';

  const typeHeader = order.type === 'delivery' 
    ? `🛵 Delivery (taxa de: R$ ${order.deliveryFee.toFixed(2).replace('.', ',')})\n🏠 ${order.address}\n(Previsão de Entrega: entre 35 e 45 min)`
    : order.type === 'mesa'
      ? `🍽️ Consumo no Local (${order.address})`
      : `🛍️ Retirada no Balcão`;

  const msgText = `Oba! Seu pedido está EM PRODUÇÃO! 🥳\n\nPedido nº ${order.id}\n\nItens:\n${itemsText}\n\n${payText}\n\n${typeHeader}\n\nTotal: R$ ${order.total.toFixed(2).replace('.', ',')}\n\nObrigado pela preferência, se precisar de algo é só chamar! 😉`;

  whatsappMessages.push({
    sender: "bot",
    text: msgText,
    time: order.time
  });

  renderWhatsAppChat();
}

// Tela de Rastreamento de Pedido do Cliente
function showOrderTrackingScreen(order) {
  document.getElementById('checkout-view-container').style.display = 'none';
  document.getElementById('tracking-view-container').style.display = 'block';
  
  document.getElementById('tracking-order-num').textContent = `Pedido #${order.id}`;
  document.getElementById('tracking-order-total').textContent = `Total: R$ ${order.total.toFixed(2).replace('.', ',')}`;
  
  updateTrackingStepper(order.status);
}

function updateTrackingStepper(status) {
  const steps = [
    { id: 'step-received', rank: 1 },
    { id: 'step-prep', rank: 2 },
    { id: 'step-route', rank: 3 },
    { id: 'step-delivered', rank: 4 }
  ];

  let currentRank = 1;
  if (status === 'prep') currentRank = 2;
  if (status === 'route') currentRank = 3;
  if (status === 'done') currentRank = 4;

  steps.forEach(st => {
    const el = document.getElementById(st.id);
    if (!el) return;
    el.classList.remove('active', 'completed');
    if (st.rank < currentRank) el.classList.add('completed');
    if (st.rank === currentRank) el.classList.add('active');
  });
}

// --- 10. GESTOR DE PEDIDOS / COZINHA (KDS KANBAN AO VIVO) ---
function renderKdsBoard() {
  const colNew = document.getElementById('kds-orders-new');
  const colPrep = document.getElementById('kds-orders-prep');
  const colRoute = document.getElementById('kds-orders-route');
  const colDone = document.getElementById('kds-orders-done');

  if (!colNew) return;

  colNew.innerHTML = "";
  colPrep.innerHTML = "";
  colRoute.innerHTML = "";
  colDone.innerHTML = "";

  let countNew = 0, countPrep = 0, countRoute = 0, countDone = 0;
  let revenueToday = 0;

  orders.forEach(order => {
    revenueToday += order.total;
    const card = createKdsOrderCard(order);

    if (order.status === 'new') {
      colNew.appendChild(card);
      countNew++;
    } else if (order.status === 'prep') {
      colPrep.appendChild(card);
      countPrep++;
    } else if (order.status === 'route') {
      colRoute.appendChild(card);
      countRoute++;
    } else {
      colDone.appendChild(card);
      countDone++;
    }
  });

  // Atualiza contadores dos cards do topo
  document.getElementById('count-new').textContent = countNew;
  document.getElementById('count-prep').textContent = countPrep;
  document.getElementById('count-route').textContent = countRoute;
  document.getElementById('count-done').textContent = countDone;

  // Atualiza métricas
  const kdsRevenue = document.getElementById('kds-stat-revenue');
  const kdsCount = document.getElementById('kds-stat-count');
  const kdsTicket = document.getElementById('kds-stat-ticket');
  
  if (kdsRevenue) kdsRevenue.textContent = `R$ ${revenueToday.toFixed(2).replace('.', ',')}`;
  if (kdsCount) kdsCount.textContent = orders.length;
  if (kdsTicket) {
    const avg = orders.length > 0 ? revenueToday / orders.length : 0;
    kdsTicket.textContent = `R$ ${avg.toFixed(2).replace('.', ',')}`;
  }

  // Badge do dock superior e sidebar do restaurante
  const activeOrders = countNew + countPrep + countRoute;
  const dockBadge = document.getElementById('dock-orders-badge');
  if (dockBadge) {
    dockBadge.textContent = activeOrders;
    dockBadge.style.display = activeOrders > 0 ? 'inline-block' : 'none';
  }
  const sidebarBadge = document.getElementById('sidebar-order-badge');
  if (sidebarBadge) {
    sidebarBadge.textContent = activeOrders;
    sidebarBadge.style.display = activeOrders > 0 ? 'inline-block' : 'none';
  }
}

function createKdsOrderCard(order) {
  const card = document.createElement('div');
  card.className = 'kds-order-card';

  const itemsHtml = order.items.map(it => {
    const addonsStr = it.addons && it.addons.length > 0
      ? `<div class="item-addons-list">+ ${it.addons.map(a => typeof a === 'string' ? a : a.name).join(', ')}</div>`
      : '';
    return `
      <div style="margin-bottom:6px;">
        <div class="order-item-row">
          <span class="item-qty-name">${it.quantity || 1}x ${it.name}</span>
          <span>R$ ${((it.basePrice || it.price) * (it.quantity || 1)).toFixed(2).replace('.', ',')}</span>
        </div>
        ${addonsStr}
      </div>
    `;
  }).join('');

  // Botões de Ação por Coluna
  let actionsHtml = "";
  if (order.status === 'new') {
    actionsHtml = `
      <button class="btn-kds-action primary" onclick="updateOrderStatus(${order.id}, 'prep')">🍳 Aceitar & Iniciar Preparo</button>
    `;
  } else if (order.status === 'prep') {
    actionsHtml = `
      <button class="btn-kds-action primary" onclick="updateOrderStatus(${order.id}, 'route')">🛵 Despachar (Chamar Motoboy)</button>
    `;
  } else if (order.status === 'route') {
    actionsHtml = `
      <button class="btn-kds-action success" onclick="updateOrderStatus(${order.id}, 'done')">✅ Concluir Pedido</button>
    `;
  } else {
    actionsHtml = `
      <span style="font-size:11px; color:#10B981; font-weight:700;">✅ Pedido Entregue</span>
    `;
  }

  const payBadge = order.paymentMethod === 'pix' ? '🟢 PIX' : order.paymentMethod === 'dinheiro' ? '💵 Dinheiro' : '💳 Cartão';

  card.innerHTML = `
    <div class="order-top">
      <span class="order-num">#${order.id}</span>
      <span class="order-time">${order.time}</span>
    </div>
    <div class="order-customer">👤 ${order.customer}</div>
    <div class="order-address">📍 ${order.address}</div>
    
    <div class="order-items-box">
      ${itemsHtml}
    </div>
    
    <div class="order-footer-row">
      <span class="order-pay-method">${payBadge}</span>
      <span class="order-total-val">R$ ${order.total.toFixed(2).replace('.', ',')}</span>
    </div>

    <div class="order-actions-bar">
      ${actionsHtml}
      <button class="btn-kds-action whatsapp" title="Notificar no WhatsApp" onclick="notifyOrderOnWhatsApp(${order.id})">💬</button>
      <button class="btn-kds-action" style="flex: 0 0 34px;" title="Imprimir Comanda" onclick="printReceipt(${order.id})">🖨️</button>
    </div>
  `;

  return card;
}

// Atualiza Status do Pedido e Notifica no WhatsApp em Tempo Real
window.updateOrderStatus = function(orderId, newStatus) {
  sounds.playSuccess();
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = newStatus;
  localStorage.setItem('anotazap_orders', JSON.stringify(orders));

  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Se saiu para entrega, manda a notificação real do motoboy no WhatsApp
  if (newStatus === 'route') {
    whatsappMessages.push({
      sender: "bot",
      text: `🛵 ${order.customer}, seu pedido nº ${order.id} acabou de sair para entrega com nosso motoboy!\n\nEle já está a caminho de:\n📍 ${order.address}\n\nPrevisão de chegada: 15 a 20 minutos. Bom apetite! 😋`,
      time: timeString
    });
    sounds.playWhatsApp();
    renderWhatsAppChat();
  } else if (newStatus === 'done') {
    whatsappMessages.push({
      sender: "bot",
      text: `✅ Pedido nº ${order.id} entregue com sucesso!\n\nEsperamos que tenha uma ótima refeição! Se puder avaliar sua experiência com uma nota de 1 a 5, ficamos muito felizes! ⭐⭐⭐⭐⭐`,
      time: timeString
    });
    renderWhatsAppChat();
  }

  renderKdsBoard();
  updateTrackingStepper(newStatus);
};

// --- 11. SIMULADOR DO WHATSAPP (BOT ANOTA AI) ---
function renderWhatsAppChat() {
  const container = document.getElementById('wa-chat-container');
  if (!container) return;

  container.innerHTML = "";

  whatsappMessages.forEach(msg => {
    const bubble = document.createElement('div');
    bubble.className = `wa-msg ${msg.sender === 'client' ? 'out' : 'in'}`;

    let linkHtml = "";
    if (msg.hasLink) {
      linkHtml = `
        <div class="wa-card-preview">
          <strong>${STORE_DATA.name}</strong><br>
          Faça seu pedido online de forma rápida e prática!
          <a href="#" class="wa-btn-link" onclick="switchModuleView('cardapio'); return false;">👉 Ver Cardápio Online</a>
        </div>
      `;
    }

    // Formata quebras de linha
    const formattedText = msg.text.replace(/\n/g, '<br>');

    bubble.innerHTML = `
      <div>${formattedText}</div>
      ${linkHtml}
      <div class="wa-time">${msg.time} ${msg.sender === 'client' ? '✓✓' : ''}</div>
    `;

    container.appendChild(bubble);
  });

  container.scrollTop = container.scrollHeight;
}

window.sendWhatsAppClientMessage = function() {
  const input = document.getElementById('wa-input-field');
  const text = input.value.trim();
  if (!text) return;

  sounds.playWhatsApp();
  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  whatsappMessages.push({
    sender: "client",
    text: text,
    time: timeString
  });

  input.value = "";
  renderWhatsAppChat();

  // IA da Anota AI responde automaticamente após 1 segundo
  setTimeout(() => {
    simulateBotResponse(text);
  }, 1000);
};

function simulateBotResponse(userText) {
  const lower = userText.toLowerCase();
  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  let botReply = "";
  let hasLink = false;

  if (lower.includes('cardapio') || lower.includes('cardápio') || lower.includes('pedir') || lower.includes('fome')) {
    botReply = `🍔 Claro! Segue o link do nosso cardápio digital:\n\n👉 Acesse e monte seu pedido:\nhttps://app.anota.ai/m/blugarlegal\n\nQualquer dúvida é só chamar!`;
    hasLink = true;
  } else if (lower.includes('horario') || lower.includes('horário') || lower.includes('aberto') || lower.includes('trabalhando')) {
    botReply = `Estamos abertos hoje até às 23:59! 🎉\n\nProntos para preparar os melhores lanches para você.\n👉 Peça pelo cardápio: https://app.anota.ai/m/blugarlegal`;
    hasLink = true;
  } else if (lower.includes('status') || lower.includes('onde tá') || lower.includes('demora')) {
    botReply = `🛵 Seus pedidos ativos estão sendo monitorados pela nossa cozinha! Caso já tenha pedido, fique tranquilo que avisaremos assim que o motoboy sair!`;
  } else {
    botReply = `Olá! Seja bem-vindo ao ${STORE_DATA.name}! 👋\n\nSou o assistente virtual da casa. Como posso te ajudar hoje?\n\n1. 🍔 Ver Cardápio e Fazer Pedido\n2. ⏱️ Consultar Status do Pedido\n3. 📍 Nosso Endereço e Horários`;
    hasLink = true;
  }

  sounds.playWhatsApp();
  whatsappMessages.push({
    sender: "bot",
    text: botReply,
    time: timeString,
    hasLink: hasLink
  });

  renderWhatsAppChat();
}

window.simulateQuickAction = function(type) {
  const input = document.getElementById('wa-input-field');
  if (type === 'oi') {
    input.value = "Boa noite meus amigos, estão trabalhando?";
  } else if (type === 'cardapio') {
    input.value = "Pode me enviar o cardápio por favor?";
  } else if (type === 'status') {
    input.value = "Onde está meu pedido nº 22?";
  }
  sendWhatsAppClientMessage();
};

// --- 12. IMPRESSÃO DE COMANDA TÉRMICA (KDS) ---
window.printReceipt = function(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  const receiptContent = `
================================
       ${STORE_DATA.name.toUpperCase()}
   NIMBO • GESTOR DE PEDIDOS
================================
PEDIDO Nº: #${order.id}
DATA/HORA: ${new Date().toLocaleDateString('pt-BR')} ${order.time}
CLIENTE: ${order.customer}
FONE: ${order.phone}
--------------------------------
TIPO: ${order.type.toUpperCase()}
END: ${order.address}
--------------------------------
ITENS DO PEDIDO:
${order.items.map(it => `
${it.quantity || 1}x ${it.name}
   R$ ${((it.basePrice || it.price) * (it.quantity || 1)).toFixed(2)}
   ${it.addons ? it.addons.map(a => `+ ${typeof a === 'string' ? a : a.name}`).join('\n   ') : ''}
   ${it.obs ? `Obs: ${it.obs}` : ''}
`).join('')}
--------------------------------
TAXA ENTREGA: R$ ${order.deliveryFee.toFixed(2)}
TOTAL PEDIDO: R$ ${order.total.toFixed(2)}
PAGAMENTO: ${order.paymentMethod.toUpperCase()}
================================
  Obrigado pela preferência!
================================
  `;

  const printWindow = window.open('', '', 'width=400,height=600');
  printWindow.document.write(`<pre style="font-family:monospace; font-size:12px; padding:10px;">${receiptContent}</pre>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 250);
};

// Notificar cliente no WhatsApp com mensagem formatada
window.notifyOrderOnWhatsApp = function(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  let text = `Olá ${order.customer}! Seu pedido #${order.id} no ${STORE_DATA.name} está `;
  if (order.status === 'new') text += "confirmado e entrando em produção!";
  if (order.status === 'prep') text += "sendo preparado com carinho na cozinha!";
  if (order.status === 'route') text += "a caminho com nosso motoboy!";
  if (order.status === 'done') text += "concluído! Bom apetite!";

  if (typeof showAdminTab === 'function') {
    showAdminTab('wa');
  }
  const input = document.getElementById('wa-input-field');
  if (input) input.value = text;
};

// --- 13. CALCULADORA DE ECONOMIA (LANDING PAGE SAAS) ---
function initLandingCalculator() {
  const slider = document.getElementById('lp-orders-slider');
  if (!slider) return;

  slider.addEventListener('input', (e) => {
    const ordersMonth = parseInt(e.target.value);
    document.getElementById('slider-orders-val').textContent = `${ordersMonth} pedidos/mês`;

    const avgTicket = 45.00;
    const monthlyBilling = ordersMonth * avgTicket;

    // Custos comparativos:
    // iFood cobra 27% (ou 12% + taxas de pagamento)
    const ifoodCost = monthlyBilling * 0.23;

    // Anota AI tradicional cobra mensalidade alta (R$ 289/mês)
    const anotaAiCost = 289.00;

    // Nosso SaaS cobra R$ 69,90 fixo
    const ourCost = 69.90;
    const economy = ifoodCost - ourCost;

    document.getElementById('calc-ifood-cost').textContent = `R$ ${ifoodCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('calc-our-economy').textContent = `R$ ${economy.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  });
}
