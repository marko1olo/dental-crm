import { Building2, Gauge, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { minutesLabel } from "../../../AppHelpers";
import { workloadStateLabels } from "../../../workspaceUiLabels";

export function ShiftIntelligence() {
	const { dashboard, mostLoadedResource, staffRoleLabels, activeQueueRole } =
		useAppLogicContext();
	const [showAnalytics, setShowAnalytics] = useState(false);
	const [showOtherQueues, setShowOtherQueues] = useState(false);

	return (
		<motion.section
			className="shift-intelligence glass-panel"
			aria-label="Операционный контроль смены"
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
		>
			<div
				className="analytics-toggle-container"
				style={{ gridColumn: "1 / -1" }}
			>
				<button
					className="secondary-button"
					type="button"
					aria-expanded={showAnalytics}
					onClick={() => setShowAnalytics((v) => !v)}
					style={{
						minHeight: "30px",
						padding: "0 12px",
						fontSize: "12px",
					}}
				>
					{showAnalytics ? "Скрыть аналитику" : "Показать аналитику"}
				</button>
			</div>

			{showAnalytics && (
				<>
					{dashboard?.shiftIntelligence?.modeFit && (
						<article className="mode-fit-card">
							<div className="mode-fit-head">
								<Building2 aria-hidden="true" />
								<div>
									<p className="eyebrow">Режим клиники</p>
									<h2>{dashboard.shiftIntelligence.modeFit.title ?? "—"}</h2>
								</div>
								<strong>
									{dashboard.shiftIntelligence.modeFit.fitScore ?? 0}%
								</strong>
							</div>
							<p>
								{dashboard.shiftIntelligence.modeFit.lowFrictionNextStep ?? ""}
							</p>
							<div className="mode-fit-list">
								{(
									(dashboard.shiftIntelligence.modeFit.blockers?.length
										? dashboard.shiftIntelligence.modeFit.blockers
										: dashboard.shiftIntelligence.modeFit.upgrades) ?? []
								).map((item: any) => (
									<span key={item}>{item}</span>
								))}
							</div>
						</article>
					)}

					<article className="mode-fit-card resource-focus-card">
						<div className="mode-fit-head">
							<Gauge aria-hidden="true" />
							<div>
								<p className="eyebrow">Загрузка</p>
								<h2>{mostLoadedResource?.title ?? "Нет ресурсов"}</h2>
							</div>
							<strong>
								{mostLoadedResource
									? `${mostLoadedResource.utilizationPercent}%`
									: "0%"}
							</strong>
						</div>
						{mostLoadedResource ? (
							<>
								<p>
									{minutesLabel(mostLoadedResource.bookedMinutes)} ·{" "}
									{mostLoadedResource.appointmentCount} записей ·{" "}
									{
										workloadStateLabels[
											mostLoadedResource.state as keyof typeof workloadStateLabels
										]
									}
								</p>
								<div
									className="load-meter"
									aria-label={`Загрузка ${mostLoadedResource.utilizationPercent}%`}
								>
									<span
										style={{
											width: `${Math.min(100, mostLoadedResource.utilizationPercent)}%`,
										}}
									/>
								</div>
								<div className="mode-fit-list">
									{mostLoadedResource.flags.slice(0, 3).map((flag: any) => (
										<span key={flag}>{flag}</span>
									))}
								</div>
							</>
						) : (
							<p>Врачей и кресел пока нет в настройках.</p>
						)}
					</article>
				</>
			)}

			<div className="role-queue-header-row">
				<h3>Задачи по ролям</h3>
				{(dashboard?.shiftIntelligence?.roleQueues?.length || 0) > 1 && (
					<button
						className="text-button toggle-queues-btn"
						type="button"
						onClick={() => setShowOtherQueues((v) => !v)}
					>
						{showOtherQueues ? "Скрыть другие роли" : "Показать другие роли"}
					</button>
				)}
			</div>

			<div className="role-queue-grid">
				{dashboard?.shiftIntelligence?.roleQueues &&
				dashboard.shiftIntelligence.roleQueues.length > 0 ? (
					(() => {
						const filtered = dashboard.shiftIntelligence.roleQueues.filter(
							(q: any) => showOtherQueues || q.role === activeQueueRole,
						);
						
						// If the current role (e.g., owner) has no specific queue, show them all automatically
						const queuesToDisplay = filtered.length > 0 ? filtered : dashboard.shiftIntelligence.roleQueues;

						return queuesToDisplay.map((queue: any) => (
							<article
								className={`role-queue-card ${queue.role === activeQueueRole ? "active" : ""}`}
								key={queue.role}
							>
								<div>
									<UserCheck aria-hidden="true" />
									<span>{staffRoleLabels[queue.role] || queue.role}</span>
								</div>
								<h3>{queue.title}</h3>
								<p>{queue.nextAction}</p>
								<strong>{queue.openItems} задач</strong>
								<small>{queue.blockedBy?.[0] ?? queue.automationHint}</small>
							</article>
						));
					})()
				) : (
					<p style={{ color: "var(--muted)", fontSize: "14px", padding: "12px 0" }}>
						Очередей задач не найдено.
					</p>
				)}
			</div>
		</motion.section>
	);
}
