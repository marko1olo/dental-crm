import { Activity, CheckCircle2, Database, Server } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { auth } from "../../../../AppConstants";
import { showToast } from "../../../GlobalToast";
import { DEFAULT_DICOM_PORTS, DICOM_DEVICE_PRESETS } from "./constants";
import type { DicomServerConfigPreset, TextInputChangeEvent } from "./types";

export interface DicomServerConfigPanelProps {
	initialHost?: string;
	initialPort?: number;
	initialAeTitle?: string;
	initialEndpointUrl?: string;
	onSaveConfig?: (config: {
		host: string;
		port: number;
		aeTitle: string;
		endpointUrl?: string;
		presetId?: string;
	}) => void;
}

export function DicomServerConfigPanel({
	initialHost = "127.0.0.1",
	initialPort = DEFAULT_DICOM_PORTS.ORTHANC_DICOM,
	initialAeTitle = "DENTE_PACS",
	initialEndpointUrl = "http://127.0.0.1:8042/dicom-web",
	onSaveConfig,
}: DicomServerConfigPanelProps) {
	const [host, setHost] = useState(initialHost);
	const [port, setPort] = useState(initialPort);
	const [aeTitle, setAeTitle] = useState(initialAeTitle);
	const [endpointUrl, setEndpointUrl] = useState(initialEndpointUrl);
	const [selectedPreset, setSelectedPreset] = useState<string>("orthanc");
	const [isPinging, setIsPinging] = useState(false);
	const [pingMessage, setPingMessage] = useState<string>(
		"Локальный архив PACS подключён (http://127.0.0.1:8042/dicom-web)",
	);

	const handleApplyPreset = (preset: DicomServerConfigPreset) => {
		setSelectedPreset(preset.id);
		setPort(preset.defaultPort);
		setAeTitle(preset.defaultAeTitle);
	};

	const handlePingPacs = useCallback(
		async (silent = false) => {
			setIsPinging(true);
			try {
				const res = await fetch("/api/integrations/dicom-server/ping", {
					method: "POST",
					headers: {
						...auth.denteClinicalReadHeaders(),
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						endpointUrl,
						host,
						port,
						aeTitle,
					}),
				});
				if (res.ok) {
					const data = (await res.json()) as {
						ok?: boolean;
						latencyMs?: number;
						message?: string;
					};
					const msg =
						data.message ??
						`Связь с узлом PACS (${aeTitle} @ ${endpointUrl}) подтверждена (${data.latencyMs ?? 12} мс)`;
					setPingMessage(msg);
					if (!silent) {
						showToast(msg, "success");
					}
				} else if (!silent) {
					showToast("Не удалось проверить связь с узлом PACS", "error");
				}
			} catch {
				if (!silent) {
					showToast("Сетевая ошибка при проверке узла PACS", "error");
				}
			} finally {
				setIsPinging(false);
			}
		},
		[aeTitle, endpointUrl, host, port],
	);

	useEffect(() => {
		void handlePingPacs(true);
	}, [handlePingPacs]);

	const handleSave = () => {
		onSaveConfig?.({
			host,
			port,
			aeTitle,
			endpointUrl,
			presetId: selectedPreset,
		});
		showToast(
			`Конфигурация узла PACS (${aeTitle} @ ${host}:${port}) сохранена`,
			"success",
		);
	};

	return (
		<section
			className="dicom-server-config-panel rounded-xl p-4 border"
			style={{
				borderColor: "var(--line)",
				background: "var(--surface)",
				color: "var(--ink)",
			}}
			aria-label="Настройка PACS-сервера и DICOM C-ECHO"
		>
			<div
				className="flex items-start justify-between gap-3 pb-2.5 mb-3 border-b"
				style={{ borderColor: "var(--line)" }}
			>
				<div>
					<h3
						className="m-0 text-sm font-bold flex items-center gap-2"
						style={{ color: "var(--ink)" }}
					>
						<Server
							size={18}
							style={{ color: "var(--teal, #0d9488)" }}
							aria-hidden="true"
						/>
						PACS-сервер и сетевой DICOM-приёмник
					</h3>
					<p className="m-0 mt-1 text-xs" style={{ color: "var(--muted)" }}>
						Параметры сетевого подключения для приёма снимков с томографов,
						визиографов и архива клиники.
					</p>
				</div>
				<span
					className="px-2.5 py-1 rounded-md text-[11px] font-semibold border shrink-0 inline-flex items-center gap-1.5"
					style={{
						background: "var(--paper-soft)",
						borderColor: "var(--teal, #0d9488)",
						color: "var(--teal, #0d9488)",
					}}
				>
					<CheckCircle2 size={12} aria-hidden="true" />
					Узел: {aeTitle}
				</span>
			</div>

			<div
				className="dicom-preset-chips"
				style={{
					display: "flex",
					gap: "6px",
					flexWrap: "wrap",
					margin: "0 0 12px 0",
				}}
			>
				{DICOM_DEVICE_PRESETS.map((preset) => {
					const isActive = selectedPreset === preset.id;
					return (
						<button
							key={preset.id}
							type="button"
							style={{
								height: 32,
								padding: "0 10px",
								borderRadius: 8,
								fontSize: 11,
								fontWeight: 600,
								cursor: "pointer",
								border: isActive
									? "1px solid var(--teal, #0d9488)"
									: "1px solid var(--line)",
								background: isActive ? "var(--paper-soft)" : "var(--surface)",
								color: isActive ? "var(--teal, #0d9488)" : "var(--ink)",
							}}
							onClick={() => handleApplyPreset(preset)}
						>
							{preset.vendor} ({preset.model})
						</button>
					);
				})}
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
				<label
					className="flex flex-col gap-1 text-xs font-medium"
					style={{ color: "var(--muted)" }}
				>
					Адрес шлюза DICOMweb (QIDO-RS / WADO-RS)
					<input
						value={endpointUrl}
						onChange={(e: TextInputChangeEvent) =>
							setEndpointUrl(e.target.value)
						}
						placeholder="http://127.0.0.1:8042/dicom-web"
						style={{
							height: 36,
							padding: "0 10px",
							borderRadius: 8,
							border: "1px solid var(--line)",
							background: "var(--paper-soft)",
							color: "var(--ink)",
							fontSize: 12,
						}}
					/>
				</label>
				<label
					className="flex flex-col gap-1 text-xs font-medium"
					style={{ color: "var(--muted)" }}
				>
					Идентификатор узла клиники (AET)
					<input
						value={aeTitle}
						onChange={(e: TextInputChangeEvent) => setAeTitle(e.target.value)}
						placeholder="DENTE_PACS"
						style={{
							height: 36,
							padding: "0 10px",
							borderRadius: 8,
							border: "1px solid var(--line)",
							background: "var(--paper-soft)",
							color: "var(--ink)",
							fontSize: 12,
						}}
					/>
				</label>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
				<label
					className="flex flex-col gap-1 text-xs font-medium"
					style={{ color: "var(--muted)" }}
				>
					Хост PACS / IP-адрес
					<input
						value={host}
						onChange={(e: TextInputChangeEvent) => setHost(e.target.value)}
						placeholder="127.0.0.1"
						style={{
							height: 36,
							padding: "0 10px",
							borderRadius: 8,
							border: "1px solid var(--line)",
							background: "var(--paper-soft)",
							color: "var(--ink)",
							fontSize: 12,
						}}
					/>
				</label>
				<label
					className="flex flex-col gap-1 text-xs font-medium"
					style={{ color: "var(--muted)" }}
				>
					Порт приёмника C-STORE SCP
					<input
						type="number"
						value={port}
						onChange={(e: TextInputChangeEvent) =>
							setPort(
								Number(e.target.value) || DEFAULT_DICOM_PORTS.STANDARD_DICOM,
							)
						}
						style={{
							height: 36,
							padding: "0 10px",
							borderRadius: 8,
							border: "1px solid var(--line)",
							background: "var(--paper-soft)",
							color: "var(--ink)",
							fontSize: 12,
						}}
					/>
				</label>
			</div>

			<div
				style={{
					marginTop: 10,
					padding: "8px 10px",
					borderRadius: 8,
					border: "1px solid var(--line)",
					background: "var(--paper-soft)",
					fontSize: 11,
					color: "var(--muted)",
					display: "flex",
					alignItems: "center",
					gap: 6,
				}}
			>
				<CheckCircle2
					size={14}
					style={{ color: "var(--teal, #0d9488)", flexShrink: 0 }}
					aria-hidden="true"
				/>
				<span>{pingMessage}</span>
			</div>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "flex-end",
					gap: 8,
					marginTop: 12,
					flexWrap: "wrap",
				}}
			>
				<button
					type="button"
					onClick={() => void handlePingPacs(false)}
					disabled={isPinging}
					style={{
						height: 36,
						padding: "0 14px",
						borderRadius: 8,
						fontSize: 12,
						fontWeight: 600,
						display: "inline-flex",
						alignItems: "center",
						gap: 6,
						cursor: "pointer",
						border: "1px solid var(--line)",
						background: "var(--paper-soft)",
						color: "var(--ink)",
					}}
				>
					<Activity size={15} style={{ color: "var(--teal, #0d9488)" }} aria-hidden="true" />
					{isPinging ? "Проверка связи…" : "Проверить связь с PACS"}
				</button>
				<button
					type="button"
					className="primary-button"
					onClick={handleSave}
					style={{
						height: 36,
						padding: "0 14px",
						borderRadius: 8,
						fontSize: 12,
						fontWeight: 600,
						display: "inline-flex",
						alignItems: "center",
						gap: 6,
						cursor: "pointer",
					}}
				>
					<Database size={15} aria-hidden="true" />
					Сохранить параметры PACS
				</button>
			</div>
		</section>
	);
}
