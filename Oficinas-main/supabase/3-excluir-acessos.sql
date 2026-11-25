-- Permite que administradores excluam contas pela aba "Acessos" do site.
create or replace function public.excluir_usuario(uid uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.e_admin() then
    raise exception 'Somente administradores podem excluir contas.';
  end if;
  if uid = auth.uid() then
    raise exception 'Você não pode excluir a sua própria conta.';
  end if;
  delete from auth.users where id = uid;   -- o perfil é apagado junto
end $$;

revoke all on function public.excluir_usuario(uuid) from public, anon;
grant execute on function public.excluir_usuario(uuid) to authenticated;
