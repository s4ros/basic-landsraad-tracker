-- The version inserted below must match this filename.

alter table identities
  add column display_name text not null default '',
  add column email text;

alter table identities
  alter column display_name drop default;

alter table identities
  add constraint identities_display_name_length check (char_length(display_name) <= 80),
  add constraint identities_email_length check (email is null or char_length(email) <= 320);

create unique index identities_email_lower on identities (lower(email)) where email is not null;

insert into schema_migrations (version) values ('004_identity_label.sql');
