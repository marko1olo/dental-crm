import { Bot, Copy, Download, ExternalLink, RefreshCw } from "lucide-react";
import type { ChangeEvent } from "react";

export function TelegramConnectionWorkbench({ mergedProps }: { mergedProps: any }) {
	const {
		loadTelegramControlPlane,
		isTelegramLoading,
		telegramLinkSubjectType,
		setTelegramLinkSubjectType,
		normalizedTelegramLinkSubjectType,
		setTelegramLinkCode,
		setTelegramLinkActionState,
		telegramLinkStaffId,
		setTelegramLinkStaffId,
		typedTelegramLinkStaffOptions,
		activePatient,
		createTelegramLinkCode,
		isTelegramLinkCreating,
		telegramLinkCode,
		formatDateTime,
		copyTelegramTextToClipboard,
		downloadTelegramQrSvg,
		telegramLinkActionState,
		telegramQrSvgToDataUrl,
		telegramChatLinkLedger,
		typedTelegramChatLinks,
		telegramSubjectName,
		revokeTelegramChatLink,
		telegramRevokingLinkId,
		loadMoreTelegramChatLinks,
		isTelegramChatLinksLoadingMore,
		telegramLinkCodeLedger,
		typedTelegramLinkCodes,
		telegramLinkCodeStatusLabels,
		loadMoreTelegramLinkCodes,
		isTelegramLinkCodesLoadingMore,
	} = mergedProps;

	return (
		<article className="telegram-link-panel">
			<div className="panel-heading">
				<div>
					<h3>QR для подключения</h3>
					<p>
						Покажите пациенту или сотруднику. Старый ожидающий код для этой
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
					<span
						className="field-label"
						style={{
							fontSize: "14px",
							fontWeight: 600,
							color: "var(--slate-700)",
							display: "block",
							marginBottom: "8px",
						}}
					>
						Кого подключаем
					</span>
					<div className="settings-segmented-group">
						{[
							{ value: "patient", label: "Активный пациент" },
							{ value: "staff", label: "Сотрудник клиники" },
						].map((option) => (
							<button
								key={option.value}
								type="button"
								className={`quick-chip ${telegramLinkSubjectType === option.value ? "active" : ""}`}
								onClick={() => {
									setTelegramLinkSubjectType(
										normalizedTelegramLinkSubjectType(option.value),
									);
									setTelegramLinkCode(null);
									setTelegramLinkActionState(null);
								}}
								style={{
									background:
										telegramLinkSubjectType === option.value
											? "var(--brand-500)"
											: "var(--slate-100)",
									color:
										telegramLinkSubjectType === option.value
											? "#fff"
											: "var(--slate-700)",
									padding: "6px 12px",
									borderRadius: "16px",
									border: "none",
									cursor: "pointer",
									fontSize: "14px",
								}}
							>
								{option.label}
							</button>
						))}
					</div>
				</div>
				{telegramLinkSubjectType === "staff" ? (
					<label>
						Сотрудник
						<select
							value={telegramLinkStaffId}
							onChange={(event: ChangeEvent<HTMLSelectElement>) => {
								setTelegramLinkStaffId(event.target.value);
								setTelegramLinkCode(null);
								setTelegramLinkActionState(null);
							}}
						>
							{typedTelegramLinkStaffOptions.length === 0 ? (
								<option value="">Нет активных сотрудников</option>
							) : null}
							{typedTelegramLinkStaffOptions.map((member: any) => (
								<option key={member.id} value={member.id}>
									{member.fullName}
								</option>
							))}
						</select>
					</label>
				) : (
					<label>
						Пациент
						<input
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
									void copyTelegramTextToClipboard(telegramLinkCode.code, "Код")
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
										"Текст для пациента",
									)
								}
								disabled={!telegramLinkCode.shareText.trim()}
							>
								<Copy aria-hidden="true" /> Текст
							</button>
							{telegramLinkCode.qrSvg ? (
								<button
									className="secondary-button compact-button"
									type="button"
									onClick={downloadTelegramQrSvg}
								>
									<Download aria-hidden="true" /> Скачать QR
								</button>
							) : null}
						</div>
						{telegramLinkActionState ? (
							<small className="telegram-link-action-state">
								{telegramLinkActionState}
							</small>
						) : null}
					</div>
					{telegramLinkCode.qrSvg ? (
						<img
							alt="QR-код Telegram-бота клиники"
							src={telegramQrSvgToDataUrl(telegramLinkCode.qrSvg)}
							loading="lazy"
							decoding="async"
						/>
					) : (
						<p>
							QR недоступен для слишком длинной ссылки, используйте код вручную.
						</p>
					)}
				</div>
			) : null}

			<div className="telegram-link-ledger">
				<div>
					<h4>Активные связки</h4>
					<p>
						{telegramChatLinkLedger?.activeCount ??
							typedTelegramChatLinks.filter((link: any) => link.status === "active")
								.length}{" "}
						чатов сейчас можно использовать для отправок.
						{telegramChatLinkLedger
							? ` Показано ${typedTelegramChatLinks.length} из ${telegramChatLinkLedger.filteredCount}.`
							: ""}
					</p>
				</div>
				{typedTelegramChatLinks.length ? (
					<div className="telegram-link-ledger-list">
						{typedTelegramChatLinks.map((link: any) => (
							<article
								className={`telegram-link-ledger-row link-${link.status}`}
								key={link.id}
							>
								<div>
									<strong>
										{telegramSubjectName(link.subjectType, link.subjectId)}
									</strong>
									<span>
										{link.subjectType === "patient" ? "пациент" : "сотрудник"} ·
										чат *{link.chatIdLast4 ?? "----"} ·{" "}
										{link.status === "active" ? "активна" : "отозвана"}
									</span>
									<small>{formatDateTime(link.linkedAt)}</small>
								</div>
								<button
									className="secondary-button compact-button"
									type="button"
									onClick={() => void revokeTelegramChatLink(link.id)}
									disabled={
										link.status !== "active" || Boolean(telegramRevokingLinkId)
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
					<p className="telegram-empty-state">
						Связанных Telegram-чатов пока нет. Создайте QR и попросите пациента
						открыть бота.
					</p>
				)}
				<div className="telegram-link-ledger-codes">
					<span>
						{telegramLinkCodeLedger?.pendingCount ??
							typedTelegramLinkCodes.filter(
								(code: any) => code.status === "pending",
							).length}{" "}
						кодов ожидают подключения
						{telegramLinkCodeLedger
							? ` · показано ${typedTelegramLinkCodes.length} из ${telegramLinkCodeLedger.filteredCount}`
							: ""}
					</span>
					{typedTelegramLinkCodes.map((code: any) => (
						<small key={code.id}>
							{telegramSubjectName(code.subjectType, code.subjectId)} · *
							{code.codeLast4} ·{" "}
							{
								(telegramLinkCodeStatusLabels || {
									pending: "ожидает",
									used: "использован",
									expired: "истек",
									revoked: "отозван",
								})[code.status]
							}{" "}
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
		</article>
	);
}
