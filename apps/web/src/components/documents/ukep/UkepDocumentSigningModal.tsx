/**
 * UkepDocumentSigningModal.tsx — Каноническая студия подписания медицинских документов УКЭП врача
 * Мандаты: 8b (Sweet Spot <= 350 строк), 8e (Автономия врача), 8am (1 Primary CTA), 8ze/8al (Apple HIG), [CRY-01]..[CRY-03].
 */

import React from "react";
import {
	ShieldCheck,
	KeyRound,
	FileText,
	CheckCircle2,
	Printer,
	RefreshCw,
	X,
	Lock,
	AlertCircle,
	ExternalLink,
	Fingerprint,
} from "lucide-react";
import { useUkepSigningEngine } from "./useUkepSigningEngine";

export interface UkepDocumentSigningModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onPrintPaper?: ((docId: string) => void) | undefined;
	readonly patientId?: string | null | undefined;
	readonly patientFullName?: string | null | undefined;
}

export const UkepDocumentSigningModal: React.FC<UkepDocumentSigningModalProps> = ({
	isOpen,
	onClose,
	onPrintPaper,
	patientId,
	patientFullName,
}) => {
	const engine = useUkepSigningEngine({ patientId, patientFullName });

	if (!isOpen) return null;

	const {
		documents,
		selectedDoc,
		selectedDocId,
		setSelectedDocId,
		certificates,
		selectedCert,
		selectedThumbprint,
		setSelectedThumbprint,
		pinCode,
		setPinCode,
		hasPlugin,
		isCheckingPlugin,
		isSigning,
		statusMessage,
		errorMessage,
		detectCryptoPro,
		signSelectedDocumentUkep,
		signSelectedDocumentPep,
	} = engine;

	return (
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
			data-testid="ukep-signing-modal-root"
		>
			<div
				className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-2xl overflow-hidden"
				role="dialog"
				aria-modal="true"
				aria-labelledby="ukep-modal-title"
			>
				{/* Шапка модалки */}
				<header className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-xl bg-teal-500/10 text-[var(--primary)] flex items-center justify-center shrink-0 border border-teal-500/20">
							<ShieldCheck className="w-4 h-4" />
						</div>
						<div>
							<h2 id="ukep-modal-title" className="text-sm sm:text-base font-bold tracking-tight">
								Юридическая электронная подпись врача (УКЭП ГОСТ)
							</h2>
							<p className="text-xs text-[var(--muted)]">
								63-ФЗ «Об электронной подписи» · КриптоПро CSP / Нативный CLI-мост
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-subtle)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
						aria-label="Закрыть окно"
					>
						<X className="w-5 h-5" />
					</button>
				</header>

				{/* Тело студии */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
					{/* Индикатор статуса СКЗИ КриптоПро */}
					<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-wrap items-center justify-between gap-3">
						<div className="flex items-center gap-2.5">
							<Fingerprint className={`w-5 h-5 ${hasPlugin ? "text-teal-600 dark:text-teal-400" : "text-amber-500"}`} />
							<div>
								<div className="text-xs font-bold">
									{isCheckingPlugin
										? "Опрос криптопровайдера КриптоПро CSP..."
										: hasPlugin
										? "Криптопровайдер готов к работе (ГОСТ Р 34.10-2012)"
										: "Криптопровайдер не обнаружен"}
								</div>
								<div className="text-[11px] text-[var(--muted)]">
									{hasPlugin
										? "Доступен браузерный плагин CAdES и нативный CLI-мост Fastify"
										: "Врач может подписать ПЭП в 1 клик или распечатать бумажный бланк без блокировок"}
								</div>
							</div>
						</div>

						<button
							type="button"
							onClick={() => void detectCryptoPro()}
							disabled={isCheckingPlugin}
							className="secondary-button text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-subtle)] flex items-center gap-1.5 transition-colors min-h-[36px]"
						>
							<RefreshCw className={`w-3.5 h-3.5 ${isCheckingPlugin ? "animate-spin" : ""}`} />
							<span>Обновить статус</span>
						</button>
					</div>

					{/* Сетка: Список документов и панель подписания */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
						{/* Левая колонка: Документы для подписания */}
						<div className="flex flex-col gap-2.5">
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
								Документы приёма ({documents.length})
							</label>

							{documents.length > 0 ? (
								<div className="flex flex-col gap-2">
									{documents.map((doc) => {
										const isSelected = doc.id === selectedDocId;
										const isSignedUkep = doc.status === "signed_ukep";
										const isSignedPep = doc.status === "signed_pep";

										return (
											<div
												key={doc.id}
												onClick={() => setSelectedDocId(doc.id)}
												className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
													isSelected
														? "border-[var(--primary)] bg-teal-500/5 shadow-xs"
														: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)]"
												}`}
												role="button"
												tabIndex={0}
											>
												<div className="flex items-center justify-between gap-2 mb-1">
													<span className="text-xs font-bold line-clamp-1">{doc.title}</span>
													{isSignedUkep ? (
														<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 shrink-0">
															УКЭП ГОСТ
														</span>
													) : isSignedPep ? (
														<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 shrink-0">
															ПЭП врача
														</span>
													) : (
														<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 shrink-0">
															Черновик
														</span>
													)}
												</div>

												<div className="text-[11px] text-[var(--muted)] flex items-center justify-between">
													<span>{doc.documentNumber} · {doc.patientFullName}</span>
													<span>{doc.date}</span>
												</div>

												{doc.signerFullName && (
													<div className="text-[10px] text-teal-600 dark:text-teal-400 mt-1 line-clamp-1 font-mono">
														Подписал: {doc.signerFullName}
													</div>
												)}
											</div>
										);
									})}
								</div>
							) : (
								<div
									className="p-8 rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper)] text-center flex flex-col items-center justify-center gap-2.5"
									data-testid="ukep-empty-state"
								>
									<FileText className="w-8 h-8 text-[var(--muted)]" />
									<div className="text-xs font-bold text-[var(--ink)]">Нет документов для подписания</div>
									<p className="text-[11px] text-[var(--muted)] max-w-xs">
										Все документы приёма уже подписаны либо ещё не сформированы.
									</p>
								</div>
							)}
						</div>

						{/* Правая колонка: Сертификат, PIN и хэш */}
						<div className="flex flex-col gap-3.5 p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
									Квалифицированный сертификат
								</span>
								<KeyRound className="w-4 h-4 text-[var(--muted)]" />
							</div>

							{certificates.length > 0 ? (
								<div className="flex flex-col gap-1.5">
									<label htmlFor="ukep-cert-select" className="text-xs font-medium">
										Выберите сертификат врача:
									</label>
									<select
										id="ukep-cert-select"
										value={selectedThumbprint}
										onChange={(e) => setSelectedThumbprint(e.target.value)}
										className="w-full text-xs p-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--primary)]"
									>
										{certificates.map((cert) => (
											<option key={cert.thumbprint} value={cert.thumbprint}>
												{cert.subjectName || cert.name} ({cert.serialNumber || cert.thumbprint.slice(0, 8)})
											</option>
										))}
									</select>
									{selectedCert && (
										<div className="text-[11px] text-[var(--muted)] mt-1 flex flex-col gap-0.5">
											<div><strong>Действителен до:</strong> {new Date(selectedCert.validTo).toLocaleDateString("ru-RU")}</div>
											<div><strong>Издатель:</strong> {selectedCert.issuerName || "Минцифры России"}</div>
											<div className="font-mono text-[10px]"><strong>Отпечаток:</strong> {selectedCert.thumbprint}</div>
										</div>
									)}
								</div>
							) : (
								<div className="p-3 rounded-lg border border-dashed border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--muted)] leading-relaxed">
									Личные сертификаты в хранилище КриптоПро не обнаружены. Проверьте подключение Рутокен или JaCarta к USB-порту либо используйте ПЭП / печать на бумагу.
								</div>
							)}

							{/* Поле PIN-кода токена */}
							<div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--line)]">
								<label htmlFor="ukep-pin-input" className="text-xs font-medium flex items-center justify-between">
									<span>ПИН-код контейнера / токена:</span>
									<span className="text-[11px] text-[var(--muted)]">(если установлен на токене)</span>
								</label>
								<input
									id="ukep-pin-input"
									type="password"
									value={pinCode}
									onChange={(e) => setPinCode(e.target.value)}
									placeholder="Стандартный ПИН: 12345678"
									className="w-full text-xs p-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--primary)]"
								/>
							</div>

							{/* Хэш документа */}
							{selectedDoc && (
								<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-1">
									<div className="text-[11px] font-bold text-[var(--muted)] flex items-center justify-between">
										<span>Хэш документа (ГОСТ Стрибог 256):</span>
										<Lock className="w-3 h-3 text-teal-600 dark:text-teal-400" />
									</div>
									<div className="text-[10px] font-mono break-all text-[var(--ink)]">
										{selectedDoc.hashHex}
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Уведомления */}
					{statusMessage && (
						<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-800 dark:text-teal-200 text-xs flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
							<span>{statusMessage}</span>
						</div>
					)}

					{errorMessage && (
						<div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
							<AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
							<span>{errorMessage}</span>
						</div>
					)}
				</div>

				{/* Подвал с действиями — Строго 1 Primary CTA */}
				<footer className="px-4 sm:px-6 py-3.5 border-t border-[var(--line)] bg-[var(--paper-soft)] flex flex-wrap items-center justify-between gap-3 shrink-0">
					<div className="flex flex-wrap items-center gap-2">
						{/* Вторичное действие: ПЭП врача */}
						<button
							type="button"
							onClick={signSelectedDocumentPep}
							className="secondary-button text-xs font-semibold px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-subtle)] flex items-center gap-1.5 transition-colors min-h-[44px] sm:min-h-[36px]"
						>
							<FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
							<span>Подписать ПЭП в 1 клик</span>
						</button>

						{/* Вторичное действие: Печать на бумагу */}
						<button
							type="button"
							onClick={() => onPrintPaper?.(selectedDocId)}
							className="secondary-button text-xs font-semibold px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-subtle)] flex items-center gap-1.5 transition-colors min-h-[44px] sm:min-h-[36px]"
						>
							<Printer className="w-4 h-4 text-[var(--muted)]" />
							<span>Печать на бумагу</span>
						</button>
					</div>

					{/* Ровно 1 Primary CTA кнопка (Мандат 8am, 8e) */}
					<button
						type="button"
						onClick={signSelectedDocumentUkep}
						disabled={isSigning}
						className="primary-button text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-dark,#0f766e)] text-white flex items-center gap-2 shadow-md transition-all min-h-[44px] sm:min-h-[36px] cursor-pointer"
						data-testid="btn-ukep-sign-primary"
					>
						<ShieldCheck className="w-4 h-4 shrink-0" />
						<span>{isSigning ? "Идёт подписание..." : "Подписать документ УКЭП врача"}</span>
					</button>
				</footer>
			</div>
		</div>
	);
};

export default UkepDocumentSigningModal;
