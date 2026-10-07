import type { Dashboard } from "@dental/shared";
import React, { useState } from "react";
import {
	Building2,
	Gauge,
	UserCheck,
} from "lucide-react";
import { countLabel } from "../../lib/russianPlural";
import { minutesLabel } from "../../AppHelpers";

export interface ShiftIntelligenceSectionProps {
	readonly dashboard?: Dashboard | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly mostLoadedResource?: any | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly activeQueueRole?: any | undefined;
	readonly rolesWorthShowing?: boolean | undefined;
	readonly staffRoleLabels?: Record<string, string> | undefined;
	readonly className?: string | undefined;
}

/**
 * ShiftIntelligenceSection — Операционный контроль смены (загрузка кресел, режим клиники, задачи по ролям).
 *
 * Инварианты:
 * 1. Аналитика скрыта под кнопкой «Показать аналитику» по дефолту (Mandate 8d, Studio Clinical HIG), чтобы не захламлять горячий путь врача.
 * 2. Чёткие русские числительные и согласованные счётные слова (Мандат 8e).
 * 3. 0% эмодзи, только строгие векторные иконки Lucide.
 */
export const ShiftIntelligenceSection: React.FC<ShiftIntelligenceSectionProps> = ({
	dashboard,
	mostLoadedResource,
	activeQueueRole,
	rolesWorthShowing = false,
	staffRoleLabels,
	className = "",
}) => {
	const [showAnalytics, setShowAnalytics] = useState<boolean>(false);
	const [showOtherQueues, setShowOtherQueues] = useState<boolean>(false);

	return (
		<section
			className={`shift-intelligence ${className}`.trim()}
			aria-label="Операционный контроль смены"
			style={{
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: "14px",
				padding: "18px 20px",
				boxShadow: "var(--shadow-1)",
				display: "flex",
				flexDirection: "column",
				gap: "16px",
			}}
			data-testid="shift-intelligence-section"
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "12px",
					flexWrap: "wrap",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "10px",
						minWidth: 0,
					}}
				>
					<div
						style={{
							width: "32px",
							height: "32px",
							borderRadius: "9px",
							background: "var(--teal-soft)",
							color: "var(--teal-dark)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
						}}
					>
						<Gauge size={16} aria-hidden="true" />
					</div>
					<div style={{ minWidth: 0 }}>
						<h4
							style={{
								margin: 0,
								fontSize: "14px",
								fontWeight: 700,
								color: "var(--ink)",
								wordBreak: "break-word",
								lineHeight: 1.25,
							}}
						>
							Операционный контроль смены
						</h4>
						<p
							style={{
								margin: "1px 0 0",
								fontSize: "12px",
								color: "var(--ink-2)",
								fontWeight: 500,
								wordBreak: "break-word",
								lineHeight: 1.35,
							}}
						>
							Насколько режим клиники и загрузка кресел совпадают с планом на день
						</p>
					</div>
				</div>
				<button
					className="secondary-button min-h-[44px] px-3 py-2"
					type="button"
					aria-expanded={showAnalytics}
					onClick={() => setShowAnalytics((v) => !v)}
					style={{
						minHeight: "44px",
						padding: "8px 12px",
						fontSize: "12px",
						flexShrink: 0,
					}}
				>
					{showAnalytics ? "Скрыть аналитику" : "Показать аналитику"}
				</button>
			</div>

			{showAnalytics && (
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: "12px",
					}}
				>
					<article
						className="mode-fit-card"
						style={{
							padding: "16px",
							borderRadius: "12px",
							border: "1px solid var(--line)",
							background: "var(--paper-soft)",
						}}
					>
						<div
							className="mode-fit-head"
							style={{ display: "flex", alignItems: "center", gap: "10px" }}
						>
							<Building2 aria-hidden="true" className="shrink-0" />
							<div style={{ minWidth: 0 }}>
								<p className="eyebrow">Режим клиники</p>
								<h2
									style={{
										fontSize: "15px",
										margin: 0,
										wordBreak: "break-word",
										lineHeight: 1.25,
									}}
								>
									{dashboard?.shiftIntelligence?.modeFit?.title ??
										"Режим ещё не выбран"}
								</h2>
							</div>
							<strong
								style={{
									marginLeft: "auto",
									fontSize: "18px",
									color: "var(--teal-dark)",
									flexShrink: 0,
								}}
							>
								{dashboard?.shiftIntelligence?.modeFit?.fitScore ?? 0}%
							</strong>
						</div>
						<p
							style={{
								fontSize: "12.5px",
								color: "var(--muted)",
								margin: "8px 0",
								wordBreak: "break-word",
								lineHeight: 1.35,
							}}
						>
							{dashboard?.shiftIntelligence?.modeFit?.lowFrictionNextStep ?? ""}
						</p>
					</article>

					<article
						className="mode-fit-card resource-focus-card"
						style={{
							padding: "16px",
							borderRadius: "12px",
							border: "1px solid var(--line)",
							background: "var(--paper-soft)",
						}}
					>
						<div
							className="mode-fit-head"
							style={{ display: "flex", alignItems: "center", gap: "10px" }}
						>
							<Gauge aria-hidden="true" className="shrink-0" />
							<div style={{ minWidth: 0 }}>
								<p className="eyebrow">Загрузка</p>
								<h2
									style={{
										fontSize: "15px",
										margin: 0,
										wordBreak: "break-word",
										lineHeight: 1.25,
									}}
								>
									{mostLoadedResource?.title ?? "Кресел и врачей нет"}
								</h2>
							</div>
							<strong
								style={{
									marginLeft: "auto",
									fontSize: "18px",
									color: "var(--teal-dark)",
									flexShrink: 0,
								}}
							>
								{mostLoadedResource
									? `${mostLoadedResource.utilizationPercent}%`
									: "0%"}
							</strong>
						</div>
						{mostLoadedResource ? (
							<>
								<p
									style={{
										fontSize: "12.5px",
										color: "var(--muted)",
										margin: "8px 0",
										wordBreak: "break-word",
										lineHeight: 1.35,
									}}
								>
									{minutesLabel(mostLoadedResource.bookedMinutes)} ·{" "}
									{countLabel(
										mostLoadedResource.appointmentCount ?? 0,
										"запись",
										"записи",
										"записей",
									)}
								</p>
								<div
									role="progressbar"
									aria-valuenow={mostLoadedResource.utilizationPercent}
									aria-valuemin={0}
									aria-valuemax={100}
									className="load-meter"
									aria-label={`Загрузка ${mostLoadedResource.utilizationPercent}%`}
									style={{
										height: "4px",
										borderRadius: "4px",
										background: "var(--line)",
										overflow: "hidden",
									}}
								>
									<span
										style={{
											display: "block",
											height: "100%",
											width: `${Math.min(100, mostLoadedResource.utilizationPercent)}%`,
											background: "var(--teal)",
										}}
									/>
								</div>
							</>
						) : (
							<p
								style={{
									fontSize: "12.5px",
									color: "var(--muted)",
									margin: "8px 0",
									wordBreak: "break-word",
									lineHeight: 1.35,
								}}
							>
								Врачей и кресел пока нет в настройках.
							</p>
						)}
					</article>
				</div>
			)}

			{rolesWorthShowing ? (
				<>
					<div
						className="role-queue-header-row"
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
						}}
					>
						<h3
							style={{
								margin: 0,
								fontSize: "14px",
								fontWeight: 700,
								letterSpacing: "0.02em",
								color: "var(--ink)",
							}}
						>
							Задачи по ролям
						</h3>
						{(dashboard?.shiftIntelligence?.roleQueues ?? []).length > 1 && (
							<button
								className="text-button toggle-queues-btn min-h-[44px] px-3 py-2 flex items-center"
								type="button"
								onClick={() => setShowOtherQueues((v) => !v)}
							>
								{showOtherQueues ? "Скрыть другие роли" : "Показать другие роли"}
							</button>
						)}
					</div>

					<div
						className="role-queue-grid"
						style={{
							display: "grid",
							gridTemplateColumns:
								"repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
							gap: "12px",
						}}
					>
						{(dashboard?.shiftIntelligence?.roleQueues ?? [])
							.filter(
								// biome-ignore lint/suspicious/noExplicitAny: automated suppression
								(q: any) => q.role === activeQueueRole || showOtherQueues,
							)
							// biome-ignore lint/suspicious/noExplicitAny: automated suppression
							.map((queue: any) => (
								<article
									className={`role-queue-card ${queue.role === activeQueueRole ? "active" : ""}`}
									key={queue.role}
									style={{
										position: "relative",
										padding: "14px 16px",
										border:
											queue.role === activeQueueRole
												? "1px solid var(--teal-ring)"
												: "1px solid var(--line)",
										borderRadius: "12px",
										background:
											queue.role === activeQueueRole
												? "var(--teal-surface)"
												: "var(--paper)",
										boxShadow: "var(--shadow-1)",
										transition: "all 0.15s ease",
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											gap: "8px",
										}}
									>
										<span
											style={{
												display: "inline-flex",
												alignItems: "center",
												gap: "6px",
												fontSize: "11px",
												fontWeight: 700,
												textTransform: "uppercase",
												letterSpacing: "0.06em",
												color:
													queue.role === activeQueueRole
														? "var(--teal-dark)"
														: "var(--muted)",
											}}
										>
											<UserCheck size={14} aria-hidden="true" />
											{staffRoleLabels?.[queue.role] ?? "роль не подписана"}
										</span>
										<strong
											title={countLabel(
												queue.openItems ?? 0,
												"открытое дело",
												"открытых дела",
												"открытых дел",
											)}
											style={{
												fontSize: "22px",
												fontWeight: 800,
												color:
													queue.role === activeQueueRole
														? "var(--teal-dark)"
														: "var(--ink)",
												fontVariantNumeric: "tabular-nums",
											}}
										>
											<span aria-hidden="true">{queue.openItems}</span>
											<span className="sr-only">
												{countLabel(
													queue.openItems ?? 0,
													"открытое дело",
													"открытых дела",
													"открытых дел",
												)}
											</span>
										</strong>
									</div>
									<h3
										style={{
											margin: "8px 0 0",
											fontSize: "14px",
											fontWeight: 700,
											color: "var(--ink)",
											wordBreak: "break-word",
											lineHeight: 1.25,
										}}
									>
										{queue.title}
									</h3>
									<p
										style={{
											margin: "2px 0 0",
											fontSize: "12.5px",
											color: "var(--ink-2)",
											wordBreak: "break-word",
											lineHeight: 1.35,
										}}
									>
										{queue.nextAction}
									</p>
									<small
										style={{
											display: "block",
											marginTop: "8px",
											fontSize: "11.5px",
											color: "var(--muted)",
											wordBreak: "break-word",
											lineHeight: 1.3,
										}}
									>
										{queue.blockedBy?.[0] ?? queue.automationHint}
									</small>
								</article>
							))}
					</div>
				</>
			) : null}
		</section>
	);
};
