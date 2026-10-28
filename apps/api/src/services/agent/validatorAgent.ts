/**
 * validatorAgent.ts — Adversarial Hallucination Firewall & Clinical Safety Guardrail.
 *
 * Statutory, Pharmacological & Clinical Standards:
 * - Federal Law No. 323-FZ "On Fundamentals of Health Protection of Citizens in the Russian Federation" (Art. 64, 79).
 * - Clinical recommendations of the Dental Association of Russia (СтАР) on local anesthesia and pharmacotherapy.
 * - State Register of Medicines of the Russian Federation (ГРЛС Минздрава РФ).
 * - FDI World Dental Federation two-digit tooth numbering notation (ISO 3950).
 *
 * Compliant with Mandate 8b / 8zi (Decomposed, ~440 lines).
 */

import {
	auditClinicalDrugSafety,
	type DrugSafetyAuditInput,
} from "@dental/shared";
import {
	ARTICAINE_KEYWORDS,
	type ClinicalPlanInput,
	type ClinicalValidationContext,
	type ClinicalValidationErrorCode,
	type ClinicalValidationIssue,
	type ClinicalValidationResult,
	type ClinicalValidationSeverity,
	EPINEPHRINE_KEYWORDS,
	HYPERTENSION_STAGE_3_KEYWORDS,
	isValidFdiToothNumber,
	NSAID_KEYWORDS,
	type OdontogramToothStatus,
	PENICILLIN_KEYWORDS,
	PHEOCHROMOCYTOMA_KEYWORDS,
	type ProposedClinicalItem,
	type SafeAlternativeRecommendation,
	THYROTOXICOSIS_KEYWORDS,
} from "./validator/validatorSafetyRules.js";

export type {
	ClinicalValidationSeverity,
	ClinicalValidationErrorCode,
	ClinicalValidationIssue,
	SafeAlternativeRecommendation,
	OdontogramToothStatus,
	ClinicalValidationContext,
	ProposedClinicalItem,
	ClinicalPlanInput,
	ClinicalValidationResult,
};
export { isValidFdiToothNumber };

// ============================================================================
// CLINICAL VALIDATOR IMPLEMENTATION
// ============================================================================

