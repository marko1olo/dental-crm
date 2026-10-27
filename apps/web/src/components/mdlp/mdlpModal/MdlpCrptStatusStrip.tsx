import type React from "react";
import { AlertTriangle, WifiOff } from "lucide-react";
import type { MdlpOfflinePackage } from "../mdlpOfflineQueue.js";
import type { CrptServerStatus } from "./types.js";

export interface MdlpCrptStatusStripProps {
	readonly crptStatus: CrptServerStatus;
	readonly offlineQueue: readonly MdlpOfflinePackage[];
	readonly showEmergencyScannerBypass: boolean;
	readonly onToggleOfflineDrawer: () => void;
	readonly onToggleEmergencyScannerBypass: () => void;
}

export const MdlpCrptStatusStrip: React.FC<MdlpCrptStatusStripProps> = ({
	crptStatus,
	offlineQueue,
	showEmergencyScannerBypass,
	onToggleOfflineDrawer,
	onToggleEmergencyScannerBypass,
}) => {
	return (
		<div className="mdlp-crpt-status-strip" data-testid="mdlp-crpt-status-strip">
			<div className="mdlp-crpt-status-left">
				<span className={`mdlp-status-dot ${crptStatus}`} />
				<span className="mdlp-crpt-status-text">
					{crptStatus === "online" && "Синхронизировано (связь в норме)"}
					{crptStatus === "degraded" &&
						"Задержка связи (активен офлайн-буфер, приём не прерывается)"}
					{crptStatus === "offline" &&
						"Ошибка связи (активен офлайн-буфер, приём продолжается)"}
				</span>
			</div>

			<div className="mdlp-crpt-status-right">
				{offlineQueue.length > 0 && (
					<button
						type="button"
						onClick={onToggleOfflineDrawer}
						className="mdlp-offline-badge-btn"
						data-testid="mdlp-offline-queue-badge"
						title="Показать пакеты в локальном офлайн-буфере"
					>
						<WifiOff className="w-3.5 h-3.5 text-amber-400" />
						<span>В очереди буфера: {offlineQueue.length} пак.</span>
					</button>
				)}
				<button
					type="button"
					onClick={onToggleEmergencyScannerBypass}
					className={`mdlp-emergency-toggle-btn ${showEmergencyScannerBypass ? "active" : ""}`}
					data-testid="toggle-emergency-scanner-bypass-btn"
					title="Выдача медикаментов или имплантатов при поломке 2D-сканера или сбое связи"
				>
					<AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
					<span>
						{showEmergencyScannerBypass
							? "Скрыть панель аварийной выдачи"
							: "Поломка 2D-сканера? Аварийная выдача"}
					</span>
				</button>
			</div>
		</div>
	);
};
