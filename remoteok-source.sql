INSERT INTO public.job_sources (
  name,
  source_type,
  default_expiry_days
)
VALUES (
  'Remote OK',
  'job_board',
  30
)
ON CONFLICT (name) DO NOTHING;