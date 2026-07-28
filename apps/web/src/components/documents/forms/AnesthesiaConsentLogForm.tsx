import {
	ANESTHESIA_MEDICATION_JOIN_LIMIT,
	anesthesiaTextLimitsReview,
} from "../anesthesiaTextLimits";
import { useDocumentStore } from "../../../store/documentStore";
import { AnamnesisField } from "../AnamnesisField";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import type { DocumentVisitHints } from "./documentFormTypes";

/**
 * Журнал анестезии: метод, препарат, зона, доза и реакция до создания документа.
 *
 * Вынесено из DocumentsView.tsx дословно. Аллергоанамнез остаётся пустым и
 * заполняется врачом — за это отвечает AnamnesisField, а не хранилище.
 *
 * ПОЛЕ «ЗОНА»: СЕРАЯ ПОДСКАЗКА ВЫГЛЯДЕЛА ЗАПОЛНЕННЫМ ПОЛЕМ, А ДОКУМЕНТ ОТКАЗЫВАЛ.
 *
 * В подписи пустого поля стояла зона лечения приёма — «зуб 46». Врач видел в
 * рамке «зуб 46», считал поле заполненным, ставил три отметки и нажимал
 * «Создать выбранный документ» — и получал «Заполните поле: анестезия, зона».
 * Проверка журнала (validateAnesthesiaConsentLog в documentValidators.ts:1107)
 * требует именно ЗНАЧЕНИЕ поля и зону приёма не подставляет.
 *
 * Обмана добавляло соседство: в информированном и процедурном согласиях та же
 * серая зона в подписи поля — правда, там проверка честно берёт зону приёма,
 * если поле пустое (documentValidators.ts:717 и :791). Один и тот же вид на
 * экране означал в трёх формах две разные вещи, и отличить их можно было только
 * по отказу после нажатия.
 *
 * Теперь в подписи стоит пример, а зона приёма подставляется НАСТОЯЩИМ нажатием
 * — ровно так же, как отрицательный ответ в аллергоанамнезе рядом. Кнопка видна,
 * только пока поле пустое и пока приём вообще даёт зону.
 *
 * Класс кнопки взят у AnamnesisField: это единственный в приложении вид кнопки
 * «заполнить пустое поле одним нажатием», а правки в styles/* этой задаче не
 * разрешены. Ничего специфичного для анамнеза в нём нет
 * (styles/main.css:11425-11439) — только рамка, отступы и выравнивание влево.
 *
 * СЛИШКОМ ДЛИННЫЙ ТЕКСТ ОТКАЗЫВАЛСЯ СООБЩЕНИЕМ О ДРУГОЙ БЕДЕ. Пределы длины из
 * схемы содержимого журнала теперь видны на экране, а не только на сервере:
 * разбор и то, что видел врач, записаны в anesthesiaTextLimits.ts.
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

	/**
	 * Зона приёма, которую есть смысл предлагать нажатием: только пока поле пустое.
	 * Затирать набранное кнопкой нельзя — врач мог уточнить зону руками.
	 */
	const zoneOfferedFromVisit =
		anesthesiaZone.trim() === "" ? (inferredTreatmentArea ?? "").trim() : "";

	const limits = anesthesiaTextLimitsReview({
		method: anesthesiaMethod,
		anesthetic: anesthesiaAnesthetic,
		vasoconstrictor: anesthesiaVasoconstrictor,
		zone: anesthesiaZone,
		allergyStatus: anesthesiaAllergyStatus,
		restrictionNotes: anesthesiaRestrictionNotes,
		doseTime: anesthesiaDoseTime,
		doseMl: anesthesiaDoseMl,
		reaction: anesthesiaReaction,
	});

	return (
		<DocumentPayloadCard
			title="Журнал анестезии"
			description="Перед созданием: метод, препарат, зона, доза и реакция."
			notice={
				limits.tooLong.length > 0 ? (
					<div
						className="schedule-create-missing document-anesthesia-too-long"
						role="status"
						aria-live="polite"
						style={{ marginTop: "12px" }}
					>
						<strong>
							Журнал не создастся: текст в {limits.tooLong.length} поле длиннее, чем
							принимает сервер. Отказ на нажатие «Создать» при этом говорит про
							незаполненные поля, поэтому причину пишем здесь:
						</strong>
						<ul>
							{limits.tooLong.map((entry) => (
								<li key={entry.field}>
									{entry.label} — {entry.length} символов, принимается не больше{" "}
									{entry.limit}: сократите на {entry.length - entry.limit}
									{entry.field === "anesthesiaMedicationJoin"
										? `. В строку дозы уходит склейка «препарат, вазоконстриктор», и у неё предел ${ANESTHESIA_MEDICATION_JOIN_LIMIT ?? 0} — короче, чем у самого поля препарата: сократите любое из двух`
										: ""}
								</li>
							))}
						</ul>
						<small>
							Текст не обрезается сам: обрезка посередине испортила бы клиническую
							запись, поэтому сокращает врач.
						</small>
					</div>
				) : null
			}
		>
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
				<input
					value={anesthesiaZone}
					onChange={(event) => setAnesthesiaZone(event.target.value)}
					placeholder="например: 46 или нижняя челюсть справа"
				/>
				{zoneOfferedFromVisit ? (
					<button
						type="button"
						className="document-anamnesis-quick"
						onClick={() => setAnesthesiaZone(zoneOfferedFromVisit)}
					>
						Подставить зону приёма: {zoneOfferedFromVisit}
					</button>
				) : null}
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
