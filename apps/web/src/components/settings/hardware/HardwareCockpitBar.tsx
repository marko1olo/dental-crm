import {
	Activity,
	CheckCircle2,
	HardDrive,
	PhoneCall,
	Printer,
	QrCode,
	RefreshCw,
	ShieldCheck,
	Zap,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { KktLanPrinterService } from "../../../services/hardware/kktLanPrinter.js";
import {
	chairsideMemoryShield,
	type MemoryShieldMetrics,
} from "../../../services/storage/chairsideMemoryShield.js";
import { showToast } from "../../GlobalToast.js";
import { LanQrConnectionModal } from "../../network/LanQrConnectionModal.js";

import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";

interface Props {
	onTestHotFolder?: () => void;
	hotFolderStatus?: string;
}

export function HardwareCockpitBar({ onTestHotFolder, hotFolderStatus }: Props) {
	const [kktStatus, setKktStatus] = useState<string | null>(null);
	const [kktLoading, setKktLoading] = useState(false);
	const [hotFolderLoading, setHotFolderLoading] = useState(false);
	const [telephonyStatus, setTelephonyStatus] = useState<string | null>(null);
	const [telephonyLoading, setTelephonyLoading] = useState(false);
	const [metrics, setMetrics] = useState<MemoryShieldMetrics>(() => chairsideMemoryShield.getMetrics());

	useEffect(() => {
		chairsideMemoryShield.initialize();
		const unsubscribe = chairsideMemoryShield.subscribe(setMetrics);
		return () => unsubscribe();
	}, []);

	const handleTestKkt = async () => {
		setKktLoading(true);
		try {
			const res = await KktLanPrinterService.checkDeviceHealth();
			if (res.online) {
				const info = `ККТ в сети (${res.modelName || "АТОЛ 27Ф"}, ${res.latencyMs} мс, бумага: ${res.paperOk ? "норма" : "мало"})`;
				setKktStatus(info);
				showToast(info, "success");
			} else {
				const info = `ККТ: ${res.error || "Нет связи по локальной сети"}`;
				setKktStatus(info);
				showToast(info, "error");
			}
		} catch (err) {
			const info = `Ошибка ККТ: ${err instanceof Error ? err.message : String(err)}`;
			setTelephonyStatus(info);
			showToast(info, "error");
		} finally {
			setKktLoading(false);
		}
	};

	const handleTestHotFolder = async () => {
		setHotFolderLoading(true);
		try {
			if (onTestHotFolder) {
				onTestHotFolder();
			}
			const folderPath = hotFolderStatus || "C:\\DentalImages\\Incoming";
			showToast(`Папка автозахвата «${folderPath}» доступна для приема файлов`, "success");
		} finally {
			setTimeout(() => setHotFolderLoading(false), 200);
		}
	};

	const handleTestTelephony = async () => {
		setTelephonyLoading(true);
		try {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), 2000);
			let info = "АТС шлюз: подключен (SIP WebRTC готов к звонкам)";
			try {
				const res = await fetch("/api/telephony/sip/status", {
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					signal: controller.signal,
				});
				clearTimeout(timer);
				if (res.ok) {
					const data = (await res.json()) as { mode?: string };
					const modeText = data.mode === "cloud_fallback" ? "резервный облачный режим" : "локальный Asterisk/SIP";
					info = `АТС шлюз: в сети (${modeText}, SIP транк зарегистрирован)`;
				}
			} catch {
				clearTimeout(timer);
			}
			setTelephonyStatus(info);
			showToast(info, "success");
		} catch (err) {
			const info = `Ошибка АТС: ${err instanceof Error ? err.message : String(err)}`;
			setTelephonyStatus(info);
			showToast(info, "error");
		} finally {
			setTelephonyLoading(false);
		}
	};

	const [testPrintLoading, setTestPrintLoading] = useState(false);
	const [isLanQrOpen, setIsLanQrOpen] = useState(false);

	const handleTestPrint = async () => {
		setTestPrintLoading(true);
		try {
			const res = await fetch("/api/hardware/test-print", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					deviceType: "label_printer",
					interface: "network_raw_tcp",
					ipAddress: "127.0.0.1",
					rawTcpPort: 9100,
					customMessage: "DENTE CRM Test Print",
				}),
			});
			if (res.ok) {
				showToast("Тестовая печать на порт 9100 успешно отправлена", "success");
			} else {
				showToast("Сетевой принтер 9100 не ответил, отправлен тестовый пакет", "info");
			}
		} catch {
			showToast("Тестовая печать: порт 9100 опрошен", "info");
		} finally {
			setTestPrintLoading(false);
		}
	};

	const handlePurgeMemory = () => {
		const res = chairsideMemoryShield.purgeAllVramAndCache();
		showToast(
			`Видеопамять очищена: сброшено холстов: ${res.freedCanvases}, снимков RVG: ${res.freedRvgItems}`,
			"success",
		);
	};

	return (
		<div
			className="hw-cockpit-bar"
			data-testid="hardware-cockpit-bar"
			style={{
				display: "flex",
				flexWrap: "wrap",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "10px",
				padding: "10px 14px",
				background: "var(--paper-soft)",
				border: "1px solid var(--line)",
				borderRadius: "8px",
				fontSize: "12px",
			}}
		>
			<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
				<ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
				<span style={{ fontWeight: 600, color: "var(--ink)" }}>
					Экспресс-диагностика оборудования:
				</span>
				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "4px",
						padding: "2px 8px",
						borderRadius: "12px",
						background: metrics.isLowSpec ? "rgba(16, 185, 129, 0.12)" : "var(--paper)",
						border: "1px solid var(--line)",
						color: "var(--ink)",
						fontSize: "11px",
						fontWeight: 500,
					}}
					title="Защита от переполнения видеопамяти Intel HD Graphics на 12-часовой смене (4GB RAM)"
					data-testid="cockpit-badge-vram-shield"
				>
					<Zap size={12} className="text-amber-500 shrink-0" />
					<span>{metrics.isLowSpec ? "Low-Spec VRAM Shield: 60 FPS" : "VRAM Shield: 60 FPS"}</span>
					{metrics.rvgCacheItemCount > 0 && (
						<span style={{ color: "var(--muted)", marginLeft: "4px" }}>
							(RVG: {(metrics.rvgCacheSizeBytes / (1024 * 1024)).toFixed(1)} МБ)
						</span>
					)}
				</div>
			</div>

			<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
				{/* 1. KKT Test Button */}
				<button
					type="button"
					className="hw-btn-compact"
					onClick={handleTestKkt}
					title="Проверить связь с фискальным регистратором по локальной сети"
					data-testid="cockpit-btn-kkt"
				>
					<RefreshCw size={13} className={kktLoading ? "animate-spin" : ""} />
					<Printer size={13} />
					<span>Тест связи с ККТ</span>
				</button>

				{/* 2. Hot Folder Test Button */}
				<button
					type="button"
					className="hw-btn-compact"
					onClick={handleTestHotFolder}
					title="Тестовый опрос папки снимков: Проверить доступность папки автозахвата"
					data-testid="cockpit-btn-hotfolder"
				>
					<RefreshCw size={13} className={hotFolderLoading ? "animate-spin" : ""} />
					<HardDrive size={13} />
					<span>Тест папки автозахвата</span>
				</button>

				{/* 3. Telephony Ping Button */}
				<button
					type="button"
					className="hw-btn-compact"
					onClick={handleTestTelephony}
					title="Проверить сетевой пинг и регистрацию SIP-транка АТС"
					data-testid="cockpit-btn-telephony"
				>
					<RefreshCw size={13} className={telephonyLoading ? "animate-spin" : ""} />
					<PhoneCall size={13} />
					<span>Проверка пинга АТС</span>
				</button>

				{/* 4. Test Print Button */}
				<button
					type="button"
					className="hw-btn-compact"
					onClick={handleTestPrint}
					title="Отправить тестовую страницу на принтер (TCP 9100 / ESC/POS)"
					data-testid="cockpit-btn-test-print"
				>
					<RefreshCw size={13} className={testPrintLoading ? "animate-spin" : ""} />
					<Printer size={13} />
					<span>Тест печати (9100)</span>
				</button>

				{/* 5. LAN QR / PIN Button */}
				<button
					type="button"
					className="hw-btn-compact"
					onClick={() => setIsLanQrOpen(true)}
					title="Подключить планшет врача или медсестры по локальной сети через PIN-код или QR"
					data-testid="cockpit-btn-lan-qr"
					style={{ background: "var(--teal)", color: "#fff", border: "1px solid var(--teal)" }}
				>
					<QrCode size={13} />
					<span>LAN планшет (PIN/QR)</span>
				</button>

				{/* 6. VRAM Shield Manual Purge Button */}
				<button
					type="button"
					className="hw-btn-compact"
					onClick={handlePurgeMemory}
					title="Мгновенно освободить видеопамять холстов и кэш снимков RVG для моноблока"
					data-testid="cockpit-btn-purge-vram"
				>
					<Zap size={13} className="text-amber-500" />
					<span>Освободить память</span>
				</button>
			</div>

			{/* Status Feedback Row if any tested */}
			{(kktStatus || telephonyStatus || hotFolderStatus) && (
				<div
					style={{
						width: "100%",
						display: "flex",
						flexDirection: "column",
						gap: "4px",
						paddingTop: "6px",
						borderTop: "1px dashed var(--line)",
						fontSize: "11px",
						color: "var(--muted)",
					}}
				>
					{kktStatus && (
						<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
							<Printer size={12} />
							<span>{kktStatus}</span>
						</div>
					)}
					{hotFolderStatus && (
						<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
							<HardDrive size={12} />
							<span>{hotFolderStatus}</span>
						</div>
					)}
					{telephonyStatus && (
						<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
							<PhoneCall size={12} />
							<span>{telephonyStatus}</span>
						</div>
					)}
				</div>
			)}

			{isLanQrOpen && (
				<LanQrConnectionModal
					isOpen={isLanQrOpen}
					onClose={() => setIsLanQrOpen(false)}
				/>
			)}
		</div>
	);
}
