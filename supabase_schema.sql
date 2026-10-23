-- ============================================================================
-- NIMBO SAAS — SCHEMA DDL & ROW LEVEL SECURITY (SUPABASE / POSTGRESQL)
-- Suporte completo para múltiplos restaurantes, planos e isolamento de dados
-- ============================================================================

-- 1. TABELA DE PERFIS DE USUÁRIO (VINCULADA AO AUTH.USERS DO SUPABASE)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. TABELA DE RESTAURANTES (MÚLTIPLOS RESTAURANTES POR USUÁRIO)
CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  tagline TEXT DEFAULT '',
  description TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  pix_key TEXT DEFAULT '',
  delivery_fee NUMERIC(10, 2) DEFAULT 0.00,
  min_order NUMERIC(10, 2) DEFAULT 0.00,
  eta_text TEXT DEFAULT '30-45 min',
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'essential', 'pro')),
  accepting_orders BOOLEAN DEFAULT FALSE,
  business_hours JSONB DEFAULT '{
    "seg": {"open": true, "start": "18:00", "end": "23:00"},
    "ter": {"open": true, "start": "18:00", "end": "23:00"},
    "qua": {"open": true, "start": "18:00", "end": "23:00"},
    "qui": {"open": true, "start": "18:00", "end": "23:00"},
    "sex": {"open": true, "start": "18:00", "end": "00:00"},
    "sab": {"open": true, "start": "18:00", "end": "00:00"},
    "dom": {"open": true, "start": "18:00", "end": "23:00"}
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. TABELA DE CATEGORIAS DO CARDÁPIO
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. TABELA DE PRODUTOS DO CARDÁPIO
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  image_url TEXT DEFAULT '',
  is_available BOOLEAN DEFAULT TRUE,
  is_popular BOOLEAN DEFAULT FALSE,
  addons JSONB DEFAULT '[]'::jsonb,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. TABELA DE PEDIDOS (RECEBIDOS PELO CARDÁPIO DIGITAL)
CREATE TABLE IF NOT EXISTS public.orders (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_number INT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('delivery', 'retirada', 'mesa')),
  address TEXT DEFAULT '',
  complement TEXT DEFAULT '',
  table_number TEXT DEFAULT '',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'dinheiro', 'cartao')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'prep', 'route', 'done', 'canceled')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. TABELA DE ASSINATURAS E PLANOS
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID UNIQUE NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'essential', 'pro')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  payment_gateway TEXT DEFAULT 'kiwify',
  gateway_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- POLÍTICAS DE SEGURANÇA EM NÍVEL DE LINHA (ROW LEVEL SECURITY - RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Regras para Profiles: Cada usuário só edita seu próprio perfil
CREATE POLICY "Usuários veem próprio perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuários alteram próprio perfil" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Regras para Restaurants:
-- A) Público pode consultar dados básicos de restaurantes para carregar cardápio
CREATE POLICY "Cardápio público pode ler restaurantes" ON public.restaurants
  FOR SELECT USING (true);

-- B) Proprietário pode gerenciar seus próprios restaurantes
CREATE POLICY "Donos gerenciam seus restaurantes" ON public.restaurants
  FOR ALL USING (auth.uid() = owner_id);

-- Regras para Categories:
CREATE POLICY "Público visualiza categorias do cardápio" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "Dono gerencia categorias" ON public.categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.restaurants 
      WHERE restaurants.id = categories.restaurant_id 
        AND restaurants.owner_id = auth.uid()
    )
  );

-- Regras para Products:
CREATE POLICY "Público visualiza produtos" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "Dono gerencia produtos" ON public.products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.restaurants 
      WHERE restaurants.id = products.restaurant_id 
        AND restaurants.owner_id = auth.uid()
    )
  );

-- Regras para Orders:
-- A) Criação de pedidos no cardápio público:
-- SOMENTE permitida se o restaurante estiver em um plano pago (essential ou pro) e aceitando pedidos!
CREATE POLICY "Criação de pedidos com validação de plano" ON public.orders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants 
      WHERE restaurants.id = orders.restaurant_id 
        AND restaurants.plan IN ('essential', 'pro')
        AND restaurants.accepting_orders = true
    )
  );

-- B) Leitura e gerenciamento de pedidos: SOMENTE o dono do restaurante pode ver/atualizar
CREATE POLICY "Dono do restaurante gerencia pedidos" ON public.orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.restaurants 
      WHERE restaurants.id = orders.restaurant_id 
        AND restaurants.owner_id = auth.uid()
    )
  );

-- Regras para Subscriptions:
CREATE POLICY "Dono do restaurante visualiza assinatura" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.restaurants 
      WHERE restaurants.id = subscriptions.restaurant_id 
        AND restaurants.owner_id = auth.uid()
    )
  );
