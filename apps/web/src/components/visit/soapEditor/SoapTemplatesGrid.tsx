import { Eye } from "lucide-react";
import React from "react";
import type { OutpatientProtocolTemplate } from "@dental/shared";
import { SPECIALTY_BADGE_COLORS } from "./constants";

export interface SoapTemplatesGridProps {
	readonly templatesSlice: {
		visibleItems: OutpatientProtocolTemplate[];
		hasMore: boolean;
		remainingCount: number;
		displayedCount: number;
		totalCount: number;
	};
	readonly onApplyProtocol: (protocol: OutpatientProtocolTemplate, mode: "replace" | "append") => void;
	readonly onSetPreviewProtocol: (proto: OutpatientProtocolTemplate) => void;
	readonly onShowMore: () => void;
}

export const SoapTemplatesGrid: React.FC<SoapTemplatesGridProps> = ({
	templatesSlice,
	onApplyProtocol,
	onSetPreviewProtocol,
	onShowMore,
}) => {
	return (
		<div
			className="max-h-[50dvh] sm:max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pr-1"
			style={{ contain: "content" }}
		>
			{(templatesSlice?.visibleItems ?? []).map((protocol) => (
				<div
					key={protocol.id}
					className="p-2 bg-[var(--paper)] border border-[var(--line)] rounded-lg flex flex-col justify-between hover:border-[var(--teal,var(--brand-primary))] transition-colors shadow-2xs"
					style={{ contain: "content", contentVisibility: "auto", containIntrinsicSize: "auto 84px" }}
				>
					<div>
						<div className="flex items-center justify-between gap-1 mb-1">
							<span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${SPECIALTY_BADGE_COLORS[protocol.specialty]}`}>
								{protocol.mkbCode}
							</span>
							<span className="text-xs text-slate-500">{protocol.subcategory}</span>
						</div>
						<div className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
							{protocol.name}
						</div>
						<div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
							{protocol.complaint}
						</div>
					</div>
					<div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/50">
						<button
							type="button"
							onClick={() => onApplyProtocol(protocol, "replace")}
							className="flex-1 min-h-[44px] sm:min-h-[32px] sm:h-8 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded cursor-pointer transition-colors flex items-center justify-center touch-manipulation"
							title="Заменить текущий дневник этим протоколом"
						>
							<span>Заполнить</span>
						</button>
						<button
							type="button"
							onClick={() => onSetPreviewProtocol(protocol)}
							className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:px-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded flex items-center justify-center touch-manipulation"
							title="Предпросмотр протокола"
						>
							<Eye className="w-3.5 h-3.5" />
						</button>
						<button
							type="button"
							onClick={() => onApplyProtocol(protocol, "append")}
							className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 text-xs font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded cursor-pointer flex items-center justify-center touch-manipulation"
							title="Дописать протокол к текущему тексту"
						>
							+ Добавить
						</button>
					</div>
				</div>
			))}
			{templatesSlice.hasMore && (
				<div className="col-span-full flex justify-center py-2">
					<button
						type="button"
						onClick={onShowMore}
						className="secondary-button min-h-[34px] h-8 px-4 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
						data-testid="btn-soap-templates-show-more"
					>
						{`Показать ещё ${Math.min(30, templatesSlice.remainingCount)} шаблонов (показано ${templatesSlice.displayedCount} из ${templatesSlice.totalCount})`}
					</button>
				</div>
			)}
		</div>
	);
};
