/**
 * apps/web/src/components/settings/doctor/DoctorAnesthesiaDefaultsSection.tsx
 *
 * Clean 1-click anesthesia defaults and carpule needle settings facade.
 * Decomposed strictly <= 120 lines following Mandate 8b.
 */

import { ShieldCheck, Syringe } from "lucide-react";
import React, { useMemo } from "react";
import {
	ANESTHETIC_OPTIONS,
	type AnestheticKey,
	DENTAL_NEEDLE_OPTIONS,
	type DentalNeedleType,
	useDoctorPreferencesStore,
} from "../../../store/doctorPreferencesStore";
import { showToast } from "../../GlobalToast";
import {
	resolveAnestheticName,
	resolveNeedleName,
} from "../protocolSnippetHelpers";
import { DoctorAnestheticSelector } from "./anesthesia/DoctorAnestheticSelector";
import { DoctorNeedleSelector } from "./anesthesia/DoctorNeedleSelector";
import { DoctorLiveAnesthesiaProtocolCard } from "./anesthesia/DoctorLiveAnesthesiaProtocolCard";

export function DoctorAnesthesiaDefaultsSection() {
	const preferences = useDoctorPreferencesStore((s) => s.preferences);
	const updatePreferences = useDoctorPreferencesStore((s) => s.updatePreferences);

	const selectedAnestheticKey = preferences.favoriteAnesthetic || "articaine_200k";
	const selectedNeedleKey = preferences.favoriteNeedleType || "septoject_30g_short";

	const handleSelectAnesthetic = (key: AnestheticKey) => {
		updatePreferences({ favoriteAnesthetic: key });
		const found = ANESTHETIC_OPTIONS.find((a) => a.key === key || a.id === key);
		showToast(`Анестетик по умолчанию: «${found?.name || key}»`, "success");
	};

	const handleSelectNeedle = (key: DentalNeedleType) => {
		updatePreferences({ favoriteNeedleType: key });
		const found = DENTAL_NEEDLE_OPTIONS.find((n) => n.key === key || n.id === key);
		showToast(`Карпульная игла по умолчанию: «${found?.title || key}»`, "success");
	};

	const currentAnestheticName = useMemo(() => resolveAnestheticName(selectedAnestheticKey), [selectedAnestheticKey]);
	const currentNeedleName = useMemo(() => resolveNeedleName(selectedNeedleKey), [selectedNeedleKey]);

	const liveAnesthesiaNote = useMemo(() => {
		const isCardio = selectedAnestheticKey === "scandonest_mepivacaine_3";
		const epiNote = isCardio
			? "без вазоконстриктора (соматически отягощенный статус / кардиопрофиль)"
			: "аспирационная проба (-)";
		return `Местная инфильтрационная/проводниковая анестезия: ${currentAnestheticName}, карпула 1.7 мл. Игла карпульная: ${currentNeedleName}. ${epiNote}. Обезболивание глубокое, наступило через 2–3 мин. Осложнений нет.`;
	}, [currentAnestheticName, currentNeedleName, selectedAnestheticKey]);

	const handleCopyLiveSnippet = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(liveAnesthesiaNote);
		}
		showToast("Протокол анестезии скопирован в буфер для медицинской карты", "success");
	};

	return (
		<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-5" data-testid="doctor-anesthesia-defaults-section">
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
				<div className="flex items-center gap-2.5">
					<div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
						<Syringe size={18} />
					</div>
					<div>
						<h4 className="font-extrabold text-sm sm:text-base text-[var(--ink)] m-0">
							Быстрые дефолты анестезии и карпульных игл
						</h4>
						<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
							Калибровка рабочего анестетика и типа игл. Автоматически подставляются в медицинскую карту.
						</p>
					</div>
				</div>
				<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30">
					<ShieldCheck size={13} className="text-teal-600 dark:text-teal-400" />
					Автосохранение
				</span>
			</div>

			<DoctorAnestheticSelector selectedAnestheticKey={selectedAnestheticKey} onSelectAnesthetic={handleSelectAnesthetic} />
			<DoctorNeedleSelector selectedNeedleKey={selectedNeedleKey} onSelectNeedle={handleSelectNeedle} />
			<DoctorLiveAnesthesiaProtocolCard liveAnesthesiaNote={liveAnesthesiaNote} onCopy={handleCopyLiveSnippet} />
		</div>
	);
}
