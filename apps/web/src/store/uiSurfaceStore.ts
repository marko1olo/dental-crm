import { create } from "zustand";
import { useTelephonyStore } from "./telephonyStore";

/**
 * Идентификаторы известных модальных поверхностей первого уровня.
 */
export type PrimaryModalId =
	| "appointment_modal"
	| "patient_editor"
	| "doctor_free_slots"
	| "preventive_inspection"
	| "slot_conflict"
	| "roster_modal"
	| "quick_add_chair"
	| "calendar_sync"
	| "patient_search"
	| "tomorrow_reminders"
	| "dms_letter"
	| "dms_registry"
	| "loyalty"
	| "duplicate_merge"
	| "photo_protocol"
	| "ortho_photo"
	| "lab_order"
	| "endo_canal"
	| "stage_payment"
	| "price_validator"
	| "emergency_rescue"
	| "voice_dictation"
	| "warranty_passport"
	| "doctor_mobile_shift"
	| "informed_consent"
	| "cbct_implant_studio"
	| "cephalometric_trg"
	| "egisz_remd_hub"
	| "privacy_shield"
	| "telephony_dialer"
	| "dicom_viewer"
	| "tp_comparator"
	| "tp_stage_payment"
	| "tp_price_validator"
	| "tp_signature"
	| "tp_contract_print"
	| "tp_act_print"
	| "tp_fiscal"
	| "tp_lab_order"
	| "tp_invoice"
	| "tp_installment"
	| "tp_presenter"
	| "tp_curator"
	| "tp_bundles"
	| (string & {});

/**
 * Идентификаторы боковых шторок (Drawers).
 */
export type DrawerSurfaceId =
	| "telephony"
	| "quick_booking"
	| "waitlist"
	| "doctor_shift"
	| "help"
	| "mobile_price"
	| (string & {});

export const FULLSCREEN_STUDIO_MODAL_IDS: ReadonlySet<PrimaryModalId> = new Set([
	"cbct_implant_studio",
	"cephalometric_trg",
	"egisz_remd_hub",
	"privacy_shield",
]);

export const CT_STUDIO_MODAL_IDS: ReadonlySet<PrimaryModalId> = new Set([
	"cbct_implant_studio",
	"dicom_viewer",
	"cephalometric_trg",
]);

export const CLINICAL_VISIT_MODAL_IDS: ReadonlySet<PrimaryModalId> = new Set([
	"lab_order",
	"endo_canal",
	"stage_payment",
	"warranty_passport",
	"informed_consent",
	"emergency_rescue",
	"price_validator",
	"voice_dictation",
	"doctor_mobile_shift",
]);

export const PATIENT_WORKSPACE_MODAL_IDS: ReadonlySet<PrimaryModalId> = new Set([
	"dms_letter",
	"dms_registry",
	"loyalty",
	"duplicate_merge",
	"photo_protocol",
	"ortho_photo",
	"cbct_implant_studio",
	"dicom_viewer",
]);

export interface PrimaryModalState {
	readonly id: PrimaryModalId;
	readonly title?: string | undefined;
	readonly payload?: unknown;
}

export interface UiSurfaceStore {
	/** Активное модальное окно верхнего уровня (Primary Modal). Не более одного одновременно. */
	readonly primaryModal: PrimaryModalState | null;

	/** Активная боковая шторка (Drawer). Не более одной одновременно. */
	readonly activeDrawer: DrawerSurfaceId | null;

	/** Открыть модальное окно верхнего уровня. По умолчанию закрывает открытые боковые шторки. */
	readonly openPrimaryModal: (
		id: PrimaryModalId,
		payload?: unknown,
		options?: { title?: string; keepDrawers?: boolean },
	) => void;

	/** Закрыть модальное окно верхнего уровня. */
	readonly closePrimaryModal: (id?: PrimaryModalId) => void;

	/** Проверить, открыто ли конкретное модальное окно. */
	readonly isPrimaryModalOpen: (id: PrimaryModalId) => boolean;

