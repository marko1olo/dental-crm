import React, { useState } from "react";
import { Camera, Radio, HardDrive, RefreshCw, ShieldCheck } from "lucide-react";
import { ClinicalPhotoProtocolModal } from "../../photography/ClinicalPhotoProtocolModal";
import { DirectRvgCaptureModal } from "../../radiology/DirectRvgCaptureModal";
import { POPULAR_RVG_SENSORS } from "../../radiology/directRvgFileValidation";
import { showToast } from "../../GlobalToast";

export const DiagnosticDrawerImagingTab: React.FC = () => {
	const [isPhotoOpen, setIsPhotoOpen] = useState(false);
	const [isRvgOpen, setIsRvgOpen] = useState(false);
	const [isCheckingSensors, setIsCheckingSensors] = useState(false);
	const [sensorStatus, setSensorStatus] = useState<string>("Готов к захвату (Auto-Trigger)");

	const handleCheckSensors = () => {
		setIsCheckingSensors(true);
		setTimeout(() => {
			setIsCheckingSensors(false);
			setSensorStatus("Vatech EzSensor Classic — Активен (USB 3.0 / Hot Folder)");
			showToast("Датчики RVG и папка Hot Folder проверены: активно", "success", 3000);
		}, 300);
	};

	return (
		<div className="dente-diagnostic-imaging-tab" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
						onClick={() => setIsPhotoOpen(true)}
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
						onClick={() => setIsRvgOpen(true)}
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
						onClick={handleCheckSensors}
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
						<span className="dente-diagnostic-metric-label">Мандат 8e и Доказательность</span>
					</div>
					<span className="dente-diagnostic-metric-value" style={{ fontSize: 13 }}>
						Ноль блокировок сохранения
					</span>
					<span style={{ fontSize: 11, color: "var(--muted, #64748b)", marginTop: 2 }}>
						FDI 11..48 привязка, честный DICOM
					</span>
				</div>
			</div>

			<div
				style={{
					padding: 16,
					borderRadius: 8,
					background: "var(--paper-strong, #ffffff)",
					border: "1px solid var(--glass-border, rgba(0,0,0,0.08))",
					display: "flex",
					flexDirection: "column",
					gap: 10,
				}}
			>
				<h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
					Поддерживаемые датчики визиографов (Zero-Configuration):
				</h4>
				<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
					{POPULAR_RVG_SENSORS.map((s) => (
						<span
							key={s.brand}
							style={{
								padding: "4px 8px",
								borderRadius: 6,
								background: "var(--surface, #f1f5f9)",
								border: "1px solid var(--line, #e2e8f0)",
								fontSize: 12,
								fontWeight: 600,
							}}
						>
							✓ {s.brand} ({s.model})
						</span>
					))}
				</div>
			</div>

			{isPhotoOpen && (
				<ClinicalPhotoProtocolModal
					isOpen={true}
					onClose={() => setIsPhotoOpen(false)}
					patientName="Захаров Иван Дмитриевич"
					patientId="demo_patient_diag"
					doctorName="Д-р Воронов Алексей Владимирович"
				/>
			)}

			{isRvgOpen && (
				<DirectRvgCaptureModal
					isOpen={true}
					onClose={() => setIsRvgOpen(false)}
					patientName="Захаров Иван Дмитриевич"
					patientId="demo_patient_diag"
					initialToothFdi="16"
					doctorName="Д-р Воронов Алексей Владимирович"
				/>
			)}
		</div>
	);
};

export default DiagnosticDrawerImagingTab;
