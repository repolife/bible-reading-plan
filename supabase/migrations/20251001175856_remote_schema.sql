set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$begin
  insert into public.profiles (id) values (new.id);
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION public.on_auth_user_created()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$begin
  insert into public.profiles (id) values (new.id);
  return new;
end;$function$
;



