import { AlertTriangle, ShieldAlert } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientResource } from "../../hooks/usePatientResource";
import {
	actionFailureToast,
	type PanelSubject,
	panelStateText,
	resolvePanelPhase,
	unconfirmedActionToast,
} from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
import { PanelLoadFailure } from "../PanelLoadFailure";

/**
 * Отказ чтения здесь дороже, чем в любом другом виджете карточки: пустой ответ
 * даёт `isBlacklisted === false`, то есть экран утверждает «пациент не
 * заблокирован» и предлагает кнопку «Добавить в черный список» человеку,
 * который в списке уже может быть. Администратор по такому экрану запишет на
 * приём того, кому запись запрещена.
 */
const BLACKLIST_SUBJECT: PanelSubject = {
	// Единственное число: «Статус блокировки НЕ ПРОЧИТАН». Раньше согласование
	// дописывал модуль — и для этой панели дало бы «не загружены».
	notLoadedTitle: "Статус блокировки записи не прочитан",
	accusative: "статус блокировки записи",
	emptyTitle: "Пациент не в архиве, запрет записи не установлен",
	emptyHint:
		"Блокировка нужна, когда записывать пациента нельзя: долг, агрессия, отказ от лечения. Она действует во всех клиниках сети.",
	failureConsequence:
		"Не считайте пациента разблокированным по этому экрану: статус не прочитан. Обновите его перед записью на приём.",
};

export interface ArchiveReasonItem {
	id: string;
	organizationId: string;
	reasonName: string;
	isBookingBlocked: boolean;
	allowRebooking: boolean;
	notes?: string | null;
	createdAt: string;
}

