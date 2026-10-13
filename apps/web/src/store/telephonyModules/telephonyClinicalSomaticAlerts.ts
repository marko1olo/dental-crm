import type { Patient, PatientInsight } from "@dental/shared";
import type { PatientSomaticAlert } from "../telephonyTypes";

/**
 * Extracts and classifies structured somatic alerts, allergies, and contraindications for a patient.
 */
export function resolvePatientSomaticAlerts(
	patient: Patient | null | undefined,
	insight?: PatientInsight | null | undefined,
): PatientSomaticAlert[] {
	if (!patient && !insight) return [];

	const alerts: PatientSomaticAlert[] = [];
	const seenLabels = new Set<string>();

	const addAlert = (
		label: string,
		category: PatientSomaticAlert["category"],
		severity: PatientSomaticAlert["severity"],
		icon: string,
	) => {
		const norm = label.trim().toLowerCase();
		if (!norm || seenLabels.has(norm)) return;
		seenLabels.add(norm);
		alerts.push({
			id: `alert-${alerts.length + 1}`,
			label: label.trim(),
			category,
			severity,
			icon,
		});
	};

	// 1. Check direct allergies property if present
	if (patient && (patient as any).allergies) {
		const rawAllergies = (patient as any).allergies;
		if (Array.isArray(rawAllergies)) {
			for (const a of rawAllergies) {
				if (typeof a === "string" && a.trim()) {
					addAlert(a.trim(), "allergy", "high", "AlertTriangle");
				}
			}
		} else if (typeof rawAllergies === "string" && rawAllergies.trim()) {
			addAlert(rawAllergies.trim(), "allergy", "high", "AlertTriangle");
		}
	}

	// 2. Check notes for allergies, somatics, contraindications
	if (patient?.notes) {
		const rawNotes = patient.notes;
		const lower = rawNotes.toLowerCase();

		// Specific allergy detections
		if (
			lower.includes("лидокаин") ||
			lower.includes("анестети") ||
			lower.includes("ультракаин") ||
			lower.includes("новокаин") ||
			lower.includes("артикаин")
		) {
			addAlert(
				"Аллергия на анестетики (лидокаин / артикаин)",
				"allergy",
				"high",
				"AlertTriangle",
			);
		}
		if (
			lower.includes("пенициллин") ||
			lower.includes("антибиотик") ||
			lower.includes("амоксициллин")
		) {
			const alreadyHasPenicillin = alerts.some((al) => {
				const l = al.label.toLowerCase();
				return l.includes("пенициллин") || l.includes("амокси");
			});
			if (!alreadyHasPenicillin) {
				addAlert(
					"Аллергия на пенициллиновый ряд",
					"allergy",
					"high",
					"AlertTriangle",
				);
			}
		}
		if (lower.includes("латекс")) {
			addAlert(
				"Непереносимость латекса (безлатексные перчатки)",
				"allergy",
				"medium",
				"AlertCircle",
			);
		}
		if (
			lower.includes("аллерги") &&
			!lower.includes("лидокаин") &&
			!lower.includes("пенициллин") &&
			!lower.includes("латекс")
		) {
			addAlert(rawNotes, "allergy", "high", "AlertTriangle");
		}

		// Specific somatic pathology detections
		if (lower.includes("беременн") || lower.includes("триместр")) {
			addAlert(
				"Беременность (ограничения по рентгену и адреналину)",
				"chronic",
				"high",
				"ShieldAlert",
			);
		}
		if (
			lower.includes("кардиостимулятор") ||
			lower.includes("пейсмейкер") ||
			lower.includes("электрокардиостимулятор")
		) {
			addAlert(
				"Кардиостимулятор (запрет ультразвуковых скейлеров)",
				"chronic",
				"high",
				"ShieldAlert",
			);
		}
		if (lower.includes("диабет") || lower.includes("сахарн")) {
			addAlert(
				"Сахарный диабет (риск замедленного заживления)",
				"chronic",
				"medium",
				"AlertCircle",
			);
		}
		if (
			lower.includes("гипертон") ||
			lower.includes("давлен") ||
			lower.includes("аг ")
		) {
			addAlert("Артериальная гипертензия", "chronic", "medium", "AlertCircle");
		}
		if (
			lower.includes("антикоагулянт") ||
			lower.includes("варфарин") ||
			lower.includes("ксарелто") ||
			lower.includes("кровотеч")
		) {
			addAlert(
				"Прием антикоагулянтов (риск кровотечения)",
				"chronic",
				"high",
				"AlertTriangle",
			);
		}
		if (
			lower.includes("гепатит") ||
			lower.includes("вич") ||
			lower.includes("вирусн")
		) {
			addAlert(
				"Особый санитарно-эпидемиологический режим",
				"alert",
				"high",
				"ShieldAlert",
			);
		}
		if (
			lower.includes("острая боль") ||
			lower.includes("зубная боль") ||
			lower.includes("пульпит") ||
			lower.includes("периодонтит") ||
			lower.includes("отек") ||
			lower.includes("флюс")
		) {
			addAlert(
				"Острая боль / Экстренное состояние",
				"pain",
				"high",
				"Zap",
			);
		}
	}

	// 3. Check clinical flags from PatientInsight
	if (insight?.clinicalFlags && Array.isArray(insight.clinicalFlags)) {
		for (const flag of insight.clinicalFlags) {
			const lower = flag.toLowerCase();
			const isPain =
				lower.includes("бол") ||
				lower.includes("пульпит") ||
				lower.includes("периодонтит") ||
				lower.includes("экстрен");
			const isAllergy = lower.includes("аллерг");
			const isHigh =
				isAllergy ||
				isPain ||
				lower.includes("кардио") ||
				lower.includes("беремен");
			const severity: PatientSomaticAlert["severity"] = isHigh
				? "high"
				: "medium";
			const cat: PatientSomaticAlert["category"] = isPain
				? "pain"
				: isAllergy
					? "allergy"
					: "alert";
			const icon = isPain ? "Zap" : isAllergy ? "AlertTriangle" : "ShieldAlert";
			addAlert(flag, cat, severity, icon);
		}
	}

	// 4. High risk level from PatientInsight
	if (insight?.riskLevel === "high") {
		if (insight.riskReasons && insight.riskReasons.length > 0) {
			for (const reason of insight.riskReasons) {
				addAlert(`Риск: ${reason}`, "risk", "high", "ShieldAlert");
			}
		} else {
			addAlert(
				"Высокий клинический / организационный риск",
				"risk",
				"high",
				"ShieldAlert",
			);
		}
	}

	return alerts;
}
