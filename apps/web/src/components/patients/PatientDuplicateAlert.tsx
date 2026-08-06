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
 * ОБЪЕДИНЯЕТ В ОТКРЫТУЮ КАРТОЧКУ. Действие названо прямым глаголом. Так
 * человеку понятно, что останется именно та карточка, которую он смотрит.
 * Обратный выбор — открыть вторую карточку и нажать там; для этого есть ссылка.
 */

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	DOUBTFUL_BELOW,
	type DuplicateCandidate,
	dismissDuplicatePair,
	duplicatePairKey,
	fetchDuplicatesForPatient,
	mergeDuplicatePair,
	otherSideOf,
} from "../../lib/patientDuplicatesApi";
import { usePatientStore } from "../../store/patientStore";

function formatBirthDate(value: string | null): string {
	if (!value) return "дата рождения не указана";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString("ru-RU");
}

export const PatientDuplicateAlert: React.FC<{ patientId: string }> = ({
	patientId,
}) => {
	const appLogic = useAppLogicContext();
	const { setSelectedPatientId } = usePatientStore();
	const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
	const [notice, setNotice] = useState<string | null>(null);
	const [busyKey, setBusyKey] = useState<string | null>(null);
	const [confirmKey, setConfirmKey] = useState<string | null>(null);

	const auth = appLogic?.auth;

	// Кто открыт прямо сейчас. Нужен, чтобы ответ по прежнему пациенту не осел на
	// карточке следующего: запросы возвращаются не в том порядке, в каком уходили.
	const patientIdRef = useRef(patientId);
	patientIdRef.current = patientId;

	const load = useCallback(async () => {
		const requestedPatientId = patientId;
		try {
			const headers = auth ? auth.denteClinicalReadHeaders() : {};
			const fresh = await fetchDuplicatesForPatient(
				requestedPatientId,
				headers,
			);
			/*
			 * БЫЛО: результат ставился без этой проверки. Пока список дублей
			 * Иванова был в пути, администратор успевал открыть карточку Петровой —
			 * и дубли Иванова показывались как дубли Петровой. Кнопка «Перенести
			 * сюда» рядом с ними сливает ОТКРЫТУЮ карточку с показанной:
			 * keepPatientId берётся текущий, mergePatientId — из показанной пары.
			 * То есть по чужому списку объединялись две карточки разных людей, а
			 * это перенос приёмов, оплат и снимков, который вручную не разбирается.
			 */
			if (patientIdRef.current !== requestedPatientId) return;
			setCandidates(fresh);
		} catch {
			// Молча: это подсказка, а не основная работа карточки. Красная плашка
			// «не удалось проверить дубли» поверх приёма мешала бы лечить.
			if (patientIdRef.current !== requestedPatientId) return;
			setCandidates([]);
		}
	}, [patientId, auth]);

	useEffect(() => {
		void load();
	}, [load]);

	/*
	 * БЫЛО: при переключении карточки сбрасывался только список дублей, и то
	 * лишь когда приходил новый ответ. Сообщение о результате и, главное,
	 * открытое подтверждение переноса оставались от прежнего пациента.
	 *
	 * Чем это опасно. `confirmKey` — ключ ПАРЫ, а пара у двух карточек одного
	 * человека одна и та же. Администратор нажимал «Перенести сюда» на карточке
	 * Иванова (останется Иванов), не подтверждал, открывал вторую карточку того же
	 * человека — и там уже стояло раскрытое подтверждение с кнопкой «Подтвердить
	 * перенос», но теперь оно оставляло ВТОРУЮ карточку и поглощало первую, то
	 * есть выполняло обратное тому, что человек подтверждал. Слияние карточек
	 * обратно не разбирается.
	 *
	 * Заодно уходит сообщение вида «Объединено: перенесено 3 приёма», которое
	 * висело на карточке уже другого пациента как отчёт о его слиянии.
	 */
	const [shownPatientId, setShownPatientId] = useState(patientId);
	if (shownPatientId !== patientId) {
		setShownPatientId(patientId);
		setCandidates([]);
		setNotice(null);
		setConfirmKey(null);
		setBusyKey(null);
	}

	async function merge(candidate: DuplicateCandidate) {
		const key = duplicatePairKey(candidate);
		// Кого сливаем — решено ДО ожидания ответа, дальше это не пересчитывается.
		const keepPatientId = patientId;
		setBusyKey(key);
		try {
			const other = otherSideOf(candidate, keepPatientId);
			const headers = auth ? auth.denteClinicalMutationHeaders() : {};
			const result = await mergeDuplicatePair(
				{
					keepPatientId,
					mergePatientId: other.patientId,
					reason: "Объединено из карточки пациента",
				},
				headers,
			);
			// Отчёт о слиянии принадлежит той карточке, из которой его запустили.
			// Без этой проверки он появлялся на карточке уже другого пациента.
			if (patientIdRef.current !== keepPatientId) return;
			setNotice(result.summary);
			setConfirmKey(null);
			await load();
		} catch (error) {
			if (patientIdRef.current !== keepPatientId) return;
			setNotice(error instanceof Error ? error.message : String(error));
		} finally {
			setBusyKey(null);
		}
	}

	async function dismiss(candidate: DuplicateCandidate) {
		const key = duplicatePairKey(candidate);
		const decidedOnPatientId = patientId;
		setBusyKey(key);
		try {
			const headers = auth ? auth.denteClinicalMutationHeaders() : {};
			const result = await dismissDuplicatePair(
				{
					leftPatientId: candidate.leftPatientId,
					rightPatientId: candidate.rightPatientId,
					reason: "Отмечено из карточки пациента",
				},
				headers,
			);
			// Тот же случай: ответ по чужой карточке на ней и остаётся.
			if (patientIdRef.current !== decidedOnPatientId) return;
			setNotice(result.message);
			await load();
		} catch (error) {
			if (patientIdRef.current !== decidedOnPatientId) return;
			setNotice(error instanceof Error ? error.message : String(error));
		} finally {
			setBusyKey(null);
		}
	}

	// Нечего сказать — ничего и не занимаем. Сообщение после слияния показываем
	// ещё один раз: администратор должен увидеть, что произошло.
	if (candidates.length === 0) {
		return notice ? (
			<p
				className="patient-duplicate-alert patient-duplicate-alert--done"
				role="status"
			>
				{notice}
			</p>
		) : null;
	}

	return (
		<section
			className="patient-duplicate-alert"
			data-testid="patient-duplicate-alert"
			aria-label="Возможный дубль карточки"
		>
			<p className="patient-duplicate-alert__lead">
				{candidates.length === 1
					? "Похоже, у этого пациента есть вторая карточка."
					: `Похоже, у этого пациента есть ещё карточки: ${candidates.length}.`}{" "}
				Пока карточки не объединены, приёмы, оплаты и снимки разложены по разным
				местам, и долг не виден целиком.
			</p>

			{notice ? (
				<p
					className="patient-duplicate-alert__notice"
					role="status"
					aria-live="polite"
				>
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
								<span className="patient-duplicate-alert__name">
									{other.fullName}
								</span>
								<span className="patient-duplicate-alert__facts">
									{formatBirthDate(other.birthDate)} ·{" "}
									{other.phone ?? "телефон не указан"}
								</span>
								<span
									className={`ops-state ops-state--${doubtful ? "warn" : "ok"}`}
								>
									{Math.round(candidate.confidence * 100)} % совпадения
								</span>
								<span className="patient-duplicate-alert__why">
									{candidate.explanation}
								</span>
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
											Останется открытая карточка. Записи, оплаты и снимки из «
											{other.fullName}» перенесутся сюда, вторая карточка
											сохранится как архивная ссылка.
										</span>
										<button
											className="primary-button"
											type="button"
											disabled={busy}
											onClick={() => void merge(candidate)}
										>
											{busy ? "Перенос…" : "Подтвердить перенос"}
										</button>
										<button
											className="secondary-button"
											type="button"
											onClick={() => setConfirmKey(null)}
										>
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
											{/* У сомнительной пары название говорит о риске: рядом стоит
												    предупреждение «объединять нельзя без проверки», а кнопка
												    выглядела так же, как у пары с 95 % совпадения. Замечено
												    на снимке экрана. */}
											{doubtful ? "Всё равно перенести сюда" : "Перенести сюда"}
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
										<button
											className="secondary-button"
											type="button"
											disabled={busy}
											onClick={() => void dismiss(candidate)}
										>
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
