import { z } from "zod";
import { type CheckInteractionsRequest, type CheckInteractionsResponse, createPrescription107RequestSchema, type InteractionConflictItem } from "./implantologyAndPrescriptionSchemas.js";

export type CreatePrescription107Request = z.infer<
	typeof createPrescription107RequestSchema
>;

export class DentalInteractionMatrixEngine {
	public static evaluatePrescriptionSafety(
		req: CheckInteractionsRequest,
		patientAllergies: Array<{
			allergenGroup: string;
			reactionSeverity: string;
			hasSamterTriad: boolean;
		}>,
	): CheckInteractionsResponse {
		const conflicts: InteractionConflictItem[] = [];
		const normalizedPrescribed = req.prescribedInnList.map((d) =>
			d.toLowerCase().trim(),
		);
		const normalizedBaseline = req.currentMedications.map((d) =>
			d.toLowerCase().trim(),
		);

		// 1. Metronidazole + Ethanol
		const hasMetronidazole = normalizedPrescribed.some(
			(d) =>
				d.includes("metronidazol") ||
				d.includes("метронидазол") ||
				d.includes("трихопол") ||
				d.includes("метрогил"),
		);
		if (hasMetronidazole) {
			conflicts.push({
				id: "INT-METRO-ALC",
				severity: "blocker",
				agentA: "Метронидазол (Metronidazolum)",
				agentB: "Этанол / Спиртосодержащие растворы",
				conflictCategory: "drug_drug",
				title: "Дисульфирамоподобная реакция (Ингибирование ALDH)",
				clinicalRisk:
					"Накопление токсического ацетальдегида: гипотония, тахикардия, неукротимая рвота, коллапс.",
				mechanism:
					"Блокада печеночной альдегиддегидрогеназы. Запрещен алкоголь во время курса + 48ч.",
				actionRequired:
					"Предупредить пациента; исключить спиртовые ополаскиватели.",
			});
		}

		// 2. NSAIDs + Anticoagulants
		const hasNsaid = normalizedPrescribed.some(
			(d) =>
				d.includes("ketorolac") ||
				d.includes("кеторолак") ||
				d.includes("кеторол") ||
				d.includes("ibuprofen") ||
				d.includes("ибупрофен") ||
				d.includes("nimesulid") ||
				d.includes("нимесулид") ||
				d.includes("ketoprofen") ||
				d.includes("кетопрофен"),
		);
		const hasAnticoagulant = normalizedBaseline.some(
			(d) =>
				d.includes("warfarin") ||
				d.includes("варфарин") ||
				d.includes("rivaroxaban") ||
				d.includes("ривароксабан") ||
				d.includes("ксарелто") ||
				d.includes("apixaban") ||
				d.includes("апиксабан") ||
				d.includes("эликвис") ||
				d.includes("dabigatran") ||
				d.includes("дабигатран") ||
				d.includes("прадакса") ||
				d.includes("clopidogrel") ||
				d.includes("клопидогрел") ||
				d.includes("аспирин"),
		);
		if (hasNsaid && hasAnticoagulant) {
			conflicts.push({
				id: "INT-NSAID-ANTICOAG",
				severity: "blocker",
				agentA: "НПВП (Кеторолак / Ибупрофен / Нимесулид)",
				agentB: "Антикоагулянты / Антиагреганты",
				conflictCategory: "drug_drug",
				title: "Высокий риск массивного луночкового кровотечения и язв ЖКТ",
				clinicalRisk:
					"Синергическое угнетение тромбоцитарного гемостаза (ингибирование ЦОГ-1) и свертывания крови.",
				mechanism: "Подавление TxA2 на фоне системной антикоагуляции.",
				actionRequired:
					"Заменить НПВП на Парацетамол 500-1000 мг (до 2 г/сут). Провести ревизию лунки и ушивание.",
			});
		}

		// 3. NSAIDs + ACEi / ARBs
		const hasAceiArb = normalizedBaseline.some(
			(d) =>
				d.includes("enalapril") ||
				d.includes("эналаприл") ||
				d.includes("lisinopril") ||
				d.includes("лизиноприл") ||
				d.includes("losartan") ||
				d.includes("лозартан") ||
				d.includes("valsartan") ||
				d.includes("валсартан"),
		);
		if (hasNsaid && hasAceiArb) {
			conflicts.push({
				id: "INT-NSAID-ACEI",
				severity: "warning",
				agentA: "НПВП (Кеторолак / Нимесулид / Ибупрофен)",
				agentB: "Ингибиторы АПФ / БРА",
				conflictCategory: "drug_drug",
				title: "Риск острого почечного повреждения и снижение гипотензивного эффекта",
				clinicalRisk:
					"Спазм приносящей артериолы (дефицит PGE2) + дилатация выносящей артериолы -> падение СКФ.",
				mechanism: "Блокада простагландинового ауторегуляторного почечного кровотока.",
				actionRequired: "Ограничить курс НПВП до 48 часов.",
			});
		}

		// 4. Aminopenicillins + Methotrexate
		const hasPenicillin = normalizedPrescribed.some(
			(d) =>
				d.includes("amoxicillin") ||
				d.includes("амоксициллин") ||
				d.includes("augmentin") ||
				d.includes("аугментин") ||
				d.includes("ampicillin"),
		);
		const hasMethotrexate = normalizedBaseline.some(
			(d) => d.includes("methotrexate") || d.includes("метотрексат"),
		);
		if (hasPenicillin && hasMethotrexate) {
			conflicts.push({
				id: "INT-PEN-MTX",
				severity: "blocker",
				agentA: "Аминопенициллины (Амоксициллин / Аугментин)",
				agentB: "Метотрексат (Methotrexatum)",
				conflictCategory: "drug_drug",
				title: "Блокада канальцевой секреции метотрексата: тяжелая миелосупрессия",
				clinicalRisk:
					"Угнетение кроветворения, панцитопения, токсический некролиз.",
				mechanism:
					"Конкуренция за транспортеры OAT1/OAT3 в почечных канальцах.",
				actionRequired:
					"Исключить пенициллины! Заменить на Кларитромицин или Клиндамицин.",
			});
		}

		// 5. Vasoconstrictor Epinephrine + Non-selective Beta-blockers
		const hasBetaBlocker = normalizedBaseline.some(
			(d) =>
				d.includes("propranolol") ||
				d.includes("пропранолол") ||
				d.includes("анаприлин") ||
				d.includes("sotalol") ||
				d.includes("соталол"),
		);
		if (hasBetaBlocker && req.vasoconstrictorPlanned !== "none") {
			conflicts.push({
				id: "INT-EPI-BB",
				severity: "blocker",
				agentA: "Эпинефрин (Адреналин в анестетике)",
				agentB: "Неселективные бета-блокаторы (Анаприлин)",
				conflictCategory: "anesthetic_vasoconstrictor",
				title: "Некомпенсированная альфа-1 вазоконстрикция: Острый гипертонический криз",
				clinicalRisk:
					"Критический скачок АД > 200 мм рт. ст., рефлекторная брадикардия, геморрагический инсульт.",
				mechanism:
					"Блокада сосудистых бета-2 рецепторов оставляет чистую альфа-1 вазоконстрикцию.",
				actionRequired: "Применять Мепивакаин 3% БЕЗ вазоконстриктора (Plain)!",
			});
		}

		// 6. Penicillin Allergy Direct & Cross to Cephalosporins
		const hasPenicillinAllergy = patientAllergies.some(
			(a) =>
				a.allergenGroup.toLowerCase().includes("penicillin") ||
				a.allergenGroup.toLowerCase().includes("пенициллин"),
		);
		if (hasPenicillinAllergy && hasPenicillin) {
			conflicts.push({
				id: "ALLERGY-PEN-DIRECT",
				severity: "blocker",
				agentA: "Амоксициллин / Пенициллины",
				agentB: "Сенсибилизация к пенициллинам в анамнезе",
				conflictCategory: "drug_allergy_cross",
				title: "Прямая аллергическая реакция: Риск анафилактического шока",
				clinicalRisk: "Отек Квинке, ларингоспазм, анафилаксия.",
				mechanism: "IgE-опосредованная дегрануляция тучных клеток на бета-лактамы.",
				actionRequired: "Заменить на Азитромицин 500 мг или Клиндамицин 300 мг.",
			});
		}

		// 7. Aspirin Asthma / Samter Triad
		const hasSamter = patientAllergies.some(
			(a) =>
				a.hasSamterTriad ||
				a.allergenGroup.toLowerCase().includes("aspirin") ||
				a.allergenGroup.toLowerCase().includes("аспирин"),
		);
		if (hasSamter && hasNsaid) {
			conflicts.push({
				id: "ALLERGY-SAMTER-TRIAD",
				severity: "blocker",
				agentA: "НПВП (Кеторолак / Нимесулид / Ибупрофен)",
				agentB: "Аспириновая астма / Триада Видаля",
				conflictCategory: "drug_disease",
				title: "Аспириновая триада: Астматический статус и анафилактоидный шок",
				clinicalRisk: "Тотальный бронхоспазм, отек дыхательных путей, асфиксия.",
				mechanism: "Шунтирование каскада арахидоновой кислоты на 5-LOX путь лейкотриенов.",
				actionRequired: "Категорически запрещены любые неселективные НПВП! Использовать Парацетамол до 500 мг.",
			});
		}

		const blockers = conflicts.filter((c) => c.severity === "blocker");
		const warnings = conflicts.filter((c) => c.severity === "warning");

		return {
			patientId: req.patientId,
			isPrescriptionSafe: blockers.length === 0,
			blockersCount: blockers.length,
			warningsCount: warnings.length,
			conflicts,
			suggestedModifications:
				blockers.length > 0
					? [
							"Рецепт заблокирован движком безопасности DENTE. Исправьте назначения согласно рекомендациям.",
						]
					: [],
			evaluatedAt: new Date().toISOString(),
		};
	}
}
