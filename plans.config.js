/**
 * NIMBO SAAS - CONFIGURAÇÃO CENTRAL DE PLANOS E PREÇOS
 * Permite ajustar valores, nomes, recursos e períodos sem alterar a regra de negócio.
 */

var NIMBO_PLANS = {
  free: {
    id: "free",
    name: "Nimbo Grátis",
    tagline: "O ponto de partida para qualquer restaurante",
    priceMonthly: 0,
    priceFormatted: "R$ 0",
    period: "/mês",
    badge: "Gratuito para Sempre",
    highlight: false,
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
    highlight: true,
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
    highlight: false,
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

if (typeof window !== 'undefined') {
  window.NIMBO_PLANS = NIMBO_PLANS;
}
