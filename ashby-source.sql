INSERT INTO public.job_sources (
  name,
  source_type,
  default_expiry_days
)
VALUES (
  'Ashby',
  'ats',
  30
)
ON CONFLICT (name) DO NOTHING;