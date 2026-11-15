/**
 * PatientReclamationsHistoryTab.tsx — Журнал рекламаций, осложнений и гарантийных случаев пациента (Мандат 8aq, 8e, 8am).
 * Сквозное монтирование бэкенда /api/patients/:patientId/reclamations в карточку пациента.
 */

import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, FileText, Plus, RefreshCw, ShieldAlert, ShieldCheck, Sparkles, X } from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";

export interface PatientReclamationRecord {
	readonly id: string;
	readonly patientId: string;
	readonly doctorId: string | null;
	readonly complicationDetails: string;
	readonly proposedAction: string | null;
	readonly status: "under_review" | "resolved" | string;
	readonly resolvedAt: string | null;
	readonly createdAt: string;
}

export interface PatientReclamationsHistoryTabProps {
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly doctorId?: string | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly onOpenWarrantyPassport?: (() => void) | undefined;
}

export const PatientReclamationsHistoryTab: React.FC<PatientReclamationsHistoryTabProps> = React.memo(
	function PatientReclamationsHistoryTab({
		patientId,
		patientName = "Пациент",
		doctorId,
		doctorName,
		onOpenWarrantyPassport,
	}) {
		const [reclamations, setReclamations] = useState<PatientReclamationRecord[]>([]);
		const [isLoading, setIsLoading] = useState<boolean>(false);
		const [loadError, setLoadError] = useState<string | null>(null);

		const [isCreateFormOpen, setIsCreateFormOpen] = useState<boolean>(false);
		const [complicationDetails, setComplicationDetails] = useState<string>("");
		const [proposedAction, setProposedAction] = useState<string>("Гарантийная переделка (0 ₽)");
		const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

		const fetchReclamations = useCallback(async () => {
			if (!patientId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) {
				setReclamations([]);
				return;
			}
			setIsLoading(true);
			setLoadError(null);
			try {
				const response = await fetch(`/api/patients/${encodeURIComponent(patientId)}/reclamations`, {
					method: "GET",
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!response.ok) {
					const errorData = await response.json().catch(() => null) as { message?: string } | null;
					throw new Error(errorData?.message || `Сервер ответил статусом ${response.status}`);
				}
				const data = (await response.json()) as PatientReclamationRecord[];
				setReclamations(Array.isArray(data) ? data : []);
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : "Не удалось загрузить рекламации пациента";
				setLoadError(message);
			} finally {
				setIsLoading(false);
			}
		}, [patientId]);

		useEffect(() => {
			void fetchReclamations();
		}, [fetchReclamations]);

		const handleCreateReclamation = async (e: React.FormEvent) => {
			e.preventDefault();
			if (!patientId) {
				showToast("Не выбран пациент для создания рекламации", "error", 4000);
				return;
			}
			const trimmedDetails = complicationDetails.trim();
			if (!trimmedDetails) {
				showToast("Опишите суть клинического осложнения или жалобы пациента", "error", 4000);
				return;
			}

			// Проверяем валидность doctorId для бэкенда PostgreSQL 18
			const effectiveDoctorId = (doctorId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doctorId))
				? doctorId
				: "00000000-0000-0000-0000-000000000001"; // Fallback канонического врача клиники

			setIsSubmitting(true);
			try {
				const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/reclamations`, {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({
						complicationDetails: trimmedDetails,
						proposedAction: proposedAction.trim() || null,
						doctorId: effectiveDoctorId,
					}),
				});

				if (!res.ok) {
					const errorJson = await res.json().catch(() => null) as { message?: string } | null;
					throw new Error(errorJson?.message || `Ошибка сохранения (${res.status})`);
				}

				const created = (await res.json()) as PatientReclamationRecord;
				setReclamations((prev) => [created, ...prev]);
				setComplicationDetails("");
				setProposedAction("Гарантийная переделка (0 ₽)");
				setIsCreateFormOpen(false);
				showToast("Рекламация успешно зафиксирована в медицинской карте", "success", 4000);
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : "Ошибка при сохранении рекламации";
				showToast(message, "error", 5000);
			} finally {
				setIsSubmitting(false);
			}
		};

		const handleOpenWarranty = () => {
			if (onOpenWarrantyPassport) {
				onOpenWarrantyPassport();
			} else if (typeof window !== "undefined") {
				window.location.hash = "#warranty-passport";
			}
		};

		const underReviewCount = reclamations.filter((r) => r.status === "under_review").length;
		const resolvedCount = reclamations.filter((r) => r.status === "resolved").length;

		return (
			<div
				className="flex flex-col gap-4 p-3.5 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs text-[var(--ink)]"
				data-testid="patient-reclamations-history-tab"
			>
				{/* Шапка раздела рекламаций */}
				<div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap pb-3 border-b border-[var(--line)]">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
							<ShieldAlert className="w-5 h-5" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h3 className="text-sm sm:text-base font-bold text-[var(--ink)] m-0 leading-tight">
									Рекламации, осложнения и гарантия клиники
								</h3>
								{reclamations.length > 0 && (
									<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
										Всего: {reclamations.length}
									</span>
								)}
							</div>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
								Официальный клинический реестр претензий по качеству и гарантийных переделок (ст. 29 ЗоЗПП)
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0 flex-wrap">
						<button
							type="button"
							onClick={handleOpenWarranty}
							className="h-8 px-2.5 sm:px-3 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px] sm:min-h-0 shadow-2xs"
							title="Открыть студию Гарантийного паспорта и актов переделки"
						>
							<Sparkles size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Гарантийный паспорт</span>
						</button>

						{!isCreateFormOpen && (
							<button
								type="button"
								onClick={() => setIsCreateFormOpen(true)}
								className="h-8 px-2.5 sm:px-3 text-xs font-semibold rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px] sm:min-h-0"
								title="Зафиксировать новое клиническое осложнение или жалобу пациента"
							>
								<Plus size={14} className="shrink-0" />
								<span>Зафиксировать претензию</span>
							</button>
						)}

						<button
							type="button"
							onClick={() => void fetchReclamations()}
							disabled={isLoading}
							className="w-8 h-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer min-h-[44px] sm:min-h-0"
							title="Обновить список рекламаций"
							aria-label="Обновить"
						>
							<RefreshCw size={14} className={`shrink-0 ${isLoading ? "animate-spin text-teal-600" : ""}`} />
						</button>
					</div>
				</div>

				{/* Панель со сводкой статусов */}
				{reclamations.length > 0 && (
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
						<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-0.5">
							<span className="text-[11px] font-semibold text-[var(--muted)]">На рассмотрении</span>
							<div className="flex items-center gap-1.5">
								<AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
								<span className="text-sm font-black text-[var(--ink)]">{underReviewCount}</span>
							</div>
						</div>
						<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-0.5">
							<span className="text-[11px] font-semibold text-[var(--muted)]">Урегулировано (0 ₽)</span>
							<div className="flex items-center gap-1.5">
								<CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
								<span className="text-sm font-black text-[var(--ink)]">{resolvedCount}</span>
							</div>
						</div>
						<div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-0.5">
							<span className="text-[11px] font-semibold text-[var(--muted)]">Лечащий врач</span>
							<span className="text-xs font-bold text-[var(--ink)] truncate" title={doctorName || "Врач клиники"}>
								{doctorName || "Врач клиники"}
							</span>
						</div>
					</div>
				)}

				{/* Форма быстрой фиксации рекламации */}
				{isCreateFormOpen && (
					<form
						onSubmit={(e) => void handleCreateReclamation(e)}
						className="p-3.5 sm:p-4 rounded-xl bg-[var(--paper-soft)] border border-amber-500/40 shadow-xs flex flex-col gap-3 animate-in fade-in duration-150"
					>
						<div className="flex items-center justify-between gap-2">
							<div className="flex items-center gap-2">
								<ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
								<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0">
									Новая запись в реестр рекламаций и осложнений
								</h4>
							</div>
							<button
								type="button"
								onClick={() => setIsCreateFormOpen(false)}
								className="text-[var(--muted)] hover:text-[var(--ink)] p-1 rounded-md transition-colors"
								aria-label="Закрыть форму"
							>
								<X size={16} />
							</button>
						</div>

						<div className="flex flex-col gap-1.5">
							<label htmlFor="reclamation-details-field" className="text-xs font-semibold text-[var(--ink)]">
								Суть клинического осложнения или претензии пациента: <span className="text-rose-500">*</span>
							</label>
							<textarea
								id="reclamation-details-field"
								value={complicationDetails}
								onChange={(e) => setComplicationDetails(e.target.value)}
								placeholder="Например: Выпадение пломбы на зубе 1.6 через 4 месяца после лечения. Скол керамики на коронке 2.4."
								rows={3}
								required
								className="w-full p-2.5 text-xs sm:text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-colors resize-y min-h-[70px]"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<label htmlFor="reclamation-action-field" className="text-xs font-semibold text-[var(--ink)]">
								Предложенное клиническое действие или гарантийное решение:
							</label>
							<input
								id="reclamation-action-field"
								type="text"
								value={proposedAction}
								onChange={(e) => setProposedAction(e.target.value)}
								placeholder="Например: Гарантийная переделка (0 ₽) по ст. 29 ЗоЗПП, повторная фиксация пломбы"
								className="w-full h-9 px-2.5 text-xs sm:text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-colors min-h-[36px]"
							/>
						</div>

						<div className="flex items-center justify-end gap-2 pt-1">
							<button
								type="button"
								onClick={() => setIsCreateFormOpen(false)}
								className="h-9 px-3 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] min-h-[36px] cursor-pointer"
							>
								Отмена
							</button>
							<button
								type="submit"
								disabled={isSubmitting}
								className="h-9 px-4 text-xs font-bold rounded-lg bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white shadow-xs min-h-[36px] flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
							>
								{isSubmitting ? (
									<>
										<RefreshCw size={13} className="animate-spin shrink-0" />
										<span>Сохранение...</span>
									</>
								) : (
									<>
										<CheckCircle2 size={14} className="shrink-0" />
										<span>Зафиксировать в карту</span>
									</>
								)}
							</button>
						</div>
					</form>
				)}

				{/* Ошибка загрузки с кнопкой повтора */}
				{loadError && (
					<div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-950 dark:text-rose-100 flex items-center justify-between gap-3">
						<div className="flex items-center gap-2 min-w-0">
							<AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
							<span className="text-xs font-medium">{loadError}</span>
						</div>
						<button
							type="button"
							onClick={() => void fetchReclamations()}
							className="px-2.5 py-1 text-xs font-bold rounded-lg border border-rose-500/40 bg-[var(--paper)] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0 cursor-pointer"
						>
							Повторить
						</button>
					</div>
				)}

				{/* Индикатор загрузки */}
				{isLoading && reclamations.length === 0 && (
					<div className="py-8 flex flex-col items-center justify-center gap-2 text-[var(--muted)]">
						<RefreshCw size={24} className="animate-spin text-teal-600" />
						<span className="text-xs">Загрузка истории рекламаций пациента...</span>
					</div>
				)}

				{/* Пустой стейт: претензий нет */}
				{!isLoading && !loadError && reclamations.length === 0 && (
					<div className="py-8 px-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-center flex flex-col items-center gap-2.5">
						<div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
							<ShieldCheck size={24} />
						</div>
						<h4 className="text-sm font-bold text-[var(--ink)] m-0">
							Претензий и рекламаций по качеству не зафиксировано
						</h4>
						<p className="text-xs text-[var(--muted)] max-w-md m-0 leading-relaxed">
							Все выполненные клинические работы находятся на штатной гарантии клиники (ст. 29 ЗоЗПП). Пациент {patientName} не предъявлял претензий по качеству лечения.
						</p>
						<button
							type="button"
							onClick={() => setIsCreateFormOpen(true)}
							className="mt-1 h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] text-[var(--ink)] inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
						>
							<Plus size={14} className="shrink-0 text-amber-600" />
							<span>Зафиксировать обращение по гарантии</span>
						</button>
					</div>
				)}

				{/* Список рекламаций */}
				{reclamations.length > 0 && (
					<div className="flex flex-col gap-2.5">
						{reclamations.map((rec) => {
							const isResolved = rec.status === "resolved";
							const formattedDate = rec.createdAt
								? new Date(rec.createdAt).toLocaleDateString("ru-RU", {
										day: "2-digit",
										month: "short",
										year: "numeric",
										hour: "2-digit",
										minute: "2-digit",
									})
								: "Дата не указана";

							return (
								<div
									key={rec.id}
									className={`p-3.5 rounded-xl border transition-all ${
										isResolved
											? "bg-[var(--paper)] border-[var(--line)] opacity-90"
											: "bg-amber-500/5 dark:bg-amber-950/10 border-amber-500/30 shadow-2xs"
									}`}
								>
									<div className="flex items-start justify-between gap-2.5 flex-wrap sm:flex-nowrap">
										<div className="flex items-start gap-2.5 min-w-0 flex-1">
											{isResolved ? (
												<CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
											) : (
												<AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
											)}
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2 flex-wrap">
													<span className="text-xs font-bold text-[var(--ink)]">
														{formattedDate}
													</span>
													<span
														className={`text-[10.5px] font-bold px-2 py-0.2 rounded-full border ${
															isResolved
																? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
																: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40"
														}`}
													>
														{isResolved ? "Урегулировано" : "На рассмотрении"}
													</span>
												</div>

												<p className="text-xs sm:text-sm text-[var(--ink)] mt-1.5 m-0 font-medium leading-relaxed">
													{rec.complicationDetails}
												</p>

												{rec.proposedAction && (
													<div className="mt-2 text-xs flex items-center gap-1.5 text-[var(--muted)] bg-[var(--paper-soft)] px-2.5 py-1.5 rounded-lg border border-[var(--line)]">
														<FileText size={13} className="shrink-0 text-teal-600 dark:text-teal-400" />
														<span>
															<strong>Решение:</strong> {rec.proposedAction}
														</span>
													</div>
												)}
											</div>
										</div>

										<div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
											<button
												type="button"
												onClick={handleOpenWarranty}
												className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-colors"
												title="Открыть акт гарантийной переделки 0 ₽"
											>
												<Sparkles size={12} className="text-teal-600" />
												<span>Акт (0 ₽)</span>
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		);
	},
);

PatientReclamationsHistoryTab.displayName = "PatientReclamationsHistoryTab";
