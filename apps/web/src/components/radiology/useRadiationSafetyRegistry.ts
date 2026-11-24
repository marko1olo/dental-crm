import {
	calculateAnnualRadiationDose,
	DEFAULT_EFFECTIVE_DOSES_MSV,
	type DentalRadiologyStudyType,
} from "@dental/shared";
import { useEffect, useMemo, useState } from "react";
import type { RadiationSafetyRecord } from "./radiationSafetyTypes.js";
import { denteClinicalReadHeaders } from "../../lib/denteRequestHeaders.js";
import { clientLogger } from "../../services/logging/clientLogger.js";

export function useRadiationSafetyRegistry(
	initialRecords: RadiationSafetyRecord[] = [],
	patientId?: string | undefined,
) {
	const currentYear = new Date().getFullYear();
	const [records, setRecords] = useState<RadiationSafetyRecord[]>(() => initialRecords);
	const doseAssessment = useMemo(
		() => calculateAnnualRadiationDose(records, currentYear),
		[records, currentYear],
	);

	useEffect(() => {
		if (!patientId) return;
		let active = true;
		const load = async () => {
			try {
				const res = await fetch(`/api/imaging/studies?patientId=${encodeURIComponent(patientId)}`, {
					headers: denteClinicalReadHeaders(),
				});
				if (!res.ok) return;
				const json = await res.json();
				const studies = (json?.data ?? json) as Array<Record<string, unknown>>;
				if (!Array.isArray(studies) || !active) return;

				const loadedRecords: RadiationSafetyRecord[] = studies
					.filter((s) => s.kind !== "photo")
					.map((s) => {
						const kind = String(s.kind || "periapical");
						let studyType: DentalRadiologyStudyType = "intraoral_radiovisiography";
						let defaultDose = 0.003;
						if (kind === "cbct") {
							studyType = "cbct_jaw_8x8";
							defaultDose = 0.055;
						} else if (kind === "opg") {
							studyType = "optg_digital_panoramic";
							defaultDose = 0.018;
						} else if (kind === "ceph") {
							studyType = "trg_cephalometric_lateral";
							defaultDose = 0.010;
						}
						const doseMsv = typeof s.radiationDoseMsv === "number" && s.radiationDoseMsv > 0
							? s.radiationDoseMsv
							: defaultDose;
						return {
							id: String(s.id || crypto.randomUUID()),
							studyDate: typeof s.capturedAt === "string" ? s.capturedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
							studyType,
							anatomicalArea: (typeof s.region === "string" && s.region) || (s.toothCode ? `Зуб #${s.toothCode}` : "Челюстно-лицевая область"),
							apparatusName: typeof s.sourceName === "string" && s.sourceName ? s.sourceName : "Цифровой аппарат DENTE",
							effectiveDoseMsv: doseMsv,
							effectiveDoseMicrosv: Number((doseMsv * 1000).toFixed(1)),
							doctorName: "Врач клиники",
						};
					});

				if (loadedRecords.length > 0 && active) {
					setRecords((prev) => {
						const existingIds = new Set(prev.map((r) => r.id));
						const fresh = loadedRecords.filter((r) => !existingIds.has(r.id));
						return [...fresh, ...prev];
					});
				}
			} catch (err) {
				clientLogger.warn("[RadiationSafetyRegistry] Не удалось загрузить дозиметрию пациента", err, {
					module: "RadiationSafetyRegistry",
				});
			}
		};
		void load();
		return () => { active = false; };
	}, [patientId]);

	const handleAddStudy = (type: DentalRadiologyStudyType, area: string) => {
		const standardMsv = DEFAULT_EFFECTIVE_DOSES_MSV[type] ?? 0.003;
		setRecords((prev) => [
			{
				id: `dose-${Date.now()}`,
				studyDate: new Date().toISOString().slice(0, 10),
				studyType: type,
				anatomicalArea: area,
				apparatusName: "Цифровой радиовизиограф",
				effectiveDoseMsv: standardMsv,
				effectiveDoseMicrosv: Number((standardMsv * 1000).toFixed(1)),
				doctorName: "Лечащий врач",
			},
			...prev,
		]);
	};

	return { currentYear, records, doseAssessment, handleAddStudy };
}
