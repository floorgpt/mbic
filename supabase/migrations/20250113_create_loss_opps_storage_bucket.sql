-- Create Supabase Storage bucket for loss opportunity attachments
-- Date: 2025-01-13

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'loss-opportunity-attachments',
  'loss-opportunity-attachments',
  true,  -- Public bucket so URLs can be accessed directly
  5242880,  -- 5MB file size limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload loss opp attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'loss-opportunity-attachments');

-- Allow public read access (since bucket is public)
CREATE POLICY "Allow public read access to loss opp attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'loss-opportunity-attachments');

-- Allow authenticated users to delete their own uploads (optional, for cleanup)
CREATE POLICY "Allow authenticated users to delete loss opp attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'loss-opportunity-attachments');
