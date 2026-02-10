-- Create razorpay_orders table to store payment orders
CREATE TABLE IF NOT EXISTS public.razorpay_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id TEXT NOT NULL,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  receipt TEXT,
  amount INTEGER NOT NULL, -- Amount in paise
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created',
  payment_capture BOOLEAN DEFAULT true,
  notes JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create razorpay_payments table to store successful payments
CREATE TABLE IF NOT EXISTS public.razorpay_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.razorpay_orders(id),
  razorpay_payment_id TEXT NOT NULL UNIQUE,
  razorpay_order_id TEXT NOT NULL,
  razorpay_signature TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'captured',
  plan_id TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.razorpay_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.razorpay_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for razorpay_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'razorpay_orders'
      AND policyname = 'Users can view their own orders'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own orders" ON public.razorpay_orders FOR SELECT USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'razorpay_orders'
      AND policyname = 'Service role can insert orders'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can insert orders" ON public.razorpay_orders FOR INSERT WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'razorpay_orders'
      AND policyname = 'Service role can update orders'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can update orders" ON public.razorpay_orders FOR UPDATE USING (true)';
  END IF;
END;
$$;

-- RLS policies for razorpay_payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'razorpay_payments'
      AND policyname = 'Users can view their own payments'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own payments" ON public.razorpay_payments FOR SELECT USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'razorpay_payments'
      AND policyname = 'Service role can insert payments'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can insert payments" ON public.razorpay_payments FOR INSERT WITH CHECK (true)';
  END IF;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_razorpay_orders_user_id ON public.razorpay_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_orders_razorpay_order_id ON public.razorpay_orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_payments_user_id ON public.razorpay_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_payments_razorpay_payment_id ON public.razorpay_payments(razorpay_payment_id);

-- Ensure updated_at trigger function exists (some databases may not have it yet)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'handle_updated_at'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION public.handle_updated_at()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $fn$
      BEGIN
        new.updated_at = now();
        RETURN new;
      END;
      $fn$';
  END IF;
END;
$$;

-- Trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'update_razorpay_orders_updated_at'
      AND n.nspname = 'public'
      AND c.relname = 'razorpay_orders'
  ) THEN
    EXECUTE 'CREATE TRIGGER update_razorpay_orders_updated_at BEFORE UPDATE ON public.razorpay_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()';
  END IF;
END;
$$;
