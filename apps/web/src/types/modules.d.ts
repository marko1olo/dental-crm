/*
 * Здесь объявляются ТОЛЬКО пакеты, которые действительно установлены и у
 * которых нет собственных типов.
 *
 * ОТСЮДА УДАЛЕНЫ ДВА ОБЪЯВЛЕНИЯ ПАКЕТОВ, КОТОРЫХ В ПРОЕКТЕ НЕТ ВООБЩЕ:
 * "vitest" и "qrcode.react". Ни того, ни другого нет ни в корневом
 * node_modules, ни в apps/web/node_modules, ни в одном package.json. Такое
 * объявление хуже ошибки типов: оно делает импорт несуществующего модуля
 * зелёным для tsc, поэтому проверка компилятором перестаёт быть проверкой, а
 * отказ переезжает в рантайм или в сборку.
 *
 * Цена уже заплачена дважды.
 *   1. components/auth/__tests__/AuthArtBackground.test.ts был написан под
 *      vitest: typecheck проходил, а прогон падал на ERR_MODULE_NOT_FOUND до
 *      первого утверждения — тест не выполнялся ни разу. Он переписан на
 *      node:test, как остальные тесты веб-пакета.
 *   2. components/QrGatewayPanel.tsx импортировал "qrcode.react" и тоже был
 *      зелёным. Смонтировать его значило уронить не панель, а сборку всего
 *      веб-пакета: Vite не разрешил бы модуль. Панель удалена.
 *
 * Порядок обратный: сначала пакет ставится в package.json, и только потом, если
 * у него нет своих типов, он объявляется здесь.
 */

declare module "html2canvas" {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const html2canvas: any;
	export default html2canvas;
}

declare module "jspdf" {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const jsPDF: any;

	export { jsPDF };
	export default jsPDF;
}
