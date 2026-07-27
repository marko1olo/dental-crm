-- Переводит проценты в doctor_commissions из real (двоичный float, приблизительный)
-- в numeric(5, 2) (точная десятичная дробь), как это уже сделано для процентов
-- страхового покрытия в 0112.
--
-- ЗАЧЕМ: db/schema.ts объявляет обе колонки как numeric(5, 2), а физически они
-- созданы как real. Расхождение бьёт дважды. Во-первых, real — это float4, у
-- него около семи значащих цифр: 25.5 хранится не как 25.5, и выручка,
-- умноженная на такой процент, даёт неверные копейки. Во-вторых, drizzle для
-- numeric ожидает строку, а из real приходит число — TypeScript считает
-- значение string, в рантайме получает number.
--
-- Диапазон 0.00..100.00 укладывается в precision 5 / scale 2. USING сохраняет
-- существующие данные, округляя до двух знаков.
ALTER TABLE "doctor_commissions" ALTER COLUMN "commission_pct" SET DATA TYPE numeric(5, 2) USING "commission_pct"::numeric(5, 2);--> statement-breakpoint
ALTER TABLE "doctor_commissions" ALTER COLUMN "commission_pct" SET DEFAULT '25';--> statement-breakpoint
ALTER TABLE "doctor_commissions" ALTER COLUMN "material_cost_deduction_pct" SET DATA TYPE numeric(5, 2) USING "material_cost_deduction_pct"::numeric(5, 2);--> statement-breakpoint
ALTER TABLE "doctor_commissions" ALTER COLUMN "material_cost_deduction_pct" SET DEFAULT '0';
