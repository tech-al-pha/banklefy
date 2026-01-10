-- Create enum for fraud alert severity
CREATE TYPE public.fraud_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Create enum for alert status
CREATE TYPE public.alert_status AS ENUM ('pending', 'reviewed', 'dismissed', 'confirmed');

-- Create table for fraud alerts per conversion
CREATE TABLE public.fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_id UUID NOT NULL REFERENCES public.conversions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  severity fraud_severity NOT NULL DEFAULT 'medium',
  status alert_status NOT NULL DEFAULT 'pending',
  description TEXT NOT NULL,
  affected_rows JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Create table for risk analysis results
CREATE TABLE public.risk_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_id UUID NOT NULL REFERENCES public.conversions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  foir_score DECIMAL(5,2),
  average_daily_balance DECIMAL(15,2),
  max_dip_amount DECIMAL(15,2),
  max_dip_date DATE,
  total_inflow DECIMAL(15,2),
  total_outflow DECIMAL(15,2),
  net_cashflow DECIMAL(15,2),
  salary_credits JSONB DEFAULT '[]'::jsonb,
  emi_debits JSONB DEFAULT '[]'::jsonb,
  risk_flags JSONB DEFAULT '[]'::jsonb,
  integrity_score DECIMAL(5,2) DEFAULT 100.00,
  balance_mismatches INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for user category corrections (learning feedback)
CREATE TABLE public.category_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  original_category TEXT NOT NULL,
  corrected_category TEXT NOT NULL,
  description_pattern TEXT NOT NULL,
  weight DECIMAL(3,2) DEFAULT 1.00,
  usage_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, description_pattern)
);

-- Enable RLS on all tables
ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_corrections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fraud_alerts
CREATE POLICY "Deny anonymous access to fraud_alerts"
ON public.fraud_alerts FOR ALL
TO anon
USING (false);

CREATE POLICY "Users can view their own fraud alerts"
ON public.fraud_alerts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fraud alerts"
ON public.fraud_alerts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fraud alerts"
ON public.fraud_alerts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for risk_analysis
CREATE POLICY "Deny anonymous access to risk_analysis"
ON public.risk_analysis FOR ALL
TO anon
USING (false);

CREATE POLICY "Users can view their own risk analysis"
ON public.risk_analysis FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own risk analysis"
ON public.risk_analysis FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own risk analysis"
ON public.risk_analysis FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for category_corrections
CREATE POLICY "Deny anonymous access to category_corrections"
ON public.category_corrections FOR ALL
TO anon
USING (false);

CREATE POLICY "Users can view their own category corrections"
ON public.category_corrections FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own category corrections"
ON public.category_corrections FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own category corrections"
ON public.category_corrections FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create updated_at trigger for risk_analysis
CREATE TRIGGER update_risk_analysis_updated_at
BEFORE UPDATE ON public.risk_analysis
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create updated_at trigger for category_corrections
CREATE TRIGGER update_category_corrections_updated_at
BEFORE UPDATE ON public.category_corrections
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();