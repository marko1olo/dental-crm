import { useDocumentStore } from "../../../store/documentStore";
import { AnamnesisField } from "../AnamnesisField";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import type { DocumentVisitHints } from "./documentFormTypes";

/**
 * Журнал анестезии: метод, препарат, зона, доза и реакция до создания документа.
 *
 * Вынесено из DocumentsView.tsx дословно. Аллергоанамнез остаётся пустым и
 * заполняется врачом — за это отвечает AnamnesisField, а не хранилище.
 */
export function AnesthesiaConsentLogForm({ inferredTreatmentArea }: Pick<DocumentVisitHints, "inferredTreatmentArea">) {
	const {
		anesthesiaAllergyRestrictionsChecked,
		anesthesiaAllergyStatus,
		anesthesiaAnesthetic,
		anesthesiaConsentConfirmed,
		anesthesiaDoseMl,
		anesthesiaDoseTime,
		anesthesiaMethod,
		anesthesiaReaction,
		anesthesiaRestrictionNotes,
		anesthesiaRisksExplained,
		anesthesiaVasoconstrictor,
		anesthesiaZone,
		setAnesthesiaAllergyRestrictionsChecked,
		setAnesthesiaAllergyStatus,
		setAnesthesiaAnesthetic,
		setAnesthesiaConsentConfirmed,
		setAnesthesiaDoseMl,
		setAnesthesiaDoseTime,
		setAnesthesiaMethod,
		setAnesthesiaReaction,
		setAnesthesiaRestrictionNotes,
		setAnesthesiaRisksExplained,
		setAnesthesiaVasoconstrictor,
		setAnesthesiaZone,
	} = useDocumentStore();

	return (
		<DocumentPayloadCard title="Журнал анестезии" description="Перед созданием: метод, препарат, зона, доза и реакция.">
			<label>
				Метод
				<input
					value={anesthesiaMethod}
					onChange={(event) => setAnesthesiaMethod(event.target.value)}
					placeholder="например: инфильтрационная"
				/>
			</label>
			<label>
				Препарат
				<input
					value={anesthesiaAnesthetic}
					onChange={(event) => setAnesthesiaAnesthetic(event.target.value)}
					placeholder="например: артикаин 4%"
				/>
			</label>
			<label>
				Вазоконстриктор
				<input
					value={anesthesiaVasoconstrictor}
					onChange={(event) => setAnesthesiaVasoconstrictor(event.target.value)}
					placeholder="например: 1:100000 или «без вазоконстриктора»"
				/>
			</label>
			<label>
				Зона
				<input value={anesthesiaZone} onChange={(event) => setAnesthesiaZone(event.target.value)} placeholder={inferredTreatmentArea || "FDI / зона"} />
			</label>
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
						onChange={(event) => setAnesthesiaDoseTime(event.target.value)}
						placeholder="время введения, часы:минуты"
					/>
				</label>
				<label>
					Доза, мл
					<input
						value={anesthesiaDoseMl}
						onChange={(event) => setAnesthesiaDoseMl(event.target.value)}
						placeholder="например: 1,7"
					/>
				</label>
			</div>
			<label>
				Реакция
				<textarea
					value={anesthesiaReaction}
					onChange={(event) => setAnesthesiaReaction(event.target.value)}
					placeholder="заполняется после введения"
					rows={2}
				/>
			</label>
			<label>
				Ограничения
				<textarea
					value={anesthesiaRestrictionNotes}
					onChange={(event) => setAnesthesiaRestrictionNotes(event.target.value)}
					placeholder="например: без вазоконстриктора / контроль АД"
					rows={2}
				/>
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={anesthesiaRisksExplained}
					type="checkbox"
					onChange={(event) => setAnesthesiaRisksExplained(event.target.checked)}
				/>
				Пациенту объяснены риски и ограничения анестезии
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={anesthesiaAllergyRestrictionsChecked}
					type="checkbox"
					onChange={(event) => setAnesthesiaAllergyRestrictionsChecked(event.target.checked)}
				/>
				Аллергии, лекарства и ограничения проверены до введения
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={anesthesiaConsentConfirmed}
					type="checkbox"
					onChange={(event) => setAnesthesiaConsentConfirmed(event.target.checked)}
				/>
				Пациент согласен на выбранную местную анестезию
			</label>
		</DocumentPayloadCard>
	);
}
