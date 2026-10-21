/**
 * DENTE Dental CRM — Column Focus Metrics Cluster
 * Mandate 8b (<= 120 lines)
 */

import { AlertTriangle, Clock, DollarSign, Users } from "lucide-react";
import React from "react";
import type { ColumnMetrics } from "./types";

interface ColumnFocusMetricsClusterProps {
	metrics: ColumnMetrics;
}

export const ColumnFocusMetricsCluster: React.FC<ColumnFocusMetricsClusterProps> = ({ metrics }) => {
	return (
		<div className="expanded-focus-metrics-cluster">
			<div className="expanded-focus-metric-pill" title="Всего лидов на этапе">
				<Users size={12} className="text-[var(--muted)]" />
				<span>Лидов: <strong>{metrics.totalCount}</strong></span>
			</div>
			{metrics.totalRevenue > 0 && (
				<div className="expanded-focus-metric-pill expanded-focus-metric-pill--revenue" title="Суммарный потенциал выручки">
					<DollarSign size={12} />
					<span>{metrics.totalRevenue.toLocaleString("ru-RU")} ₽</span>
				</div>
			)}
			<div className="expanded-focus-metric-pill" title="Среднее время ожидания в очереди">
				<Clock size={12} className="text-[var(--muted)]" />
				<span>Ср. SLA: <strong>{metrics.avgWaitMinutes}м</strong></span>
			</div>
			{metrics.breachedCount > 0 && (
				<div className="expanded-focus-metric-pill expanded-focus-metric-pill--breached lead-sla-breached-pulse" title="Требуют немедленной реакции">
					<AlertTriangle size={12} />
					<span>SLA просрочен: <strong>{metrics.breachedCount}</strong></span>
				</div>
			)}
		</div>
	);
};
