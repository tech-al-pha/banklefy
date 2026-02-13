-- Ensure storage RLS policies for bank-statements uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload their own files'
  ) THEN
    CREATE POLICY "Users can upload their own files"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'bank-statements'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can read their own files'
  ) THEN
    CREATE POLICY "Users can read their own files"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'bank-statements'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete their own files'
  ) THEN
    CREATE POLICY "Users can delete their own files"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'bank-statements'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