	/** Открыть боковую шторку. Автоматически закрывает любую другую открытую шторку. */
	readonly openDrawer: (id: DrawerSurfaceId, options?: { keepModal?: boolean }) => void;

	/** Закрыть боковую шторку. */
	readonly closeDrawer: (id?: DrawerSurfaceId) => void;

	/** Плавный переход от модального окна к боковой шторке (Invariant 3) без наслоения */
	readonly transitionModalToDrawer: (
		modalId: PrimaryModalId,
		drawerId: DrawerSurfaceId,
	) => void;

	/** Закрыть все модалки и шторки. */
	readonly closeAllSurfaces: () => void;

	/** Индикатор: активно ли сейчас хоть одно модальное окно верхнего уровня. */
	readonly hasPrimaryModal: boolean;

	/** Индикатор: активна ли сейчас хоть одна боковая шторка. */
	readonly hasActiveDrawer: boolean;

	/** Индикатор: экран занят модалкой или шторкой (фоновые виджеты должны свернуться). */
	readonly isSurfaceOccupied: boolean;

	/** Индикатор: активна ли сейчас полноэкранная клиническая студия (КЛКТ, ТРГ, ЕГИСЗ, Privacy Shield). */
	readonly isFullScreenStudioActive: boolean;

	/** Индикатор: активен ли рендеринг КТ / DICOM / 3D студии имплантации (КЛКТ, ТРГ, DICOM). */
	readonly isCtActive: boolean;

	/** Проверить, активна ли полноэкранная студия (опционально конкретная). */
	readonly isStudioActive: (id?: PrimaryModalId) => boolean;

	/** Проверить, активен ли КТ-просмотрщик или КЛКТ-студия */
	readonly isCtRunning: () => boolean;
}

