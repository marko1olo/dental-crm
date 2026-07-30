import { randomBytes, pbkdf2, createHmac, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const ITERATIONS = 100_000;
const KEYLEN = 64;
const DIGEST = "sha512";

/*
 * ПОЧЕМУ ЗДЕСЬ НЕТ `pbkdf2Sync`, И ЧЕМ ЭТО СТОИЛО КЛИНИКЕ.
 *
 * `pbkdf2Sync` считает 100 000 итераций SHA-512 ПРЯМО В ЦИКЛЕ СОБЫТИЙ. Пока
 * идёт один такой счёт, Fastify не обрабатывает ни одного другого запроса —
 * ни расписание, ни карту приёма, ни печать документа: у Node один поток на
 * весь JavaScript, и он занят арифметикой.
 *
 * ИЗМЕРЕНО на рабочей машине (`npx tsx src/utils/cryptoHelper.bench.ts`,
 * коммит a8d582063, синхронная редакция): одна проверка пароля — медиана
 * 180 мс; серия из 50 проверок — 14 216 мс подряд; контрольный таймер с шагом
 * 5 мс, который обязан сработать больше двух тысяч раз, сработал ЧЕТЫРЕ раза,
 * и наибольшая его задержка составила 10 473 мс. Десять секунд, в которые
 * сервер не ответил никому.
 *
 * Для клиники это ровно утренний вход смены: персонал прикладывается к PIN
 * одновременно, входы выстраиваются в очередь, и всё это время программа стоит
 * для всех — включая врача у кресла, который в этот момент ничего не вводил.
 *
 * ЧТО СТАЛО. `pbkdf2` в форме с обратным вызовом отдаёт счёт в ПУЛ ПОТОКОВ
 * libuv, то есть за пределы цикла событий. Сама проверка не ускоряется — она и
 * не должна: медленный хеш и есть защита от подбора. Ускоряется всё
 * ОСТАЛЬНОЕ — сервер продолжает отвечать, пока пароль считается. По тому же
 * замеру наибольшая задержка контрольного таймера падает с 10 473 мс до 18 мс,
 * а число его срабатываний растёт с 4 до 389: в 580 раз меньше глухоты на той
 * же нагрузке.
 *
 * ЦЕНА, КОТОРУЮ НАДО ЗНАТЬ: пул потоков libuv по умолчанию — 4 потока, и он
 * общий с чтением файлов и разрешением имён. Одновременных проверок пароля
 * больше четырёх не станет, пятая ждёт свободный поток. Это ОЧЕРЕДЬ В ПУЛЕ, а
 * не остановка сервера: цикл событий при этом свободен и все прочие запросы
 * идут. Размер пула задаётся окружением (UV_THREADPOOL_SIZE) и здесь не
 * прописывается — это параметр развёртывания, а не константа кода.
 *
 * ФОРМАТ ХРАНИМОГО ЗНАЧЕНИЯ НЕ ИЗМЕНИЛСЯ И МЕНЯТЬСЯ НЕ ДОЛЖЕН: `соль:хеш`,
 * обе части в hex, соль 32 байта, 100 000 итераций, SHA-512, длина ключа 64
 * байта. В базе клиники уже лежат хеши, посчитанные прежней редакцией; смена
 * любого из этих параметров означает, что весь персонал разом не сможет войти.
 * Совместимость закреплена тестом с хешами, посчитанными СТАРЫМ кодом
 * (utils/cryptoHelper.test.ts).
 */
const pbkdf2Async = promisify(pbkdf2);

/**
 * Hash a password or PIN code with a random per-credential salt.
 * Format: salt:hash (hex:hex)
 */
export async function hashCredential(value: string): Promise<string> {
  const salt = randomBytes(32).toString("hex");
  const derived = await pbkdf2Async(value, salt, ITERATIONS, KEYLEN, DIGEST);
  return `${salt}:${derived.toString("hex")}`;
}

/**
 * Verify a plaintext credential against a stored hash (salt:hash format).
 */
export async function verifyCredential(
  plain: string,
  stored: string,
): Promise<boolean> {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const derived = await pbkdf2Async(plain, salt, ITERATIONS, KEYLEN, DIGEST);
    const candidate = derived.toString("hex");
    // Сравнение хешей идёт timingSafeEqual, а не `===`: посимвольное
    // сравнение выходит на первом несовпавшем знаке, и по времени ответа
    // хеш восстанавливается знак за знаком.
    const a = Buffer.from(candidate, "utf8");
    const b = Buffer.from(hash, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Cryptographically signs a token payload with an expiry.
 * Format: base64(payload).base64(sig)
 */
export function signToken(
  payload: object,
  secret: string,
  ttlSeconds = 60 * 60 * 12,
): string {
  const full = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    iat: Math.floor(Date.now() / 1000),
  };
  const data = Buffer.from(JSON.stringify(full)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
}

/**
 * Verifies a token's signature and expiry, returns payload or null.
 */
export function verifyToken(
  token: string,
  secret: string,
): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [data, signature] = parts;
    if (!data || !signature) return null;
    const expectedSig = createHmac("sha256", secret)
      .update(data)
      .digest("base64url");
    const a = Buffer.from(expectedSig, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    // Check expiry
    if (
      typeof payload.exp === "number" &&
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
