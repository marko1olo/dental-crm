import type React from "react";
import { AlertTriangle, Calculator, Loader2 } from "lucide-react";
import { PanelLoadFailure } from "../PanelLoadFailure";
import {
	type PanelSubject,
	panelStateText,
	requestFailureCause,
} from "../../lib/panelStateText";

export interface TreatmentEstimatorAlertsProps {
	planLoadPhase: "loading" | "ready" | "failed";
	planLoadStatus: number | null;
	planSubject: PanelSubject;
	contractFailure: { status: number | null } | null;
	issueMessages: readonly string[];
	itemsCount: number;
	onRetryPlan: () => void;
	onRetryContract: () => void;
}

export const TreatmentEstimatorAlerts: React.FC<TreatmentEstimatorAlertsProps> = ({
	planLoadPhase,
	planLoadStatus,
	planSubject,
	contractFailure,
	issueMessages,
	itemsCount,
	onRetryPlan,
	onRetryContract,
}) => {
	return (
		<>
			{/* Отказ чтения сохраненного плана */}
			{planLoadPhase === "failed" && (
				<PanelLoadFailure
					subject={planSubject}
					status={planLoadStatus}
					onRetry={onRetryPlan}
					className="mb-3"
				/>
			)}

			{/* Договор ДМС не прочитан */}
			{contractFailure && (
				<div
					role="alert"
					className="flex flex-wrap items-start gap-x-3 gap-y-2 p-3 mb-3 rounded-lg border text-xs leading-relaxed bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-900"
				>
					<AlertTriangle
						size={14}
						className="mt-0.5 shrink-0"
						aria-hidden="true"
					/>
					<div className="flex-1 min-w-0 break-words">
						<div className="font-semibold">
							Договор ДМС не прочитан:{" "}
							{requestFailureCause(contractFailure.status)}.
						</div>
						<div className="mt-0.5">
							Суммы ниже показаны БЕЗ покрытия ДМС — пациент по договору
							заплатит меньше. Не называйте эти суммы пациенту, пока договор
							не прочитан.
						</div>
					</div>
					<button
						type="button"
						onClick={onRetryContract}
						className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-100 font-semibold cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
					>
						Повторить
					</button>
				</div>
			)}

			{/* Чего не хватает в прайсе */}
			{issueMessages.length > 0 && (
				<div
					role="alert"
					className="flex flex-wrap items-start gap-x-3 gap-y-2 p-3 mb-3 rounded-lg border text-xs leading-relaxed bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-900"
				>
					<AlertTriangle
						size={14}
						className="mt-0.5 shrink-0"
						aria-hidden="true"
					/>
					<div className="flex-1 min-w-0 break-words">
						<div className="font-semibold">
							Часть лечения посчитать не удалось — цены нет в вашем прайсе.
						</div>
						<ul className="mt-1 flex flex-col gap-1">
							{issueMessages.map((message) => (
								<li key={message}>{message}</li>
							))}
						</ul>
					</div>
				</div>
			)}

			{/* Загрузка */}
			{planLoadPhase === "loading" && itemsCount === 0 && (
				<div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500 dark:text-zinc-400">
					<Loader2 size={16} className="animate-spin" aria-hidden="true" />
					{panelStateText(planSubject, { phase: "loading" }).title}
				</div>
			)}

			{/* Пустой план */}
			{planLoadPhase === "ready" && itemsCount === 0 && (
				<div className="flex flex-col items-center justify-center p-8 mx-2 my-8 rounded-2xl border border-dashed border-zinc-300/50 dark:border-zinc-700/50 bg-zinc-50/30 dark:bg-zinc-900/20 backdrop-blur-sm text-center">
					<div className="p-5 mb-4 rounded-full bg-teal-500/10 dark:bg-teal-500/20 border border-teal-500/20 shadow-sm">
						<Calculator
							size={40}
							className="text-teal-600 dark:text-teal-400 opacity-60"
						/>
					</div>
					<h4 className="text-base font-bold text-slate-800 dark:text-zinc-100 mb-2">
						План лечения пуст
					</h4>
					<p className="text-sm leading-relaxed text-slate-500 dark:text-zinc-400 max-w-[320px]">
						Кликните на любой зуб на схеме слева, выберите патологию, и
						система автоматически подберет оптимальный набор процедур из
						прайс-листа
					</p>
				</div>
			)}
		</>
	);
};
