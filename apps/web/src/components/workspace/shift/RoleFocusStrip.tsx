import { UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";

export function RoleFocusStrip() {
	const {
		selectedWorkspaceRole,
		staffRoleLabels,
		activeRoleQueue,
		activeRolePolicy,
		activeRoleWritableSections,
		viewLabels,
		activeRoleRestrictedSections,
	} = useAppLogicContext();

	return (
		<motion.section
			className="role-focus-strip glass-panel"
			aria-label="Фокус текущей роли"
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
		>
			<div>
				<UserCheck aria-hidden="true" />
				<div>
					<p className="eyebrow">Фокус: {staffRoleLabels[selectedWorkspaceRole]}</p>
					<h2>
						{activeRoleQueue?.title ??
							activeRolePolicy?.title ??
							"Рабочая очередь"}
					</h2>
					<p>
						{activeRoleQueue?.nextAction ??
							activeRolePolicy?.requiresApprovalFor?.[0] ??
							"Анализ задач завершен"}
					</p>
				</div>
			</div>
			<div
				className="role-focus-meta flex flex-wrap gap-2 justify-start mt-2"
				aria-label="Доступы текущей роли"
			>
				<span className="bg-[var(--paper)] text-[var(--ink)] px-2 py-1 rounded-full text-xs font-bold border border-[var(--line-strong)]">
					{activeRoleQueue?.openItems ?? 0} открыто
				</span>
				{activeRolePolicy ? (
					<span className="bg-[var(--paper)] text-[var(--ink)] px-2 py-1 rounded-full text-xs font-bold border border-[var(--line-strong)]">
						Старт: {viewLabels[activeRolePolicy.defaultSection]}
					</span>
				) : null}
				{activeRoleWritableSections.slice(0, 3).map((section: any) => (
					<span
						key={section}
						className="bg-[var(--paper)] text-[var(--ink)] px-2 py-1 rounded-full text-xs font-bold border border-[var(--line-strong)]"
					>
						пишет: {viewLabels[section]}
					</span>
				))}
				{activeRoleRestrictedSections?.[0] ? (
					<span className="bg-red-500/20 text-red-500 px-2 py-1 rounded-md text-xs">
						{activeRoleRestrictedSections[0]} недоступна
					</span>
				) : (
					<span className="bg-green-500/20 text-green-500 px-2 py-1 rounded-md text-xs">
						Доступ открыт
					</span>
				)}
			</div>
		</motion.section>
	);
}
