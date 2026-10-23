/**
 * NIMBO CORE — ENGINE MULTI-TENANT DE DADOS, AUTENTICAÇÃO E REGRAS DE NEGÓCIO
 * 
 * Suporte Universal: Funciona tanto em servidor HTTP quanto abrindo arquivos diretamente no navegador (file://).
 */

(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else {
    var core = factory();
    root.NimboCore = core;
    root.NimboAuth = core.NimboAuth;
    root.NimboRestaurant = core.NimboRestaurant;
    root.NimboMenu = core.NimboMenu;
    root.NimboOrders = core.NimboOrders;
    root.NimboPlans = core.NimboPlans;
    root.generateSlug = core.generateSlug;
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // --- CONFIGURAÇÃO CENTRAL DE PLANOS (FALLBACK EMBUTIDO SE PLANS.CONFIG.JS NÃO TIVER CARREGADO) ---
  const DEFAULT_PLANS = (typeof window !== 'undefined' && window.NIMBO_PLANS) ? window.NIMBO_PLANS : {
    free: {
      id: "free",
      name: "Nimbo Grátis",
      tagline: "O ponto de partida para qualquer restaurante",
      priceMonthly: 0,
      priceFormatted: "R$ 0",
      period: "/mês",
      badge: "Gratuito para Sempre",
      color: "#94A3B8",
      canAcceptOrders: false,
      canUseKds: false,
      canUseBot: false,
      canViewReports: false,
      features: [
        { text: "Cadastro completo do restaurante", included: true },
        { text: "Cardápio digital público com URL permanente", included: true },
        { text: "Categorias e produtos ilimitados", included: true },
        { text: "Fotos, descrições e preços nos itens", included: true },
        { text: "Horários de funcionamento por dia da semana", included: true },
        { text: "Pré-visualização do cardápio em tempo real", included: true },
        { text: "Edição e atualização a qualquer momento", included: true },
        { text: "Recebimento de pedidos pelo sistema", included: false, highlightBadge: "Requer Essencial" },
        { text: "Gestor de Cozinha em tempo real (KDS)", included: false },
        { text: "Robô inteligente de WhatsApp", included: false }
      ],
      ctaText: "Plano Atual",
      ctaAction: "current"
    },
    essential: {
      id: "essential",
      name: "Nimbo Essencial",
      tagline: "Para quem quer começar a vender e organizar a cozinha",
      priceMonthly: 49.90,
      priceFormatted: "R$ 49,90",
      period: "/mês",
      badge: "Mais Popular",
      color: "#B8F36B",
      canAcceptOrders: true,
      canUseKds: true,
      canUseBot: false,
      canViewReports: false,
      features: [
        { text: "Todos os recursos do plano Grátis", included: true },
        { text: "Ativação do recebimento de pedidos online", included: true, bold: true },
        { text: "Painel Gestor de Cozinha (KDS) em tempo real", included: true, bold: true },
        { text: "Alertas sonoros para novos pedidos na cozinha", included: true },
        { text: "Impressão de comanda térmica para produção", included: true },
        { text: "Recebimento via PIX direto na sua chave", included: true },
        { text: "Taxa de entrega configurável por distância/fixa", included: true },
        { text: "Acompanhamento de status em 4 etapas pelo cliente", included: true },
        { text: "Robô inteligente de WhatsApp", included: false, highlightBadge: "Disponível no Pro" },
        { text: "Relatórios avançados de faturamento", included: false }
      ],
      ctaText: "Ativar Nimbo Essencial",
      ctaAction: "subscribe_essential"
    },
    pro: {
      id: "pro",
      name: "Nimbo Pro",
      tagline: "Automação total no WhatsApp e controle completo do negócio",
      priceMonthly: 89.90,
      priceFormatted: "R$ 89,90",
      period: "/mês",
      badge: "Completo",
      color: "#38BDF8",
      canAcceptOrders: true,
      canUseKds: true,
      canUseBot: true,
      canViewReports: true,
      features: [
        { text: "Todos os recursos do plano Essencial", included: true },
        { text: "Robô de atendimento automático no WhatsApp", included: true, bold: true },
        { text: "Notificações automáticas de status no WhatsApp", included: true, bold: true },
        { text: "Relatórios e métricas de vendas e faturamento", included: true },
        { text: "Gráficos de formas de pagamento e produtos top", included: true },
        { text: "Cálculo de ticket médio e tempo de preparo", included: true },
        { text: "Disparo de mensagens promocionais e reativação", included: true },
        { text: "Suporte prioritário via WhatsApp", included: true }
      ],
      ctaText: "Evoluir para Nimbo Pro",
      ctaAction: "subscribe_pro"
    }
  };

  function getPlans() {
    return (typeof window !== 'undefined' && window.NIMBO_PLANS) ? window.NIMBO_PLANS : DEFAULT_PLANS;
  }

  // --- UTILITÁRIOS AUXILIARES ---
  function generateSlug(text) {
    if (!text) return 'restaurante-' + Math.floor(Math.random() * 1000);
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  }

  function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  // --- ARMAZENAMENTO SEGURO ISOLADO POR TENANT ---
  class LocalMultiTenantStorage {
    constructor() {
      this.prefix = 'nimbo_saas_';
      this.memoryStore = {};
    }

    _getKey(table, tenantId = 'global') {
      return `${this.prefix}${tenantId}_${table}`;
    }

    get(table, tenantId = 'global') {
      try {
        const key = this._getKey(table, tenantId);
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw) : null;
        }
        return this.memoryStore[key] ? JSON.parse(this.memoryStore[key]) : null;
      } catch (e) {
        console.error(`Erro ao ler tabela ${table} para tenant ${tenantId}`, e);
        return null;
      }
    }

    set(table, data, tenantId = 'global') {
      try {
        const key = this._getKey(table, tenantId);
        const str = JSON.stringify(data);
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          localStorage.setItem(key, str);
        } else {
          this.memoryStore[key] = str;
        }
        return true;
      } catch (e) {
        console.error(`Erro ao salvar tabela ${table} para tenant ${tenantId}`, e);
        return false;
      }
    }

    remove(table, tenantId = 'global') {
      const key = this._getKey(table, tenantId);
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      } else {
        delete this.memoryStore[key];
      }
    }
  }

  const localDB = new LocalMultiTenantStorage();

  // --- AUTENTICAÇÃO ---
  const NimboAuth = {
    getCurrentUser() {
      const session = localDB.get('session', 'auth');
      if (!session || !session.user) return null;
      return session.user;
    },

    async signUp(email, password, fullName) {
      if (!email || !password) throw new Error('E-mail e senha são obrigatórios.');
      if (password.length < 6) throw new Error('A senha deve ter no mínimo 6 caracteres.');

      const cleanEmail = email.trim().toLowerCase();
      const users = localDB.get('users', 'auth') || [];

      if (users.some(u => u.email === cleanEmail)) {
        throw new Error('Já existe uma conta cadastrada com este e-mail.');
      }

      const newUser = {
        id: generateId('usr'),
        email: cleanEmail,
        fullName: fullName ? fullName.trim() : cleanEmail.split('@')[0],
        createdAt: new Date().toISOString()
      };

      users.push({ ...newUser, passwordHash: btoa(password) });
      localDB.set('users', users, 'auth');
      localDB.set('session', { user: newUser, token: 'token_' + Date.now() }, 'auth');

      return newUser;
    },

    async signIn(email, password) {
      if (!email || !password) throw new Error('Informe seu e-mail e senha.');

      const cleanEmail = email.trim().toLowerCase();
      const users = localDB.get('users', 'auth') || [];

      const user = users.find(u => u.email === cleanEmail);
      if (!user || user.passwordHash !== btoa(password)) {
        throw new Error('E-mail ou senha incorretos.');
      }

      const safeUser = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        createdAt: user.createdAt
      };

      localDB.set('session', { user: safeUser, token: 'token_' + Date.now() }, 'auth');
      return safeUser;
    },

    signOut() {
      localDB.remove('session', 'auth');
      localDB.remove('active_restaurant_id', 'auth');
      return true;
    },

    async resetPassword(email) {
      if (!email) throw new Error('Informe o e-mail cadastrado.');
      const cleanEmail = email.trim().toLowerCase();
      const users = localDB.get('users', 'auth') || [];
      const exists = users.some(u => u.email === cleanEmail);
      if (!exists) throw new Error('Nenhuma conta encontrada com este e-mail.');
      return { success: true, message: 'Instruções para redefinir sua senha foram enviadas para ' + cleanEmail };
    }
  };

  // --- RESTAURANTES ---
  const NimboRestaurant = {
    _getAllRestaurants() {
      return localDB.get('restaurants_registry', 'global') || [];
    },

    _saveAllRestaurants(list) {
      localDB.set('restaurants_registry', list, 'global');
    },

    getUserRestaurants(userId) {
      if (!userId) return [];
      const all = this._getAllRestaurants();
      return all.filter(r => r.ownerId === userId && !r.isDemo);
    },

    getActiveRestaurant() {
      const user = NimboAuth.getCurrentUser();
      const activeId = localDB.get('active_restaurant_id', 'auth');
      const all = this._getAllRestaurants();

      if (activeId) {
        const found = all.find(r => r.id === activeId);
        if (found) return found;
      }

      if (user) {
        const userRestaurants = this.getUserRestaurants(user.id);
        if (userRestaurants.length > 0) {
          this.setActiveRestaurant(userRestaurants[0].id);
          return userRestaurants[0];
        }
      }

      // Se houver qualquer restaurante não demo, retorna
      const nonDemo = all.filter(r => !r.isDemo);
      if (nonDemo.length > 0) return nonDemo[0];

      return null;
    },

    setActiveRestaurant(restaurantId) {
      localDB.set('active_restaurant_id', restaurantId, 'auth');
    },

    getRestaurantBySlug(slug) {
      if (!slug) return null;
      const cleanSlug = slug.toLowerCase().trim();
      const all = this._getAllRestaurants();
      return all.find(r => r.slug === cleanSlug) || null;
    },

    getRestaurantById(id) {
      if (!id) return null;
      const all = this._getAllRestaurants();
      return all.find(r => r.id === id) || null;
    },

    createRestaurant({ name, tagline, phone, whatsapp, description, ownerId = null }) {
      const user = NimboAuth.getCurrentUser();
      const finalOwnerId = ownerId || (user ? user.id : 'anon_owner');
      if (!name || !name.trim()) throw new Error('O nome do restaurante é obrigatório.');

      const cleanName = name.trim();
      let baseSlug = generateSlug(cleanName);
      let finalSlug = baseSlug;

      const all = this._getAllRestaurants();
      let counter = 1;
      while (all.some(r => r.slug === finalSlug)) {
        counter++;
        finalSlug = `${baseSlug}-${counter}`;
      }

      const newRestaurant = {
        id: generateId('rest'),
        ownerId: finalOwnerId,
        name: cleanName,
        slug: finalSlug,
        tagline: tagline ? tagline.trim() : 'Cardápio Digital Oficial',
        description: description ? description.trim() : '',
        avatar: '',
        cover: '',
        phone: phone ? phone.trim() : '',
        whatsapp: whatsapp ? whatsapp.trim() : '',
        pixKey: '',
        deliveryFee: 5.00,
        minOrder: 0.00,
        eta: '30-45 min',
        plan: 'free',
        acceptingOrders: false,
        businessHours: {
          seg: { open: true, start: "18:00", end: "23:00" },
          ter: { open: true, start: "18:00", end: "23:00" },
          qua: { open: true, start: "18:00", end: "23:00" },
          qui: { open: true, start: "18:00", end: "23:00" },
          sex: { open: true, start: "18:00", end: "00:00" },
          sab: { open: true, start: "18:00", end: "00:00" },
          dom: { open: true, start: "18:00", end: "23:00" }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      all.push(newRestaurant);
      this._saveAllRestaurants(all);

      NimboMenu.createCategory(newRestaurant.id, 'Destaques');
      NimboMenu.createCategory(newRestaurant.id, 'Pratos Principais');
      NimboMenu.createCategory(newRestaurant.id, 'Bebidas');

      this.setActiveRestaurant(newRestaurant.id);
      return newRestaurant;
    },

    updateRestaurant(restaurantId, updates) {
      const all = this._getAllRestaurants();
      const index = all.findIndex(r => r.id === restaurantId);
      if (index === -1) throw new Error('Restaurante não encontrado.');

      if (updates.slug && updates.slug !== all[index].slug) {
        const cleanSlug = generateSlug(updates.slug);
        if (all.some(r => r.id !== restaurantId && r.slug === cleanSlug)) {
          throw new Error('Esta URL/Slug já está em uso por outro restaurante. Escolha outra.');
        }
        updates.slug = cleanSlug;
      }

      const currentPlan = updates.plan || all[index].plan;
      if (currentPlan === 'free' && updates.acceptingOrders === true) {
        throw new Error('O recebimento de pedidos online requer a ativação do plano Nimbo Essencial ou Pro.');
      }

      all[index] = {
        ...all[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      this._saveAllRestaurants(all);
      return all[index];
    },

    loadDemoRestaurant() {
      const demoSlug = 'demo-b-lugar-legal';
      const all = this._getAllRestaurants();
      let demo = all.find(r => r.slug === demoSlug);

      if (!demo) {
        demo = {
          id: 'demo_restaurant_01',
          ownerId: 'demo_owner',
          isDemo: true,
          name: 'B Lugar Legal 🍔 (Demonstração)',
          slug: demoSlug,
          tagline: 'Hambúrgueres Artesanais, Porções & Sucos Naturais',
          description: 'Restaurante modelo para demonstração de recursos e testes da plataforma Nimbo.',
          avatar: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=250&q=80',
          cover: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
          phone: '(11) 98765-4321',
          whatsapp: '5511987654321',
          pixKey: 'blugarlegal@pix.com.br',
          deliveryFee: 6.00,
          minOrder: 15.00,
          eta: '30-45 min',
          plan: 'pro',
          acceptingOrders: true,
          businessHours: {
            seg: { open: true, start: "18:00", end: "23:00" },
            ter: { open: true, start: "18:00", end: "23:00" },
            qua: { open: true, start: "18:00", end: "23:00" },
            qui: { open: true, start: "18:00", end: "23:00" },
            sex: { open: true, start: "18:00", end: "00:00" },
            sab: { open: true, start: "18:00", end: "00:00" },
            dom: { open: true, start: "18:00", end: "23:00" }
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        all.push(demo);
        this._saveAllRestaurants(all);

        NimboMenu._populateDemoMenu(demo.id);
      }

      return demo;
    }
  };

  // --- CARDÁPIO ---
  const NimboMenu = {
    getCategories(restaurantId) {
      if (!restaurantId) return [];
      return localDB.get('categories', restaurantId) || [];
    },

    createCategory(restaurantId, name) {
      if (!restaurantId || !name || !name.trim()) return null;
      const cats = this.getCategories(restaurantId);
      const newCat = {
        id: generateId('cat'),
        restaurantId,
        name: name.trim(),
        slug: generateSlug(name),
        displayOrder: cats.length + 1
      };
      cats.push(newCat);
      localDB.set('categories', cats, restaurantId);
      return newCat;
    },

    deleteCategory(restaurantId, categoryId) {
      const cats = this.getCategories(restaurantId);
      const filtered = cats.filter(c => c.id !== categoryId);
      localDB.set('categories', filtered, restaurantId);
      return true;
    },

    getProducts(restaurantId) {
      if (!restaurantId) return [];
      return localDB.get('products', restaurantId) || [];
    },

    createProduct(restaurantId, productData) {
      if (!restaurantId) throw new Error('ID do restaurante é obrigatório.');
      if (!productData.name || !productData.name.trim()) throw new Error('Nome do produto é obrigatório.');

      const products = this.getProducts(restaurantId);
      const newProduct = {
        id: generateId('prod'),
        restaurantId,
        name: productData.name.trim(),
        description: productData.description ? productData.description.trim() : '',
        category: productData.category || 'outros',
        price: parseFloat(productData.price) || 0.00,
        image: productData.image || '',
        isAvailable: productData.isAvailable !== undefined ? productData.isAvailable : true,
        isPopular: !!productData.isPopular,
        addons: Array.isArray(productData.addons) ? productData.addons : [],
        createdAt: new Date().toISOString()
      };

      products.push(newProduct);
      localDB.set('products', products, restaurantId);
      return newProduct;
    },

    updateProduct(restaurantId, productId, updates) {
      const products = this.getProducts(restaurantId);
      const index = products.findIndex(p => p.id === productId);
      if (index === -1) throw new Error('Produto não encontrado.');

      products[index] = {
        ...products[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      localDB.set('products', products, restaurantId);
      return products[index];
    },

    deleteProduct(restaurantId, productId) {
      const products = this.getProducts(restaurantId);
      const filtered = products.filter(p => p.id !== productId);
      localDB.set('products', filtered, restaurantId);
      return true;
    },

    toggleAvailability(restaurantId, productId) {
      const products = this.getProducts(restaurantId);
      const prod = products.find(p => p.id === productId);
      if (prod) {
        prod.isAvailable = !prod.isAvailable;
        localDB.set('products', products, restaurantId);
        return prod.isAvailable;
      }
      return false;
    },

    _populateDemoMenu(demoId) {
      const cats = [
        { id: 'cat_lanches', restaurantId: demoId, name: 'Hambúrgueres', slug: 'lanches', displayOrder: 1 },
        { id: 'cat_porcoes', restaurantId: demoId, name: 'Porções', slug: 'porcoes', displayOrder: 2 },
        { id: 'cat_bebidas', restaurantId: demoId, name: 'Bebidas', slug: 'bebidas', displayOrder: 3 },
        { id: 'cat_sobremesas', restaurantId: demoId, name: 'Sobremesas', slug: 'sobremesas', displayOrder: 4 }
      ];
      localDB.set('categories', cats, demoId);

      const prods = [
        {
          id: 'p1',
          restaurantId: demoId,
          category: 'lanches',
          name: 'X Burger Especial',
          description: 'Pão brioche selado na manteiga, hambúrguer bovino 160g, cheddar cremoso e maionese verde.',
          price: 18.00,
          image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80',
          isAvailable: true,
          isPopular: true,
          addons: [
            { id: 'ovo', name: 'Ovo caipira frito', price: 3.00 },
            { id: 'bacon', name: 'Bacon Crocante', price: 4.50 },
            { id: 'cheddar', name: 'Cheddar cremoso extra', price: 4.00 }
          ]
        },
        {
          id: 'p2',
          restaurantId: demoId,
          category: 'lanches',
          name: 'Smash Bacon Duplo',
          description: '2 carnes smash 90g com crostinha crocante, queijo prato, dobro de bacon e molho barbecue.',
          price: 26.00,
          image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=500&q=80',
          isAvailable: true,
          isPopular: true,
          addons: [
            { id: 'bacon', name: 'Bacon Extra', price: 4.50 },
            { id: 'maionese', name: 'Pote de Maionese da Casa', price: 2.50 }
          ]
        },
        {
          id: 'p3',
          restaurantId: demoId,
          category: 'porcoes',
          name: 'Batata Rústica com Alecrim',
          description: 'Batatas com corte rústico fritas na hora, temperadas com sal marinho, alecrim fresco e alho.',
          price: 16.00,
          image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=500&q=80',
          isAvailable: true,
          isPopular: true,
          addons: [
            { id: 'cheddar_bacon', name: 'Cobertura de Cheddar & Bacon', price: 6.00 }
          ]
        },
        {
          id: 'p4',
          restaurantId: demoId,
          category: 'bebidas',
          name: 'Coca-Cola Gelada 350ml',
          description: 'Lata 350ml trincando de gelada.',
          price: 6.00,
          image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=80',
          isAvailable: true,
          isPopular: false,
          addons: []
        }
      ];
      localDB.set('products', prods, demoId);
    }
  };

  // --- PEDIDOS ---
  const NimboOrders = {
    getOrders(restaurantId) {
      if (!restaurantId) return [];
      return localDB.get('orders', restaurantId) || [];
    },

    createOrder(restaurantId, orderPayload) {
      const restaurant = NimboRestaurant.getRestaurantById(restaurantId);
      if (!restaurant) throw new Error('Restaurante não encontrado.');

      if (!NimboPlans.canAcceptOrders(restaurant)) {
        throw new Error(
          'Este restaurante está no plano Grátis e não aceita pedidos automáticos pelo sistema. ' +
          'O cardápio está no modo consultivo. Faça o pedido diretamente pelo WhatsApp ou balcão.'
        );
      }

      if (!restaurant.acceptingOrders) {
        throw new Error('O restaurante está fechado ou temporariamente pausou o recebimento de pedidos.');
      }

      const orders = this.getOrders(restaurantId);
      const nextNum = (orders.length > 0 ? Math.max(...orders.map(o => o.orderNumber || 0)) : 20) + 1;

      const newOrder = {
        id: generateId('ord'),
        restaurantId,
        orderNumber: nextNum,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        customer: orderPayload.customer,
        phone: orderPayload.phone,
        type: orderPayload.type || 'delivery',
        address: orderPayload.address || '',
        complement: orderPayload.complement || '',
        table: orderPayload.table || '',
        items: orderPayload.items || [],
        deliveryFee: parseFloat(orderPayload.deliveryFee) || 0.00,
        subtotal: parseFloat(orderPayload.subtotal) || 0.00,
        total: parseFloat(orderPayload.total) || 0.00,
        paymentMethod: orderPayload.paymentMethod || 'pix',
        status: 'new',
        createdAt: new Date().toISOString()
      };

      orders.unshift(newOrder);
      localDB.set('orders', orders, restaurantId);

      return newOrder;
    },

    updateOrderStatus(restaurantId, orderId, newStatus) {
      const orders = this.getOrders(restaurantId);
      const order = orders.find(o => o.id === orderId);
      if (!order) return null;

      order.status = newStatus;
      order.updatedAt = new Date().toISOString();
      localDB.set('orders', orders, restaurantId);
      return order;
    }
  };

  // --- PLANOS ---
  const NimboPlans = {
    getPlanDetails(planId) {
      const plans = getPlans();
      return plans[planId] || plans.free;
    },

    canAcceptOrders(restaurant) {
      if (!restaurant) return false;
      const plans = getPlans();
      const plan = plans[restaurant.plan];
      return plan ? plan.canAcceptOrders : false;
    },

    canUseKds(restaurant) {
      if (!restaurant) return false;
      const plans = getPlans();
      const plan = plans[restaurant.plan];
      return plan ? plan.canUseKds : false;
    },

    canUseBot(restaurant) {
      if (!restaurant) return false;
      const plans = getPlans();
      const plan = plans[restaurant.plan];
      return plan ? plan.canUseBot : false;
    },

    canViewReports(restaurant) {
      if (!restaurant) return false;
      const plans = getPlans();
      const plan = plans[restaurant.plan];
      return plan ? plan.canViewReports : false;
    },

    simulateUpgrade(restaurantId, targetPlan) {
      if (!['free', 'essential', 'pro'].includes(targetPlan)) {
        throw new Error('Plano inválido.');
      }
      const updates = {
        plan: targetPlan,
        acceptingOrders: targetPlan !== 'free'
      };
      return NimboRestaurant.updateRestaurant(restaurantId, updates);
    }
  };

  return {
    generateSlug,
    NimboAuth,
    NimboRestaurant,
    NimboMenu,
    NimboOrders,
    NimboPlans
  };
}));
