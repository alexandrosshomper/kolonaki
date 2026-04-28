-- Prevent duplicate pending invites to the same email from the same inviter.
-- Partial index: only covers rows where accepted_at IS NULL so that a previously
-- accepted invite does not block a fresh one to the same address.
create unique index if not exists invitations_pending_unique
  on invitations (inviter_id, email)
  where accepted_at is null;
