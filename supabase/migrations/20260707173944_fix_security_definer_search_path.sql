/*
# Fix SECURITY DEFINER functions with search_path

## Problem
The `is_admin_or_rh()` and `is_admin()` helper functions are SECURITY DEFINER
but lack `SET search_path`, which can cause policy evaluation failures in
newer Supabase versions.

## Fix
Recreate both functions with `SET search_path = public`.
*/

CREATE OR REPLACE FUNCTION public.is_admin_or_rh()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND role IN ('Administrador', 'RH') AND ativo = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND role = 'Administrador' AND ativo = true
  );
$$;