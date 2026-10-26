import React from "react";
import { Camera, Radio, HardDrive, RefreshCw, ShieldCheck } from "lucide-react";

interface DiagnosticImagingMetricsGridProps {
	sensorStatus: string;
	isCheckingSensors: boolean;
	onOpenPhoto: () => void;
	onOpenRvg: () => void;
	onCheckSensors: () => void;
}

export const DiagnosticImagingMetricsGrid: React.FC<DiagnosticImagingMetricsGridProps> = ({
	sensorStatus,
	isCheckingSensors,
	onOpenPhoto,
	onOpenRvg,
	onCheckSensors,
}) => {
	return (
		<div className="dente-diagnostic-grid">
			<div className="dente-diagnostic-metric-card" data-testid="metric-photo-protocol">
				<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
					<Camera size={16} className="text-blue-500" />
					<span className="dente-diagnostic-metric-label">Фотопротокол</span>
				</div>
				<span className="dente-diagnostic-metric-value" style={{ fontSize: 13 }}>
					6/12 слотов, VITA, FDI
				</span>
				<span style={{ fontSize: 11, color: "var(--muted, #64748b)", marginTop: 2 }}>
					1-клик вставка Ctrl+V, экспорт PDF
				</span>
				<button
					type="button"
					className="dente-diagnostic-btn mt-3"
					onClick={onOpenPhoto}
					data-testid="btn-open-diagnostic-photo"
					style={{ minHeight: 38, width: "100%", justifyContent: "center" }}
				>
					Открыть фотопротокол
				</button>
			</div>

			<div className="dente-diagnostic-metric-card" data-testid="metric-rvg-sensor">
				<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
					<Radio size={16} className="text-teal-500" />
					<span className="dente-diagnostic-metric-label">Радиовизиограф RVG</span>
				</div>
				<span className="dente-diagnostic-metric-value" style={{ fontSize: 13 }}>
					Мгновенный захват &lt;50мс
				</span>
				<span style={{ fontSize: 11, color: "var(--muted, #64748b)", marginTop: 2 }}>
					{sensorStatus}
				</span>
				<button
					type="button"
					className="dente-diagnostic-btn mt-3 primary"
					onClick={onOpenRvg}
					data-testid="btn-open-diagnostic-rvg"
					style={{ minHeight: 38, width: "100%", justifyContent: "center" }}
				>
					Запустить захват RVG
				</button>
			</div>

			<div className="dente-diagnostic-metric-card" data-testid="metric-hot-folder">
				<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
					<HardDrive size={16} className="text-amber-500" />
					<span className="dente-diagnostic-metric-label">Hot Folder & PACS</span>
				</div>
				<span className="dente-diagnostic-metric-value" style={{ fontSize: 13 }}>
					C:\RadiologyDropzone\
				</span>
				<span style={{ fontSize: 11, color: "var(--muted, #64748b)", marginTop: 2 }}>
					DICOM 3.0 / TIFF автоподхват
				</span>
				<button
					type="button"
					className="dente-diagnostic-btn mt-3"
					onClick={onCheckSensors}
					data-testid="btn-check-sensors"
					style={{ minHeight: 38, width: "100%", justifyContent: "center" }}
				>
					<RefreshCw size={13} className={isCheckingSensors ? "animate-spin" : ""} />
					<span>Проверить шлюзы</span>
				</button>
			</div>

			<div className="dente-diagnostic-metric-card" data-testid="metric-ebm-compliance">
				<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
					<ShieldCheck size={16} className="text-emerald-500" />
					<span className="dente-diagnostic-metric-label">Автономия врача и доказательность</span>
				</div>
				<span className="dente-diagnostic-metric-value" style={{ fontSize: 13 }}>
					Ноль блокировок сохранения
				</span>
				<span style={{ fontSize: 11, color: "var(--muted, #64748b)", marginTop: 2 }}>
					FDI 11..48 привязка, честный DICOM
				</span>
			</div>
		</div>
	);
};
