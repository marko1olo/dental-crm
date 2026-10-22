import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "../../GlobalToast";
import { formatSoapFromPreset, getPresetById } from "../../visit/clinicalSoapPresets";
import { COMMON_ICD10_PRESETS, STANDARD_ANESTHETICS, type VisitProtocolData } from "./types";

export function useVisitProtocolState(
	visitId?: string | null,
	patientId?: string | null,
	initialTooth?: number | string | null,
	initialDate?: string | null,
	initialDiagnosis?: string | null,
	onSaveProtocol?: (data: VisitProtocolData) => void,
) {
	const [selectedTooth, setSelectedTooth] = useState<string>(initialTooth ? String(initialTooth) : "16");
	const cacheKey = useMemo(() => `dente_visit_protocol_draft_${visitId || patientId || "active"}`, [visitId, patientId]);

	const [protocol, setProtocol] = useState<VisitProtocolData>(() => {
		const init: VisitProtocolData = {
			visitId, patientId, date: initialDate || new Date().toISOString().slice(0, 10),
			toothNumber: initialTooth || 16,
			complaints: "Жалоб на момент осмотра активно не предъявляет (профилактический осмотр).",
			anamnesis: "Соматически здоров. Аллергоанамнез не отягощен. Хронические заболевания отрицает.",
			statusLocalis: "Слизистая оболочка полости рта бледно-розовая, влажная. Зубной ряд интактен.",
			diagnosisIcd10: initialDiagnosis || "Z01.2 Стоматологическое обследование и гигиена полости рта (Норма)",
			treatmentProtocol: "Проведен осмотр, зондирование, перкуссия безболезненна. Обучение гигиене.",
			recommendations: "Динамическое наблюдение и плановый профосмотр через 6 месяцев.",
			anestheticDrug: "Ультракаин Д-С 1:200 000 (1 карпула 1.7 мл)",
			anestheticCarpules: 1,
			deductedMaterials: [
				{ name: "Одноразовый набор (зеркало, зонд, лоток, слюноотсос)", category: "auxiliary", quantity: 1, unit: "компл." },
				{ name: "Перчатки нитриловые смотровые", category: "ppe", quantity: 1, unit: "пары" },
				{ name: "Маска трехслойная защитная", category: "ppe", quantity: 1, unit: "шт." },
			],
			isSigned: false,
		};
		if (typeof window !== "undefined") {
			try {
				const cached = localStorage.getItem(`dente_visit_protocol_draft_${visitId || patientId || "active"}`);
				if (cached) return { ...init, ...JSON.parse(cached) };
			} catch {}
		}
		return init;
	});

	const [lastSaved, setLastSaved] = useState<string>("");
	const onSaveRef = useRef(onSaveProtocol);
	useEffect(() => { onSaveRef.current = onSaveProtocol; }, [onSaveProtocol]);
	const prevJsonRef = useRef<string>("");

	useEffect(() => {
		const currentJson = JSON.stringify(protocol);
		if (currentJson === prevJsonRef.current) return;
		prevJsonRef.current = currentJson;
		if (typeof window !== "undefined") {
			try { localStorage.setItem(cacheKey, currentJson); } catch {}
		}
		const timer = setTimeout(() => {
			if (onSaveRef.current) onSaveRef.current(protocol);
			setLastSaved(new Date().toLocaleTimeString("ru-RU"));
		}, 700);
		return () => clearTimeout(timer);
	}, [protocol, cacheKey]);

	const handleApplySomaticNorm = useCallback(() => {
		setProtocol((prev) => ({
			...prev,
			complaints: "Жалоб на момент осмотра активно не предъявляет (профилактический осмотр).",
			anamnesis: "Соматически здоров. Аллергоанамнез не отягощен. Хронические заболевания отрицает. Физиологическая норма.",
			statusLocalis: "Слизистая оболочка полости рта бледно-розовая, влажная. Десневой край без признаков воспаления. Зондирование безболезненно. Зубной ряд интактен.",
			diagnosisIcd10: "Z01.2 Стоматологическое обследование и гигиена полости рта (Норма)",
			treatmentProtocol: "Проведен осмотр, зондирование, перкуссия отрицательна. Индекс гигиены удовлетворительный. Проведена контролируемая чистка зубов.",
			recommendations: "Профилактический контрольный осмотр через 6 месяцев.",
		}));
		showToast("Норма соматики и физиологический статус применены", "success", 3000);
	}, []);

	const handleSelectIcd10Preset = useCallback((item: (typeof COMMON_ICD10_PRESETS)[number]) => {
		const preset = getPresetById(item.presetId);
		if (!preset) return;
		const toothNum = Number.parseInt(selectedTooth, 10) || null;
		const formatted = formatSoapFromPreset(preset, toothNum);
		setProtocol((prev) => {
			const existingNames = new Set(prev.deductedMaterials.map((m) => m.name));
			const newDeductions = [...prev.deductedMaterials];
			if (formatted.materialsToDeduct) {
				for (const mat of formatted.materialsToDeduct) {
					if (!existingNames.has(mat.name)) { newDeductions.push(mat); existingNames.add(mat.name); }
				}
			}
			return {
				...prev, diagnosisIcd10: formatted.diagnosis, complaints: formatted.complaint || prev.complaints,
				anamnesis: formatted.anamnesis || prev.anamnesis, statusLocalis: formatted.objectiveStatus || prev.statusLocalis,
				treatmentProtocol: formatted.treatmentPlan, recommendations: preset.recommendations || prev.recommendations,
				deductedMaterials: newDeductions,
			};
		});
		showToast(`Дневник приёма автосформирован по ${item.code}`, "success", 3500);
	}, [selectedTooth]);

	const handleApplyAnesthesia = useCallback((anes: (typeof STANDARD_ANESTHETICS)[number]) => {
		setProtocol((prev) => {
			const existing = prev.deductedMaterials.filter((m) => !m.name.toLowerCase().includes("артикаин") && !m.name.toLowerCase().includes("ультракаин") && !m.name.toLowerCase().includes("скандонест") && !m.name.toLowerCase().includes("мепивакаин"));
			existing.push(anes.material);
			const snippet = `Анестезия: инфильтрационная/проводниковая ${anes.nameRu}. Аспирационная проба отрицательная. Обезболивание глубокое, достаточное.`;
			const updatedProtocol = prev.treatmentProtocol.includes("Анестезия:")
				? prev.treatmentProtocol.replace(/Анестезия:[^\n]+/, snippet)
				: `${snippet}\n\n${prev.treatmentProtocol}`;
			const updated = { ...prev, anestheticDrug: anes.nameRu, anestheticCarpules: 1, treatmentProtocol: updatedProtocol, deductedMaterials: existing };
			if (onSaveProtocol) onSaveProtocol(updated);
			setLastSaved(new Date().toLocaleTimeString("ru-RU"));
			return updated;
		});
		showToast(`Анестезия добавлена: ${anes.nameRu}`, "success", 2500);
	}, [onSaveProtocol]);

	return { protocol, setProtocol, selectedTooth, setSelectedTooth, lastSaved, setLastSaved, handleApplySomaticNorm, handleSelectIcd10Preset, handleApplyAnesthesia };
}
