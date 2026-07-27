-- ─────────────────────────────────────────────────────────────────────────────
-- family_groups.organization_id: NULL больше не допускается.
--
-- ЗАЧЕМ: колонка была nullable, а routes/finance_family.ts выбирал семейные
-- группы условием
--     organization_id = :orgId OR organization_id IS NULL
-- и, найдя бесхозную группу, присваивал её обратившейся клинике. Через семейную
-- группу проходит кошелёк с деньгами: любая клиника могла прочитать чужую
-- группу без организации, забрать её себе и списать баланс. Условие убрано из
-- кода; здесь закрывается сама возможность появления таких строк.
--
-- Порядок: сначала восстановить принадлежность существующих строк, только потом
-- ставить NOT NULL — иначе ALTER упадёт на первой же унаследованной записи.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Привязка по головному пациенту группы (head_patient_id, затем
--    primary_patient_id). Пациент всегда принадлежит организации, поэтому это
--    единственный достоверный источник.
UPDATE "family_groups" AS fg
SET "organization_id" = p."organization_id"
FROM "patients" AS p
WHERE fg."organization_id" IS NULL
  AND p."id" = COALESCE(fg."head_patient_id", fg."primary_patient_id");

-- 2. Если головной пациент не проставлен, берём организацию любого участника
--    группы — при условии, что все участники из одной организации. Разнородные
--    группы не трогаем: угадывать владельца кошелька нельзя.
UPDATE "family_groups" AS fg
SET "organization_id" = src."organization_id"
FROM (
    SELECT "family_group_id", MIN("organization_id"::text)::uuid AS "organization_id"
    FROM "patients"
    WHERE "family_group_id" IS NOT NULL
    GROUP BY "family_group_id"
    HAVING COUNT(DISTINCT "organization_id") = 1
) AS src
WHERE fg."organization_id" IS NULL
  AND fg."id" = src."family_group_id";

-- 3. Оставшиеся без владельца строки могут существовать только если группа
--    пуста и головной пациент не задан. Денег в такой группе быть не должно;
--    если баланс всё же ненулевой, миграция остановится и потребует ручного
--    разбора, вместо того чтобы молча удалить деньги.
DO $$
DECLARE
    orphan_with_money integer;
    orphan_empty integer;
BEGIN
    SELECT COUNT(*) INTO orphan_with_money
    FROM "family_groups"
    WHERE "organization_id" IS NULL
      AND COALESCE("balance", '0.00')::numeric <> 0;

    IF orphan_with_money > 0 THEN
        RAISE EXCEPTION
            'family_groups: % строк без организации имеют ненулевой баланс. Определите владельца вручную перед применением миграции.',
            orphan_with_money;
    END IF;

    SELECT COUNT(*) INTO orphan_empty
    FROM "family_groups"
    WHERE "organization_id" IS NULL;

    IF orphan_empty > 0 THEN
        DELETE FROM "family_groups" WHERE "organization_id" IS NULL;
        RAISE NOTICE 'family_groups: удалено % пустых групп без организации.', orphan_empty;
    END IF;
END $$;

-- 4. Запрет на появление новых бесхозных групп.
ALTER TABLE "family_groups" ALTER COLUMN "organization_id" SET NOT NULL;

-- 5. Внешний ключ: организация должна существовать. Раньше в колонку можно было
--    записать произвольный UUID.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'family_groups_organization_id_fk'
    ) THEN
        ALTER TABLE "family_groups"
            ADD CONSTRAINT "family_groups_organization_id_fk"
            FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
    END IF;
END $$;

-- 6. Выборки всегда идут парой (id, organization_id).
CREATE INDEX IF NOT EXISTS "idx_family_groups_org"
    ON "family_groups" ("organization_id", "id");
