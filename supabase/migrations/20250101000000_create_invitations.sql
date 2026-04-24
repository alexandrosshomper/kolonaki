-- invitations table
--
-- Stores workspace invite tokens. All operations (insert, select, update) are
-- performed by the service role client (createAdminClient) which bypasses RLS.
-- No anon or authenticated role needs direct table access — RLS is enabled with
-- no policies so that accidental non-admin queries return nothing.

create table if not exists invitations (
  id           uuid        primary key default gen_random_uuid(),
  inviter_id   uuid        not null references auth.users(id) on delete cascade,
  email        text        not null,
  token        uuid        not null unique default gen_random_uuid(),
  accepted_by  uuid        references auth.users(id) on delete set null,
  accepted_at  timestamptz,
  expires_at   timestamptz not null default (now() + interval '7 days'),
  created_at   timestamptz not null default now()
);

-- Enable RLS. No policies are defined intentionally — only the service role
-- (used by createAdminClient) can access this table.
alter table invitations enable row level security;

-- Fast token lookup (hot path: every invite-accept request)
create index if not exists invitations_token_idx on invitations (token);

-- Useful for "has this email already been invited?" checks
create index if not exists invitations_email_idx on invitations (email);

-- Useful for "show invites sent by this user" queries
create index if not exists invitations_inviter_id_idx on invitations (inviter_id);
