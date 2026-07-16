import { AlertCircle, FileSignature, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	type CryptoProCertificate,
	checkCryptoProPlugin,
	getPersonalCertificates,
	signBase64WithCertificate,
} from "../../utils/cryptoPro";
import { showToast } from "../GlobalToast";

interface DocumentUkepSignButtonProps {
	documentId: string;
	onSuccess?: () => void;
}

export function DocumentUkepSignButton({
	documentId,
	onSuccess,
}: DocumentUkepSignButtonProps) {
	const [isSigning, setIsSigning] = useState(false);
	const [hasPlugin, setHasPlugin] = useState<boolean | null>(null);
	const [certificates, setCertificates] = useState<CryptoProCertificate[]>([]);
	const [selectedThumbprint, setSelectedThumbprint] = useState<string>("");
	const [isLoadingCerts, setIsLoadingCerts] = useState(false);
	const [isDevMode, setIsDevMode] = useState(false);

	const loadCertificates = useCallback(async () => {
		try {
			setIsLoadingCerts(true);
			const list = await getPersonalCertificates();
			setCertificates(list);
			const firstCert = list[0];
			if (firstCert) {
				setSelectedThumbprint(firstCert.thumbprint);
			}
		} catch (e: any) {
			console.warn("Failed to load personal certificates:", e);
			showToast("Не удалось загрузить список сертификатов УКЭП", "error");
		} finally {
			setIsLoadingCerts(false);
		}
	}, []);

	useEffect(() => {
		setIsDevMode(Boolean(import.meta.env.DEV));

		async function detectPlugin() {
			const detected = await checkCryptoProPlugin();
			setHasPlugin(detected);
			if (detected) {
				await loadCertificates();
			}
		}
		void detectPlugin();
	}, [loadCertificates]);

	// Convert file blob to base64 string
	const getPdfBase64 = async (): Promise<string> => {
		const response = await fetch(`/api/documents/${documentId}/pdf`);
		if (!response.ok) {
			throw new Error("Не удалось загрузить PDF файл документа с сервера.");
		}
		const blob = await response.blob();
		return new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				const result = reader.result as string;
				const base64Data = result.substring(result.indexOf(",") + 1);
				resolve(base64Data);
			};
			reader.onerror = () =>
				reject(new Error("Ошибка при обработке PDF файла."));
			reader.readAsDataURL(blob);
		});
	};

	const handleSign = async () => {
		try {
			setIsSigning(true);
			let signature = "";

			if (hasPlugin && selectedThumbprint) {
				// Real signing flow
				const base64Pdf = await getPdfBase64();
				signature = await signBase64WithCertificate(
					base64Pdf,
					selectedThumbprint,
				);
			} else if (isDevMode) {
				// Dev fallback mode
				await new Promise((resolve) => setTimeout(resolve, 1500));
				signature = `MIIB_DEV_MOCK_SIGNATURE_${btoa(documentId)}_==`;
				showToast(
					"Использована тестовая подпись (режим разработки)",
					"warning",
				);
			} else {
				throw new Error(
					"Подписание невозможно: отсутствует плагин или сертификат.",
				);
			}

			const response = await fetch(`/api/documents/${documentId}/sign-ukep`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ pkcs7Signature: signature }),
			});

			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				throw new Error(err.message || "Ошибка сохранения подписи на сервере.");
			}

			showToast("Документ успешно подписан УКЭП (КриптоПро)", "success");
			onSuccess?.();
		} catch (error: any) {
			console.error("UKEP Sign Error:", error);
			showToast(error.message || "Не удалось подписать документ", "error");
		} finally {
			setIsSigning(false);
		}
	};

	if (hasPlugin === null) {
		return (
			<div className="flex items-center justify-center p-2 text-sm text-slate-500">
				<Loader2 className="dente-icon-spin mr-2" size={16} />
				<span>Проверка плагина КриптоПро...</span>
			</div>
		);
	}

	if (!hasPlugin) {
		return (
			<div className="p-3 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30 rounded-lg text-sm">
				<div className="flex items-start text-red-800 dark:text-red-300 mb-2">
					<AlertCircle className="mr-2 shrink-0 mt-0.5" size={16} />
					<span>Плагин КриптоПро ЭЦП Browser Plug-in не обнаружен.</span>
				</div>
				<p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
					Для подписания УКЭП необходимо установить плагин КриптоПро CSP и
					соответствующее расширение для браузера.
				</p>
				{isDevMode ? (
					<button
						type="button"
						onClick={handleSign}
						disabled={isSigning}
						className="dente-button dente-button--secondary dente-button--small w-full justify-center"
					>
						{isSigning ? (
							<Loader2 className="dente-icon-spin mr-2" size={16} />
						) : (
							<FileSignature className="mr-2" size={16} />
						)}
						<span>
							{isSigning ? "Подписание..." : "Тестовое подписание (DEV)"}
						</span>
					</button>
				) : (
					<a
						href="https://cryptopro.ru/products/cades/plugin"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-block text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
					>
						Инструкция по установке плагина →
					</a>
				)}
			</div>
		);
	}

	return (
		<div className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/50">
			<label
				htmlFor="ukep-cert-select"
				className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
			>
				Выберите сертификат УКЭП:
			</label>
			{isLoadingCerts ? (
				<div className="flex items-center text-xs text-slate-400 p-2">
					<Loader2 className="dente-icon-spin mr-2" size={14} />
					Загрузка хранилища сертификатов...
				</div>
			) : certificates.length === 0 ? (
				<div className="text-xs text-red-500 p-2 border border-dashed border-red-200 rounded mb-2">
					Личные сертификаты в хранилище не найдены.
				</div>
			) : (
				<select
					id="ukep-cert-select"
					value={selectedThumbprint}
					onChange={(e) => setSelectedThumbprint(e.target.value)}
					disabled={isSigning}
					className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2 py-1.5 mb-3 focus:outline-none focus:ring-1 focus:ring-emerald-500"
				>
					{certificates.map((cert) => {
						const expiry = new Date(cert.validTo).toLocaleDateString("ru-RU");
						const cleanSubject =
							cert.subjectName
								.split(",")
								.find((part) => part.startsWith("CN="))
								?.replace("CN=", "") || cert.subjectName;

						return (
							<option key={cert.thumbprint} value={cert.thumbprint}>
								{cleanSubject} (до {expiry})
							</option>
						);
					})}
				</select>
			)}

			<button
				type="button"
				onClick={handleSign}
				disabled={isSigning || (!selectedThumbprint && !isDevMode)}
				className="dente-button dente-button--primary dente-button--small w-full justify-center"
			>
				{isSigning ? (
					<Loader2 className="dente-icon-spin mr-2" size={16} />
				) : (
					<FileSignature className="mr-2" size={16} />
				)}
				<span>
					{isSigning ? "Подписание..." : "Подписать УКЭП (КриптоПро)"}
				</span>
			</button>
		</div>
	);
}
