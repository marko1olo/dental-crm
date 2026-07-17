import React, { useState } from "react";
import { Lock, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import {
	type CryptoProCertificate,
	checkCryptoProPlugin,
	getPersonalCertificates,
	signBase64WithCertificate,
} from "../../utils/cryptoPro";

interface CryptoProSignerProps {
	diaryHash: string | null;
	isLocked: boolean;
	lockedAt: string | null;
	onLock: (certThumbprint: string, signature: string) => Promise<void>;
}

export const CryptoProSigner: React.FC<CryptoProSignerProps> = ({
	diaryHash,
	isLocked,
	lockedAt,
	onLock,
}) => {
	const [hasPlugin, setHasPlugin] = useState(false);
	const [certificates, setCertificates] = useState<CryptoProCertificate[]>([]);
	const [selectedCert, setSelectedCert] = useState("");
	const [isLoadingCerts, setIsLoadingCerts] = useState(false);
	const [isDevMode, setIsDevMode] = useState(false);
	const [showPinDialog, setShowPinDialog] = useState(false);
	const [pinCode, setPinCode] = useState("");
	const [signatureType, setSignatureType] = useState<"crypto_pro" | "pin">("pin");

	const detectPlugin = async () => {
		const detected = await checkCryptoProPlugin();
		setHasPlugin(detected);
		if (!detected) {
			setIsDevMode(true);
		}
	};

	const loadCertificates = async () => {
		setIsLoadingCerts(true);
		try {
			await detectPlugin();
			const certs = await getPersonalCertificates();
			setCertificates(certs);
			if (certs.length > 0) setSelectedCert(certs[0]?.thumbprint ?? "");
		} catch (error) {
			console.error("Ошибка загрузки сертификатов:", error);
			setIsDevMode(true);
		} finally {
			setIsLoadingCerts(false);
		}
	};

	const handleConfirmLock = async () => {
		if (signatureType === "crypto_pro") {
			if (!selectedCert && !isDevMode) {
				alert("Выберите сертификат КриптоПро");
				return;
			}
			try {
				let signature = "DEV_MOCK_SIGNATURE";
				if (!isDevMode && diaryHash) {
					signature = await signBase64WithCertificate(selectedCert, diaryHash);
				}
				await onLock(selectedCert || "DEV_CERT", signature);
				setShowPinDialog(false);
			} catch (err: any) {
				alert(`Ошибка подписания: ${err.message}`);
			}
		} else {
			if (!pinCode) {
				alert("Введите PIN-код для простой ЭП");
				return;
			}
			await onLock("PIN_SIGNATURE", `PIN:${pinCode}`);
			setShowPinDialog(false);
		}
	};

	if (isLocked) {
		return (
			<div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
				<ShieldCheck className="w-4 h-4 text-emerald-500" />
				<div>
					<div className="text-xs font-medium text-emerald-400">
						Подписано ЭЦП и защищено
					</div>
					<div className="text-[10px] text-emerald-500/70">
						{new Date(lockedAt!).toLocaleString("ru-RU")}
					</div>
				</div>
			</div>
		);
	}

	return (
		<>
			<button
				type="button"
				onClick={() => setShowPinDialog(true)}
				className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl transition-colors border border-zinc-700"
			>
				<Lock className="w-4 h-4" />
				<span>Подписать и закрыть</span>
			</button>

			{showPinDialog && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
					<div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
						<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-orange-500"></div>
						
						<h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
							<ShieldCheck className="w-6 h-6 text-rose-500" />
							Подписание дневника
						</h3>
						<p className="text-zinc-400 text-sm mb-6">
							После подписания редактирование будет заблокировано.
						</p>

						<div className="flex gap-2 mb-6 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
							<button
								type="button"
								onClick={() => setSignatureType("pin")}
								className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
									signatureType === "pin"
										? "bg-zinc-800 text-white shadow-sm"
										: "text-zinc-500 hover:text-zinc-300"
								}`}
							>
								Простая ЭП (ПИН)
							</button>
							<button
								type="button"
								onClick={() => {
									setSignatureType("crypto_pro");
									if (!hasPlugin) loadCertificates();
								}}
								className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
									signatureType === "crypto_pro"
										? "bg-zinc-800 text-white shadow-sm"
										: "text-zinc-500 hover:text-zinc-300"
								}`}
							>
								УКЭП (КриптоПро)
							</button>
						</div>

						{signatureType === "pin" ? (
							<div className="mb-6">
								<label className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">
									Ваш PIN-код сотрудника
								</label>
								<input
									type="password"
									maxLength={4}
									className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[1em] focus:ring-2 focus:ring-rose-500 focus:outline-none"
									value={pinCode}
									onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
									placeholder="••••"
								/>
							</div>
						) : (
							<div className="mb-6 space-y-4">
								{!hasPlugin && !isDevMode ? (
									<div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-start gap-3">
										<AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
										<div className="text-sm text-orange-200">
											Плагин КриптоПро ЭЦП Browser не найден. Установите расширение или используйте PIN.
										</div>
									</div>
								) : (
									<div>
										<label className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">
											Выберите сертификат
										</label>
										<select
											className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:ring-2 focus:ring-rose-500 focus:outline-none"
											value={selectedCert}
											onChange={(e) => setSelectedCert(e.target.value)}
											disabled={isLoadingCerts}
										>
											{isLoadingCerts ? (
												<option>Загрузка сертификатов...</option>
											) : certificates.length === 0 ? (
												<option value="">Нет доступных сертификатов</option>
											) : (
												certificates.map((c) => (
													<option key={c.thumbprint} value={c.thumbprint}>
														{c.subjectName} (до {new Date(c.validTo).toLocaleDateString()})
													</option>
												))
											)}
										</select>
										<button
											type="button"
											onClick={loadCertificates}
											className="mt-2 text-xs text-rose-400 hover:text-rose-300"
										>
											Обновить список
										</button>
									</div>
								)}
							</div>
						)}

						<div className="flex gap-3 pt-2">
							<button
								type="button"
								onClick={() => setShowPinDialog(false)}
								className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-colors"
							>
								Отмена
							</button>
							<button
								type="button"
								onClick={handleConfirmLock}
								className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-rose-500/20"
							>
								Подписать
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};
