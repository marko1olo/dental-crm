ALTER TABLE "dente_telegram_bot_configs"
  ADD COLUMN IF NOT EXISTS "post_visit_checkup_delay_hours_json" text DEFAULT '{"extraction":24,"implantation":24,"filling_restoration":48,"endo":48,"surgery":24,"local_anesthesia":24,"hygiene":72,"prosthetics":48,"orthodontics":72,"periodontology":72,"other":48}' NOT NULL;
