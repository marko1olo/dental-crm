import React from "react";
import { Activity, ArrowUpRight, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { calculateAge } from "@dental/shared";
import {
	type DentitionMode,
	PATHOLOGY_STAMPS,
} from "../view/VisitEmbeddedOdontogram";
import { OdontogramModule } from "../../odontogram/OdontogramModule";
import { useVisitStore, type VisitToothUiState } from "../../../store/visitStore";
import {
	loadStoredTeethData,
	saveStoredTeethData,
} from "../../odontogram/odontogramStorage";
import { generateSoapFromOdontogramFinding } from "../../../lib/clinicalProtocols";
import {
	mergeMultiToothDiagnoses,
	mergeMultiToothObjective,
	mergeMultiToothTreatmentPlan,
} from "../../../utils/clinicalTextSanitizer";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import {
	toOdontogramToothState,
	toVisitToothUiState,
	infer804nServiceFromStamp,
} from "../useVisitEmkToothSync";
import {
	buildEffectiveToothStateByCode,
	buildOdontogramFormulaSummary,
} from "./visitEmkOdontogramBarHelpers";
import type { VisitEmkOdontogramBarProps } from "./types";

export function VisitEmkOdontogramBar({
	activePatient,
	patientHistory,
	visitNoteForm,
	updateVisitNoteField,
	effectiveActiveTooth,
	visitToothStateByCode,
	draft,
}: VisitEmkOdontogramBarProps) {
	const [activeQuadrant, setActiveQuadrant] = React.useState<number | null>(null);
	const [activeStamp, setActiveStamp] = React.useState<string>("idle");
	const activeStampRef = React.useRef<string>("idle");
	const [isOdontogramCollapsed, setIsOdontogramCollapsed] = React.useState<boolean>(true);

	const [dentitionMode, setDentitionMode] = React.useState<DentitionMode>(() => {
		const age =
			activePatient?.age ??
			(activePatient?.birthDate ? calculateAge(activePatient.birthDate) : null);
		if (age !== null && age < 6) return "pediatric";
		if (age !== null && age < 12) return "mixed";
		return "adult";
	});

	const effectiveToothStateByCode = React.useMemo(() => {
		return buildEffectiveToothStateByCode({
			activePatient: (activePatient as any) ?? null,
			patientHistory: (patientHistory as any) ?? null,
			visitToothStateByCode: (visitToothStateByCode as any) ?? null,
		});
	}, [
		activePatient?.id,
		activePatient?.toothStates,
		activePatient?.patientHistory,
		activePatient?.teeth,
		patientHistory,
		visitToothStateByCode,
	]);

	const formulaSummary = React.useMemo(() => {
		return buildOdontogramFormulaSummary(dentitionMode, effectiveToothStateByCode);
	}, [dentitionMode, effectiveToothStateByCode]);

	const toothRows = React.useMemo(
		() => [
			[
				"18", "17", "16", "15", "14", "13", "12", "11",
				"21", "22", "23", "24", "25", "26", "27", "28",
			],
			[
				"48", "47", "46", "45", "44", "43", "42", "41",
				"31", "32", "33", "34", "35", "36", "37", "38",
			],
		],
		[],
	);

	const handleOdontogramToothClick = React.useCallback(
		(code: string, _currentState: string) => {
			const stamp = activeStampRef.current;
			const num = Number.parseInt(code, 10) || 16;
			useVisitStore.getState().setActiveToothNumber(num);

			if (stamp && stamp !== "idle") {
				const uiState = stamp as VisitToothUiState;
				useVisitStore.getState().setToothState(code, uiState);

				const canonicalState = toOdontogramToothState(stamp);
				const patId = activePatient?.id;

				// 1. Persistent storage update & real-time sync with VisitOdontogramTab
				if (patId) {
					const existingTeeth = loadStoredTeethData(patId) || [];
					const nowIso = new Date().toISOString();
					const nextTeeth = [...existingTeeth];
					const idx = nextTeeth.findIndex((t) => t.toothNumber === num);
					if (idx > -1 && nextTeeth[idx]) {
						nextTeeth[idx] = {
							...nextTeeth[idx],
							toothNumber: num,
							state: canonicalState as any,
							updatedAt: nowIso,
						};
					} else {
						nextTeeth.push({
							toothNumber: num,
							state: canonicalState as any,
							updatedAt: nowIso,
						});
					}
					saveStoredTeethData(patId, nextTeeth, true);

					// Dispatch unified event bus to immediately update OdontogramModule in VisitOdontogramTab
					window.dispatchEvent(
						new CustomEvent("dente-odontogram-update", {
							detail: { patientId: patId, states: nextTeeth },
						}),
					);

					// Async background persist to PostgreSQL
					fetch(`/api/patients/${patId}/tooth-states/batch`, {
						method: "POST",
						headers: denteAdminSecretRequestHeaders({
							"Content-Type": "application/json",
						}),
						body: JSON.stringify({
							toothNumbers: [num],
							state: canonicalState,
						}),
					}).catch((err) => {
						logger.warn("[VisitEmkOdontogramBar] Background tooth-state batch sync failed:", err);
					});
				}

				// 2. Linear Chairside Cockpit Trajectory: Auto-enrich Form 043/u SOAP Diary
				const soap = generateSoapFromOdontogramFinding({
					toothNumber: num,
					state: canonicalState,
				});

				const diagText = soap.diagnosisIcd10
					? `${soap.diagnosisIcd10} ${soap.diagnosisIcd10Label || ""} (зуб ${num})`
					: soap.diagnosisTooth;

				const currentDiag = String(visitNoteForm?.diagnosis || "");
				const mergedDiag = mergeMultiToothDiagnoses(currentDiag, {
					toothNumber: num,
					diagnosis: diagText,
				});
				updateVisitNoteField("diagnosis", mergedDiag);

				if (soap.statusLocalis) {
					const currentObj = String(visitNoteForm?.objectiveStatus || "");
					const mergedObj = mergeMultiToothObjective(currentObj, soap.statusLocalis, num);
					updateVisitNoteField("objectiveStatus", mergedObj);
				}

				if (soap.treatmentDescription) {
					const currentPlan = String(visitNoteForm?.treatmentPlan || "");
					const mergedPlan = mergeMultiToothTreatmentPlan(
						currentPlan,
						soap.treatmentDescription,
						num,
					);
					updateVisitNoteField("treatmentPlan", mergedPlan);
				}

				if (soap.anamnesis) {
					const currentComp = String(
						visitNoteForm?.complaint || (visitNoteForm as any)?.complaints || "",
					).trim();
					if (
						!currentComp ||
						currentComp.includes("активно не предъявляет") ||
						currentComp.includes("Жалоб нет")
					) {
						updateVisitNoteField("complaint", soap.anamnesis);
					}
				}

				// Synchronize structured tooth record in useVisitStore
				useVisitStore.getState().setVisitToothRecord(code, {
					toothNumber: num,
					state: uiState,
					diagnosis: diagText,
					diagnosisIcd10: soap.diagnosisIcd10,
					treatmentPlan: soap.treatmentDescription,
				});

				// Dispatch dente-apply-soap-protocol
				window.dispatchEvent(
					new CustomEvent("dente-apply-soap-protocol", {
						detail: {
							finding: { toothNumber: num, state: canonicalState },
							soap: {
								diagnosis: diagText,
								objectiveStatus: soap.statusLocalis,
								treatmentPlan: soap.treatmentDescription,
								complaint: soap.anamnesis,
							},
							mode: "merge",
							immediate: true,
						},
					}),
				);

				// 3. Auto-link Order 804n clinical services to tooth & invoice
				const matchingService = infer804nServiceFromStamp(stamp, num);
				if (matchingService) {
					useVisitStore.getState().addCompletedService({
						serviceId: matchingService.id,
						code804n: matchingService.code804n,
						toothNumber: num,
						toothCode: code,
						name: matchingService.title,
						priceRub: matchingService.priceRub,
						quantity: 1,
					});

					// Dispatch to billing widget
					window.dispatchEvent(
						new CustomEvent("dente-add-services-to-invoice", {
							detail: {
								services: [
									{
										serviceId: matchingService.id,
										title: matchingService.title,
										unitPriceRub: matchingService.priceRub,
										quantity: 1,
										code804n: matchingService.code804n,
										toothCode: code,
									},
								],
							},
						}),
					);
				}

				const stampObj = PATHOLOGY_STAMPS.find((s) => s.id === stamp);
				const stampLabel = stampObj?.label || stamp;
				showToast(`Зуб ${code}: ${stampLabel}. Дневник и услуги обновлены`, "success", 2500);
			} else {
				showToast(`Выбран зуб ${code} для манипуляций`, "info", 1500);
			}
		},
		[activePatient, visitNoteForm, updateVisitNoteField],
	);

	const handleMarkAllIntact = React.useCallback(() => {
		const numbers =
			dentitionMode === "pediatric"
				? [51, 52, 53, 54, 55, 61, 62, 63, 64, 65, 71, 72, 73, 74, 75, 81, 82, 83, 84, 85]
				: [
						18, 17, 16, 15, 14, 13, 12, 11,
						21, 22, 23, 24, 25, 26, 27, 28,
						31, 32, 33, 34, 35, 36, 37, 38,
						48, 47, 46, 45, 44, 43, 42, 41,
				  ];

		for (const num of numbers) {
			const code = String(num);
			useVisitStore.getState().setToothState(code, "idle");
			useVisitStore.getState().setVisitToothRecord(code, {
				toothNumber: num,
				state: "idle",
				diagnosis: "Зубной ряд интактен / Санирован",
				diagnosisIcd10: "Z01.2",
				treatmentPlan: "Профилактический осмотр 1 раз в 6 месяцев",
			});
		}

		const patId = activePatient?.id;
		if (patId) {
			const nowIso = new Date().toISOString();
			const intactTeeth = numbers.map((num) => ({
				toothNumber: num,
				state: "Healthy" as const,
				updatedAt: nowIso,
			}));
			saveStoredTeethData(patId, intactTeeth as any, true);

			window.dispatchEvent(
				new CustomEvent("dente-odontogram-update", {
					detail: { patientId: patId, states: intactTeeth },
				}),
			);

			fetch(`/api/patients/${patId}/tooth-states/batch`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					toothNumbers: numbers,
					state: "Healthy",
				}),
			}).catch((err) => {
				logger.warn("[VisitEmkOdontogramBar] Background all-intact batch sync failed:", err);
			});
		}

		const normDiag = "K00.0 / Z01.2 Зубной ряд санирован, кариозных полостей и воспаления не выявлено";
		const normObj = "Слизистая оболочка полости рта бледно-розовая, умеренно увлажнена. Десневые сосочки бледно-розовые, плотно прилежат к шейкам зубов, не кровоточат. Зубные ряды интактны, устойчивы. Прикус ортогнатический. Перкуссия всех зубов безболезненная.";
		const normPlan = "Рекомендована профессиональная гигиена и контрольный осмотр через 6 месяцев. Обучение гигиене полости рта проведено.";
		const normComp = "Жалоб нет. Профилактический осмотр / плановая санация.";

		updateVisitNoteField("diagnosis", normDiag);
		updateVisitNoteField("objectiveStatus", normObj);
		updateVisitNoteField("treatmentPlan", normPlan);
		const currentComp = String(visitNoteForm?.complaint || (visitNoteForm as any)?.complaints || "").trim();
		if (!currentComp || currentComp.includes("активно не предъявляет") || currentComp.includes("Жалоб нет")) {
			updateVisitNoteField("complaint", normComp);
		}

		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					finding: { toothNumber: 0, state: "Healthy" },
					soap: {
						diagnosis: normDiag,
						objectiveStatus: normObj,
						treatmentPlan: normPlan,
						complaint: normComp,
					},
					mode: "replace",
					immediate: true,
				},
			}),
		);

		showToast("Все зубы отмечены интактными. Дневник приёма заполнен протоколом санации", "success", 3000);
	}, [activePatient?.id, dentitionMode, updateVisitNoteField, visitNoteForm]);

	return (
		<div
			className={`visit-emk-embedded-odontogram-wrap bg-[var(--paper)] border border-[var(--line)] rounded-xl transition-all shadow-2xs ${
				isOdontogramCollapsed ? "px-2.5 sm:px-3 py-1.5" : "p-2.5 sm:p-3"
			}`}
			data-testid="visit-emk-embedded-odontogram"
		>
			<div
				className={`flex items-center justify-between gap-2 ${
					isOdontogramCollapsed ? "" : "mb-2 pb-1.5 border-b border-[var(--line)]/60"
				}`}
			>
				<div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
					<span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
					<span className="text-xs font-bold text-[var(--ink)] truncate">
						<span className="hidden sm:inline">Интерактивная </span>зубная формула
						<span className="font-normal text-[var(--muted)] ml-1.5 hidden md:inline">
							• {formulaSummary}
						</span>
					</span>
					<span className="text-[11px] font-mono px-1.5 sm:px-2 py-0.5 rounded-md bg-[var(--teal-soft)] text-[var(--teal-dark,var(--teal))] font-bold shrink-0 whitespace-nowrap">
						<span className="hidden sm:inline">Активный зуб: </span>Зуб {effectiveActiveTooth}
					</span>
				</div>
				<div className="flex items-center gap-1.5 shrink-0">
					<button
						type="button"
						onClick={handleMarkAllIntact}
						data-testid="btn-mark-all-teeth-intact"
						className="border border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-bold rounded-lg px-2 sm:px-2.5 py-1 text-xs shadow-2xs hover:bg-teal-500/20 hover:border-teal-500 transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0"
						title="Отметить все зубы интактными и заполнить протокол нормы (Дневник визита)"
					>
						<ShieldCheck size={13} className="shrink-0 text-teal-600 dark:text-teal-400" />
						<span>Санирован</span>
					</button>
					<button
						type="button"
						onClick={() => {
							window.dispatchEvent(
								new CustomEvent("dente:visit-tab-change", { detail: { tab: "odontogram" } }),
							);
						}}
						data-testid="btn-open-odontogram-tab"
						className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2 sm:px-2.5 py-1 text-xs shadow-2xs hover:border-[var(--teal)] transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0"
						title="Перейти во вкладку полной зубной формулы"
					>
						<span className="hidden md:inline">Зубная формула</span>
						<ArrowUpRight size={13} className="shrink-0" />
					</button>
					<button
						type="button"
						onClick={() => {
							window.dispatchEvent(new CustomEvent("dente:open-perio-modal"));
						}}
						data-testid="btn-open-perio-modal"
						className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2 sm:px-2.5 py-1 text-xs shadow-2xs hover:border-[var(--teal)] transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0"
						title="Открыть подробную пародонтограмму и скрининг карманов (Мандат 8e)"
					>
						<Activity size={13} className="shrink-0 text-teal-600 dark:text-teal-400" />
						<span className="hidden sm:inline">Пародонтограмма</span>
					</button>
					<button
						type="button"
						onClick={() => setIsOdontogramCollapsed((v) => !v)}
						data-testid="btn-toggle-odontogram-collapse"
						className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2 sm:px-2.5 py-1 text-xs shadow-2xs hover:border-[var(--teal)] transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0"
						title={isOdontogramCollapsed ? "Развернуть одонтограмму" : "Свернуть одонтограмму"}
					>
						{isOdontogramCollapsed ? (
							<>
								<span className="hidden sm:inline">Развернуть</span>
								<ChevronDown size={13} />
							</>
						) : (
							<>
								<span className="hidden sm:inline">Свернуть</span>
								<ChevronUp size={13} />
							</>
						)}
					</button>
				</div>
			</div>
			{!isOdontogramCollapsed && (
				<div className="mt-2.5 pt-2 border-t border-[var(--line)]" data-testid="visit-emk-odontogram-canonical-container">
					{activePatient?.id ? (
						<OdontogramModule
							patientId={activePatient.id}
							pediatricMode={dentitionMode !== "adult"}
							dentitionMode={dentitionMode}
						/>
					) : (
						<div className="py-6 text-center text-xs text-[var(--muted)]">
							Пациент не выбран. Выберите пациента для работы с зубной формулой.
						</div>
					)}
				</div>
			)}
		</div>
	);
}
