const wholeRublesMessage = "укажите сумму целыми рублями без копеек";

export function normalizeRubAmountInput(value: string): number | null {
  const compactAmount = value.replace(/[\s\u00A0]/g, "");
  if (!compactAmount || !/^\d+$/.test(compactAmount)) return null;

  const amountRub = Number(compactAmount);
  return Number.isSafeInteger(amountRub) ? amountRub : null;
}

export function rubAmountInputMissingStep(
  value: string,
  zeroMessage = "укажите сумму больше нуля",
  invalidMessage = wholeRublesMessage
): string | null {
  const amountRub = normalizeRubAmountInput(value);
  if (!value.trim()) return zeroMessage;
  if (amountRub === null) return invalidMessage;
  if (amountRub <= 0) return zeroMessage;
  return null;
}
