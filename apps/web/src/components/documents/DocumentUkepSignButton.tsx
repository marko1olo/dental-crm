import { AlertCircle, CheckCircle2, FileSignature, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	operatorReadableErrorDetailFromUnknown,
	responseErrorMessage,
} from "../../AppHelpers";
import {
	type CryptoProCertificate,
	checkCryptoProPlugin,
	getPersonalCertificates,
	parseCryptoProError,
	signBase64WithCertificate,
} from "../../utils/cryptoPro";
import { showToast } from "../GlobalToast";

interface DocumentUkepSignButtonProps {
	documentId: string;
	onSuccess?: () => void;
}

/** Состояние чтения личного хранилища сертификатов: отказ отличается от пустоты. */
type CertificatesState = "loading" | "failed" | "ready";

/** Что делать, если хранилище не читается или в нём ничего нет. */
const CERTIFICATE_STORE_ADVICE =
	"Вставьте носитель с подписью (Рутокен или JaCarta), проверьте, что КриптоПро CSP запущен, и нажмите «Проверить снова».";

/** Общий хвост отказа подписания: документ остался без подписи, и это важно сказать. */
const SIGN_FAILURE_TAIL =
	"Документ остался без крипто-подписи. Повторите подписание, а если отказ повторится — сообщите администратору клиники.";

type PdfLoadResult =
	| { ok: true; base64: string }
	| { ok: false; reason: string };

