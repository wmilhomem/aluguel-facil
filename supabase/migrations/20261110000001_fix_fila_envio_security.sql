-- Corrige a segurança da fila de envio e o tipo da chave de idempotência.
-- Aplicar depois das migrações anteriores.

ALTER TABLE public.fila_envio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Donos so gerenciam sua fila de envio" ON public.fila_envio;
CREATE POLICY "Donos so gerenciam sua fila de envio" ON public.fila_envio
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON TABLE public.fila_envio FROM anon;

ALTER TABLE public.fila_envio ALTER COLUMN chave_idempotencia DROP DEFAULT;
ALTER TABLE public.fila_envio
    ALTER COLUMN chave_idempotencia TYPE TEXT USING chave_idempotencia::text;
