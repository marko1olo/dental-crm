/**
 * ChairsideQuickSwitchModal.tsx — Мгновенное переключение врача или ассистента у кресла по PIN-коду.
 *
 * Mandate 8e: Doctor Autonomy (Zero Dead-Ends, смена оператора без разлогина и потери открытого черновика).
 * Mandate 8n: Solo Doctor Sovereignty (соло-врач работает без барьеров).
 * Mandate 8d & 8am: Apple HIG Modal Grid (h-14 header, p-6 body, h-16 footer, 44px touch targets).
 */

import React, { useEffect, useState } from "react";
import { AlertCircle, Check, Loader2, Lock, User, UserCheck, X } from "lucide-react";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_STAFF_TOKEN_KEY,
	safeLocalStorageGetItem,
} from "../../lib/safeLocalStorage";
import { setCachedAuthTokens } from "../../lib/apiAuthFetch";
import { cacheActiveStaffUser, getCachedStaffList } from "../../lib/offlineStorage";
import { staffRoleLabels } from "../../workspaceUiLabels";
import type { StaffRole } from "@dental/shared";

export interface ChairsideStaffMember {
	readonly id: string;
	readonly fullName: string;
	readonly role: StaffRole;
	readonly email?: string | null | undefined;
	readonly phone?: string | null | undefined;
	readonly active?: boolean | undefined;
}

export interface ChairsideQuickSwitchModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSuccess?: ((switchedUser: ChairsideStaffMember) => void) | undefined;
}

