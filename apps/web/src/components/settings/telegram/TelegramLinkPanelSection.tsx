import React, { type ChangeEvent } from "react";
import { Bot, Copy, Download, ExternalLink, RefreshCw } from "lucide-react";
import { EmptyState } from "../../EmptyState";

type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;

export interface TelegramLinkPanelSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: integration with legacy settings props bag
	props: any;
}

export function TelegramLinkPanelSection({
	props,
}: TelegramLinkPanelSectionProps) {
	const {
		createTelegramLinkCode,
		copyTelegramTextToClipboard,
		downloadTelegramQrSvg,
		formatDateTime,
		isTelegramLoading,
		loadTelegramControlPlane,
		telegramLinkSubjectType,
		setTelegramLinkSubjectType,
		normalizedTelegramLinkSubjectType,
		setTelegramLinkCode,
		setTelegramLinkActionState,
		telegramLinkStaffId,
		setTelegramLinkStaffId,
		isTelegramLinkCreating,
		telegramLinkCode,
		telegramLinkActionState,
		telegramQrSvgToDataUrl,
		telegramChatLinkLedger,
		typedTelegramChatLinks = [],
		telegramSubjectName,
		revokeTelegramChatLink,
		telegramRevokingLinkId,
		loadMoreTelegramChatLinks,
		isTelegramChatLinksLoadingMore,
		telegramLinkCodeLedger,
		typedTelegramLinkCodes = [],
		telegramLinkCodeStatusLabels,
		loadMoreTelegramLinkCodes,
		isTelegramLinkCodesLoadingMore,
		activePatient,
		typedTelegramLinkStaffOptions = [],
	} = props;

	return (
		<article className="telegram-link-panel">
			<div className="panel-heading">
				<div>
					<h3>QR для подключения</h3>
					<p>
						Покажите пациенту или сотруднику. Предыдущий ожидающий код для этой
						записи будет отозван.
					</p>
				</div>
				<button
					className="secondary-button"
					type="button"
					onClick={() => void loadTelegramControlPlane()}
					disabled={isTelegramLoading}
				>
					<RefreshCw aria-hidden="true" /> Обновить
				</button>
			</div>
			<div className="telegram-link-controls">
				<div className="settings-field">
					<span className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
						Кого подключаем
					</span>
					<div className="flex gap-2 flex-wrap mb-2">
						{[
							{ value: "patient", label: "Активный пациент" },
							{ value: "staff", label: "Сотрудник клиники" },
						].map((option) => (
							<button
								key={option.value}
								type="button"
								onClick={() => {
									setTelegramLinkSubjectType(
										normalizedTelegramLinkSubjectType(option.value),
									);
									setTelegramLinkCode(null);
									setTelegramLinkActionState(null);
								}}
								className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
									telegramLinkSubjectType === option.value
										? "bg-[var(--teal)] text-white border-[var(--teal-dark)]"
										: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
								}`}
							>
								{option.label}
							</button>
						))}
					</div>
				</div>
				{telegramLinkSubjectType === "staff" ? (
					<label htmlFor="telegram-link-staff-select">
						Сотрудник
						<select
							id="telegram-link-staff-select"
							value={telegramLinkStaffId}
							onChange={(event: SelectChangeEvent) => {
								setTelegramLinkStaffId(event.target.value);
								setTelegramLinkCode(null);
								setTelegramLinkActionState(null);
							}}
						>
							{typedTelegramLinkStaffOptions.length === 0 ? (
								<option value="">Нет активных сотрудников</option>
							) : null}
							{typedTelegramLinkStaffOptions.map(
								(member: { id: string; fullName: string }) => (
									<option key={member.id} value={member.id}>
										{member.fullName}
									</option>
								),
							)}
						</select>
					</label>
				) : (
					<label htmlFor="telegram-link-patient-input">
						Пациент
						<input
							id="telegram-link-patient-input"
							readOnly
							value={activePatient?.fullName ?? "Нет активного пациента"}
						/>
					</label>
				)}
				<button
					className="primary-button"
					type="button"
					onClick={() => void createTelegramLinkCode()}
					disabled={
						isTelegramLinkCreating ||
						(telegramLinkSubjectType === "staff" &&
							!typedTelegramLinkStaffOptions.length)
					}
				>
					<Bot aria-hidden="true" />{" "}
					{isTelegramLinkCreating ? "Создаю" : "Создать QR/код"}
				</button>
			</div>

			{telegramLinkCode ? (
				<div className="telegram-link-result">
					<div>
						<span>Код</span>
						<strong>{telegramLinkCode.code}</strong>
						<p>
							До {formatDateTime(telegramLinkCode.expiresAt)}. В списках
							показывается только хвост {telegramLinkCode.codeLast4}.
						</p>
						{telegramLinkCode.deepLink ? (
							<a
								href={telegramLinkCode.deepLink}
								target="_blank"
								rel="noreferrer noopener"
								aria-label="Открыть ссылку Telegram в новой вкладке"
								title="Открыть ссылку Telegram в новой вкладке"
							>
								Открыть ссылку Telegram <ExternalLink aria-hidden="true" />
							</a>
						) : null}
						<small>{telegramLinkCode.shareText}</small>
						<div className="telegram-link-actions">
							<button
								className="secondary-button compact-button"
								type="button"
								onClick={() =>
									void copyTelegramTextToClipboard(
										telegramLinkCode.code,
										"Код",
									)
								}
								disabled={!telegramLinkCode.code.trim()}
							>
								<Copy aria-hidden="true" /> Код
							</button>
							{telegramLinkCode.deepLink ? (
								<button
									className="secondary-button compact-button"
									type="button"
									onClick={() =>
										void copyTelegramTextToClipboard(
											telegramLinkCode.deepLink,
											"Ссылка",
										)
									}
									disabled={!telegramLinkCode.deepLink.trim()}
								>
									<Copy aria-hidden="true" /> Ссылка
								</button>
							) : null}
							<button
								className="secondary-button compact-button"
								type="button"
								onClick={() =>
									void copyTelegramTextToClipboard(
										telegramLinkCode.shareText,
										"Текст",
									)
								}
								disabled={!telegramLinkCode.shareText.trim()}
							>
								<Copy aria-hidden="true" /> Текст
							</button>
						</div>
						{telegramLinkActionState ? (
							<small>{telegramLinkActionState}</small>
						) : null}
					</div>
					{telegramLinkCode.qrSvg ? (
						<div className="telegram-qr-card">
							<img
								src={telegramQrSvgToDataUrl(telegramLinkCode.qrSvg)}
								alt="QR-код для подключения Telegram"
								loading="lazy"
								decoding="async"
							/>
							<button
								className="secondary-button compact-button"
								type="button"
								onClick={downloadTelegramQrSvg}
								disabled={!telegramLinkCode.qrSvg.trim()}
							>
								<Download aria-hidden="true" /> Скачать SVG
							</button>
						</div>
					) : null}
				</div>
			) : null}

			<div className="telegram-link-ledgers">
				<div className="telegram-link-ledger-chats">
					<div className="panel-heading">
						<div>
							<h4>Связанные чаты</h4>
							<p>Активные связки между пациентами и ботом клиники.</p>
						</div>
						<span className="status-pill status-confirmed">
							{typedTelegramChatLinks.length}
						</span>
					</div>
					{typedTelegramChatLinks.length > 0 ? (
						<div className="telegram-link-ledger-rows">
							{/* biome-ignore lint/suspicious/noExplicitAny: chat links */}
							{typedTelegramChatLinks.map((link: any) => (
								<article className="telegram-link-ledger-row" key={link.id}>
									<div>
										<strong>
											{telegramSubjectName(link.subjectType, link.subjectId)}
										</strong>
										<span>
											{link.telegramUsername
												? `@${link.telegramUsername}`
												: `ID ${link.telegramChatId}`}
										</span>
										<small>Связан {formatDateTime(link.linkedAt)}</small>
									</div>
									<button
										className="secondary-button compact-button"
										type="button"
										onClick={() => void revokeTelegramChatLink(link.id)}
										disabled={
											telegramRevokingLinkId === link.id || isTelegramLoading
										}
									>
										{telegramRevokingLinkId === link.id ? "..." : "Отозвать"}
									</button>
								</article>
							))}
							{telegramChatLinkLedger?.nextCursor ? (
								<button
									className="secondary-button compact-button"
									type="button"
									onClick={() => void loadMoreTelegramChatLinks()}
									disabled={isTelegramChatLinksLoadingMore}
								>
									{isTelegramChatLinksLoadingMore
										? "Загружаем"
										: "Показать еще связки"}
								</button>
							) : null}
						</div>
					) : (
						<EmptyState
							title="Нет связанных чатов"
							description="Связанных Telegram-чатов пока нет. Создайте QR и попросите пациента открыть бота."
							className="py-6"
						/>
					)}
					<div className="telegram-link-ledger-codes">
						<span>
							{telegramLinkCodeLedger?.pendingCount ??
								typedTelegramLinkCodes.filter(
									(code: { status: string }) => code.status === "pending",
								).length}{" "}
							кодов ожидают подключения
							{telegramLinkCodeLedger
								? ` · показано ${typedTelegramLinkCodes.length} из ${telegramLinkCodeLedger.filteredCount}`
								: ""}
						</span>
						{/* biome-ignore lint/suspicious/noExplicitAny: link codes */}
						{typedTelegramLinkCodes.map((code: any) => (
							<small key={code.id}>
								{telegramSubjectName(code.subjectType, code.subjectId)} · *
								{code.codeLast4} ·{" "}
								{(telegramLinkCodeStatusLabels || {
									pending: "ожидает",
									used: "использован",
									expired: "истек",
									revoked: "отозван",
								})[code.status]}{" "}
								· до {formatDateTime(code.expiresAt)}
							</small>
						))}
						{telegramLinkCodeLedger?.nextCursor ? (
							<button
								className="secondary-button compact-button"
								type="button"
								onClick={() => void loadMoreTelegramLinkCodes()}
								disabled={isTelegramLinkCodesLoadingMore}
							>
								{isTelegramLinkCodesLoadingMore
									? "Загружаем"
									: "Показать еще коды"}
							</button>
						) : null}
					</div>
				</div>
			</div>
		</article>
	);
}
