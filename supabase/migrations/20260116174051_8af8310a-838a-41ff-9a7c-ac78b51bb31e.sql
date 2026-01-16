-- Fix RLS policies for profiles table
-- Drop existing policies
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create PERMISSIVE policies for authenticated users (required for access to work)
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

-- Fix RLS policies for risk_analysis table
DROP POLICY IF EXISTS "Deny anonymous access to risk_analysis" ON public.risk_analysis;
DROP POLICY IF EXISTS "Users can view their own risk analysis" ON public.risk_analysis;
DROP POLICY IF EXISTS "Users can insert their own risk analysis" ON public.risk_analysis;
DROP POLICY IF EXISTS "Users can update their own risk analysis" ON public.risk_analysis;

-- Create PERMISSIVE policies for authenticated users only
CREATE POLICY "Users can view their own risk analysis" 
ON public.risk_analysis 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own risk analysis" 
ON public.risk_analysis 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own risk analysis" 
ON public.risk_analysis 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Fix RLS policies for category_corrections table
DROP POLICY IF EXISTS "Deny anonymous access to category_corrections" ON public.category_corrections;
DROP POLICY IF EXISTS "Users can view their own category corrections" ON public.category_corrections;
DROP POLICY IF EXISTS "Users can insert their own category corrections" ON public.category_corrections;
DROP POLICY IF EXISTS "Users can update their own category corrections" ON public.category_corrections;

-- Create PERMISSIVE policies for authenticated users only
CREATE POLICY "Users can view their own category corrections" 
ON public.category_corrections 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own category corrections" 
ON public.category_corrections 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own category corrections" 
ON public.category_corrections 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);