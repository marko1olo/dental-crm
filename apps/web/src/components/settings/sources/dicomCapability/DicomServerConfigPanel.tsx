import { Database, Server } from "lucide-react";
import { useState } from "react";
import { DEFAULT_DICOM_PORTS, DICOM_DEVICE_PRESETS } from "./constants";
import type { DicomServerConfigPreset, TextInputChangeEvent } from "./types";

export interface DicomServerConfigPanelProps {
	initialHost?: string;
	initialPort?: number;
	initialAeTitle?: string;
	onSaveConfig?: (config: {
		host: string;
		port: number;
		aeTitle: string;
		presetId?: string;
	}) => void;
}

export function DicomServerConfigPanel({
	initialHost = "127.0.0.1",
	initialPort = DEFAULT_DICOM_PORTS.ORTHANC_DICOM,
	initialAeTitle = "DENTE_PACS",
	onSaveConfig,
}: DicomServerConfigPanelProps) {
	const [host, setHost] = useState(initialHost);
	const [port, setPort] = useState(initialPort);
	const [aeTitle, setAeTitle] = useState(initialAeTitle);
	const [selectedPreset, setSelectedPreset] = useState<string>("orthanc");

	const handleApplyPreset = (preset: DicomServerConfigPreset) => {
		setSelectedPreset(preset.id);
		setPort(preset.defaultPort);
		setAeTitle(preset.defaultAeTitle);
	};

	const handleSave = () => {
		onSaveConfig?.({
			host,
			port,
			aeTitle,
			presetId: selectedPreset,
		});
	};

	return (
		<section
			className="dicom-server-config-panel"
			aria-label="Настройка PACS-сервера и DICOM C-ECHO"
		>
			<div className="dicomweb-launch-head">
				<div>
					<strong>PACS-сервер и сетевой DICOM-приёмник</strong>
					<p>
						Параметры сетевого подключения C-STORE/C-ECHO для приёма снимков с
						томографов, визиографов и центрального архива клиники.
					</p>
				</div>
				<span>
					<Server aria-hidden="true" style={{ width: 16, height: 16 }} /> AE:{" "}
					{aeTitle}
				</span>
			</div>

			<div className="dicom-preset-chips" style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "12px 0" }}>
				{DICOM_DEVICE_PRESETS.map((preset) => (
					<button
						key={preset.id}
						type="button"
						className={`secondary-button ${selectedPreset === preset.id ? "active" : ""}`}
						style={{ fontSize: "12px", padding: "4px 10px" }}
						onClick={() => handleApplyPreset(preset)}
					>
						{preset.vendor} ({preset.model})
					</button>
				))}
			</div>

			<div className="dicomweb-input-grid">
				<label>
					Хост PACS / IP-адрес
					<input
						value={host}
						onChange={(e: TextInputChangeEvent) => setHost(e.target.value)}
						placeholder="127.0.0.1 или pims.clinic.local"
					/>
				</label>
				<label>
					Порт C-ECHO / C-STORE
					<input
						type="number"
						value={port}
						onChange={(e: TextInputChangeEvent) =>
							setPort(Number(e.target.value) || DEFAULT_DICOM_PORTS.STANDARD_DICOM)
						}
					/>
				</label>
				<label>
					Application Entity Title (AET)
					<input
						value={aeTitle}
						onChange={(e: TextInputChangeEvent) => setAeTitle(e.target.value)}
						placeholder="DENTE_PACS"
					/>
				</label>
			</div>

			<div className="dicomweb-action-row" style={{ marginTop: "12px" }}>
				<button
					type="button"
					className="primary-button"
					onClick={handleSave}
				>
					<Database aria-hidden="true" />
					Сохранить параметры PACS
				</button>
			</div>
		</section>
	);
}
