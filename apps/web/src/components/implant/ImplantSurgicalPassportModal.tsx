/**
 * ImplantSurgicalPassportModal.tsx — Канонический адаптер единого модуля паспорта имплантации
 *
 * Ликвидировано дублирование и 1088 строк процедурного балласта (16 точек ISQ анизотропии 4 направления x 4 срока).
 * Единый канонический модуль — ImplantPassportModal (apps/web/src/components/implants/ImplantPassportModal.tsx)
 * в строгом соответствии с Мандатами 8e, 8i, 8k, 8n (соло-врач, 1 клик, 35 Н·см, мягкий овердрафт склада).
 */

export {
	ImplantPassportModal as ImplantSurgicalPassportModal,
	type ImplantPassportModalProps as ImplantSurgicalPassportModalProps,
	default,
} from "../implants/ImplantPassportModal";

export type {
	FastImplantPassportData as ImplantSurgicalPassportData,
	MischDensity as MischBoneClass,
} from "../implants/implantQuickPresets";
