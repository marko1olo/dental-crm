import assert from "node:assert";
import { describe, test } from "node:test";
import { hashCredential, verifyCredential } from "./cryptoHelper.js";

describe("cryptoHelper", () => {
	describe("verifyCredential", () => {
		test("returns true for valid salt:hash matching", async () => {
			const hashed = await hashCredential("securepassword");
			assert.strictEqual(
				await verifyCredential("securepassword", hashed),
				true,
			);
		});

		test("returns false for invalid salt:hash matching", async () => {
			const hashed = await hashCredential("securepassword");
			assert.strictEqual(
				await verifyCredential("wrongpassword", hashed),
				false,
			);
		});

		test("returns false when salt is missing in stored format", async () => {
			assert.strictEqual(
				await verifyCredential("password", ":somehash"),
				false,
			);
		});

		test("returns false when hash is missing in stored format", async () => {
			assert.strictEqual(
				await verifyCredential("password", "somesalt:"),
				false,
			);
		});

		test("returns false when stored hash has different length than expected", async () => {
			// salt = "somesalt", hash = "short"
			assert.strictEqual(
				await verifyCredential("password", "somesalt:short"),
				false,
			);
		});

		test("returns false when try block throws exception", async () => {
			// Passing null as stored string should throw on .includes
			assert.strictEqual(
				await verifyCredential("password", null as unknown as string),
				false,
			);
			// Passing null as plain string should throw in pbkdf2
			assert.strictEqual(
				await verifyCredential(null as unknown as string, "somesalt:somehash"),
				false,
			);
		});
	});

	/*
	 * СОВМЕСТИМОСТЬ С ХЕШАМИ, КОТОРЫЕ УЖЕ ЛЕЖАТ В БАЗЕ КЛИНИКИ.
	 *
	 * Обе строки ниже посчитаны СТАРОЙ, СИНХРОННОЙ редакцией hashCredential
	 * (pbkdf2Sync, коммит a8d582063) и вписаны сюда дословно. Пароль клиники
	 * "dente2026" и PIN "1234" — открытые значения по умолчанию из
	 * scripts/seedAuth.ts, поэтому здесь нет ничьей настоящей учётной записи.
	 *
	 * ЗАЧЕМ ЭТИ КОНСТАНТЫ ЗДЕСЬ, А НЕ ВЫЧИСЛЕНИЕ НА МЕСТЕ. Пара
	 * «посчитали и сразу проверили» соглашается с любым форматом: смени соль,
	 * число итераций, длину ключа или разделитель — и такая проверка всё равно
	 * пройдёт, потому что обе половины поменялись вместе. Вписанное значение
	 * ловит именно то, что ломает клинику: перебор параметров хеширования, после
	 * которого весь персонал разом перестаёт входить, а тесты остаются зелёными.
	 *
	 * ЕСЛИ ЭТИ ТЕСТЫ ПОКРАСНЕЛИ — формат хранимого значения изменён, и вход в
	 * программу сломан у всех, кому хеш записали до этой правки. Правильная
	 * реакция — вернуть параметры, а не переписать константу.
	 */
	describe("совместимость со старым форматом соль:хеш", () => {
		const LEGACY_PASSWORD = "dente2026";
		const LEGACY_PASSWORD_HASH =
			"60d5ee706aac73223c73767edb6d28de34ad84aab93f5ae8af1f6ac4b95fd794:" +
			"58997ec77261be791336482d1e6be17a96f38983ab10742c321e740e277e1c02" +
			"f1d8ff1d67b41742b0353eb12f95c93abf5646a6d150c75c85b9466fd9c52b48";

		const LEGACY_PIN = "1234";
		const LEGACY_PIN_HASH =
			"8b5d3ac86d55b37c36033558e28cf08f037f54020a4aef326bacbc96292202d5:" +
			"d8125fe63e42bea7e9f4ece295825ed6692b3d211c3c02841cfd7ada99733434" +
			"d0a16f7826bb8634992bc271b5bba907a74a83669b02d3a420c5a74f74e055ef";

		test("пароль клиники, захешированный синхронной редакцией, проверяется асинхронной", async () => {
			assert.strictEqual(
				await verifyCredential(LEGACY_PASSWORD, LEGACY_PASSWORD_HASH),
				true,
			);
		});

		test("PIN сотрудника, захешированный синхронной редакцией, проверяется асинхронной", async () => {
			assert.strictEqual(
				await verifyCredential(LEGACY_PIN, LEGACY_PIN_HASH),
				true,
			);
		});

		test("неверный пароль против старого хеша по-прежнему отклоняется", async () => {
			assert.strictEqual(
				await verifyCredential("dente2027", LEGACY_PASSWORD_HASH),
				false,
			);
			assert.strictEqual(
				await verifyCredential("4321", LEGACY_PIN_HASH),
				false,
			);
		});

		test("новый хеш сохраняет прежнюю форму: hex-соль 64 знака, hex-хеш 128 знаков", async () => {
			// Форма проверяется не для красоты: колонки в базе одни и те же, и
			// значение, посчитанное сегодня, обязано быть неотличимо по строению от
			// того, что записали год назад.
			const [legacySalt, legacyHash] = LEGACY_PASSWORD_HASH.split(":");
			const fresh = await hashCredential(LEGACY_PASSWORD);
			const [freshSalt, freshHash] = fresh.split(":");

			assert.strictEqual(freshSalt?.length, legacySalt?.length);
			assert.strictEqual(freshHash?.length, legacyHash?.length);
			assert.strictEqual(freshSalt?.length, 64);
			assert.strictEqual(freshHash?.length, 128);
			assert.match(fresh, /^[0-9a-f]{64}:[0-9a-f]{128}$/);
			// Соль случайна на каждый вызов: два хеша одного пароля не совпадают.
			assert.notStrictEqual(fresh, await hashCredential(LEGACY_PASSWORD));
		});
	});

	/*
	 * СТОРОЖ ПРОТИВ ВОЗВРАТА pbkdf2Sync.
	 *
	 * Единственная причина этой правки — то, что синхронный pbkdf2 останавливал
	 * ВЕСЬ сервер на время счёта одного пароля. Проверка типов такую регрессию не
	 * заметит: `pbkdf2Sync` внутри `async function` компилируется без единого
	 * замечания, а все вызывающие продолжат работать через await. Поймать это
	 * можно только поведением, поэтому здесь считаются срабатывания таймера.
	 *
	 * ПОЧЕМУ ЭТО НЕ ПЛАВАЮЩИЙ ТЕСТ. Порог намеренно занижен на порядок: одна
	 * проверка пароля стоит больше 100 мс, таймер идёт с шагом 5 мс, то есть при
	 * свободном цикле событий ожидается порядка двадцати и более срабатываний.
	 * Требуется ДВА, то есть около десяти миллисекунд свободного цикла из двухсот.
	 * При pbkdf2Sync срабатываний ровно НОЛЬ, и это не «мало», а невозможность:
	 * таймер — макрозадача, она не выполняется, пока синхронный счёт держит поток,
	 * а сразу после его возвращения таймер снимается в той же цепочке микрозадач.
	 * Замерено подменой: 0 против 20+. Между нулём и двадцатью лежит запас,
	 * который не съедает ни загрузка машины, ни чужие сборки на том же хосте.
	 */
	describe("цикл событий не блокируется на время счёта хеша", () => {
		test("во время hashCredential таймер продолжает срабатывать", async () => {
			let ticks = 0;
			const timer = setInterval(() => {
				ticks += 1;
			}, 5);
			try {
				await hashCredential("пароль для замера блокировки");
			} finally {
				clearInterval(timer);
			}
			assert.ok(
				ticks >= 2,
				`таймер с шагом 5 мс сработал ${ticks} раз(а) за время счёта хеша. ` +
					"Ноль или единицы срабатываний означают, что хеширование вернулось в цикл " +
					"событий (pbkdf2Sync) и сервер снова не отвечает никому, пока считает пароль.",
			);
		});

		test("во время verifyCredential таймер продолжает срабатывать", async () => {
			const stored = await hashCredential("пароль для замера блокировки");
			let ticks = 0;
			const timer = setInterval(() => {
				ticks += 1;
			}, 5);
			let verified = false;
			try {
				verified = await verifyCredential(
					"пароль для замера блокировки",
					stored,
				);
			} finally {
				clearInterval(timer);
			}
			assert.strictEqual(verified, true);
			assert.ok(
				ticks >= 2,
				`таймер с шагом 5 мс сработал ${ticks} раз(а) за время проверки пароля. ` +
					"Это признак возврата к синхронному pbkdf2: вход одного сотрудника снова " +
					"останавливает расписание, карту приёма и печать документов для всех остальных.",
			);
		});
	});
});
