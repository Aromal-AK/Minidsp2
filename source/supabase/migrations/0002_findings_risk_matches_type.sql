-- Adds the risk/type pairing CHECK to databases where findings was created before it existed in 0001.
alter table public.findings drop constraint if exists findings_risk_matches_type;
alter table public.findings add constraint findings_risk_matches_type check (
  (type = 'email' and risk = 'Low')
  or (type = 'uk_phone' and risk = 'Medium')
  or (type = 'uk_nino' and risk = 'High')
  or (type = 'payment_card' and risk = 'Critical')
);
