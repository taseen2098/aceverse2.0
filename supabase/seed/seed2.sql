INSERT INTO public.profiles (id, full_name, avatar_url, updated_at)
VALUES 
  ('c12c1f7e-6900-40bc-b25b-e3abf0066cef', 'Taseen 2098', 'https://picsum.photos/50/50', now()),
  ('5cefd05a-e5af-49dc-9765-baa882cb1382', 'Teacher 1', 'https://picsum.photos/50/50', now()),
  ('fca16117-5dbf-45a1-81fb-c74e4989a14d', 'Teacher 2', 'https://picsum.photos/50/50', now()),
  ('22aa5d18-441f-4881-bd9d-cede01496b59', 'Person 1', 'https://picsum.photos/50/50', now()),
  ('227dc6af-bde5-472d-b634-7418080a7721', 'Person 2', 'https://picsum.photos/50/50', now()),
  ('4b571b6a-2a82-4a5b-85a9-35f13ba8feab', 'Person 3', 'https://picsum.photos/50/50', now())
ON CONFLICT (id) DO NOTHING;