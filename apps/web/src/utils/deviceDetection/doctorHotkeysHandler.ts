/**
 * DENTE CRM — Doctor Hotkey Dispatcher & Safe Keyboard Shortcuts
 */

export interface DoctorHotkeyHandlers {
	onF1Help?: () => void;
	onF2SearchPatient?: () => void;
	onSearch?: () => void;
	onF3NewAppointment?: () => void;
	onF4Odontogram?: () => void;
	onF5RefreshSchedule?: () => void;
	onF6ClinicalRules?: () => void;
	onF7Visiograph?: () => void;
	onF8TreatmentPlan?: () => void;
	onF9Checkout?: () => void;
	onF10Documents?: () => void;
	onF11ToggleKiosk?: () => void;
	onF12PrintDiary?: () => void;
	onSave?: () => void | Promise<void>;
	onEscape?: () => void;
}

type HotkeyFn = () => void | Promise<void>;

function matchFunctionKey(k: string, c: string, h: DoctorHotkeyHandlers): HotkeyFn | undefined {
	const fMap: Record<string, HotkeyFn | undefined> = {
		F1: h.onF1Help,
		F2: h.onSearch ?? h.onF2SearchPatient,
		F3: h.onF3NewAppointment,
		F4: h.onF4Odontogram,
		F5: h.onF5RefreshSchedule,
		F6: h.onF6ClinicalRules,
		F7: h.onF7Visiograph,
		F8: h.onF8TreatmentPlan,
		F9: h.onF9Checkout,
		F10: h.onF10Documents,
		F11: h.onF11ToggleKiosk,
		F12: h.onF12PrintDiary,
	};
	return fMap[k] ?? fMap[c];
}

export function registerDoctorHotkeys(
	handlers: DoctorHotkeyHandlers,
	options: { target?: Window | HTMLElement | EventTarget; enabled?: boolean } = {},
): () => void {
	const target = options.target ?? (typeof window !== "undefined" ? window : undefined);
	if (!target || typeof (target as { addEventListener?: unknown }).addEventListener !== "function") return () => {};
	if (options.enabled === false) return () => {};

	const handleKeyDown = (e: KeyboardEvent) => {
		const key = e.key ? e.key.toLowerCase() : "";
		const code = e.code || "";
		const isCtrlOrMeta = e.ctrlKey || e.metaKey;

		// 1. Function keys F1–F12
		const fAction = matchFunctionKey(e.key, code, handlers);
		if (fAction) {
			e.preventDefault();
			e.stopPropagation();
			void fAction();
			return;
		}

		// 2. Ctrl+K search omnibar
		if (isCtrlOrMeta && (key === "k" || key === "л" || code === "KeyK") && !e.altKey && !e.shiftKey) {
			const search = handlers.onSearch ?? handlers.onF2SearchPatient;
			if (search) {
				e.preventDefault();
				e.stopPropagation();
				search();
				return;
			}
		}

		// 3. Ctrl+S auto-save (supports Cyrillic 'ы')
		if (handlers.onSave && isCtrlOrMeta && (key === "s" || key === "ы" || code === "KeyS") && !e.altKey && !e.shiftKey) {
			e.preventDefault();
			e.stopPropagation();
			void handlers.onSave();
			return;
		}

		// 4. Escape: Close modal / drawer
		if ((e.key === "Escape" || code === "Escape") && handlers.onEscape) {
			e.preventDefault();
			e.stopPropagation();
			handlers.onEscape();
		}
	};

	target.addEventListener("keydown", handleKeyDown as EventListener, true);
	return () => {
		target.removeEventListener("keydown", handleKeyDown as EventListener, true);
	};
}
