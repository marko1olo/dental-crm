import type React from "react";
import { Clock, RefreshCw, X } from "lucide-react";

interface Props {
	minDays: number;
	syncing: boolean;
	onSync: () => void;
	onClose?: (() => void) | undefined;
}

export const CrmLeakHeader: React.FC<Props> = ({
	minDays,
	syncing,
	onSync,
	onClose,
}) => {
	return (
		<div className="cld-header">
			<div className="cld-header-left">
				<h2 className="cld-title">
					<Clock size={18} className="text-[var(--teal)]" />
					<span>Детектор оттока и спящих пациентов</span>
				</h2>
				<span className="cld-badge-threshold">Порог: {minDays} дн.</span>
			</div>

			<div className="cld-header-actions">
				<button
					type="button"
					className="secondary-button cld-btn-sync"
					onClick={onSync}
					disabled={syncing}
					title="Синхронизировать базу спящих пациентов"
				>
					<RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
					<span>{syncing ? "Поиск..." : "Синхронизировать"}</span>
				</button>
				<button
					type="button"
					className="icon-button cld-btn-close"
					onClick={onClose}
					title="Закрыть шторку"
					aria-label="Закрыть шторку"
				>
					<X size={16} />
				</button>
			</div>
		</div>
	);
};
