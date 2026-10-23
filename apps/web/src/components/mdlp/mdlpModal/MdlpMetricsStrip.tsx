import type React from "react";
import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	Coins,
	Scan,
} from "lucide-react";
import type { ChestnyZnakScanSummary } from "@dental/shared";

export interface MdlpMetricsStripProps {
	readonly summary: ChestnyZnakScanSummary;
}

export const MdlpMetricsStrip: React.FC<MdlpMetricsStripProps> = ({ summary }) => {
	return (
		<div className="mdlp-metrics-grid" data-testid="mdlp-metrics-summary">
			<div className="mdlp-metric-card">
				<span className="mdlp-metric-title">
					<Scan className="w-3.5 h-3.5" />
					<span>Всего упаковок</span>
				</span>
				<span className="mdlp-metric-value">{summary.totalCount}</span>
			</div>
			<div className="mdlp-metric-card">
				<span className="mdlp-metric-title">
					<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
					<span>Проверено</span>
				</span>
				<span className="mdlp-metric-value verified">{summary.verifiedCount}</span>
			</div>
			<div className="mdlp-metric-card">
				<span className="mdlp-metric-title">
					<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
					<span>Внимание</span>
				</span>
				<span className="mdlp-metric-value warning">{summary.warningCount}</span>
			</div>
			<div className="mdlp-metric-card">
				<span className="mdlp-metric-title">
					<AlertCircle className="w-3.5 h-3.5 text-rose-500" />
					<span>Просрочено</span>
				</span>
				<span className="mdlp-metric-value expired">{summary.expiredCount}</span>
			</div>
			<div className="mdlp-metric-card">
				<span className="mdlp-metric-title">
					<Coins className="w-3.5 h-3.5" />
					<span>Сумма партии</span>
				</span>
				<span className="mdlp-metric-value">
					{summary.totalCostRub.toLocaleString("ru-RU")} ₽
				</span>
			</div>
		</div>
	);
};
