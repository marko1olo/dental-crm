import { defineConfig } from "drizzle-kit";
import { loadAdditionalServerEnv } from "./src/env/loadServerEnv.js";

// Drizzle-kit не грузит .env сам. Тот же загрузчик, которым пользуются
// db/client.ts и scripts/migrate.ts, чтобы конфиг всегда смотрел в ту же базу,
// что и приложение: DATABASE_URL лежит в КОРНЕВОМ .env, а не apps/api/.env.
// Раньше здесь стояли `driver: "pglite"` и `url: "./dente-db"` — остаток от
// удалённой линии PGlite. Они заставляли drizzle-kit мигрировать локальный
// файловый каталог, а не PostgreSQL из DATABASE_URL, и потому db:generate
// не заслуживал доверия (см. .agents/DATABASE.md). Диалект здесь `postgresql`,
// то есть драйвер node-postgres; отдельного поля driver у этого поколения
// drizzle-kit нет.
loadAdditionalServerEnv();

const url = process.env.DATABASE_URL;
if (!url || url.trim() === "") {
	throw new Error(
		"DATABASE_URL не задан. Укажите строку подключения к PostgreSQL в корневом .env — тот же адрес, к которому подключаются db/client.ts и npm run db:migrate.",
	);
}

export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url,
	},
});
