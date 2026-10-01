import React, { type FormEvent, useCallback, useEffect, useState } from "react";
import { Radio, RefreshCw, ShieldCheck, Stethoscope } from "lucide-react";
import {
	getCachedClinicDashboard,
	setOfflineAutonomyMode,
} from "./lib/offlineStorage";

export type AppLoadingStateProps = {
	actionLabel?: string;
	message: string;
	onAction?: () => void;
	timeoutMs?: number;
	onSwitchToOffline?: () => void;
	onOpenCachedData?: () => void;
};

export function AppLoadingState({
	actionLabel,
	message,
	onAction,
	timeoutMs = 2500,
	onSwitchToOffline,
	onOpenCachedData,
}: AppLoadingStateProps) {
	const [isSlowResponse, setIsSlowResponse] = useState(false);
	const [hasCachedData, setHasCachedData] = useState(false);

	useEffect(() => {
		try {
			const cached = getCachedClinicDashboard();
			if (cached) {
				setHasCachedData(true);
			}
		} catch {
			// безопасное чтение хранилища
		}

		const timer = setTimeout(() => {
			setIsSlowResponse(true);
		}, timeoutMs);

		return () => clearTimeout(timer);
	}, [timeoutMs]);

	const handleSwitchToOffline = useCallback(() => {
		setOfflineAutonomyMode(true);
		if (onSwitchToOffline) {
			onSwitchToOffline();
			return;
		}
		if (onOpenCachedData) {
			onOpenCachedData();
			return;
		}
		if (onAction) {
			onAction();
			return;
		}
		if (typeof window !== "undefined") {
			window.location.reload();
		}
	}, [onSwitchToOffline, onOpenCachedData, onAction]);

	return (
		<main
			className="boot-state"
			aria-busy={onAction && !isSlowResponse ? undefined : "true"}
			style={{
				background: "var(--paper, #090d11)",
				color: "var(--ink, #ffffff)",
				minHeight: "100dvh",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				padding: "24px",
				gap: "12px",
				textAlign: "center",
				boxSizing: "border-box",
			}}
		>
			<div
				className="boot-logo-box"
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					width: "56px",
					height: "56px",
					borderRadius: "14px",
					background: "var(--paper-soft, rgba(20, 184, 166, 0.1))",
					border: "1px solid var(--line, rgba(20, 184, 166, 0.2))",
					color: "var(--teal, #14b8a6)",
				}}
			>
				<Stethoscope aria-hidden="true" className="boot-logo" size={32} />
			</div>
			<h1
				className="boot-title"
				style={{
					fontSize: "1.75rem",
					fontWeight: 800,
					margin: 0,
					color: "var(--ink, #ffffff)",
					letterSpacing: "-0.02em",
				}}
			>
				DENTE
			</h1>
			<p
				className="boot-subtitle"
				style={{
					fontSize: "14px",
					fontWeight: 500,
					margin: 0,
					color: "var(--muted, #94a3b8)",
					maxWidth: "380px",
					lineHeight: 1.4,
				}}
			>
				{message || "Загрузка системы..."}
			</p>

			{/* Обычная кнопка повтора, если задана и таймер медленного ответа ещё не сработал */}
			{onAction && !isSlowResponse ? (
				<button
					className="secondary-button boot-retry-button"
					type="button"
					onClick={onAction}
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
						marginTop: "8px",
						minHeight: "36px",
						padding: "6px 14px",
						borderRadius: "8px",
						fontSize: "13px",
						fontWeight: 600,
						background: "var(--paper-soft)",
						border: "1px solid var(--line)",
						color: "var(--ink)",
						cursor: "pointer",
					}}
				>
					<RefreshCw aria-hidden="true" size={15} /> {actionLabel ?? "Повторить"}
				</button>
			) : null}

			{/* Защита от белого экрана и зависаний: предложение автономного режима через 2.5 сек */}
			{isSlowResponse ? (
				<div
					className="boot-offline-fallback-banner"
					role="alert"
					aria-live="polite"
					style={{
						marginTop: "16px",
						padding: "16px 20px",
						borderRadius: "10px",
						background: "var(--paper-soft, rgba(255, 255, 255, 0.05))",
						border: "1px solid var(--line, rgba(255, 255, 255, 0.1))",
						maxWidth: "420px",
						width: "100%",
						display: "flex",
						flexDirection: "column",
						gap: "10px",
						textAlign: "center",
						boxShadow: "var(--shadow-1, 0 4px 12px rgba(0, 0, 0, 0.1))",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "8px",
							color: "var(--warn-fg, #f59e0b)",
							fontWeight: 700,
							fontSize: "13.5px",
						}}
					>
						<Radio size={16} aria-hidden="true" />
						<span>Сервер отвечает дольше обычного</span>
					</div>
					<p
						style={{
							fontSize: "12.5px",
							color: "var(--muted, #94a3b8)",
							margin: 0,
							lineHeight: 1.45,
						}}
					>
						Связь замедлена или сервер недоступен. Чтобы не задерживать пациентов у
						кресла, перейдите в автономный режим.
					</p>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "8px",
							flexWrap: "wrap",
							marginTop: "4px",
						}}
					>
						<button
							className="primary-button boot-offline-action-button"
							type="button"
							onClick={handleSwitchToOffline}
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								minHeight: "36px",
								padding: "8px 16px",
								borderRadius: "8px",
								fontSize: "13px",
								fontWeight: 700,
								background: "var(--teal, #0d9488)",
								color: "#ffffff",
								border: "none",
								cursor: "pointer",
								boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
							}}
						>
							<Radio size={15} aria-hidden="true" />
							<span>
								{hasCachedData
									? "Открыть кэшированные данные"
									: "Перейти в автономный режим"}
							</span>
						</button>
						{onAction ? (
							<button
								className="secondary-button boot-retry-button"
								type="button"
								onClick={onAction}
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
									minHeight: "36px",
									padding: "8px 14px",
									borderRadius: "8px",
									fontSize: "13px",
									fontWeight: 600,
									background: "var(--paper)",
									border: "1px solid var(--line)",
									color: "var(--ink)",
									cursor: "pointer",
								}}
							>
								<RefreshCw aria-hidden="true" size={14} />
								<span>{actionLabel ?? "Повторить"}</span>
							</button>
						) : null}
					</div>
				</div>
			) : null}
		</main>
	);
}