export const useUiSurfaceStore = create<UiSurfaceStore>((set, get) => ({
	primaryModal: null,
	activeDrawer: null,
	hasPrimaryModal: false,
	hasActiveDrawer: false,
	isSurfaceOccupied: false,
	isFullScreenStudioActive: false,
	isCtActive: false,

	openPrimaryModal: (id, payload, options) => {
		const isStudio = FULLSCREEN_STUDIO_MODAL_IDS.has(id);
		const isCt = CT_STUDIO_MODAL_IDS.has(id);
		const keepDrawers = isStudio ? false : (options?.keepDrawers ?? false);
		if (!keepDrawers || isStudio) {
			useTelephonyStore.getState().closeCallDrawer();
		}
		set({
			primaryModal: {
				id,
				title: options?.title,
				payload,
			},
			// По умолчанию открытие модалки верхнего уровня закрывает конкурирующие боковые шторки
			activeDrawer: keepDrawers ? get().activeDrawer : null,
			hasPrimaryModal: true,
			hasActiveDrawer: keepDrawers ? Boolean(get().activeDrawer) : false,
			isSurfaceOccupied: true,
			isFullScreenStudioActive: isStudio,
			isCtActive: isCt,
		});

		if (typeof document !== "undefined") {
			document.documentElement.setAttribute("data-ct-active", isCt ? "true" : "false");
		}

		if (isStudio && typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente:close-all-drawers"));
			window.dispatchEvent(new CustomEvent("dente:studio-opened", { detail: { id } }));
		}
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente:ct-active-changed", { detail: { isCtActive: isCt, id } }));
		}
	},

	closePrimaryModal: (id) => {
		const current = get().primaryModal;
		if (!id || current?.id === id) {
			const activeDrawer = get().activeDrawer;
			const wasStudio = current ? FULLSCREEN_STUDIO_MODAL_IDS.has(current.id) : false;
			const wasCt = current ? CT_STUDIO_MODAL_IDS.has(current.id) : false;
			set({
				primaryModal: null,
				hasPrimaryModal: false,
				isSurfaceOccupied: Boolean(activeDrawer),
				isFullScreenStudioActive: false,
				isCtActive: false,
			});
			if (typeof document !== "undefined") {
				document.documentElement.setAttribute("data-ct-active", "false");
			}
			if (wasStudio && typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:studio-closed", { detail: { id: current?.id } }));
			}
			if (wasCt && typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:ct-active-changed", { detail: { isCtActive: false, id: current?.id } }));
			}
		}
	},

	isPrimaryModalOpen: (id) => {
		return get().primaryModal?.id === id;
	},

	isStudioActive: (id) => {
		const current = get().primaryModal;
		if (!current) return false;
		if (id) return current.id === id;
		return FULLSCREEN_STUDIO_MODAL_IDS.has(current.id);
	},

	isCtRunning: () => {
		return get().isCtActive;
	},

	openDrawer: (id, options) => {
		// INVARIANT 3: Full-screen studio protection — no side drawer may open while studio is active!
		if (get().isFullScreenStudioActive) {
			return;
		}
		const keepModal = options?.keepModal ?? false;
		if (id !== "telephony") {
			useTelephonyStore.getState().closeCallDrawer();
		}
		set({
			activeDrawer: id,
			hasActiveDrawer: true,
			primaryModal: keepModal ? get().primaryModal : null,
			hasPrimaryModal: keepModal ? Boolean(get().primaryModal) : false,
			isSurfaceOccupied: true,
			isFullScreenStudioActive: keepModal ? get().isFullScreenStudioActive : false,
		});
	},

	closeDrawer: (id) => {
		const current = get().activeDrawer;
		if (!id || current === id) {
			if (current === "telephony" || !id) {
				useTelephonyStore.getState().closeCallDrawer();
			}
			const hasPrimaryModal = Boolean(get().primaryModal);
			set({
				activeDrawer: null,
				hasActiveDrawer: false,
				isSurfaceOccupied: hasPrimaryModal,
			});
		}
	},

	transitionModalToDrawer: (modalId, drawerId) => {
		if (drawerId !== "telephony") {
			useTelephonyStore.getState().closeCallDrawer();
		}
		set({
			primaryModal: null,
			hasPrimaryModal: false,
			activeDrawer: drawerId,
			hasActiveDrawer: true,
			isSurfaceOccupied: true,
			isFullScreenStudioActive: false,
		});
	},

	closeAllSurfaces: () => {
		useTelephonyStore.getState().closeCallDrawer();
		const current = get().primaryModal;
		const wasStudio = current ? FULLSCREEN_STUDIO_MODAL_IDS.has(current.id) : false;
		const wasCt = current ? CT_STUDIO_MODAL_IDS.has(current.id) : false;
		set({
			primaryModal: null,
			activeDrawer: null,
			hasPrimaryModal: false,
			hasActiveDrawer: false,
			isSurfaceOccupied: false,
			isFullScreenStudioActive: false,
			isCtActive: false,
		});
		if (typeof document !== "undefined") {
			document.documentElement.setAttribute("data-ct-active", "false");
		}
		if (wasStudio && typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente:studio-closed", { detail: { id: current?.id } }));
		}
		if (wasCt && typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente:ct-active-changed", { detail: { isCtActive: false } }));
		}
	},
}));

// Глобальная шина событий для кросс-модульного управления поверхностями без прямых зависимостей
if (typeof window !== "undefined") {
	(window as unknown as { __useUiSurfaceStore?: typeof useUiSurfaceStore }).__useUiSurfaceStore = useUiSurfaceStore;
	window.addEventListener("dente:close-all-surfaces", () => {
		useUiSurfaceStore.getState().closeAllSurfaces();
	});
	window.addEventListener("dente:close-drawer", (e: Event) => {
		const custom = e as CustomEvent<{ id?: DrawerSurfaceId }>;
		useUiSurfaceStore.getState().closeDrawer(custom.detail?.id);
	});
}
