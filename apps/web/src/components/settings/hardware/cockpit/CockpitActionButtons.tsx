import React from "react";
import { HardDrive, PhoneCall, Printer, QrCode, RefreshCw, Zap } from "lucide-react";

interface Props {
	kktLoading: boolean;
	hotFolderLoading: boolean;
	telephonyLoading: boolean;
	testPrintLoading: boolean;
	onTestKkt: () => void;
	onTestHotFolder: () => void;
	onTestTelephony: () => void;
	onTestPrint: () => void;
	onOpenLanQr: () => void;
	onPurgeMemory: () => void;
}

export const CockpitActionButtons: React.FC<Props> = ({
	kktLoading,
	hotFolderLoading,
	telephonyLoading,
	testPrintLoading,
	onTestKkt,
	onTestHotFolder,
	onTestTelephony,
	onTestPrint,
	onOpenLanQr,
	onPurgeMemory,
}) => {
	return (
		<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
			<button
				type="button"
				className="hw-btn-compact"
				onClick={onTestKkt}
				title="Проверить связь с кассовым аппаратом по локальной сети"
				data-testid="cockpit-btn-kkt"
			>
				<RefreshCw size={13} className={kktLoading ? "animate-spin" : ""} />
				<Printer size={13} />
				<span>Тест связи с ККТ</span>
			</button>

			<button
				type="button"
				className="hw-btn-compact"
				onClick={onTestHotFolder}
				title="Тестовый опрос папки снимков: Проверить доступность папки автозахвата"
				data-testid="cockpit-btn-hotfolder"
			>
				<RefreshCw size={13} className={hotFolderLoading ? "animate-spin" : ""} />
				<HardDrive size={13} />
				<span>Тест папки автозахвата</span>
			</button>

			<button
				type="button"
				className="hw-btn-compact"
				onClick={onTestTelephony}
				title="Проверить сетевой пинг и регистрацию SIP-транка АТС"
				data-testid="cockpit-btn-telephony"
			>
				<RefreshCw size={13} className={telephonyLoading ? "animate-spin" : ""} />
				<PhoneCall size={13} />
				<span>Проверка пинга АТС</span>
			</button>

			<button
				type="button"
				className="hw-btn-compact"
				onClick={onTestPrint}
				title="Отправить тестовую страницу на принтер (TCP 9100 / ESC/POS)"
				data-testid="cockpit-btn-test-print"
			>
				<RefreshCw size={13} className={testPrintLoading ? "animate-spin" : ""} />
				<Printer size={13} />
				<span>Тест печати (9100)</span>
			</button>

			<button
				type="button"
				className="hw-btn-compact"
				onClick={onOpenLanQr}
				title="Подключить планшет врача или медсестры по локальной сети через PIN-код или QR"
				data-testid="cockpit-btn-lan-qr"
				style={{ background: "var(--teal)", color: "#fff", border: "1px solid var(--teal)" }}
			>
				<QrCode size={13} />
				<span>LAN планшет (PIN/QR)</span>
			</button>

			<button
				type="button"
				className="hw-btn-compact"
				onClick={onPurgeMemory}
				title="Мгновенно освободить видеопамять холстов и кэш снимков RVG для моноблока"
				data-testid="cockpit-btn-purge-vram"
			>
				<Zap size={13} className="text-amber-500" />
				<span>Освободить память</span>
			</button>
		</div>
	);
};