export const PatientArchiveAndBlacklistWidget: React.FC<{
	patientId: string;
}> = ({ patientId }) => {
	const { auth, dashboard } = useAppLogicContext();
	const [_selectedReason, _setSelectedReason] = useState<string>("");
	const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
	const [isApplying, setIsApplying] = useState<boolean>(false);
	const [archiveReason, setArchiveReason] = useState<string>("");
	const [modalIsBlacklisted, setModalIsBlacklisted] = useState<boolean>(false);
	const [blacklistReason, setBlacklistReason] = useState<string>("");

	// БЫЛО: ручная загрузка без сброса и без отмены. При переключении
	// пациента виджет продолжал показывать статус предыдущего, а
	// handleApplyStatus считает новое значение как !isBlacklisted и шлёт
	// его ТЕКУЩЕМУ пациенту — то есть чужой показанный статус приводил к
	// блокировке записи не тому человеку.
	const {
		data: reasons,
		isLoading: loading,
		// БЫЛО: отказ чтения из хука не забирался вовсе. Пустой список от
		// упавшего запроса читался как «не заблокирован».
		error: loadFailure,
		failureStatus,
		reload,
	} = usePatientResource<ArchiveReasonItem[]>(
		patientId,
		(id) => `/api/patients/${id}/archive-status`,
		() => (auth ? auth.denteClinicalReadHeaders() : {}),
		[],
	);

	// Оптимистичное значение после успешной записи. Принадлежит конкретному
	// пациенту, поэтому сбрасывается при переключении.
	const [optimisticBlacklist, setOptimisticBlacklist] = useState<
		boolean | null
	>(null);
	useEffect(() => {
		setOptimisticBlacklist(null);
		setConfirmModalOpen(false);
		setArchiveReason("");
		setBlacklistReason("");
		setModalIsBlacklisted(false);
	}, []);

	const patientIdRef = useRef(patientId);
	patientIdRef.current = patientId;

	/*
	 * `false` здесь — значение по умолчанию, а не прочитанный факт. Поэтому
	 * оно имеет право попадать на экран только когда статус действительно
	 * прочитан: при отказе чтения виджет показывает отказ и не даёт кнопку.
	 */
	const isBlacklisted =
		optimisticBlacklist ?? reasons[0]?.isBookingBlocked ?? false;
	const statusPhase = resolvePanelPhase({
		isLoading: loading,
		hasFailure: Boolean(loadFailure),
		isEmpty: reasons.length === 0,
	});
	// Успешная запись даёт факт, которого сервер уже не отменит: после неё
	// прежний отказ чтения статус неизвестным больше не делает.
	const statusUnknown =
		statusPhase === "failed" && optimisticBlacklist === null;

	// Блокировка записи действует на всю сеть клиник, поэтому подтверждение
	// обязано называть пациента поимённо, а не «пациента».
	const patientName =
		(
			dashboard?.patients as
				| Array<{ id: string; fullName?: string }>
				| undefined
		)?.find((p) => p.id === patientId)?.fullName ?? null;

	const handleApplyStatus = async () => {
		if (isApplying || loading) return;
		const targetPatientId = patientId;
		const newStatus = !isBlacklisted;
		setIsApplying(true);

		const endpoint = newStatus
			? `/api/patients/${targetPatientId}/archive`
			: `/api/patients/${targetPatientId}/archive-status`;

		const bodyPayload = newStatus
			? { archiveReason, isBlacklisted: modalIsBlacklisted, blacklistReason }
			: { isBlacklisted: newStatus };

		if (newStatus && !archiveReason.trim()) {
			showToast(actionFailureToast("Укажите причину архивации", 400), "error");
			setIsApplying(false);
			return;
		}

		try {
			const res = await fetch(endpoint, {
				method: "POST",
				headers: auth
					? {
							...auth.denteClinicalMutationHeaders(),
							"Content-Type": "application/json",
						}
					: {
							"Content-Type": "application/json",
						},
				body: JSON.stringify(bodyPayload),
			});
			// БЫЛО: ни .catch, ни проверки res.ok. При отказе сервера кнопка
			// просто ничего не делала — оператор считал, что заблокировал.
			if (!res.ok) {
				showToast(
					actionFailureToast(
						newStatus
							? "Пациент не добавлен в черный список"
							: "Блокировка записи не снята",
						res.status,
					),
					"error",
				);
				return;
			}
			const data = await res
				.json()
				.catch(() => ({}) as Record<string, unknown>);
			if (!(data.success || data.isBlacklisted !== undefined)) {
				showToast(
					unconfirmedActionToast(
						newStatus
							? "Пациент не добавлен в черный список"
							: "Блокировка записи не снята",
					),
					"error",
				);
				return;
			}
			// Пациента могли переключить, пока запрос был в пути: тогда ответ
			// не должен перекрашивать карточку уже другого человека.
			if (patientIdRef.current !== targetPatientId) return;
			setOptimisticBlacklist(newStatus);
			setConfirmModalOpen(false);
			reload();
			showToast(
				newStatus
					? "Пациент добавлен в черный список. Запись на прием заблокирована."
					: "Разблокировано. Пациент восстановлен из черного списка.",
				newStatus ? "warning" : "success",
			);
		} catch (error) {
			console.error("[PatientArchiveAndBlacklistWidget apply error]:", error);
			showToast(
				actionFailureToast(
					newStatus
						? "Пациент не добавлен в черный список"
						: "Блокировка записи не снята",
					null,
				),
				"error",
			);
		} finally {
			setIsApplying(false);
		}
	};

	return (
		<div
			data-testid="patient-archive-blacklist-widget"
			className={`p-4 rounded-xl border my-4 shadow-sm transition-all duration-200 text-slate-900 dark:text-slate-100 ${
				// Красный фон — утверждение «этот пациент заблокирован». При
				// непрочитанном статусе такого утверждения делать нельзя.
				isBlacklisted && !statusUnknown
					? "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800"
					: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
			}`}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<ShieldAlert
						className={`w-5 h-5 ${isBlacklisted && !statusUnknown ? "text-rose-600 dark:text-rose-400" : "text-amber-500"}`}
					/>
					<h3 className="font-semibold text-sm">
						Блокировка записи и черный список
					</h3>
				</div>
				{/*
					Здесь стояла плашка «Специфика IDENT #20» — внутренняя метка
					сверки с конкурентом. Пользователю она не говорит ничего, а
					рядом с кнопкой «Добавить в черный список» ещё и путает.
				*/}
			</div>

			<div className="space-y-3">
				{statusUnknown ? (
					/*
						Отказ чтения вместо кнопки, а не рядом с ней: кнопка
						подписана по значению isBlacklisted, а оно здесь неизвестно.
					*/
					<PanelLoadFailure
						subject={BLACKLIST_SUBJECT}
						status={failureStatus}
						onRetry={reload}
					/>
				) : (
					<>
						<p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed break-words">
							{isBlacklisted
								? "Запись на прием заблокирована во всех клиниках сети. Снимите блокировку, если причина больше не действует."
								: panelStateText(BLACKLIST_SUBJECT, { phase: "empty" }).hint}
						</p>
						<div className="flex items-center space-x-2">
							<button
								type="button"
								onClick={() => {
									setModalIsBlacklisted(true);
									setConfirmModalOpen(true);
								}}
								// Пока статус не загружен, isBlacklisted равен false по
								// умолчанию: нажатие в этот момент предлагало бы «добавить
								// в ЧС» пациента, который в нём уже есть.
								disabled={loading || isApplying}
								title={
									isBlacklisted
										? "Снять блокировку записи"
										: "Заблокировать запись и добавить в ЧС"
								}
								className={`px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
									isBlacklisted
										? "bg-emerald-600 hover:bg-emerald-700 text-white"
										: "bg-rose-600 hover:bg-rose-700 text-white"
								}`}
							>
								{/* На кнопке короткая подпись: полная формулировка состояния
									растягивает кнопку и ломает ряд. */}
								{loading
									? "Читаем статус…"
									: isBlacklisted
										? "Восстановить из черного списка"
										: "Добавить в черный список"}
							</button>
						</div>
					</>
				)}
			</div>

			{confirmModalOpen && (
				<div className="mt-3 p-3 rounded-lg border bg-rose-50 border-rose-200 dark:bg-slate-800 dark:border-rose-800 space-y-2">
					<div className="flex items-center space-x-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
						<AlertTriangle className="w-4 h-4" />
						<span>
							{!isBlacklisted ? "Архивация пациента" : "Подтверждение действия"}
						</span>
					</div>
					<p className="text-xs text-rose-700 dark:text-rose-300">
						{!isBlacklisted
							? `Вы собираетесь отправить в архив: ${patientName ?? "выбранного пациента"}.`
							: `Снять блокировку записи с пациента: ${patientName ?? "выбранный пациент"}?`}
					</p>

					{!isBlacklisted && (
						<div className="space-y-3 mt-2">
							<div>
								<label
									htmlFor="patient-archive-reason"
									className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
								>
									Причина архивации *
								</label>
								<input
									id="patient-archive-reason"
									type="text"
									className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
									value={archiveReason}
									onChange={(e) => setArchiveReason(e.target.value)}
									placeholder="Например: Переезд, дубль..."
								/>
							</div>
							<label className="flex items-center space-x-2 cursor-pointer">
								<input
									type="checkbox"
									className="rounded border-slate-300"
									checked={modalIsBlacklisted}
									onChange={(e) => setModalIsBlacklisted(e.target.checked)}
								/>
								<span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
									Добавить в Черный Список (запрет записи)
								</span>
							</label>
							{modalIsBlacklisted && (
								<div>
									<label
										htmlFor="patient-blacklist-reason"
										className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
									>
										Причина занесения в ЧС
									</label>
									<textarea
										id="patient-blacklist-reason"
										className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
										value={blacklistReason}
										onChange={(e) => setBlacklistReason(e.target.value)}
										placeholder="Например: Агрессивное поведение, долг..."
										rows={2}
									/>
								</div>
							)}
						</div>
					)}
					<div className="flex space-x-2 pt-1">
						<button
							type="button"
							onClick={handleApplyStatus}
							disabled={isApplying}
							title="Подтвердить действие"
							className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
						>
							{isApplying ? "Применяем…" : "Подтвердить"}
						</button>
						<button
							type="button"
							onClick={() => setConfirmModalOpen(false)}
							title="Отмена действия"
							className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-slate-200 text-xs transition-colors"
						>
							Отмена
						</button>
					</div>
				</div>
			)}
		</div>
	);
};
