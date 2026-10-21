import { AlertCircle, Check, Layers } from "lucide-react";
import type React from "react";
import {
	SplitRemainderChips,
	type SplitRemainderChipsProps,
} from "./SplitRemainderChips";

export type SplitRemainderBarProps = SplitRemainderChipsProps;

export const SplitRemainderBar: React.FC<SplitRemainderBarProps> = (props) => {
	const { remainingRub } = props;

	return (
		<div className="flex flex-wrap items-center justify-between gap-2">
			<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
				<Layers size={14} className="text-teal-600" />
				Разделение оплаты (Сплит):
			</span>

			{remainingRub > 0 ? (
				<SplitRemainderChips {...props} />
			) : remainingRub === 0 ? (
				<div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
					<Check size={14} className="text-emerald-600" />
					<span>Чек сбалансирован</span>
				</div>
			) : (
				<div className="flex items-center gap-1.5 text-xs font-bold text-rose-600">
					<AlertCircle size={14} />
					<span>
						Переплата:{" "}
						{Math.abs(remainingRub).toLocaleString("ru-RU", {
							minimumFractionDigits: 2,
						})}{" "}
						₽
					</span>
				</div>
			)}
		</div>
	);
};
