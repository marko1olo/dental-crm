/*
 * ЧИТАЮЩАЯ проба. Ничего не пишет.
 *
 * Доказывает, ПОЧЕМУ nullable-суммы сводки прайса нельзя отдавать в money()
 * напрямую. Тело функции не переписано, а вынуто из AppHelpers.tsx как есть:
 * переписанная копия доказывала бы мою редакцию, а не отгруженный код. Импортом
 * взять нельзя — AppHelpers по цепочке тянет таблицы стилей и в node не
 * запускается (об этом сказано в самом файле у реэкспорта russianPlural).
 */
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
	path.resolve("apps/web/src/AppHelpers.tsx"),
	"utf8",
);
const start = source.indexOf("export function money(");
if (start < 0) throw new Error("money() не найдена в AppHelpers.tsx");
let depth = 0;
let end = -1;
for (let i = source.indexOf("{", start); i < source.length; i++) {
	if (source[i] === "{") depth++;
	else if (source[i] === "}") {
		depth--;
		if (depth === 0) {
			end = i + 1;
			break;
		}
	}
}
if (end < 0) throw new Error("не найден конец тела money()");
const body = source
	.slice(start, end)
	.replace(
		"export function money(value: number | string | null)",
		"function money(value)",
	)
	.replace(
		"Number.isFinite(amount as number) ? (amount as number)",
		"Number.isFinite(amount) ? amount",
	);
const money = new Function(`${body}; return money;`)();

for (const value of [null, 0, 35000, 1500.5]) {
	console.log(JSON.stringify(value) + " -> " + JSON.stringify(money(value)));
}
const nullPrintsZero = money(null) === money(0);
console.log("money(null) НЕОТЛИЧИМ ОТ money(0): " + nullPrintsZero);
process.exit(nullPrintsZero ? 0 : 1);
