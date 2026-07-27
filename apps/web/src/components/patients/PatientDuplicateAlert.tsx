/**
 * Предупреждение о второй карточке того же человека — внутри открытой карточки.
 *
 * ЗАЧЕМ ИМЕННО ЗДЕСЬ. Список дублей по всей картотеке разбирают раз в месяц, а
 * вред от дубля возникает в тот момент, когда администратор работает с
 * карточкой: он видит «долгов нет» и «снимков нет», потому что и долг, и снимки
 * лежат во второй карточке того же человека. Поэтому предупреждение должно
 * стоять там, где принимается решение, а не только в разделе обслуживания базы.
 *
 * МОЛЧИТ, КОГДА НЕЧЕГО СКАЗАТЬ. Если дублей нет — не рендерится ничего: ни
 * заголовка, ни зелёной надписи «дублей не найдено». Строка «всё хорошо» в
 * карточке каждого пациента — это шум, который приучает не читать сообщения.
 *
 * ОБЪЕДИНЯЕТ В ОТКРЫТУЮ КАРТОЧКУ. Действие названо прямо: «Перенести сюда». Так
 * человеку понятно, что останется именно та карточка, которую он смотрит.
 * Обратный выбор — открыть вторую карточку и нажать там; для этого есть ссылка.
 */

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientStore } from "../../store/patientStore";
import {
	DOUBTFUL_BELOW,
	type DuplicateCandidate,
	dismissDuplicatePair,
	duplicatePairKey,
	fetchDuplicatesForPatient,
	mergeDuplicatePair,
	otherSideOf
} from "../../lib/patientDuplicatesApi";

function formatBirthDate(value: string | null): string {
	if (!value) return "дата рождения не указана";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString("ru-RU");
}

export const PatientDuplicateAlert: React.FC<{ patientId: string }> = ({ patientId }) => {
	const appLogic = useAppLogicContext();
	const { setSelectedPatientId } = usePatientStore();
	const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
	const [notice, setNotice] = useState<string | null>(null);
	const [busyKey, setBusyKey] = useState<string | null>(null);
	const [confirmKey, setConfirmKey] = useState<string | null>(null);

	const auth = appLogic?.auth;

	const load = useCallback(async () => {
		try {
			const headers = auth ? auth.denteClinicalReadHeaders() : {};
			setCandidates(await fetchDuplicatesForPatient(patientId, headers));
		} catch {
			// Молча: это подсказка, а не основная работа карточки. Красная плашка
			// «не удалось проверить дубли» поверх приёма мешала бы лечить.
			setCandidates([]);
		}
	}, [patientId, auth]);

	useEffect(() => {
		void load();
	}, [load]);

	async function merge(candidate: DuplicateCandidate) {
		const key = duplicatePairKey(candidate);
		setBusyKey(key);
		try {
			const other = otherSideOf(candidate, patientId);
			const headers = auth ? auth.denteClinicalMutationHeaders() : {};
			const result = await mergeDuplicatePair(
				{ keepPatientId: patientId, mergePatientId: other.patientId, reason: "Объединено из карточки пациента" },
				headers
			);
			setNotice(result.summary);
			setConfirmKey(null);
			await load();
		} catch (error) {
			setNotice(error instanceof Error ? error.message : String(error));
		} finally {
			setBusyKey(null);
		}
	}

	async function dismiss(candidate: DuplicateCandidate) {
		const key = duplicatePairKey(candidate);
		setBusyKey(key);
		try {
			const headers = auth ? auth.denteClinicalMutationHeaders() : {};
			const result = await dismissDuplicatePair(
				{
					leftPatientId: candidate.leftPatientId,
					rightPatientId: candidate.rightPatientId,
					reason: "Отмечено из карточки пациента"
				},
				headers
			);
			setNotice(result.message);
			await load();
		} catch (error) {
			setNotice(error instanceof Error ? error.message : String(error));
		} finally {
			setBusyKey(null);
		}
	}

	// Нечего сказать — ничего и не занимаем. Сообщение после слияния показываем
	// ещё один раз: администратор должен увидеть, что произошло.
	if (candidates.length === 0) {
		return notice ? (
			<p className="patient-duplicate-alert patient-duplicate-alert--done" role="status">
				{notice}
			</p>
		) : null;
	}

	return (
		<section className="patient-duplicate-alert" data-testid="patient-duplicate-alert" aria-label="Возможный дубль карточки">
			<p className="patient-duplicate-alert__lead">
				{candidates.length === 1
					? "Похоже, у этого пациента есть вторая карточка."
					: `Похоже, у этого пациента есть ещё карточки: ${candidates.length}.`}{" "}
				Пока карточки не объединены, приёмы, оплаты и снимки разложены по разным местам, и долг не виден целиком.
			</p>

			{notice ? (
				<p className="patient-duplicate-alert__notice" role="status" aria-live="polite">
					{notice}
				</p>
			) : null}

			<ul className="patient-duplicate-alert__list">
				{candidates.map((candidate) => {
					const key = duplicatePairKey(candidate);
					const other = otherSideOf(candidate, patientId);
					const doubtful = candidate.confidence < DOUBTFUL_BELOW;
					const busy = busyKey === key;

					return (
						<li key={key} className="patient-duplicate-alert__item">
							<div className="patient-duplicate-alert__who">
								<span className="patient-duplicate-alert__name">{other.fullName}</span>
								<span className="patient-duplicate-alert__facts">
									{formatBirthDate(other.birthDate)} · {other.phone ?? "телефон не указан"}
								</span>
								<span className={`ops-state ops-state--${doubtful ? "warn" : "ok"}`}>
									{Math.round(candidate.confidence * 100)} % совпадения
								</span>
								<span className="patient-duplicate-alert__why">{candidate.explanation}</span>
								{candidate.caution ? (
									<span className="patient-duplicate-alert__why">
										<strong>Осторожно:</strong> {candidate.caution}
									</span>
								) : null}
							</div>

							<div className="patient-duplicate-alert__actions">
								{confirmKey === key ? (
									<>
										<span className="patient-duplicate-alert__why">
											Останется открытая карточка. Записи, оплаты и снимки из «{other.fullName}» перенесутся сюда,
											вторая карточка сохранится как архивная ссылка.
										</span>
										<button className="primary-button" type="button" disabled={busy} onClick={() => void merge(candidate)}>
											{busy ? "Перенос…" : "Подтвердить перенос"}
										</button>
										<button className="secondary-button" type="button" onClick={() => setConfirmKey(null)}>
											Отмена
										</button>
									</>
								) : (
									<>
										<button
											className="secondary-button"
											type="button"
											disabled={busy}
											onClick={() => setConfirmKey(key)}
										>
											Перенести сюда
										</button>
										{/* Открыть вторую карточку — чтобы сверить глазами и, если нужно,
										    объединить в обратную сторону оттуда. */}
										<button
											className="secondary-button"
											type="button"
											onClick={() => setSelectedPatientId(other.patientId)}
										>
											Открыть вторую
										</button>
										<button className="secondary-button" type="button" disabled={busy} onClick={() => void dismiss(candidate)}>
											Это разные люди
										</button>
									</>
								)}
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
};

export default PatientDuplicateAlert;