export type AppUnlockStateProps = {
	accessMessage: string;
	adminSecretDraft: string;
	onAdminSecretChange: (value: string) => void;
	onUnlock: () => void;
};

export function AppUnlockState({
	accessMessage,
	adminSecretDraft,
	onAdminSecretChange,
	onUnlock,
}: AppUnlockStateProps) {
	const secretReady = adminSecretDraft.trim().length > 0;

	const submitUnlock = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!secretReady) return;
		onUnlock();
	};

	return (
		<main
			className="boot-state boot-unlock-state"
			style={{
				background: "var(--paper, #090d11)",
				color: "var(--ink, #ffffff)",
				minHeight: "100dvh",
			}}
		>
			<ShieldCheck aria-hidden="true" className="boot-logo" />
			<h1 className="boot-title">DENTE</h1>
			<form className="boot-unlock-form" onSubmit={submitUnlock}>
				<div>
					<strong>Нужен доступ к данным клиники</strong>
					<p>
						{accessMessage ||
							"Сервер защищает медицинские данные. Введите секрет администратора для этой сессии."}
					</p>
				</div>
				<input
					type="password"
					autoComplete="current-password"
					value={adminSecretDraft}
					onChange={(event) => onAdminSecretChange(event.target.value)}
					placeholder="введите секрет администратора"
					aria-label="Секрет доступа к данным клиники"
					aria-describedby={!secretReady ? "boot-unlock-guidance" : undefined}
				/>
				{!secretReady ? (
					<p
						className="boot-unlock-guidance"
						id="boot-unlock-guidance"
						role="status"
						aria-live="polite"
					>
						Введите секрет доступа, который выдал администратор клиники.
					</p>
				) : null}
				<button
					className="primary-button"
					type="submit"
					disabled={!secretReady}
				>
					<ShieldCheck aria-hidden="true" /> Открыть смену
				</button>
				<small>
					Секрет хранится только в памяти вкладки и сбрасывается после
					перезагрузки.
				</small>
			</form>
		</main>
	);
}
