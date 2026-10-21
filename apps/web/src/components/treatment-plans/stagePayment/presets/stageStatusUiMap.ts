import type { StagePaymentStatus, StageStatusUiMeta } from "./stagePaymentPresetTypes.js";

export const STAGE_STATUS_UI_MAP: Record<StagePaymentStatus, StageStatusUiMeta> = {
	draft: {
		labelRu: "Черновик",
		badgeClass: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]",
		borderClass: "border-[var(--line)]",
		iconName: "FileEdit",
		descriptionRu: "Смета этапа сформирована, ожидает внесения аванса или начала работ.",
	},
	advance_paid: {
		labelRu: "Аванс внесен",
		badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700",
		borderClass: "border-amber-400 dark:border-amber-600",
		iconName: "Coins",
		descriptionRu: "Пациент внес предоплату по этапу; средства готовы к заморозке в эскроу.",
	},
	in_progress: {
		labelRu: "В работе (Эскроу)",
		badgeClass: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30",
		borderClass: "border-[var(--teal,var(--brand-primary))]",
		iconName: "Lock",
		descriptionRu: "Этап выполняется клиникой. Средства заблокированы на эскроу-депозите до подписания акта.",
	},
	act_completed: {
		labelRu: "Акт подписан",
		badgeClass: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30",
		borderClass: "border-[var(--teal,var(--brand-primary))]",
		iconName: "FileCheck",
		descriptionRu: "Услуги оказаны, Акт сдачи-приемки подписан пациентом (ст. 720 ГК РФ).",
	},
	fully_paid: {
		labelRu: "Полностью оплачен",
		badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
		borderClass: "border-emerald-500 dark:border-emerald-600",
		iconName: "CheckCircle2",
		descriptionRu: "Этап завершен, все финансовые обязательства сторон выполнены в полном объеме.",
	},
	refunded: {
		labelRu: "Расторгнут (Возврат)",
		badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700",
		borderClass: "border-rose-400 dark:border-rose-600",
		iconName: "RotateCcw",
		descriptionRu: "Договор по данному этапу расторгнут по ст. 32 Закона № 2300-1 с расчетом фактических затрат клиники.",
	},
};
