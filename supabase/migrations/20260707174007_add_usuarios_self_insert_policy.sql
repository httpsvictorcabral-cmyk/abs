/*
# Add self-insert policy for usuarios table

## Problem
The `usuarios` table only allows admins to INSERT. This means if the
`handle_new_user` trigger fails (e.g., due to a transient error), the
user has no way to create their own profile as a fallback — the RLS
INSERT policy blocks it.

## Fix
Add a policy allowing authenticated users to INSERT their own profile row
(id = auth.uid()). This is safe because:
- The id column defaults to auth.uid(), so a user can only insert their own ID
- The INSERT policy's WITH CHECK ensures id = auth.uid()
- This mirrors the standard Supabase profile pattern
*/

DROP POLICY IF EXISTS "usuarios_insert_self" ON usuarios;
CREATE POLICY "usuarios_insert_self"
ON usuarios FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);