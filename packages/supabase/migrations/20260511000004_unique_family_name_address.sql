ALTER TABLE public.family_groups
  ADD CONSTRAINT family_groups_name_address_key
  UNIQUE (family_last_name, address);
