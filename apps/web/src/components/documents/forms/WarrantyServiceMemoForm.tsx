import { WARRANTY_POLICY_PRESETS } from "@dental/shared";
import React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import type { DocumentVisitHints } from "./documentFormTypes";

export interface WarrantyServiceMemoFormProps extends DocumentVisitHints {
	/** Расчетная подсказка для названия работы из активного визита */
	warrantyServiceOrWorkNameValue?: () => string;
	/** Расчетная подсказка для зубов/области из активного визита */
	warrantyTeethOrAreaValue?: () => string;
}

/**
 * Форма Гарантийного талона и Положения о гарантийных обязательствах.
 * Реализует Закон РФ "О защите прав потребителей" (ст. 5, 10, 29) и Гражданский кодекс РФ.
 */
export const WarrantyServiceMemoForm = React.memo(
	function WarrantyServiceMemoForm({
		activeDoctorFullName,
		warrantyServiceOrWorkNameValue,
		warrantyTeethOrAreaValue,
	}: WarrantyServiceMemoFormProps) {
		const warrantyServiceOrWorkName = useDocumentStore(
			(state) => state.warrantyServiceOrWorkName,
		);
		const setWarrantyServiceOrWorkName = useDocumentStore(
			(state) => state.setWarrantyServiceOrWorkName,
		);
		const warrantyCompletedAt = useDocumentStore(
			(state) => state.warrantyCompletedAt,
		);
		const setWarrantyCompletedAt = useDocumentStore(
			(state) => state.setWarrantyCompletedAt,
		);
		const warrantyTeethOrArea = useDocumentStore(
			(state) => state.warrantyTeethOrArea,
		);
		const setWarrantyTeethOrArea = useDocumentStore(
			(state) => state.setWarrantyTeethOrArea,
		);
		const warrantyMaterialsOrSystems = useDocumentStore(
			(state) => state.warrantyMaterialsOrSystems,
		);
		const setWarrantyMaterialsOrSystems = useDocumentStore(
			(state) => state.setWarrantyMaterialsOrSystems,
		);
		const warrantyPeriod = useDocumentStore((state) => state.warrantyPeriod);
		const setWarrantyPeriod = useDocumentStore(
			(state) => state.setWarrantyPeriod,
		);
		const warrantyControlVisitSchedule = useDocumentStore(
			(state) => state.warrantyControlVisitSchedule,
		);
		const setWarrantyControlVisitSchedule = useDocumentStore(
			(state) => state.setWarrantyControlVisitSchedule,
		);
		const warrantyPatientObligations = useDocumentStore(
			(state) => state.warrantyPatientObligations,
		);
		const setWarrantyPatientObligations = useDocumentStore(
			(state) => state.setWarrantyPatientObligations,
		);
		const warrantyExcludedRiskFactors = useDocumentStore(
			(state) => state.warrantyExcludedRiskFactors,
		);
		const setWarrantyExcludedRiskFactors = useDocumentStore(
			(state) => state.setWarrantyExcludedRiskFactors,
		);
		const warrantyUrgentContactReasons = useDocumentStore(
			(state) => state.warrantyUrgentContactReasons,
		);
		const setWarrantyUrgentContactReasons = useDocumentStore(
			(state) => state.setWarrantyUrgentContactReasons,
		);
		const warrantyLinkedActOrContract = useDocumentStore(
			(state) => state.warrantyLinkedActOrContract,
		);
		const setWarrantyLinkedActOrContract = useDocumentStore(
			(state) => state.setWarrantyLinkedActOrContract,
		);
		const warrantyDoctorFullName = useDocumentStore(
			(state) => state.warrantyDoctorFullName,
		);
		const setWarrantyDoctorFullName = useDocumentStore(
			(state) => state.setWarrantyDoctorFullName,
		);
		const warrantyIssuedAt = useDocumentStore(
			(state) => state.warrantyIssuedAt,
		);
		const setWarrantyIssuedAt = useDocumentStore(
			(state) => state.setWarrantyIssuedAt,
		);
		const warrantyPolicyApplied = useDocumentStore(
			(state) => state.warrantyPolicyApplied,
		);
		const setWarrantyPolicyApplied = useDocumentStore(
			(state) => state.setWarrantyPolicyApplied,
		);
		const warrantyAftercareReceived = useDocumentStore(
			(state) => state.warrantyAftercareReceived,
		);
		const setWarrantyAftercareReceived = useDocumentStore(
			(state) => state.setWarrantyAftercareReceived,
		);
		const warrantyControlVisitsUnderstood = useDocumentStore(
			(state) => state.warrantyControlVisitsUnderstood,
		);
		const setWarrantyControlVisitsUnderstood = useDocumentStore(
			(state) => state.setWarrantyControlVisitsUnderstood,
		);

		const applyWarrantyPreset = (presetKey: string) => {
			const preset = WARRANTY_POLICY_PRESETS[presetKey];
			if (!preset) return;
			setWarrantyServiceOrWorkName(preset.title);
			setWarrantyMaterialsOrSystems(preset.materialsOrSystems);
			setWarrantyPeriod(`Гарантийный срок: ${preset.warrantyPeriod}. Срок службы: ${preset.serviceLife}.`);
			setWarrantyControlVisitSchedule(preset.controlVisitSchedule);
			setWarrantyPatientObligations(preset.patientObligations.join("\n"));
			setWarrantyExcludedRiskFactors(preset.excludedRiskFactors.join("\n"));
			setWarrantyUrgentContactReasons(preset.urgentContactReasons.join("\n"));
		};

		return (
			<DocumentPayloadCard
				title="Гарантийный талон и памятка"
				description="Гарантийные обязательства клиники, сроки службы конструкций, график контрольных визитов и условия сохранения гарантии."
			>
				<div style={{ marginBottom: "12px" }}>
					<span style={{ fontSize: "12px", color: "var(--muted, #64748b)", display: "block", marginBottom: "6px" }}>
						⚡ Клинические пресеты гарантийных сроков (1 клик):
					</span>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
						<button
							type="button"
							className="secondary-button"
							style={{ fontSize: "11.5px", padding: "3px 8px" }}
							onClick={() => applyWarrantyPreset("composite_fillings")}
						>
							🦷 Композитные пломбы (12 мес)
						</button>
						<button
							type="button"
							className="secondary-button"
							style={{ fontSize: "11.5px", padding: "3px 8px" }}
							onClick={() => applyWarrantyPreset("zirconia_emax_crowns")}
						>
							👑 Цирконий / E-max (24–36 мес)
						</button>
						<button
							type="button"
							className="secondary-button"
							style={{ fontSize: "11.5px", padding: "3px 8px" }}
							onClick={() => applyWarrantyPreset("metal_ceramic_crowns")}
						>
							⚙️ Металлокерамика (12 мес)
						</button>
						<button
							type="button"
							className="secondary-button"
							style={{ fontSize: "11.5px", padding: "3px 8px" }}
							onClick={() => applyWarrantyPreset("dental_implants")}
						>
							🔩 Имплантаты (24 мес / пожизненно)
						</button>
						<button
							type="button"
							className="secondary-button"
							style={{ fontSize: "11.5px", padding: "3px 8px" }}
							onClick={() => applyWarrantyPreset("clasp_dentures")}
						>
							🦷 Бюгельные протезы (12 мес)
						</button>
					</div>
				</div>

				<label>
					Работа или услуга
					<textarea
						value={warrantyServiceOrWorkName}
						onChange={(event) =>
							setWarrantyServiceOrWorkName(event.target.value)
						}
						placeholder={warrantyServiceOrWorkNameValue?.() || "название работы, реставрации или конструкции"}
						rows={2}
					/>
				</label>
				<div className="document-payload-row">
					<label>
						Дата завершения
						<input
							value={warrantyCompletedAt}
							onChange={(event) =>
								setWarrantyCompletedAt(event.target.value)
							}
							placeholder="дата финального этапа"
						/>
					</label>
					<label>
						Зубы или область
						<input
							value={warrantyTeethOrArea}
							onChange={(event) =>
								setWarrantyTeethOrArea(event.target.value)
							}
							placeholder={warrantyTeethOrAreaValue?.() || "зубы / зона лечения"}
						/>
					</label>
				</div>
				<label>
					Материалы или системы
					<textarea
						value={warrantyMaterialsOrSystems}
						onChange={(event) =>
							setWarrantyMaterialsOrSystems(event.target.value)
						}
						placeholder="материал реставрации, конструкция, имплант-система"
						rows={2}
					/>
				</label>
				<label>
					Гарантийный срок и условия
					<textarea
						value={warrantyPeriod}
						onChange={(event) => setWarrantyPeriod(event.target.value)}
						rows={2}
					/>
				</label>
				<label>
					Контрольные визиты
					<textarea
						value={warrantyControlVisitSchedule}
						onChange={(event) =>
							setWarrantyControlVisitSchedule(event.target.value)
						}
						rows={2}
					/>
				</label>
				<label>
					Обязанности пациента
					<textarea
						value={warrantyPatientObligations}
						onChange={(event) =>
							setWarrantyPatientObligations(event.target.value)
						}
						rows={3}
					/>
				</label>
				<label>
					Исключения и ограничения гарантии
					<textarea
						value={warrantyExcludedRiskFactors}
						onChange={(event) =>
							setWarrantyExcludedRiskFactors(event.target.value)
						}
						rows={3}
					/>
				</label>
				<label>
					Поводы для срочного обращения
					<textarea
						value={warrantyUrgentContactReasons}
						onChange={(event) =>
							setWarrantyUrgentContactReasons(event.target.value)
						}
						rows={2}
					/>
				</label>
				<div className="document-payload-row">
					<label>
						Связанный акт или договор
						<input
							value={warrantyLinkedActOrContract}
							onChange={(event) =>
								setWarrantyLinkedActOrContract(event.target.value)
							}
							placeholder="номер акта или договора"
						/>
					</label>
					<label>
						Врач
						<input
							value={warrantyDoctorFullName}
							onChange={(event) =>
								setWarrantyDoctorFullName(event.target.value)
							}
							placeholder={activeDoctorFullName ?? "врач, выдавший талон"}
						/>
					</label>
					<label>
						Дата выдачи
						<input
							value={warrantyIssuedAt}
							onChange={(event) =>
								setWarrantyIssuedAt(event.target.value)
							}
						/>
					</label>
				</div>
				<div className="document-payload-checkboxes">
					<label className="document-payload-checkbox">
						<input
							checked={warrantyPolicyApplied}
							type="checkbox"
							onChange={(event) =>
								setWarrantyPolicyApplied(event.target.checked)
							}
						/>
						Положение о гарантиях клиники применено
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={warrantyAftercareReceived}
							type="checkbox"
							onChange={(event) =>
								setWarrantyAftercareReceived(event.target.checked)
							}
						/>
						Памятка по уходу и гигиене вручена пациенту
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={warrantyControlVisitsUnderstood}
							type="checkbox"
							onChange={(event) =>
								setWarrantyControlVisitsUnderstood(event.target.checked)
							}
						/>
						Обязательность профосмотра каждые 6 месяцев разъяснена
					</label>
				</div>
			</DocumentPayloadCard>
		);
	},
);
