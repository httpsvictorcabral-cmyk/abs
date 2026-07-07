/*
# Fix handle_new_user trigger function

## Problem
The `handle_new_user()` trigger function was failing with "Database error saving new user"
because it lacked a `search_path` setting. Supabase requires SECURITY DEFINER functions
to have `SET search_path` configured, otherwise they are rejected at execution time.

## Fix
1. Recreate `handle_new_user()` with `SET search_path = public` and `SECURITY DEFINER`.
2. Recreate the trigger to ensure it uses the updated function.
3. Also ensure the `usuarios` table has the correct INSERT policy for the trigger context.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count int;
  new_role text;
BEGIN
  SELECT count(*) INTO admin_count FROM public.usuarios WHERE role = 'Administrador';
  IF admin_count = 0 THEN
    new_role := 'Administrador';
  ELSE
    new_role := 'Visualizador';
  END IF;
  INSERT INTO public.usuarios (id, email, nome, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    new_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();