export function DocumentUkepSignButton({
	documentId,
	onSuccess,
}: DocumentUkepSignButtonProps) {
	const [isSigning, setIsSigning] = useState(false);
	const [hasPlugin, setHasPlugin] = useState<boolean | null>(null);
	const [certificates, setCertificates] = useState<CryptoProCertificate[]>([]);
	const [selectedThumbprint, setSelectedThumbprint] = useState<string>("");
	const [certificatesState, setCertificatesState] =
		useState<CertificatesState>("loading");
	/** Причина отказа чтения хранилища, если она пригодна для человека. */
	const [certificatesFailureDetail, setCertificatesFailureDetail] =
		useState("");
	/** Причина отказа подписания. Остаётся на экране до следующей попытки. */
	const [signFailure, setSignFailure] = useState("");

	const loadCertificates = useCallback(async () => {
		setCertificatesState("loading");
		setCertificatesFailureDetail("");
		try {
			const list = await getPersonalCertificates();
			setCertificates(list);
			setSelectedThumbprint(list[0]?.thumbprint ?? "");
			setCertificatesState("ready");
		} catch (error) {
			setCertificates([]);
			setSelectedThumbprint("");
			const parsed = parseCryptoProError(error);
			setCertificatesFailureDetail(parsed.userMessage);
			setCertificatesState("failed");
			showToast("Хранилище сертификатов УКЭП не прочитано", "error", 6000);
		}
	}, []);

	const detectPlugin = useCallback(async () => {
		setHasPlugin(null);
		const detected = await checkCryptoProPlugin();
		setHasPlugin(detected);
		if (detected) await loadCertificates();
	}, [loadCertificates]);

	useEffect(() => {
		void detectPlugin();
	}, [detectPlugin]);

	/**
	 * Печатная копия выданного документа в виде base64.
	 */
	const loadIssuedPdfBase64 = async (): Promise<PdfLoadResult> => {
		let response: Response;
		try {
			response = await fetch(`/api/documents/${documentId}/pdf`);
		} catch {
			return {
				ok: false,
				reason:
					"Печатная копия документа не получена: сервер клиники не отвечает. Проверьте подключение и повторите.",
			};
		}
		if (!response.ok) {
			const reason = await responseErrorMessage(
				response,
				"Печатная копия документа не получена",
			);
			return {
				ok: false,
				reason: `${reason}. Подписать УКЭП можно только выданный документ с отметкой о подписании: сначала выдайте документ, затем повторите подписание.`,
			};
		}
		const blob = await response.blob();
		return await new Promise<PdfLoadResult>((resolve) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				const result = String(reader.result ?? "");
				const separator = result.indexOf(",");
				if (separator < 0) {
					resolve({
						ok: false,
						reason:
							"Печатная копия документа получена, но прочитать её не удалось. Откройте документ, проверьте, что печатная форма открывается, и повторите подписание.",
					});
					return;
				}
				resolve({ ok: true, base64: result.slice(separator + 1) });
			};
			reader.onerror = () =>
				resolve({
					ok: false,
					reason:
						"Печатная копия документа получена, но прочитать её не удалось. Повторите подписание, а если отказ повторится — сообщите администратору клиники.",
				});
			reader.readAsDataURL(blob);
		});
	};

	function failSigning(reason: string): void {
		setSignFailure(reason);
		showToast(reason, "error", 9000);
	}

	const selectedCert = certificates.find(
		(c) => c.thumbprint === selectedThumbprint,
	);
	const isSelectedCertExpired = selectedCert
		? new Date(selectedCert.validTo).getTime() < Date.now()
		: false;
	const isSelectedCertNonGost = selectedCert
		? selectedCert.isGost === false
		: false;

	const handleSign = async () => {
		if (!selectedThumbprint || !selectedCert) {
			failSigning(
				"Подписывать нечем: сертификат не выбран. Выберите сертификат в списке выше и повторите.",
			);
			return;
		}

		if (isSelectedCertExpired) {
			failSigning(
				`Срок действия сертификата истек (${new Date(selectedCert.validTo).toLocaleDateString("ru-RU")}). Подписание юридически ничтожно по 63-ФЗ.`,
			);
			return;
		}

		if (isSelectedCertNonGost) {
			failSigning(
				"Выбранный сертификат не соответствует ГОСТ Р 34.10-2012. Подписание медицинских документов допускается только по стандарту ГОСТ Р 34.10-2012 (63-ФЗ).",
			);
			return;
		}

		setIsSigning(true);
		setSignFailure("");
		try {
			const pdf = await loadIssuedPdfBase64();
			if (!pdf.ok) {
				failSigning(pdf.reason);
				return;
			}

			const signature = await signBase64WithCertificate(
				pdf.base64,
				selectedThumbprint,
			);

			let response: Response;
			try {
				response = await fetch(`/api/documents/${documentId}/sign-ukep`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						pkcs7Signature: signature,
						certificateSerialNumber: selectedCert.serialNumber,
						certificateSubject: selectedCert.subjectName,
						validFrom: selectedCert.validFrom,
						validTo: selectedCert.validTo,
						signatureType: "ukep",
					}),
				});
			} catch {
				failSigning(
					`Подпись УКЭП не сохранена: сервер клиники не отвечает. ${SIGN_FAILURE_TAIL}`,
				);
				return;
			}

			if (!response.ok) {
				const reason = await responseErrorMessage(
					response,
					"Подпись УКЭП не сохранена",
				);
				failSigning(`${reason}. ${SIGN_FAILURE_TAIL}`);
				return;
			}

			showToast("Документ успешно подписан УКЭП (КриптоПро)", "success");
			onSuccess?.();
		} catch (error) {
			const parsed = parseCryptoProError(error);
			if (parsed.isCancellation) {
				showToast(parsed.userMessage, "warning", 6000);
				setSignFailure(parsed.userMessage);
			} else {
				showToast(parsed.userMessage, "error", 8000);
				failSigning(`${parsed.userMessage}. ${SIGN_FAILURE_TAIL}`);
			}
		} finally {
			setIsSigning(false);
		}
	};

	if (hasPlugin === null) {
		return (
			<div className="flex items-center justify-center p-3 text-sm text-[var(--muted,#64748b)] bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] rounded-lg border border-[var(--glass-border,#e2e8f0)]">
				<Loader2 className="dente-icon-spin mr-2" size={16} />
				<span>Проверка плагина КриптоПро...</span>
			</div>
		);
	}

	if (!hasPlugin) {
		return (
			<div className="p-3.5 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30 rounded-lg text-sm">
				<div className="flex items-start text-red-800 dark:text-red-300 mb-2">
					<AlertCircle className="mr-2 shrink-0 mt-0.5" size={16} />
					<span className="font-semibold">
						Плагин КриптоПро ЭЦП Browser Plug-in не обнаружен.
					</span>
				</div>
				<p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
					Подписать документ усиленной квалифицированной подписью без него
					нельзя. Нужны установленный КриптоПро CSP и расширение для браузера.
					Установите их по инструкции, затем нажмите «Проверить снова».
				</p>
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
					<button
						type="button"
						onClick={() => void detectPlugin()}
						className="dente-button dente-button--secondary min-h-[44px] justify-center text-xs"
					>
						<RefreshCw className="mr-2" size={14} />
						<span>Проверить снова</span>
					</button>
					<a
						href="https://cryptopro.ru/products/cades/plugin"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center justify-center min-h-[44px] px-3 text-xs font-semibold text-[var(--teal,#0d9488)] hover:underline"
					>
						Инструкция по установке плагина →
					</a>
				</div>
			</div>
		);
	}

	return (
		<div className="p-3.5 border border-[var(--glass-border,#e2e8f0)] dark:border-slate-800 rounded-lg bg-[var(--paper-subtle,#f8fafc)] dark:bg-slate-900/50">
			<label
				htmlFor="ukep-cert-select"
				className="block text-xs font-semibold text-[var(--ink,#0f172a)] dark:text-slate-300 mb-1.5"
			>
				Сертификат электронной подписи врача (63-ФЗ):
			</label>

			{certificatesState === "loading" ? (
				<div className="flex items-center text-xs text-[var(--muted,#64748b)] p-3">
					<Loader2 className="dente-icon-spin mr-2" size={14} />
					Чтение личного хранилища сертификатов КриптоПро...
				</div>
			) : certificatesState === "failed" ? (
				<div
					className="text-xs p-3 border border-red-200 dark:border-red-900/30 rounded mb-3 text-red-800 dark:text-red-300 bg-red-50/50 dark:bg-red-950/20"
					role="status"
					aria-live="polite"
				>
					<strong className="block mb-1 font-semibold">
						Хранилище сертификатов не прочитано — это не значит, что
						сертификатов нет.
					</strong>
					{certificatesFailureDetail ? (
						<p className="mb-1.5 leading-relaxed">
							{certificatesFailureDetail}
						</p>
					) : null}
					<p className="mb-2.5 text-slate-600 dark:text-slate-400">
						{CERTIFICATE_STORE_ADVICE}
					</p>
					<button
						type="button"
						onClick={() => void loadCertificates()}
						className="dente-button dente-button--secondary min-h-[44px] justify-center text-xs w-full sm:w-auto"
					>
						<RefreshCw className="mr-2" size={14} />
						<span>Проверить снова</span>
					</button>
				</div>
			) : certificates.length === 0 ? (
				<div
					className="text-xs p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded mb-3 text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-950/50"
					role="status"
					aria-live="polite"
				>
					<strong className="block mb-1 font-semibold text-[var(--ink,#0f172a)] dark:text-slate-200">
						Хранилище прочитано, личных сертификатов в нём нет.
					</strong>
					<p className="mb-2.5 leading-relaxed">
						Сертификат подписи выдаёт удостоверяющий центр, и он должен быть
						установлен в личное хранилище этого компьютера.{" "}
						{CERTIFICATE_STORE_ADVICE}
					</p>
					<button
						type="button"
						onClick={() => void loadCertificates()}
						className="dente-button dente-button--secondary min-h-[44px] justify-center text-xs w-full sm:w-auto"
					>
						<RefreshCw className="mr-2" size={14} />
						<span>Проверить снова</span>
					</button>
				</div>
			) : (
				<>
					<select
						id="ukep-cert-select"
						value={selectedThumbprint}
						onChange={(e) => setSelectedThumbprint(e.target.value)}
						disabled={isSigning}
						className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-2 mb-2 focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)] text-[var(--ink,#0f172a)] dark:text-slate-100"
					>
						{certificates.map((cert) => {
							const expiry = new Date(cert.validTo).toLocaleDateString(
								"ru-RU",
							);
							const cleanSubject =
								cert.subjectName
									.split(",")
									.find((part) => part.startsWith("CN="))
									?.replace("CN=", "") || cert.subjectName;

							const algBadge = cert.isGost
								? "ГОСТ Р 34.10-2012"
								: "НЕ ГОСТ";

							return (
								<option key={cert.thumbprint} value={cert.thumbprint}>
									{cleanSubject} — {algBadge} (до {expiry})
								</option>
							);
						})}
					</select>

					{isSelectedCertExpired ? (
						<div className="p-2.5 mb-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
							<AlertCircle size={14} className="shrink-0 mt-0.5" />
							<div>
								<strong>Срок действия сертификата истек:</strong>{" "}
								{new Date(selectedCert!.validTo).toLocaleDateString(
									"ru-RU",
								)}
								. Подписание юридически ничтожно по ст. 14 63-ФЗ.
							</div>
						</div>
					) : isSelectedCertNonGost ? (
						<div className="p-2.5 mb-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
							<ShieldAlert size={14} className="shrink-0 mt-0.5" />
							<div>
								<strong>
									Несовместимый алгоритм (
									{selectedCert?.algorithmName ||
										selectedCert?.algorithmOid ||
										"RSA"}
									):
								</strong>{" "}
								Для заверения медицинских документов 63-ФЗ требует
								квалифицированные сертификаты по ГОСТ Р 34.10-2012.
							</div>
						</div>
					) : (
						<div className="mb-2.5 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
							<CheckCircle2 size={12} className="shrink-0" />
							<span>
								Сертификат ГОСТ Р 34.10-2012 действителен до{" "}
								{selectedCert
									? new Date(selectedCert.validTo).toLocaleDateString(
											"ru-RU",
										)
									: ""}
							</span>
						</div>
					)}
				</>
			)}

			{signFailure ? (
				<p
					className="text-xs p-2.5 border border-red-200 dark:border-red-900/30 rounded mb-3 text-red-800 dark:text-red-300 bg-red-50/50 dark:bg-red-950/20 leading-relaxed"
					role="status"
					aria-live="polite"
				>
					{signFailure}
				</p>
			) : null}

			<button
				type="button"
				onClick={handleSign}
				disabled={
					isSigning ||
					!selectedThumbprint ||
					isSelectedCertExpired ||
					isSelectedCertNonGost
				}
				className="dente-button dente-button--primary min-h-[44px] w-full justify-center text-xs font-semibold"
			>
				{isSigning ? (
					<>
						<Loader2 className="dente-icon-spin mr-2" size={16} />
						<span>Идет подписание... Введите PIN-код на токене</span>
					</>
				) : (
					<>
						<FileSignature className="mr-2" size={16} />
						<span>Подписать УКЭП (КриптоПро)</span>
					</>
				)}
			</button>
		</div>
	);
}