export class ClinicalValidatorAgent {
	/**
	 * Validates a proposed clinical plan against patient allergies, somatic conditions,
	 * and active dental formula.
	 */
	public static validatePlan(
		plan: ClinicalPlanInput,
		context: ClinicalValidationContext,
	): ClinicalValidationResult {
		const issues: ClinicalValidationIssue[] = [];
		const blockedActions: string[] = [];
		const safeAlternatives: SafeAlternativeRecommendation[] = [];
		let highestSeverity: ClinicalValidationSeverity = "safe";

		const normalizedAllergies = (context.knownAllergies || []).map((a) =>
			a.toLowerCase().trim(),
		);
		const normalizedConditions = (context.somaticConditions || []).map((c) =>
			c.toLowerCase().trim(),
		);

		const isThyrotoxicosis = normalizedConditions.some((c) =>
			THYROTOXICOSIS_KEYWORDS.some((kw) => c.includes(kw)),
		);
		const isHypertensionStage3 = normalizedConditions.some((c) =>
			HYPERTENSION_STAGE_3_KEYWORDS.some((kw) => c.includes(kw)),
		);
		const isPheochromocytoma = normalizedConditions.some((c) =>
			PHEOCHROMOCYTOMA_KEYWORDS.some((kw) => c.includes(kw)),
		);
		const hasVasoconstrictorSomaticBlock =
			isThyrotoxicosis || isHypertensionStage3 || isPheochromocytoma;

		const isPregnant3rdTrimester =
			context.isPregnant && (context.pregnancyTrimester ?? 1) >= 3;
		const hasPepticUlcer =
			context.hasPepticUlcer ||
			normalizedConditions.some(
				(c) =>
					c.includes("язв") || c.includes("язва желудка") || c.includes("k25"),
			);

		// Track revised items for automatic plan repair
		const revisedItems: ProposedClinicalItem[] = [];

		for (const item of plan.items) {
			let itemNeedsRevision = false;
			let revisedItem: ProposedClinicalItem = { ...item };

			// ─────────────────────────────────────────────────────────────────────
			// 1. ODONTOGRAM VALIDATION (Tooth existence & FDI notation)
			// ─────────────────────────────────────────────────────────────────────
			if (item.toothNumber !== undefined) {
				const tooth = item.toothNumber;

				// FDI Boundary Check
				if (!isValidFdiToothNumber(tooth)) {
					highestSeverity = "critical";
					issues.push({
						code: "INVALID_FDI_TOOTH_NUMBER",
						severity: "critical",
						message: `Недопустимый номер зуба ${tooth} по международной классификации FDI (ISO 3950). Допустимы 11–48 и 51–85.`,
						field: `items[${tooth}].toothNumber`,
						offender: String(tooth),
						suggestedFix: "Укажите корректный номер зуба по системе FDI",
					});
					blockedActions.push(`procedure_on_invalid_tooth_${tooth}`);
					itemNeedsRevision = true;
				} else if (context.activeDentalFormula) {
					// Absent tooth check
					const status = context.activeDentalFormula[tooth];
					const isAbsent =
						status &&
						(status.statusCode === "extracted_absent" ||
							status.statusCode === "absent" ||
							status.statusCode === "Отс(A)");

					if (isAbsent) {
						const act = (item.action || "").toLowerCase();
						const title = (item.procedureTitle || "").toLowerCase();
						const isAttemptToOperateOnAbsentTooth =
							act === "extraction" ||
							act === "restoration" ||
							act === "endodontics" ||
							title.includes("удал") ||
							title.includes("кариес") ||
							title.includes("пломб") ||
							title.includes("канал") ||
							title.includes("депульп");

						if (isAttemptToOperateOnAbsentTooth) {
							highestSeverity = "critical";
							const actionName =
								act === "extraction"
									? "Удаление"
									: act === "restoration"
										? "Лечение кариеса"
										: "Эндодонтическое вмешательство";

							const msg = `ОДОНТОГРАММА: Зуб ${tooth} уже отсутствует в зубной формуле (статус: extracted_absent / Отс(A)). Манипуляция "${actionName}" на отсутствующем зубе физически и клинически невозможна.`;

							issues.push({
								code: "ODONTOGRAM_ABSENT_TOOTH",
								severity: "critical",
								message: msg,
								field: `items[${tooth}]`,
								offender: `Tooth ${tooth} (extracted_absent)`,
								suggestedFix: `Запланируйте дентальную имплантацию в позиции ${tooth} или костную пластику вместо удаления/лечения.`,
							});

							blockedActions.push(`${item.action || "treatment"}_tooth_${tooth}`);
							itemNeedsRevision = true;

							// Auto-revise to implantation / consultation if possible
							revisedItem = {
								type: "tooth_procedure",
								toothNumber: tooth,
								action: "implant",
								procedureTitle: `Дентальная имплантация в области отсутствующего зуба ${tooth}`,
								icd10: "K08.1",
							};
						}
					}
				}
			}

			// ─────────────────────────────────────────────────────────────────────
			// 2. SOMATIC CONTRAINDICATIONS & VASOCONSTRICTOR (Adrenaline) SAFETY
			// ─────────────────────────────────────────────────────────────────────
			const drugOrProcedureText = (
				(item.medicationName || "") +
				" " +
				(item.procedureTitle || "") +
				" " +
				(item.action || "")
			).toLowerCase();

			const hasEpinephrine = EPINEPHRINE_KEYWORDS.some((kw) =>
				drugOrProcedureText.includes(kw),
			);

			if (hasEpinephrine && hasVasoconstrictorSomaticBlock) {
				highestSeverity = "critical";
				const conditionReason = isThyrotoxicosis
					? "тиреотоксикозом / гипертиреозом (E05)"
					: isHypertensionStage3
						? "гипертонической болезнью III стадии / кризовым течением (I10/I11)"
						: "феохромоцитомой";

				const issueMsg = `СОМАТИЧЕСКОЕ ПРОТИВОПОКАЗАНИЕ: Адреналин/эпинефрин абсолютно противопоказан пациенту с ${conditionReason} из-за высокого риска летальной аритмии, гемодинамического или тиреотоксического криза (Клин. рекомендации СтАР).`;

				issues.push({
					code: "SOMATIC_CONTRAINDICATION",
					severity: "critical",
					message: issueMsg,
					field: item.medicationName ? "medicationName" : "procedureTitle",
					offender: "Адреналин / Эпинефрин",
					suggestedFix:
						"Заменить на 3% Мепивакаин без вазоконстриктора (Скандонест 3% / Мепивастезин)",
				});

				blockedActions.push("administer_epinephrine_anesthetic");
				itemNeedsRevision = true;

				const safeAlt: SafeAlternativeRecommendation = {
					original: "Анестетик с адреналином / эпинефрином (Ультракаин Д-С Форте / Артикаин 1:100000)",
					replacement: "Мепивакаин 3% без вазоконстриктора (Скандонест 3% / Мепивастезин)",
					clinicalRationaleRu:
						"Мепивакаин не содержит адреналина и сульфитов, обладает собственной сосудосуживающей активностью и безопасен при тиреотоксикозе и тяжелой гипертонии.",
				};
				safeAlternatives.push(safeAlt);

				// Auto-revise medication to Mepivacaine 3% plain
				revisedItem = {
					...revisedItem,
					type: "anesthesia",
					medicationName: "Мепивакаин 3% без вазоконстриктора (Скандонест)",
					procedureTitle: "Анестезия инфильтрационная/проводниковая (Мепивакаин 3% без вазоконстриктора)",
				};
			}

			// ─────────────────────────────────────────────────────────────────────
			// 3. ALLERGY CROSS-REACTIVITY GUARD
			// ─────────────────────────────────────────────────────────────────────
			if (normalizedAllergies.length > 0) {
				// Check Penicillin allergy clash
				const hasPenicillinAllergy = normalizedAllergies.some((a) =>
					PENICILLIN_KEYWORDS.some((kw) => a.includes(kw)),
				);
				const isProposedPenicillin = PENICILLIN_KEYWORDS.some((kw) =>
					drugOrProcedureText.includes(kw),
				);

				if (hasPenicillinAllergy && isProposedPenicillin) {
					highestSeverity = "critical";
					issues.push({
						code: "ALLERGY_CONTRAINDICATION",
						severity: "critical",
						message: `АЛЛЕРГИЯ: У пациента зафиксирована непереносимость препаратов группы пенициллина. Назначение "${item.medicationName || item.procedureTitle}" заблокировано во избежание анафилаксии.`,
						field: "medicationName",
						offender: item.medicationName || "Пенициллин",
						suggestedFix: "Назначить альтернативный антибиотик (Азитромицин 500 мг или Кларитромицин)",
					});
					blockedActions.push(`prescribe_${item.medicationName || "penicillin"}`);
					itemNeedsRevision = true;

					safeAlternatives.push({
						original: item.medicationName || "Амоксиклав / Пенициллин",
						replacement: "Азитромицин 500 мг (1 капсула в сутки, 3 дня) или Клиндомицин 300 мг",
						clinicalRationaleRu:
							"Макролиды и линкозамиды не обладают перекрестной аллергенностью с бета-лактамными пенициллинами.",
					});

					revisedItem = {
						...revisedItem,
						medicationName: "Азитромицин 500 мг",
						procedureTitle: "Назначение антибактериальной терапии (Азитромицин 500 мг)",
					};
				}

				// Check Articaine allergy clash
				const hasArticaineAllergy = normalizedAllergies.some((a) =>
					ARTICAINE_KEYWORDS.some((kw) => a.includes(kw)),
				);
				const isProposedArticaine = ARTICAINE_KEYWORDS.some((kw) =>
					drugOrProcedureText.includes(kw),
				);

				if (hasArticaineAllergy && isProposedArticaine) {
					highestSeverity = "critical";
					issues.push({
						code: "ALLERGY_CONTRAINDICATION",
						severity: "critical",
						message: `АЛЛЕРГИЯ: Зафиксирована аллергическая реакция на артикаин. Назначение "${item.medicationName || item.procedureTitle}" заблокировано.`,
						field: "medicationName",
						offender: "Артикаин",
						suggestedFix: "Назначить Мепивакаин 3% без вазоконстриктора или Лидокаин после аллергопробы",
					});
					blockedActions.push("administer_articaine");
					itemNeedsRevision = true;

					safeAlternatives.push({
						original: "Артикаин (Ультракаин / Убистезин)",
						replacement: "Мепивакаин 3% (Скандонест)",
						clinicalRationaleRu: "Мепивакаин относится к амидам другого ряда и лишен эфирных и сульфитных аллергенов.",
					});

					revisedItem = {
						...revisedItem,
						medicationName: "Мепивакаин 3% (Скандонест)",
						procedureTitle: "Местная анестезия препаратом Мепивакаин 3%",
					};
				}
			}

			// ─────────────────────────────────────────────────────────────────────
			// 4. PREGNANCY & PEPTIC ULCER NSAID GUARD
			// ─────────────────────────────────────────────────────────────────────
			const isProposedNsaid = NSAID_KEYWORDS.some((kw) =>
				drugOrProcedureText.includes(kw),
			);

			if (isProposedNsaid) {
				if (isPregnant3rdTrimester) {
					highestSeverity = "critical";
					issues.push({
						code: "PREGNANCY_NSAID_RISK",
						severity: "critical",
						message:
							"БЕРЕМЕННОСТЬ (III ТРИМЕСТР): НПВП абсолютно противопоказаны из-за риска преждевременного закрытия артериального (Боталлова) протока плода и атонии матки.",
						field: "medicationName",
						offender: item.medicationName || "НПВП",
						suggestedFix: "Заменить на Парацетамол 500 мг (до 4 раз в сутки)",
					});
					blockedActions.push(`prescribe_nsaid_in_pregnancy`);
					itemNeedsRevision = true;

					safeAlternatives.push({
						original: item.medicationName || "НПВП (Кеторол / Нимесил / Ибупрофен)",
						replacement: "Парацетамол 500 мг",
						clinicalRationaleRu: "Парацетамол является препаратом первого выбора для анальгезии в III триместре беременности.",
					});

					revisedItem = {
						...revisedItem,
						medicationName: "Парацетамол 500 мг",
						procedureTitle: "Купирование болевого синдрома: Парацетамол 500 мг",
					};
				} else if (hasPepticUlcer) {
					if (highestSeverity === "safe") highestSeverity = "warning";
					issues.push({
						code: "ULCER_NSAID_RISK",
						severity: "warning",
						message:
							"ЯЗВЕННАЯ БОЛЕЗНЬ ЖКТ: Назначение неселективных НПВП создает высокий риск желудочно-кишечного кровотечения. Требуется прикрытие ИПП (Омепразол 20 мг).",
						field: "medicationName",
						offender: item.medicationName || "НПВП",
						suggestedFix: "Назначить Парацетамол или добавить Омепразол 20 мг",
					});
				}
			}

			revisedItems.push(itemNeedsRevision ? revisedItem : item);
		}

		// Cross-verify with shared clinical DDI engine if proposed medications exist
		const proposedDrugs = plan.items
			.filter((i) => i.medicationName)
			.map((i) => i.medicationName as string);

		if (proposedDrugs.length > 0) {
			const ddiInput: DrugSafetyAuditInput = {
				proposedMedications: proposedDrugs,
				knownAllergies: [...normalizedAllergies],
				patientConditions: [...normalizedConditions],
				existingMedications: [...(context.currentMedications || [])],
			};

			try {
				const ddiResult = auditClinicalDrugSafety(ddiInput);
				if (!ddiResult.isSafe) {
					if (highestSeverity !== "critical") {
						highestSeverity = ddiResult.riskLevel === "critical_danger" ? "critical" : "warning";
					}

					for (const warning of ddiResult.allergyWarnings) {
						if (!issues.some((iss) => iss.message.includes(warning.proposedDrug))) {
							issues.push({
								code: "ALLERGY_CONTRAINDICATION",
								severity: warning.severity === "critical" ? "critical" : "warning",
								message: `DDI АЛЛЕРГИЯ: ${warning.allergenGroup} -> ${warning.manifestationsRu}. Действие: ${warning.clinicalActionRu}`,
								offender: warning.proposedDrug,
							});
						}
					}

					for (const contra of ddiResult.conditionContraindications) {
						if (!issues.some((iss) => iss.message.includes(contra.proposedDrug))) {
							issues.push({
								code: "SOMATIC_CONTRAINDICATION",
								severity: contra.severity === "critical" ? "critical" : "warning",
								message: `DDI СОМАТИКА: Противопоказано при ${contra.condition} -> ${contra.reasonRu}.`,
								offender: contra.proposedDrug,
								suggestedFix: contra.clinicalGuidanceRu,
							});
						}
					}
				}
			} catch (ddiErr: unknown) {
				console.warn("[ValidatorAgent] auditClinicalDrugSafety evaluation failed:", ddiErr);
			}
		}

		const isValid = highestSeverity !== "critical";
		const revisedPlan: ClinicalPlanInput | undefined = isValid
			? undefined
			: {
					...plan,
					items: revisedItems,
					doctorNotes: `${plan.doctorNotes || ""}\n[Клинический фаервол скорректировал план по соматическим/аллергическим показаниям]`.trim(),
				};

		const summaryRu = isValid
			? "Клинический аудит пройден успешно: критических противопоказаний и конфликтов одонтограммы не обнаружено."
			: `ОБНАРУЖЕНЫ КРИТИЧЕСКИЕ ПРОТИВОПОКАЗАНИЯ (${issues.length} нарушений). План заблокирован и скорректирован.`;

		return {
			isValid,
			severity: highestSeverity,
			issues,
			blockedActions,
			revisedPlan,
			safeAlternatives,
			summaryRu,
			auditedAtIso: new Date().toISOString(),
		};
	}

