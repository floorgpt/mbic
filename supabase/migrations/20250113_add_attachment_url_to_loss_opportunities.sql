-- Add attachment_url column to loss_opportunities table
-- Date: 2025-01-13

-- Add the attachment_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'loss_opportunities'
    AND column_name = 'attachment_url'
  ) THEN
    ALTER TABLE public.loss_opportunities
    ADD COLUMN attachment_url TEXT NULL;
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN public.loss_opportunities.attachment_url IS 'Public URL to the attachment file stored in Supabase Storage (images: png, jpg; documents: pdf)';
