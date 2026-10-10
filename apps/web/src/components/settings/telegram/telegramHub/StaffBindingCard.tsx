import React, { useState } from "react";
import {
	Phone,
	QrCode,
	Smartphone,
	Unlink,
	UserCheck,
} from "lucide-react";
import { showToast } from "../../../GlobalToast";
import { getDenteAuthHeaders } from "../../../../lib/denteRequestHeaders";
import { PhoneAuthForm } from "./PhoneAuthForm";
import { QrAuthCard } from "./QrAuthCard";
import type { StaffBindingCardProps, TelegramAccountAuthMode } from "./types";

export function StaffBindingCard({
	clinicId,
	userId,
	accountStatus,
	isAccountLoading: _isAccountLoading,
	onRefreshStatus,
	onAccountStatusChange: _onAccountStatusChange,
}: StaffBindingCardProps) {
	const [accountAuthMode, setAccountAuthMode] =
		useState<TelegramAccountAuthMode>("phone");
	const [isDisconnectingAccount, setIsDisconnectingAccount] =
		useState<boolean>(false);

	const handleDisconnectAccount = async () => {
		try {
			setIsDisconnectingAccount(true);
			const res = await fetch("/api/telegram/account/disconnect", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					phone: accountStatus?.account?.phone,
					accountId: accountStatus?.account?.id,
				}),
			});

			const data = await res.json();
			if (res.ok && data.ok) {
				showToast("Личный Telegram-аккаунт отключен", "info");
				await onRefreshStatus();
			} else {
				showToast(data.error || "Ошибка отключения аккаунта", "error");
			}
		} catch (err) {
			showToast(`Ошибка сети: ${String(err)}`, "error");
		} finally {
			setIsDisconnectingAccount(false);
		}
	};

	return (
		<div className="tg-hub-content-card" data-testid="tg-account-pane">
			{/* Баннер статуса личного аккаунта */}
			<div
				className={`tg-status-banner ${accountStatus?.connected ? "connected" : "disconnected"}`}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
					<div
						style={{
							width: "42px",
							height: "42px",
							borderRadius: "10px",
							background: accountStatus?.connected
								? "rgba(16, 185, 129, 0.15)"
								: "rgba(245, 158, 11, 0.15)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: accountStatus?.connected ? "#10b981" : "#f59e0b",
						}}
					>
						<Smartphone size={22} />
					</div>
					<div>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								fontWeight: 700,
								fontSize: "15px",
								color: "var(--ink)",
							}}
						>
							<span>
								{accountStatus?.connected
									? `Аккаунт подключен: ${accountStatus.account?.phone}`
									: "Личный аккаунт не подключен"}
							</span>
							<span
								className={`tg-status-badge ${accountStatus?.connected ? "online" : "offline"}`}
							>
								<span
									className={`tg-pulse-dot ${accountStatus?.connected ? "pulse" : ""}`}
								/>
								<span>{accountStatus?.connected ? "Онлайн" : "Офлайн"}</span>
							</span>
						</div>
						<div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
							{accountStatus?.connected
								? `Сессия MTProto активна • ${accountStatus.account?.firstName} ${accountStatus.account?.lastName ?? ""}`
								: "Прямая отправка сообщений от имени врача или администратора"}
						</div>
					</div>
				</div>

				{/* Кнопка отключения подключенного аккаунта */}
				{accountStatus?.connected && (
					<button
						type="button"
						className="tg-btn-danger"
						onClick={handleDisconnectAccount}
						disabled={isDisconnectingAccount}
						data-testid="tg-account-disconnect-btn"
					>
						<Unlink size={14} />
						<span>
							{isDisconnectingAccount ? "Отключение..." : "Отвязать аккаунт"}
						</span>
					</button>
				)}
			</div>

			{/* Карточка подключенного профиля */}
			{accountStatus?.connected && accountStatus.account && (
				<div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "16px",
							padding: "16px",
							background: "var(--paper-soft)",
							borderRadius: "12px",
							border: "1px solid var(--line)",
						}}
					>
						{accountStatus.account.avatarUrl ? (
							<img
								src={accountStatus.account.avatarUrl}
								alt="Avatar"
								className="tg-avatar-circle"
							/>
						) : (
							<div
								className="tg-avatar-circle"
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									color: "var(--teal)",
								}}
							>
								<UserCheck size={24} />
							</div>
						)}
						<div className="tg-profile-meta">
							<div className="tg-profile-name">
								{accountStatus.account.firstName}{" "}
								{accountStatus.account.lastName}
							</div>
							<div className="tg-profile-sub">
								<span>{accountStatus.account.phone}</span>
								{accountStatus.account.username && (
									<span>• @{accountStatus.account.username}</span>
								)}
							</div>
						</div>
					</div>

					<div className="tg-info-grid" style={{ marginTop: "12px" }}>
						<div className="tg-info-item">
							<span className="tg-info-label">Статус связи</span>
							<span className="tg-info-value" style={{ color: "#10b981" }}>
								● Онлайн в сети Telegram
							</span>
						</div>
						<div className="tg-info-item">
							<span className="tg-info-label">Защита 2FA</span>
							<span className="tg-info-value">
								{accountStatus.account.is2faEnabled
									? "Включена (Облачный пароль)"
									: "Стандартная (Код из SMS/App)"}
							</span>
						</div>
						<div className="tg-info-item">
							<span className="tg-info-label">Безопасность сессии</span>
							<span className="tg-info-value">
								AES-256-GCM + AAD изоляция арендатора
							</span>
						</div>
					</div>
				</div>
			)}

			{/* Если аккаунт не подключен — выбор способа входа */}
			{!accountStatus?.connected && (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "16px",
					}}
				>
					{/* Переключатель телефон / QR */}
					<div
						style={{
							display: "flex",
							gap: "8px",
							background: "var(--paper-soft)",
							padding: "4px",
							borderRadius: "10px",
							border: "1px solid var(--line)",
							width: "fit-content",
						}}
					>
						<button
							type="button"
							className={`tg-hub-tab-btn ${accountAuthMode === "phone" ? "active" : ""}`}
							style={{ minHeight: "36px", padding: "6px 14px", fontSize: "13px" }}
							onClick={() => setAccountAuthMode("phone")}
							data-testid="tg-account-tab-phone"
						>
							<Phone size={14} />
							<span>По номеру телефона</span>
						</button>
						<button
							type="button"
							className={`tg-hub-tab-btn ${accountAuthMode === "qr" ? "active" : ""}`}
							style={{ minHeight: "36px", padding: "6px 14px", fontSize: "13px" }}
							onClick={() => setAccountAuthMode("qr")}
							data-testid="tg-account-tab-qr"
						>
							<QrCode size={14} />
							<span>По QR-коду</span>
						</button>
					</div>

					{accountAuthMode === "phone" && (
						<PhoneAuthForm
							clinicId={clinicId || ""}
							userId={userId || ""}
							onSuccess={onRefreshStatus}
						/>
					)}

					{accountAuthMode === "qr" && (
						<QrAuthCard
							clinicId={clinicId || ""}
							userId={userId || ""}
							onSuccess={onRefreshStatus}
						/>
					)}
				</div>
			)}
		</div>
	);
}
