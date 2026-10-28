import React, { useMemo } from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { AnamnesisField } from "../AnamnesisField";
import { anesthesiaTextLimitsReview } from "../anesthesiaTextLimits";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import type { DocumentVisitHints } from "./documentFormTypes";
import { AnesthesiaMainInputs } from "./anesthesiaLog/AnesthesiaMainInputs";
import { AnesthesiaVitalsAndBatchFields } from "./anesthesiaLog/AnesthesiaVitalsAndBatchFields";
import { AnesthesiaCheckboxes } from "./anesthesiaLog/AnesthesiaCheckboxes";

export const AnesthesiaConsentLogForm = React.memo(
	function AnesthesiaConsentLogForm({
		inferredTreatmentArea,
	}: Pick<DocumentVisitHints, "inferredTreatmentArea">) {
		const {
			anesthesiaAllergyStatus, setAnesthesiaAllergyStatus,
			anesthesiaAnesthetic, anesthesiaDoseMl, setAnesthesiaDoseMl,
			anesthesiaDoseTime, setAnesthesiaDoseTime,
			anesthesiaMethod, anesthesiaReaction, setAnesthesiaReaction,
			anesthesiaRestrictionNotes, setAnesthesiaRestrictionNotes,
			anesthesiaVasoconstrictor, anesthesiaZone,
		} = useDocumentStore();

		const zoneOfferedFromVisit =
			anesthesiaZone.trim() === "" ? (inferredTreatmentArea ?? "").trim() : "";

		const limits = useMemo(
			() =>
				anesthesiaTextLimitsReview({
					method: anesthesiaMethod,
					anesthetic: anesthesiaAnesthetic,
					vasoconstrictor: anesthesiaVasoconstrictor,
					zone: anesthesiaZone,
					allergyStatus: anesthesiaAllergyStatus,
					restrictionNotes: anesthesiaRestrictionNotes,
					doseTime: anesthesiaDoseTime,
					doseMl: anesthesiaDoseMl,
					reaction: anesthesiaReaction,
				}),
			[
				anesthesiaMethod, anesthesiaAnesthetic, anesthesiaVasoconstrictor,
				anesthesiaZone, anesthesiaAllergyStatus, anesthesiaRestrictionNotes,
				anesthesiaDoseTime, anesthesiaDoseMl, anesthesiaReaction,
			],
		);

		return (
			<DocumentPayloadCard
				title="Журнал анестезии"
				description="Перед созданием: метод, препарат, зона, доза и реакция."
			>
				<AnesthesiaMainInputs zoneOfferedFromVisit={zoneOfferedFromVisit} />

				<AnamnesisField
					label="Аллергоанамнез"
					value={anesthesiaAllergyStatus}
					onChange={setAnesthesiaAllergyStatus}
					placeholder="была ли реакция на анестетики и какая"
					denialText="Аллергия на местные анестетики со слов пациента не отмечена."
				/>

				<div className="document-payload-row">
					<label>
						Время
						<input
							value={anesthesiaDoseTime}
							onChange={(e) => setAnesthesiaDoseTime(e.target.value)}
							placeholder="время введения, часы:минуты"
						/>
					</label>
					<label>
						Доза, мл
						<input
							value={anesthesiaDoseMl}
							onChange={(e) => setAnesthesiaDoseMl(e.target.value)}
							placeholder="например: 1,7"
						/>
					</label>
				</div>

				<AnesthesiaVitalsAndBatchFields />

				<label>
					Реакция
					<textarea
						value={anesthesiaReaction}
						onChange={(e) => setAnesthesiaReaction(e.target.value)}
						placeholder="заполняется после введения"
						rows={2}
					/>
				</label>
				<label>
					Ограничения
					<textarea
						value={anesthesiaRestrictionNotes}
						onChange={(e) => setAnesthesiaRestrictionNotes(e.target.value)}
						placeholder="например: без вазоконстриктора / контроль АД"
						rows={2}
					/>
				</label>

				<AnesthesiaCheckboxes />
			</DocumentPayloadCard>
		);
	},
);

AnesthesiaConsentLogForm.displayName = "AnesthesiaConsentLogForm";