	/**
	 * Direct interceptor for tool calling in ReAct loop.
	 * Validates proposed tool call arguments before DB execution.
	 */
	public static validateToolCall(
		toolName: string,
		args: Record<string, unknown>,
		context: ClinicalValidationContext,
	): ClinicalValidationResult {
		// Convert single tool call into a pseudo-plan
		const items: ProposedClinicalItem[] = [];

		if (toolName.includes("suggest_treatment_plan") || toolName.includes("treatment")) {
			const tooth = typeof args.tooth === "number" ? args.tooth : undefined;
			const action = String(args.action || args.primaryDiagnosis || "treatment");
			const procedureTitle = String(args.procedureTitle || args.primaryDiagnosis || "Лечение");
			items.push({
				type: "tooth_procedure",
				toothNumber: tooth,
				action,
				procedureTitle,
			});
		} else if (toolName.includes("prescription") || toolName.includes("drug")) {
			const drugs = Array.isArray(args.drugs) ? args.drugs : [args];
			for (const d of drugs) {
				const drugName = String(d.tradeName || d.mnn || d.name || args.newDrug || "");
				items.push({
					type: "prescription",
					medicationName: drugName,
					procedureTitle: `Назначение препарата ${drugName}`,
				});
			}
		} else if (toolName.includes("anesthesia") || toolName.includes("administer")) {
			const med = String(args.anestheticName || args.medication || args.name || "");
			items.push({
				type: "anesthesia",
				medicationName: med,
				procedureTitle: `Анестезия: ${med}`,
			});
		}

		if (items.length === 0) {
			return {
				isValid: true,
				severity: "safe",
				issues: [],
				blockedActions: [],
				safeAlternatives: [],
				summaryRu: "Манипуляция безопасна",
				auditedAtIso: new Date().toISOString(),
			};
		}

		return ClinicalValidatorAgent.validatePlan({ items }, context);
	}
}
