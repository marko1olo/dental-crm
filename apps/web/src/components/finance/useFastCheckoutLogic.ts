/**
 * Канонический тонкий фасад хука быстрой кассы (Мандат 8b: <= 30 строк).
 *
 * Вся бизнес-логика декомпозирована в модульную директорию ./fastCheckout/:
 * - Layer 0 (types.ts): типы состояния чека, НДС, валидации скидок и способов оплаты.
 * - Layer 1 (fastCheckoutCalculations.ts): чистая копеечная математика сумм, скидок, сдачи и сплит-оплат.
 * - Layer 2 (fastCheckoutFiscalSync.ts): синхронизация с ККТ АТОЛ/Штрих-М, очередью 54-ФЗ и СБП QR.
 * - Layer 3 (fastCheckoutStateReducer.ts): стейт-машина ввода сумм, пресетов и хук useFastCheckoutLogic.
 */

export * from "./fastCheckout";
export { useFastCheckoutLogic } from "./fastCheckout/fastCheckoutStateReducer";
export type { UseFastCheckoutLogicProps } from "./fastCheckout/types";