export function ChairsideQuickSwitchModal({
	isOpen,
	onClose,
	onSuccess,
}: ChairsideQuickSwitchModalProps) {
	const [staffList, setStaffList] = useState<readonly ChairsideStaffMember[]>([]);
	const [selectedStaff, setSelectedStaff] = useState<ChairsideStaffMember | null>(null);
	const [pinCode, setPinCode] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Сброс состояния при открытии/закрытии (Мандат 8bn: Zero-Leak Draft)
	useEffect(() => {
		if (!isOpen) {
			setSelectedStaff(null);
			setPinCode("");
			setErrorMessage(null);
			setIsLoading(false);
			return;
		}

		// Загрузка доступного персонала из кэша или API
		const cached = getCachedStaffList() as ChairsideStaffMember[] | null;
		if (cached && Array.isArray(cached) && cached.length > 0) {
			setStaffList(cached.filter((s) => s.active !== false));
		}

		// Асинхронное обновление списка сотрудников
		const clinicToken = safeLocalStorageGetItem(DENTE_CLINIC_TOKEN_KEY);
		fetch("/api/settings/staff", {
			headers: {
				"x-dente-clinic-token": clinicToken || "",
			},
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (Array.isArray(data)) {
					setStaffList(data.filter((s) => s.active !== false));
				}
			})
			.catch(() => {
				// В офлайн-режиме используем кэш
			});
	}, [isOpen]);

	if (!isOpen) return null;

	const handlePinDigit = (digit: string) => {
		if (pinCode.length < 8) {
			setPinCode((prev) => prev + digit);
			setErrorMessage(null);
		}
	};

	const handlePinBackspace = () => {
		setPinCode((prev) => prev.slice(0, -1));
		setErrorMessage(null);
	};

	const handlePinClear = () => {
		setPinCode("");
		setErrorMessage(null);
	};

	const handleSubmitSwitch = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!selectedStaff) {
			setErrorMessage("Выберите сотрудника для переключения");
			return;
		}

		setIsLoading(true);
		setErrorMessage(null);

		try {
			const clinicToken = safeLocalStorageGetItem(DENTE_CLINIC_TOKEN_KEY);
			const staffToken = safeLocalStorageGetItem(DENTE_STAFF_TOKEN_KEY);

			const response = await fetch("/api/auth/staff/switch-role", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-clinic-token": clinicToken || "",
					"x-dente-staff-token": staffToken || "",
				},
				body: JSON.stringify({
					targetRole: selectedStaff.role,
					targetUserId: selectedStaff.id,
					pinCode: pinCode.trim() || undefined,
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				const msg = result.message || "Неверный PIN-код или ошибка авторизации";
				setErrorMessage(msg);
				setIsLoading(false);
				return;
			}

			// Успешная смена: обновляем токен и активного пользователя
			if (result.staffToken) {
				setCachedAuthTokens({ staffToken: result.staffToken });
			}
			if (result.user) {
				cacheActiveStaffUser(result.user);
			}

			// Диспатч события для мгновенного обновления UI
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente:staff-switched", {
						detail: result.user || selectedStaff,
					}),
				);
			}

			onSuccess?.(result.user || selectedStaff);
			onClose();
		} catch (err: unknown) {
			setErrorMessage("Ошибка сети при смене сотрудника");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div
			className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="chairside-quick-switch-title"
		>
			<div className="w-full max-w-md bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
				{/* Шапка модалки по Мандату 8d (Zero-Drift Layout: h-14 px-6 border-b) */}
				<div className="h-14 px-6 border-b border-[var(--line)] flex items-center justify-between shrink-0">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
							<UserCheck className="w-4 h-4" aria-hidden="true" />
						</div>
						<div>
							<h3
								id="chairside-quick-switch-title"
								className="text-base font-semibold text-[var(--ink)] leading-tight"
							>
								Смена врача у кресла
							</h3>
							<p className="text-xs text-[var(--ink-muted)]">
								Мгновенная смена смены по PIN без выхода
							</p>
						</div>
					</div>
					<button
						type="button"
						className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
						onClick={onClose}
						aria-label="Закрыть"
					>
						<X className="w-4 h-4" aria-hidden="true" />
					</button>
				</div>

				{/* Тело модалки */}
				<div className="p-6 overflow-y-auto space-y-4">
					{errorMessage ? (
						<div
							className="p-3 rounded-xl bg-[var(--bad-bg)] border border-[var(--bad-fg)]/20 text-[var(--bad-fg)] text-xs flex items-center gap-2"
							role="alert"
						>
							<AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
							<span>{errorMessage}</span>
						</div>
					) : null}

					{/* Выбор сотрудника */}
					<div>
						<label className="block text-xs font-medium text-[var(--ink-muted)] mb-2">
							Выберите принимающего врача или ассистента:
						</label>
						<div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
							{staffList.length > 0 ? (
								staffList.map((member) => {
									const isSelected = selectedStaff?.id === member.id;
									return (
										<button
											key={member.id}
											type="button"
											className={`min-h-[44px] h-12 px-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
												isSelected
													? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--ink)]"
													: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)]"
											}`}
											onClick={() => {
												setSelectedStaff(member);
												setErrorMessage(null);
											}}
										>
											<div className="flex items-center gap-2.5 min-w-0">
												<div
													className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
														isSelected
															? "bg-[var(--primary)] text-white"
															: "bg-[var(--paper-soft)] text-[var(--ink-muted)]"
													}`}
												>
													{member.fullName.slice(0, 1) || "С"}
												</div>
												<div className="truncate">
													<div className="text-sm font-medium leading-tight truncate">
														{member.fullName}
													</div>
													<div className="text-xs text-[var(--ink-muted)]">
														{staffRoleLabels[member.role] || member.role}
													</div>
												</div>
											</div>
											{isSelected ? (
												<Check
													className="w-4 h-4 text-[var(--primary)] shrink-0"
													aria-hidden="true"
												/>
											) : null}
										</button>
									);
								})
							) : (
								<div className="py-6 text-center text-xs text-[var(--ink-muted)]">
									Сотрудники не найдены
								</div>
							)}
						</div>
					</div>

					{/* Ввод PIN-кода (если сотрудник выбран) */}
					{selectedStaff ? (
						<div className="space-y-3 pt-2 border-t border-[var(--line)] animate-in fade-in duration-150">
							<div className="flex items-center justify-between">
								<label
									htmlFor="chairside-pin-input"
									className="text-xs font-medium text-[var(--ink-muted)] flex items-center gap-1.5"
								>
									<Lock className="w-3.5 h-3.5" aria-hidden="true" />
									<span>Персональный PIN-код сотрудника (4 цифры):</span>
								</label>
								<button
									type="button"
									className="text-xs text-[var(--primary)] hover:underline cursor-pointer"
									onClick={handlePinClear}
								>
									Сбросить
								</button>
							</div>

							<div className="flex justify-center gap-2">
								{[0, 1, 2, 3].map((index) => {
									const hasDigit = index < pinCode.length;
									return (
										<div
											key={index}
											className={`w-11 h-12 rounded-xl border flex items-center justify-center text-lg font-mono font-bold transition-all ${
												hasDigit
													? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--ink)]"
													: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink-muted)]"
											}`}
										>
											{hasDigit ? "•" : ""}
										</div>
									);
								})}
							</div>

							{/* Скрытый инпут для аппаратной клавиатуры */}
							<input
								id="chairside-pin-input"
								type="password"
								inputMode="numeric"
								pattern="[0-9]*"
								maxLength={8}
								value={pinCode}
								onChange={(e) => {
									const val = e.target.value.replace(/\D/g, "");
									setPinCode(val);
									setErrorMessage(null);
								}}
								className="sr-only"
								autoFocus
							/>

							{/* Сенсорный цифровой блок 44x44px по Apple HIG */}
							<div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto pt-1">
								{["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "←"].map(
									(key) => {
										const isAction = key === "C" || key === "←";
										return (
											<button
												key={key}
												type="button"
												className={`min-h-[44px] h-11 rounded-xl text-sm font-semibold flex items-center justify-center transition-colors cursor-pointer ${
													isAction
														? "bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:bg-[var(--line)]"
														: "bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95"
												}`}
												onClick={() => {
													if (key === "C") handlePinClear();
													else if (key === "←") handlePinBackspace();
													else handlePinDigit(key);
												}}
											>
												{key}
											</button>
										);
									},
								)}
							</div>
						</div>
					) : null}
				</div>

				{/* Футер по Мандату 8d: h-16 px-6 border-t, кнопка «Отмена» слева от Primary CTA */}
				<div className="h-16 px-6 border-t border-[var(--line)] bg-[var(--paper-soft)]/50 flex items-center justify-end gap-3 shrink-0">
					<button
						type="button"
						className="secondary-button min-h-[44px] h-11 px-4 rounded-xl text-base font-medium cursor-pointer"
						onClick={onClose}
						disabled={isLoading}
					>
						Отмена
					</button>
					<button
						type="button"
						className="primary-button min-h-[44px] h-11 px-5 rounded-xl text-base font-semibold shadow-sm flex items-center justify-center gap-2 cursor-pointer bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
						onClick={() => void handleSubmitSwitch()}
						disabled={!selectedStaff || isLoading}
					>
						{isLoading ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
								<span>Переключение...</span>
							</>
						) : (
							<span>Переключить смену</span>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
