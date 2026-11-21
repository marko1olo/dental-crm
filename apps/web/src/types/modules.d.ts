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
	const html2canvas: unknown;
	export default html2canvas;
}

declare module "jspdf" {
	const jsPDF: unknown;

	export { jsPDF };
	export default jsPDF;
}

declare module "jpeg-lossless-decoder-js" {
	export class Decoder {
		decode(
			buffer: ArrayBuffer | Uint8Array,
			offset?: number,
			length?: number,
			numBytes?: number,
		): Uint16Array | Uint8Array;
	}
	const jpeg: {
		Decoder: typeof Decoder;
	};
	export default jpeg;
}

declare module "dicom-parser" {
	export interface DicomDataSet {
		string(tag: string): string | undefined;
		uint16(tag: string): number | undefined;
		uint32(tag: string): number | undefined;
		elements: Record<string, { dataOffset: number; length: number }>;
	}
	export function parseDicom(
		byteArray: Uint8Array,
		options?: { untilTag?: string },
	): DicomDataSet;
	const dicomParser: {
		parseDicom: typeof parseDicom;
	};
	export default dicomParser;
}

declare module "fflate" {
	export type FlateError = Error & { code?: number };
	export type AsyncFlateCallback<T> = (err: FlateError | null, data: T) => void;
	export type Unzipped = { [key: string]: Uint8Array };
	export function unzip(data: Uint8Array, cb: AsyncFlateCallback<Unzipped>): void;
	export function unzipSync(data: Uint8Array, opts?: unknown): Unzipped;
	export class AsyncUnzipInflate {}
	export class UnzipInflate {}
	export interface UnzipFile {
		name: string;
		size?: number;
		originalSize?: number;
		compression?: number;
		ondata: (err: FlateError | null, chunk: Uint8Array, final: boolean) => void;
		start(): void;
	}
	export class Unzip {
		constructor(cb?: (file: UnzipFile) => void);
		register(cls: unknown): void;
		onfile?: ((file: UnzipFile) => void) | undefined;
		push(chunk: Uint8Array, final?: boolean): void;
	}
	export function strFromU8(dat: Uint8Array, latin1?: boolean): string;
	export function strToU8(str: string, latin1?: boolean): Uint8Array;
	export function zipSync(data: Record<string, Uint8Array>, opts?: unknown): Uint8Array;
}


