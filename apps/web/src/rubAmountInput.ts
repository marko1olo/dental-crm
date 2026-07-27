/*
 * Разбор суммы, которую человек ввёл руками.
 *
 * БЫЛО: пропускались только цифры (`/^\d+$/`), а на всё остальное выдавалось
 * «укажите сумму целыми рублями без копеек». То есть кассир не мог принять ни
 * 1500,50, ни 0,50 — вообще никакую сумму с копейками. Вместе с колонкой
 * payments.amount_rub типа integer и схемой z.number().int() это означало, что
 * копеек в программе нет как таковых. Проверено живьём: дробная сумма давала
 * 400 и в базу не попадала.
 *
 * СТАЛО: копейки принимаются, запятая и точка равноправны, разделители разрядов
 * (обычный и неразрывный пробел) отбрасываются. Три знака после запятой — отказ,
 * а не тихое округление: на деньгах округлять за пользователя нельзя.
 */
const kopecksMessage = "сумма указывается цифрами, копейки после запятой: 1500,50";

/** Максимальная сумма, при которой копейки представимы точно (2^53 копеек). */
const MAX_SAFE_RUB = Math.floor(Number.MAX_SAFE_INTEGER / 100);

export function normalizeRubAmountInput(value: string): number | null {
  const compactAmount = value.replace(/[\s ]/g, "").replace(",", ".");
  if (!compactAmount) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(compactAmount)) return null;

  const amountRub = Number(compactAmount);
  if (!Number.isFinite(amountRub) || amountRub > MAX_SAFE_RUB) return null;
  /*
   * Приводим к копейке через целые: у некоторых значений умножение на сто
   * оставляет хвост (1.005 * 100 = 100.49999999999999). Так в системе живёт
   * ровно то, что ввели, без плавающего мусора в младших разрядах.
   */
  return Math.round(amountRub * 100) / 100;
}

export function validateRubAmountInput(
  value: string,
  zeroMessage = "укажите сумму больше нуля",
  invalidMessage = kopecksMessage
): string | null {
  const amountRub = normalizeRubAmountInput(value);
  if (!value.trim()) return zeroMessage;
  if (amountRub === null) return invalidMessage;
  if (amountRub <= 0) return zeroMessage;
  return null;
}

export function rubAmountInputMissingStep(
  value: number | null | undefined,
  step: number
): boolean {
  if (!value) return false;
  // Кратность считаем в копейках: остаток от деления дробных чисел неточен.
  const kopecks = Math.round(value * 100);
  const stepKopecks = Math.round(step * 100);
  if (!stepKopecks) return false;
  return kopecks % stepKopecks !== 0;
}
