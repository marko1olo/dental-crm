import type { Appointment } from "@dental/shared";
import { evaluateAppointmentLabStatus, getVitaShadeHex } from "@dental/shared";
import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	ExternalLink,
	FlaskConical,
	Clock,
} from "lucide-react";
import React from "react";
import { useAppStore } from "../../store/appStore";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	extractTeethList,
	resolveAppointmentLabStatus,
} from "./appointmentCardHelpers";

export interface AppointmentModalLabSectionProps {
	appointment: Appointment;
	activeLabOrders?: any[];
	startsAtLocal?: string;
	setStartsAtLocal?: (val: string) => void;
	setEndsAtLocal?: (val: string) => void;
	onClose?: () => void;
}

interface NormalizedLabItem {
	id: string;
	orderNumber: string;
	statusInfo: NonNullable<ReturnType<typeof evaluateAppointmentLabStatus>>;
	construction: string;
	toothFdi: string | null;
	colorVita: string | null;
	dueDateIso: string | null;
}

export function AppointmentModalLabSection({
	appointment,
	activeLabOrders = [],
	startsAtLocal,
	setStartsAtLocal,
	setEndsAtLocal,
	onClose,
}: AppointmentModalLabSectionProps) {
	const referenceDate = startsAtLocal ? new Date(startsAtLocal) : new Date();

	// 1. Извлекаем наряды из переданного массива activeLabOrders
	const items: NormalizedLabItem[] = [];

	if (Array.isArray(activeLabOrders) && activeLabOrders.length > 0) {
		for (const lo of activeLabOrders) {
			const statusInfo = evaluateAppointmentLabStatus(lo, referenceDate);
			if (!statusInfo) continue;
			items.push({
				id: String(lo.id || Math.random()),
				orderNumber: lo.orderNumber || lo.id?.slice(0, 8) || "ЗТЛ",
				statusInfo,
				construction:
					lo.workTypeRu ||
					lo.workType ||
					lo.material ||
					lo.title ||
					lo.constructionType ||
					"Ортопедическая конструкция",
				toothFdi: lo.toothFdi || lo.toothNumber || null,
				colorVita: lo.colorVita || lo.vitaShade || lo.shade || null,
				dueDateIso: lo.dueDate || lo.expectedDeliveryDate || null,
			});
		}
	}

	// 2. Если в activeLabOrders пусто, но на самой записи есть данные ЗТЛ
	if (items.length === 0) {
		const apptLabInfo = resolveAppointmentLabStatus(appointment, undefined, referenceDate);
		if (apptLabInfo) {
			items.push({
				id: (appointment as any)?.labOrderId || `appt-lab-${appointment.id}`,
				orderNumber: apptLabInfo.orderNumber || (appointment as any)?.labOrderNumber || "Наряд ЗТЛ",
				statusInfo: apptLabInfo,
				construction:
					apptLabInfo.workTypeRu ||
					(appointment as any)?.labWorkTitle ||
					(appointment as any)?.labWorkType ||
					(appointment as any)?.material ||
					appointment.reason ||
					"Ортопедическая конструкция",
				toothFdi: apptLabInfo.toothFdi || extractTeethList(appointment)[0] || null,
				colorVita: apptLabInfo.colorVita || (appointment as any)?.colorVita || null,
				dueDateIso: apptLabInfo.dueDateIso || (appointment as any)?.labDueDate || null,
			});
		}
	}

	const handleNavigateToLab = (orderNumber?: string) => {
		onClose?.();
		useAppStore.getState().setCurrentView("lab");
		if (typeof window !== "undefined") {
			window.location.hash = "#lab";
		}
		showToast(
			orderNumber ? `ЗТЛ: открыт наряд ${orderNumber}` : "Открыт журнал лаборатории (#lab)",
			"info",
		);
	};

	const handleConfirmFitting = (item: NormalizedLabItem) => {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-lab-order-fitting-confirmed", {
					detail: {
						orderId: item.id,
						orderNumber: item.orderNumber,
						toothFdi: item.toothFdi,
						construction: item.construction,
						timestamp: new Date().toISOString(),
					},
				}),
			);
		}
		if (item.id && !item.id.startsWith("appt-lab-")) {
			fetch(`/api/lab/orders/${item.id}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					stage: "fitting",
					notes: "Примерка успешно подтверждена у кресла в 1 клик",
				}),
			}).catch(() => {});
		}
		showToast(`Примерка наряда ${item.orderNumber} успешно подтверждена!`, "success", 3000);
	};

	// Если нарядов ЗТЛ нет — отображаем компактную тихую плашку с кнопкой оформления (Friction-Killer Law)
	if (items.length === 0) {
		return (
			<div
				className="sm:col-span-2 py-2 px-3 rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--paper-soft)]/40 flex items-center justify-between gap-2 text-xs text-[var(--muted)] shadow-2xs"
				data-testid="appointment-modal-lab-empty"
			>
				<div className="flex items-center gap-2 min-w-0">
					<FlaskConical size={13} className="text-[var(--muted)] shrink-0" />
					<span className="truncate">Лаборатория (ЗТЛ): наряд не прикреплен</span>
				</div>
				<button
					type="button"
					onClick={() => handleNavigateToLab()}
					className="h-7 px-2.5 rounded-lg border border-[var(--teal)]/30 bg-[var(--teal-soft)] text-xs font-bold text-[var(--teal)] hover:bg-[var(--teal)] hover:text-white inline-flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
					data-testid="appointment-modal-create-lab-order-btn"
					title="Перейти в реестр лаборатории для оформления наряда"
				>
					<FlaskConical size={12} />
					<span>+ Оформить наряд в ЗТЛ</span>
				</button>
			</div>
		);
	}

	return (
		<div className="sm:col-span-2 space-y-2" data-testid="appointment-modal-lab-section">
			<div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
				<span className="flex items-center gap-1.5 text-[var(--teal)]">
					<FlaskConical size={13} />
					<span>Заказ в лабораторию (ЗТЛ)</span>
				</span>
				<span className="text-[10px] lowercase font-normal opacity-70">
					{items.length === 1 ? "1 наряд" : `${items.length} наряда`}
				</span>
			</div>

			{items.map((item) => {
				const hasDue = Boolean(item.dueDateIso);
				const dueDateObj = hasDue ? new Date(item.dueDateIso!) : null;
				const isBeforeLab =
					dueDateObj &&
					startsAtLocal &&
					new Date(startsAtLocal).getTime() < dueDateObj.getTime();

				const dueDayMonthRu = dueDateObj
					? `${String(dueDateObj.getDate()).padStart(2, "0")}.${String(dueDateObj.getMonth() + 1).padStart(2, "0")}`
					: "";

				const hexColor = item.colorVita ? getVitaShadeHex(item.colorVita) : null;

				const handleSyncDate = () => {
					if (dueDateObj && setStartsAtLocal && setEndsAtLocal) {
						const year = dueDateObj.getFullYear();
						const month = String(dueDateObj.getMonth() + 1).padStart(2, "0");
						const day = String(dueDateObj.getDate()).padStart(2, "0");
						const timePart = startsAtLocal ? startsAtLocal.slice(11, 16) : "10:00";
						const newStart = `${year}-${month}-${day}T${timePart}`;
						setStartsAtLocal(newStart);

						const [hh, mm] = timePart.split(":").map(Number);
						const endHh = String(Math.min(23, (hh || 10) + 1)).padStart(2, "0");
						setEndsAtLocal(
							`${year}-${month}-${day}T${endHh}:${String(mm || 0).padStart(2, "0")}`,
						);
						showToast(
							`Приём синхронизирован с готовностью ЗТЛ: ${dueDateObj.toLocaleDateString("ru-RU")}`,
							"success",
						);
					}
				};

				return (
					<div
						key={item.id}
						className={`p-3 rounded-xl border text-xs shadow-2xs space-y-2 transition-all ${
							item.statusInfo.isOverdue
								? "bg-rose-500/10 border-rose-500/40"
								: item.statusInfo.state === "ready_in_clinic"
									? "bg-emerald-500/10 border-emerald-500/40"
									: "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal)]/30"
						}`}
						data-testid={`appointment-modal-lab-card-${item.id}`}
					>
						{/* Верхняя строка: Номер наряда + Статус-бейдж */}
						<div className="flex items-center justify-between gap-2 flex-wrap font-bold">
							<div className="flex items-center gap-1.5 min-w-0">
								{item.statusInfo.isOverdue ? (
									<AlertTriangle size={13} className="text-rose-500 shrink-0" />
								) : item.statusInfo.state === "ready_in_clinic" ? (
									<CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
								) : (
									<Clock size={13} className="text-amber-500 shrink-0" />
								)}
								<span className="text-[var(--ink)] font-bold">Наряд ЗТЛ:</span>
								<span className="font-mono text-[var(--muted)]">{item.orderNumber}</span>
							</div>

							<span
								className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-extrabold border ${item.statusInfo.badgeClass}`}
								data-testid="appointment-modal-lab-status"
							>
								{item.statusInfo.isOverdue
									? `Просрочен на ${item.statusInfo.daysOverdue} дн!`
									: item.statusInfo.labelRu}
							</span>
						</div>

						{/* Индикатор готовности и кнопка 1-клик подтверждения примерки при статусе "Поступил в клинику" */}
						{item.statusInfo.state === "ready_in_clinic" && (
							<div
								className="w-full p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 dark:text-emerald-100 font-bold flex items-center justify-between gap-2 flex-wrap"
								data-testid="appointment-modal-lab-readiness-indicator"
							>
								<div className="flex items-center gap-1.5 min-w-0">
									<CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
									<span className="truncate">
										{item.statusInfo.readinessText || `Работа из ЗТЛ доставлена: ${item.construction}${item.toothFdi ? ` зуб ${item.toothFdi}` : ""}`}
									</span>
								</div>
								<button
									type="button"
									onClick={() => handleConfirmFitting(item)}
									className="h-6 px-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs transition-all active:scale-95"
									data-testid="appointment-confirm-fitting-btn"
									title="Подтвердить успешную примерку конструкции в 1 клик"
								>
									<CheckCircle2 size={11} />
									<span>Подтвердить примерку</span>
								</button>
							</div>
						)}

						{/* Средняя строка: Конструкция + Зуб FDI + Цвет VITA */}
						<div className="flex items-center justify-between gap-2 flex-wrap text-xs">
							<div
								className="flex items-center gap-1.5 font-semibold text-[var(--ink)]"
								data-testid="appointment-modal-lab-construction"
							>
								<span>{item.construction}</span>
								{item.toothFdi && (
									<span className="px-1.5 py-0.2 rounded bg-[var(--teal)]/15 text-[var(--teal-dark,var(--teal))] font-bold font-mono text-[11px] border border-[var(--teal)]/30">
										Зуб {item.toothFdi}
									</span>
								)}
							</div>

							{item.colorVita && (
								<div
									className="flex items-center gap-1.5 font-bold text-[var(--ink)] bg-[var(--paper)] px-2 py-0.5 rounded-md border border-[var(--line)]"
									data-testid="appointment-modal-lab-vita"
									title={`Расцветка VITA: ${item.colorVita}`}
								>
									<span
										className="inline-block w-3.5 h-3.5 rounded-full border border-black/20 shadow-2xs shrink-0"
										style={{ backgroundColor: hexColor || "#EBD7BB" }}
									/>
									<span className="font-mono text-[11px]">VITA {item.colorVita}</span>
								</div>
							)}
						</div>

						{/* Collision Guard Banner: Внимание: плановая готовность работы ЗТЛ DD.MM, выбранная дата раньше */}
						{isBeforeLab && (
							<div
								className="w-full p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2 text-xs flex-wrap"
								data-testid="appointment-modal-lab-collision-alert"
							>
								<div className="flex items-center gap-2 min-w-0">
									<AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
									<span className="font-semibold" data-testid="appointment-lab-collision-warning-text">
										{`Внимание: плановая готовность работы ЗТЛ ${dueDayMonthRu}, выбранная дата раньше`}
									</span>
								</div>
								{setStartsAtLocal && setEndsAtLocal && (
									<button
										type="button"
										onClick={handleSyncDate}
										className="h-6 px-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs transition-all active:scale-95"
										data-testid="appointment-modal-sync-lab-date-banner-btn"
										title="Синхронизировать дату приёма с готовностью ЗТЛ в 1 клик"
									>
										<Calendar size={11} />
										<span>Синхронизировать дату</span>
									</button>
								)}
							</div>
						)}

						{/* Нижняя строка: Срок готовности из ЗТЛ + Кнопки действий */}
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[var(--line)]/50 text-[11px]">
							<div className="space-y-0.5">
								{hasDue ? (
									<div className="text-[var(--muted)] flex items-center gap-1">
										<Clock size={12} className="shrink-0" />
										<span>
											Срок готовности:{" "}
											<strong className="text-[var(--ink)]">
												{dueDateObj?.toLocaleDateString("ru-RU")}
											</strong>
										</span>
										{isBeforeLab && (
											<span className="text-amber-600 dark:text-amber-400 font-bold ml-1 inline-flex items-center gap-1">
												<AlertTriangle size={11} className="shrink-0" />
												<span>(прием раньше готовности ЗТЛ)</span>
											</span>
										)}
									</div>
								) : (
									<span className="text-[var(--muted)]">Срок готовности: по согласованию</span>
								)}
							</div>

							<div className="flex items-center gap-1.5 shrink-0">
								{/* Кнопка синхронизации даты приёма с готовностью ЗТЛ */}
								{hasDue && setStartsAtLocal && setEndsAtLocal && (
									<button
										type="button"
										onClick={handleSyncDate}
										className="h-7 px-2 rounded-md bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
										title="Перенести приём на дату готовности наряда ЗТЛ"
										data-testid="appointment-modal-sync-lab-date-btn"
									>
										<Calendar size={12} className="text-[var(--teal)]" />
										<span>На дату ЗТЛ</span>
									</button>
								)}

								{/* Главная кнопка перехода к наряду в ЗТЛ */}
								<button
									type="button"
									onClick={() => handleNavigateToLab(item.orderNumber)}
									className="h-7 px-2.5 rounded-md bg-[var(--teal)] hover:opacity-90 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer shadow-2xs transition-all"
									title="Открыть реестр лаборатории и наряд ЗТЛ (#lab)"
									data-testid="appointment-modal-open-lab-order-btn"
								>
									<span>Открыть в ЗТЛ</span>
									<ExternalLink size={11} />
								</button>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
