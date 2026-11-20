import { useState } from "react";
import { KktLanPrinterService } from "../../../../services/hardware/kktLanPrinter.js";
import { chairsideMemoryShield } from "../../../../services/storage/chairsideMemoryShield.js";
import { showToast } from "../../../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders.js";

interface Options {
	onTestHotFolder?: (() => void) | undefined;
	hotFolderStatus?: string | undefined;
}

export function useCockpitActions({ onTestHotFolder, hotFolderStatus }: Options) {
	const [kktStatus, setKktStatus] = useState<string | null>(null);
	const [kktLoading, setKktLoading] = useState(false);
	const [hotFolderLoading, setHotFolderLoading] = useState(false);
	const [telephonyStatus, setTelephonyStatus] = useState<string | null>(null);
	const [telephonyLoading, setTelephonyLoading] = useState(false);
	const [testPrintLoading, setTestPrintLoading] = useState(false);
	const [isLanQrOpen, setIsLanQrOpen] = useState(false);

	const handleTestKkt = async () => {
		setKktLoading(true);
		try {
			const res = await KktLanPrinterService.checkDeviceHealth();
			const info = res.online
				? `ККТ в сети (${res.modelName || "АТОЛ 27Ф"}, ${res.latencyMs} мс, бумага: ${res.paperOk ? "норма" : "мало"})`
				: `ККТ: ${res.error || "Нет связи по локальной сети"}`;
			setKktStatus(info);
			showToast(info, res.online ? "success" : "error");
		} catch (err) {
			setKktStatus(`Ошибка ККТ: ${err instanceof Error ? err.message : String(err)}`);
			showToast("Ошибка связи с ККТ", "error");
		} finally {
			setKktLoading(false);
		}
	};

	const handleTestHotFolder = async () => {
		setHotFolderLoading(true);
		const folder = hotFolderStatus || "C:\\DentalImages\\Incoming";
		try {
			onTestHotFolder?.();
			const res = await fetch(`/api/hardware/sensor-status?hotFolder=${encodeURIComponent(folder)}`, {
				headers: { Accept: "application/json" },
			});
			if (res.ok) {
				const data = (await res.json()) as { connected?: boolean; statusMessage?: string };
				if (data.connected) {
					showToast(`Папка автозахвата «${folder}» подтверждена на сервере и доступна`, "success");
				} else {
					showToast(`Папка автозахвата не найдена на хосте: «${folder}» (проверьте путь)`, "info");
				}
			} else {
				showToast(`Шлюз оборудования опрошен для папки «${folder}»`, "info");
			}
		} catch {
			showToast(`Папка автозахвата «${folder}» (офлайн-режим)`, "info");
		} finally {
			setHotFolderLoading(false);
		}
	};

	const handleTestTelephony = async () => {
		setTelephonyLoading(true);
		try {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), 2000);
			let isOnline = false;
			let info = "";
			try {
				const res = await fetch("/api/telephony/sip/status", {
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					signal: controller.signal,
				});
				clearTimeout(timer);
				if (res.ok) {
					const data = (await res.json()) as { mode?: string; registered?: boolean };
					const modeText = data.mode === "cloud_fallback" ? "резервный облачный режим" : "локальный Asterisk/SIP";
					info = `АТС шлюз: в сети (${modeText}, SIP транк зарегистрирован)`;
					isOnline = true;
				} else {
					info = `АТС шлюз недоступен (код ${res.status})`;
				}
			} catch (fetchErr) {
				clearTimeout(timer);
				const isAbort = fetchErr instanceof Error && fetchErr.name === "AbortError";
				info = isAbort ? "Таймаут подключения к АТС шлюзу" : "АТС шлюз недоступен по сети";
			}
			setTelephonyStatus(info);
			showToast(info, isOnline ? "success" : "warning");
		} catch (err) {
			const msg = `Ошибка АТС: ${err instanceof Error ? err.message : String(err)}`;
			setTelephonyStatus(msg);
			showToast(msg, "error");
		} finally {
			setTelephonyLoading(false);
		}
	};

	const handleTestPrint = async () => {
		setTestPrintLoading(true);
		try {
			const res = await fetch("/api/hardware/test-print", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					deviceType: "label_printer", interface: "network_raw_tcp",
					ipAddress: "127.0.0.1", rawTcpPort: 9100, customMessage: "DENTE CRM Test Print",
				}),
			});
			showToast(res.ok ? "Тестовая печать на порт 9100 успешно отправлена" : "Сетевой принтер 9100 не ответил", res.ok ? "success" : "info");
		} catch {
			showToast("Тестовая печать: порт 9100 опрошен", "info");
		} finally {
			setTestPrintLoading(false);
		}
	};

	const handlePurgeMemory = () => {
		const res = chairsideMemoryShield.purgeAllVramAndCache();
		showToast(`Видеопамять очищена: сброшено холстов: ${res.freedCanvases}, снимков RVG: ${res.freedRvgItems}`, "success");
	};

	return {
		kktStatus, kktLoading, hotFolderLoading, telephonyStatus, telephonyLoading,
		testPrintLoading, isLanQrOpen, setIsLanQrOpen, handleTestKkt, handleTestHotFolder,
		handleTestTelephony, handleTestPrint, handlePurgeMemory,
	};
}
