/**
 * PatientDuplicateAlert.tsx — Оповещение и слияние потенциальных дубликатов карт пациентов (Фича №35, Мандат 8b).
 * Монолитный модуль в Sweet Spot (200-300 строк), консолидирующий типы, компонент строки кандидата и хук слияния.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast } from "../../lib/panelStateText";
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
import { showToast } from "../GlobalToast";

// ─── 1. УТИЛИТЫ И ХУК УПРАВЛЕНИЯ ДУБЛИКАТАМИ ─────────────────────────────────

function formatBirthDate(value: string | null): string {
	if (!value) return "дата рождения не указана";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString("ru-RU");
}

export function useDuplicateAlertLogic(patientId: string) {
	const appLogic = useAppLogicContext();
	const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
	const [notice, setNotice] = useState<string | null>(null);
	const [busyKey, setBusyKey] = useState<string | null>(null);
	const [confirmKey, setConfirmKey] = useState<string | null>(null);

	const auth = appLogic?.auth;
	const patientIdRef = useRef(patientId);
	patientIdRef.current = patientId;

	const load = useCallback(async () => {
		const reqId = patientId;
		try {
			const headers = auth ? auth.denteClinicalReadHeaders() : {};
			const fresh = await fetchDuplicatesForPatient(reqId, headers);
			if (patientIdRef.current !== reqId) return;
			setCandidates(fresh);
		} catch {
			if (patientIdRef.current !== reqId) return;
			setCandidates([]);
		}
	}, [patientId, auth]);

	useEffect(() => {
		void load();
	}, [load]);

	const [prevPatientId, setPrevPatientId] = useState(patientId);
	if (patientId !== prevPatientId) {
		setPrevPatientId(patientId);
		setCandidates([]);
		setNotice(null);
		setConfirmKey(null);
		setBusyKey(null);
	}

	async function merge(candidate: DuplicateCandidate) {
		const key = duplicatePairKey(candidate);
		const keepPatientId = patientId;
		setBusyKey(key);
		try {
			const other = otherSideOf(candidate, keepPatientId);
			const headers = auth ? auth.denteClinicalMutationHeaders() : {};
			const result = await mergeDuplicatePair(
				{ keepPatientId, mergePatientId: other.patientId, reason: "Объединено из карточки пациента" },
				headers,
			);
			if (patientIdRef.current !== keepPatientId) return;
			setNotice(result.summary);
			setConfirmKey(null);
			await load();
		} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
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
				{ leftPatientId: candidate.leftPatientId, rightPatientId: candidate.rightPatientId, reason: "Отмечено из карточки пациента" },
				headers,
			);
			if (patientIdRef.current !== decidedOnPatientId) return;
			setNotice(result.message);
			await load();
		} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
			if (patientIdRef.current !== decidedOnPatientId) return;
			setNotice(error instanceof Error ? error.message : String(error));
		} finally {
			setBusyKey(null);
		}
	}

	return {
		candidates,
		notice,
		busyKey,
		confirmKey,
		setConfirmKey,
		merge,
		dismiss,
	};
}

// ─── 2. СТРОКА КАНДИДАТА В ДУБЛИКАТЫ ──────────────────────────────────────────

export interface DuplicateCandidateItemProps {
	readonly candidate: DuplicateCandidate;
	readonly patientId: string;
	readonly busy: boolean;
	readonly isConfirming: boolean;
	readonly onStartConfirm: (key: string) => void;
	readonly onCancelConfirm: () => void;
	readonly onMerge: (candidate: DuplicateCandidate) => Promise<void>;
	readonly onDismiss: (candidate: DuplicateCandidate) => Promise<void>;
}

export const DuplicateCandidateItem: React.FC<DuplicateCandidateItemProps> = React.memo(({
	candidate,
	patientId,
	busy,
	isConfirming,
	onStartConfirm,
	onCancelConfirm,
	onMerge,
	onDismiss,
}) => {
	const { setSelectedPatientId } = usePatientStore();
	const key = duplicatePairKey(candidate);
	const other = otherSideOf(candidate, patientId);
	const doubtful = candidate.confidence < DOUBTFUL_BELOW;

	return (
		<li className="patient-duplicate-alert__item">
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
				{isConfirming ? (
					<>
						<span className="patient-duplicate-alert__why">
							Останется открытая карточка. Записи, оплаты и снимки из «{other.fullName}» перенесутся сюда, вторая карточка сохранится как архивная ссылка.
						</span>
						<button className="primary-button" type="button" disabled={busy} onClick={() => void onMerge(candidate)}>
							{busy ? "Перенос…" : "Подтвердить перенос"}
						</button>
						<button className="secondary-button" type="button" onClick={onCancelConfirm}>
							Отмена
						</button>
					</>
				) : (
					<>
						<button className="secondary-button" type="button" disabled={busy} onClick={() => onStartConfirm(key)}>
							{doubtful ? "Всё равно перенести сюда" : "Перенести сюда"}
						</button>
						<button className="secondary-button" type="button" onClick={() => setSelectedPatientId(other.patientId)}>
							Открыть вторую
						</button>
						<button className="secondary-button" type="button" disabled={busy} onClick={() => void onDismiss(candidate)}>
							Это разные люди
						</button>
					</>
				)}
			</div>
		</li>
	);
});

DuplicateCandidateItem.displayName = "DuplicateCandidateItem";

// ─── 3. ОСНОВНОЙ КОМПОНЕНТ ОПОВЕЩЕНИЯ ─────────────────────────────────────────

export const PatientDuplicateAlert: React.FC<{ patientId: string }> = ({
	patientId,
}) => {
	const {
		candidates,
		notice,
		busyKey,
		confirmKey,
		setConfirmKey,
		merge,
		dismiss,
	} = useDuplicateAlertLogic(patientId);

	if ((candidates || []).length === 0) {
		return notice ? (
			<p className="patient-duplicate-alert patient-duplicate-alert--done" role="status">
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
				{(candidates || []).length === 1
					? "Похоже, у этого пациента есть ещё одна карточка:"
					: `Похоже, у этого пациента есть ещё карточки: ${(candidates || []).length}.`}{" "}
				Пока карточки не объединены, приёмы, оплаты и снимки разложены по разным
				местам, и долг не виден целиком.
			</p>

			{notice ? (
				<p className="patient-duplicate-alert__notice" role="status" aria-live="polite">
					{notice}
				</p>
			) : null}

			<ul className="patient-duplicate-alert__list">
				{candidates.map((candidate) => {
					const key = duplicatePairKey(candidate);
					return (
						<DuplicateCandidateItem
							key={key}
							candidate={candidate}
							patientId={patientId}
							busy={busyKey === key}
							isConfirming={confirmKey === key}
							onStartConfirm={setConfirmKey}
							onCancelConfirm={() => setConfirmKey(null)}
							onMerge={merge}
							onDismiss={dismiss}
						/>
					);
				})}
			</ul>
		</section>
	);
};

export default PatientDuplicateAlert;
