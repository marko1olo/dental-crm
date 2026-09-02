/**
 * FamilyBalanceShareWidget.tsx — Виджет семейного баланса и общего кошелька в личном кабинете пациента (PWA)
 *
 * Функционал:
 * 1. Отображение общего семейного счета (в копейках и рублях) с точным расчетом и семейной скидкой.
 * 2. Список членов семьи (владелец, супруг(а), несовершеннолетние дети) со статусом законного представителя по 323-ФЗ.
 * 3. Интерактивные переключатели разрешения списания («Оплатить прием ребенка из общего кошелька»).
 * 4. 1-клик пополнение через СБП QR-код стандарта НСПК (Model 2 / ГОСТ Р 56042-2014) с диплинками банков.
 * 5. Юридическая плашка 323-ФЗ (ст. 20, 54) о правах законных представителей.
 */

import React, { useState, useMemo, useCallback } from "react";
import {
	Wallet,
	Users,
	User,
	ShieldCheck,
	ShieldAlert,
	QrCode,
	Check,
	Copy,
	ExternalLink,
	PlusCircle,
	Sparkles,
	CreditCard,
	ArrowRight,
	Heart,
	Info,
	Lock,
	CheckCircle2,
	ChevronRight,
	Smartphone,
	X,
	Sliders,
} from "lucide-react";
import {
	generateSbpPaymentQrModel,
	formatKopecksToCurrencyRu,
	kopecksToRubles,
	rublesToKopecks,
	type SbpDynamicQrModel,
} from "./patientWebappEngine.js";

// ============================================================================
// ТИПЫ И ИНТЕРФЕЙСЫ (TYPES & CONTRACTS)
// ============================================================================

export type FamilyRelationshipType =
	| "owner"
	| "spouse"
	| "child"
	| "parent"
	| "other";

export type LegalProxy323FzStatus =
	| "active_legal_proxy"
	| "not_required"
	| "pending"
	| "revoked";

export interface FamilyWalletMember {
	readonly id: string;
	readonly fullName: string;
	readonly relationship: FamilyRelationshipType;
	readonly relationshipLabelRu: string;
	readonly ageYears?: number | undefined;
	readonly isMinor?: boolean | undefined;
	readonly phone?: string | undefined;
	readonly individualBalanceKopecks: number;
	readonly canSpendFamilyBalance: boolean;
	readonly proxy323FzStatus: LegalProxy323FzStatus;
	readonly proxy323FzDetails?: string | undefined;
	readonly lastVisitDateRu?: string | undefined;
	readonly activeTreatmentTitleRu?: string | undefined;
}

export interface FamilyGroupWalletData {
	readonly groupId: string;
	readonly groupName: string;
	readonly totalBalanceKopecks: number;
	readonly totalBalanceRub: number;
	readonly familyDiscountPercent: number;
	readonly ownerPatientId: string;
	readonly ownerFullName: string;
	readonly members: readonly FamilyWalletMember[];
	readonly autoDebitChildrenEnabled: boolean;
	readonly monthlySpentKopecks: number;
	readonly monthlyLimitKopecks?: number | undefined;
}

export interface FamilyBalanceShareWidgetProps {
	readonly data?: FamilyGroupWalletData | undefined;
	readonly currentPatientId?: string | undefined;
	readonly onToggleMemberSpending?: (memberId: string, allowed: boolean) => Promise<void> | void;
	readonly onToggleAutoDebitChildren?: (enabled: boolean) => Promise<void> | void;
	readonly onTopUpSuccess?: (amountKopecks: number, paymentMethod: "sbp") => void;
	readonly onAddFamilyMember?: () => void;
	readonly className?: string | undefined;
}

// Пресетные данные для демонстрации и PWA-тестирования
export const DEFAULT_PRESET_FAMILY_WALLET: FamilyGroupWalletData = {
	groupId: "fam-grp-7701",
	groupName: "Семья Ивановых",
	totalBalanceKopecks: 4500000, // 45 000.00 ₽
	totalBalanceRub: 45000,
	familyDiscountPercent: 7,
	ownerPatientId: "pat-101",
	ownerFullName: "Иванова Анна Сергеевна",
	autoDebitChildrenEnabled: true,
	monthlySpentKopecks: 1250000, // 12 500 ₽ потрачено в текущем месяце
	monthlyLimitKopecks: 10000000, // 100 000 ₽ лимит в месяц
	members: [
		{
			id: "pat-101",
			fullName: "Иванова Анна Сергеевна",
			relationship: "owner",
			relationshipLabelRu: "Мама (Владелец счёта)",
			ageYears: 36,
			isMinor: false,
			phone: "+7 (999) 111-22-33",
			individualBalanceKopecks: 0,
			canSpendFamilyBalance: true,
			proxy323FzStatus: "not_required",
			proxy323FzDetails: "Владелец общего кошелька",
			lastVisitDateRu: "24.08.2026",
			activeTreatmentTitleRu: "Проф. гигиена и Air-Flow",
		},
		{
			id: "pat-102",
			fullName: "Иванов Петр Николаевич",
			relationship: "spouse",
			relationshipLabelRu: "Папа",
			ageYears: 38,
			isMinor: false,
			phone: "+7 (999) 222-33-44",
			individualBalanceKopecks: 0,
			canSpendFamilyBalance: true,
			proxy323FzStatus: "not_required",
			proxy323FzDetails: "Супруг (Право совместной оплаты)",
			lastVisitDateRu: "15.08.2026",
			activeTreatmentTitleRu: "Установка имплантата Straumann",
		},
		{
			id: "pat-103",
			fullName: "Иванов Михаил Петрович",
			relationship: "child",
			relationshipLabelRu: "Сын (Ребёнок)",
			ageYears: 7,
			isMinor: true,
			individualBalanceKopecks: 0,
			canSpendFamilyBalance: true,
			proxy323FzStatus: "active_legal_proxy",
			proxy323FzDetails: "Законный представитель: Иванова А.С. (ст. 20, 54 323-ФЗ)",
			lastVisitDateRu: "28.08.2026",
			activeTreatmentTitleRu: "Лечение кариеса 5.4 и герметизация",
		},
		{
			id: "pat-104",
			fullName: "Иванова София Петровна",
			relationship: "child",
			relationshipLabelRu: "Дочь (Подросток)",
			ageYears: 12,
			isMinor: true,
			individualBalanceKopecks: 0,
			canSpendFamilyBalance: true,
			proxy323FzStatus: "active_legal_proxy",
			proxy323FzDetails: "Законный представитель: Иванова А.С. (ст. 20, 54 323-ФЗ)",
			lastVisitDateRu: "01.09.2026",
			activeTreatmentTitleRu: "Ортодонтическая коррекция (элайнеры)",
		},
	],
};

const TOPUP_PRESETS_RUB = [1000, 3000, 5000, 10000, 20000];

// ============================================================================
// ОСНОВНОЙ КОМПОНЕНТ (MAIN COMPONENT)
// ============================================================================

export const FamilyBalanceShareWidget: React.FC<FamilyBalanceShareWidgetProps> = ({
	data = DEFAULT_PRESET_FAMILY_WALLET,
	currentPatientId,
	onToggleMemberSpending,
	onToggleAutoDebitChildren,
	onTopUpSuccess,
	onAddFamilyMember,
	className = "",
}) => {
	const [membersState, setMembersState] = useState<readonly FamilyWalletMember[]>(data.members);
	const [autoDebitChildren, setAutoDebitChildren] = useState(data.autoDebitChildrenEnabled);
	const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
	const [topUpRubInput, setTopUpRubInput] = useState<number>(5000);
	const [activeSbpModel, setActiveSbpModel] = useState<SbpDynamicQrModel | null>(null);
	const [copiedNspkLink, setCopiedNspkLink] = useState(false);
	const [isSimulatingTopUp, setIsSimulatingTopUp] = useState(false);
	const [topUpSuccessToast, setTopUpSuccessToast] = useState(false);

	// Переключение разрешения для конкретного члена семьи
	const handleToggleMember = useCallback(
		async (memberId: string) => {
			const target = membersState.find((m) => m.id === memberId);
			if (!target) return;

			const newAllowed = !target.canSpendFamilyBalance;
			setMembersState((prev) =>
				prev.map((m) =>
					m.id === memberId ? { ...m, canSpendFamilyBalance: newAllowed } : m,
				),
			);

			if (onToggleMemberSpending) {
				try {
					await onToggleMemberSpending(memberId, newAllowed);
				} catch {
					// rollback on failure
					setMembersState((prev) =>
						prev.map((m) =>
							m.id === memberId
								? { ...m, canSpendFamilyBalance: !newAllowed }
								: m,
						),
					);
				}
			}
		},
		[membersState, onToggleMemberSpending],
	);

	// Переключение авто-списания для всех детей
	const handleToggleAutoDebitChildren = useCallback(async () => {
		const nextVal = !autoDebitChildren;
		setAutoDebitChildren(nextVal);
		if (onToggleAutoDebitChildren) {
			try {
				await onToggleAutoDebitChildren(nextVal);
			} catch {
				setAutoDebitChildren(!nextVal);
			}
		}
	}, [autoDebitChildren, onToggleAutoDebitChildren]);

	// Генерация СБП QR Модели 2 при открытии модального окна пополнения
	const handleOpenTopUp = useCallback((presetRub?: number) => {
		const rub = presetRub ?? topUpRubInput;
		setTopUpRubInput(rub);
		const kopecks = rublesToKopecks(rub);

		const sbp = generateSbpPaymentQrModel({
			sumKopecks: kopecks,
			orderId: `FAM-TOPUP-${Date.now().toString(36).toUpperCase()}`,
			purpose: `Пополнение семейного счёта «${data.groupName}»`,
		});

		setActiveSbpModel(sbp);
		setIsTopUpModalOpen(true);
	}, [data.groupName, topUpRubInput]);

	// Обновление суммы СБП QR при выборе другого пресета
	const handleSelectPresetRub = useCallback(
		(rub: number) => {
			setTopUpRubInput(rub);
			const kopecks = rublesToKopecks(rub);
			const sbp = generateSbpPaymentQrModel({
				sumKopecks: kopecks,
				orderId: `FAM-TOPUP-${Date.now().toString(36).toUpperCase()}`,
				purpose: `Пополнение семейного счёта «${data.groupName}»`,
			});
			setActiveSbpModel(sbp);
		},
		[data.groupName],
	);

	// Копирование платежной ссылки СБП
	const handleCopyNspk = useCallback(() => {
		if (!activeSbpModel?.nspkUrl) return;
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(activeSbpModel.nspkUrl).catch(() => {});
		}
		setCopiedNspkLink(true);
		setTimeout(() => setCopiedNspkLink(false), 2000);
	}, [activeSbpModel]);

	// Эмуляция успешного зачисления оплаты через СБП
	const handleConfirmTopUpMock = useCallback(() => {
		setIsSimulatingTopUp(true);
		setTimeout(() => {
			setIsSimulatingTopUp(false);
			setIsTopUpModalOpen(false);
			setTopUpSuccessToast(true);
			if (onTopUpSuccess && activeSbpModel) {
				onTopUpSuccess(activeSbpModel.sumKopecks, "sbp");
			}
			setTimeout(() => setTopUpSuccessToast(false), 4000);
		}, 800);
	}, [activeSbpModel, onTopUpSuccess]);

	return (
		<div
			className={`family-balance-widget ${className}`}
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "14px",
				boxSizing: "border-box",
				width: "100%",
				fontFamily: "inherit",
			}}
		>
			{/* Toast об успешном пополнении */}
			{topUpSuccessToast && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						padding: "10px 14px",
						backgroundColor: "var(--teal-soft, #ccfbf1)",
						border: "1px solid var(--teal, #0d9488)",
						borderRadius: "8px",
						color: "var(--teal-strong, #0f766e)",
						fontSize: "13px",
						fontWeight: 600,
						animation: "fadeIn 0.2s ease",
					}}
				>
					<CheckCircle2 size={16} />
					<span>Семейный счёт успешно пополнен через СБП! Баланс обновлен.</span>
				</div>
			)}

			{/* 1. HERO КАРТОЧКА СЕМЕЙНОГО БАЛАНСА */}
			<div
				style={{
					borderRadius: "12px",
					padding: "16px",
					background: "linear-gradient(135deg, var(--teal-soft, #f0fdfa) 0%, var(--paper-strong, #ffffff) 100%)",
					border: "1px solid var(--teal-surface, rgba(13, 148, 136, 0.25))",
					boxShadow: "0 2px 8px rgba(13, 148, 136, 0.06)",
					position: "relative",
					overflow: "hidden",
				}}
			>
				{/* Фоновый декор */}
				<div
					style={{
						position: "absolute",
						top: "-12px",
						right: "-12px",
						opacity: 0.08,
						color: "var(--teal, #0d9488)",
						pointerEvents: "none",
					}}
				>
					<Heart size={110} />
				</div>

				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
						<span
							style={{
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								width: "28px",
								height: "28px",
								borderRadius: "6px",
								backgroundColor: "var(--teal, #0d9488)",
								color: "var(--on-teal, #ffffff)",
							}}
						>
							<Wallet size={16} />
						</span>
						<span style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
							{data.groupName}
						</span>
					</div>

					{data.familyDiscountPercent > 0 && (
						<span
							style={{
								fontSize: "11px",
								fontWeight: 700,
								color: "var(--teal-strong, #0f766e)",
								backgroundColor: "var(--teal-soft, #ccfbf1)",
								border: "1px solid var(--teal-surface, rgba(13, 148, 136, 0.3))",
								padding: "2px 8px",
								borderRadius: "9999px",
								display: "inline-flex",
								alignItems: "center",
								gap: "4px",
							}}
						>
							<Sparkles size={11} />
							<span>{`Скидка семьи ${data.familyDiscountPercent}%`}</span>
						</span>
					)}
				</div>

				{/* Сумма баланса */}
				<div style={{ margin: "12px 0 10px 0" }}>
					<div style={{ fontSize: "12px", color: "var(--muted, #64748b)", fontWeight: 500 }}>
						Общий доступный баланс
					</div>
					<div
						style={{
							fontSize: "26px",
							fontWeight: 800,
							color: "var(--teal-strong, #0f766e)",
							letterSpacing: "-0.5px",
							lineHeight: "1.2",
						}}
					>
						{formatKopecksToCurrencyRu(data.totalBalanceKopecks)}
					</div>
					{data.monthlySpentKopecks > 0 && (
						<div style={{ fontSize: "12px", color: "var(--muted, #64748b)", marginTop: "4px" }}>
							<span>{`Оплачено в этом месяце: ${formatKopecksToCurrencyRu(data.monthlySpentKopecks)}`}</span>
						</div>
					)}
				</div>

				{/* Кнопка быстрого пополнения СБП */}
				<div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
					<button
						type="button"
						onClick={() => handleOpenTopUp(5000)}
						style={{
							flex: 1,
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "6px",
							padding: "10px 14px",
							borderRadius: "8px",
							backgroundColor: "var(--teal, #0d9488)",
							color: "var(--on-teal, #ffffff)",
							border: "none",
							fontWeight: 600,
							fontSize: "13px",
							cursor: "pointer",
							minHeight: "44px",
							transition: "background-color 0.15s ease",
						}}
					>
						<QrCode size={16} />
						<span>Пополнить через СБП 0%</span>
					</button>

					{onAddFamilyMember && (
						<button
							type="button"
							onClick={onAddFamilyMember}
							style={{
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "4px",
								padding: "10px 12px",
								borderRadius: "8px",
								backgroundColor: "var(--paper-strong, #ffffff)",
								border: "1px solid var(--line, rgba(15, 118, 110, 0.2))",
								color: "var(--ink, #0f172a)",
								fontWeight: 600,
								fontSize: "13px",
								cursor: "pointer",
								minHeight: "44px",
							}}
							title="Добавить члена семьи"
						>
							<PlusCircle size={16} />
							<span>Добавить</span>
						</button>
					)}
				</div>
			</div>

			{/* 2. ПЕРЕКЛЮЧАТЕЛЬ АВТО-ОПЛАТЫ ДЕТСКИХ ПРИЕМОВ */}
			<div
				style={{
					borderRadius: "8px",
					padding: "12px 14px",
					backgroundColor: "var(--paper-strong, #ffffff)",
					border: "1px solid var(--line, rgba(15, 118, 110, 0.15))",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "10px",
				}}
			>
				<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
					<span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink, #0f172a)" }}>
						Оплачивать приёмы детей из семейного счёта
					</span>
					<span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
						Автоматически списывать счета за лечение детей до 18 лет из общего кошелька
					</span>
				</div>

				<div
					style={{
						minHeight: "44px",
						minWidth: "44px",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<button
						type="button"
						role="switch"
						aria-checked={autoDebitChildren}
						onClick={handleToggleAutoDebitChildren}
						style={{
							width: "44px",
							height: "26px",
							borderRadius: "13px",
							backgroundColor: autoDebitChildren ? "var(--teal, #0d9488)" : "var(--muted-soft, #cbd5e1)",
							border: "none",
							cursor: "pointer",
							position: "relative",
							padding: "2px",
							flexShrink: 0,
							transition: "background-color 0.2s ease",
						}}
					>
						<span
							style={{
								display: "block",
								width: "22px",
								height: "22px",
								borderRadius: "50%",
								backgroundColor: "var(--paper-strong, #ffffff)",
								boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
								transform: autoDebitChildren ? "translateX(18px)" : "translateX(0)",
								transition: "transform 0.2s ease",
							}}
						/>
					</button>
				</div>
			</div>

			{/* 3. СПИСОК ЧЛЕНОВ СЕМЬИ И СТАТУС 323-ФЗ */}
			<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
				<div style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink, #0f172a)", display: "flex", alignItems: "center", gap: "6px" }}>
					<Users size={15} />
					<span>Члены семьи и права списания</span>
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
					{membersState.map((member) => {
						const isChild = member.relationship === "child" || member.isMinor;
						const isOwner = member.relationship === "owner";

						return (
							<div
								key={member.id}
								style={{
									borderRadius: "8px",
									padding: "12px",
									backgroundColor: "var(--paper-strong, #ffffff)",
									border: "1px solid var(--line, rgba(15, 118, 110, 0.15))",
									display: "flex",
									flexDirection: "column",
									gap: "8px",
								}}
							>
								<div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
									<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
										<div
											style={{
												width: "36px",
												height: "36px",
												borderRadius: "50%",
												backgroundColor: isChild ? "var(--teal-soft, #ccfbf1)" : "var(--paper-soft, #f1f5f9)",
												color: isChild ? "var(--teal-strong, #0f766e)" : "var(--ink, #0f172a)",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												fontWeight: 700,
												fontSize: "13px",
												flexShrink: 0,
											}}
										>
											{member.fullName.slice(0, 1)}
										</div>

										<div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
											<div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink, #0f172a)" }}>
												{member.fullName}
											</div>
											<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", display: "flex", alignItems: "center", gap: "4px" }}>
												<span>{member.relationshipLabelRu}</span>
												{member.ageYears !== undefined && <span>• {`${member.ageYears} лет`}</span>}
											</div>
										</div>
									</div>

									{/* Переключатель списания средств (для всех кроме владельца) */}
									{!isOwner ? (
										<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
											<span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
												{member.canSpendFamilyBalance ? "Списание разрешено" : "Запрещено"}
											</span>
											<div
												style={{
													minHeight: "44px",
													minWidth: "44px",
													display: "inline-flex",
													alignItems: "center",
													justifyContent: "center",
												}}
											>
												<button
													type="button"
													role="switch"
													aria-checked={member.canSpendFamilyBalance}
													onClick={() => handleToggleMember(member.id)}
													style={{
														width: "38px",
														height: "22px",
														borderRadius: "11px",
														backgroundColor: member.canSpendFamilyBalance
															? "var(--teal, #0d9488)"
															: "var(--muted-soft, #cbd5e1)",
														border: "none",
														cursor: "pointer",
														position: "relative",
														padding: "2px",
														flexShrink: 0,
														transition: "background-color 0.2s ease",
													}}
													title={`Переключить разрешение списания для ${member.fullName}`}
												>
													<span
														style={{
															display: "block",
															width: "18px",
															height: "18px",
															borderRadius: "50%",
															backgroundColor: "var(--paper-strong, #ffffff)",
															boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
															transform: member.canSpendFamilyBalance
																? "translateX(16px)"
																: "translateX(0)",
															transition: "transform 0.2s ease",
														}}
													/>
												</button>
											</div>
										</div>
									) : (
										<span
											style={{
												fontSize: "11px",
												fontWeight: 700,
												color: "var(--teal-strong, #0f766e)",
												backgroundColor: "var(--teal-soft, #ccfbf1)",
												padding: "2px 8px",
												borderRadius: "4px",
											}}
										>
											Владелец счёта
										</span>
									)}
								</div>

								{/* Статус согласия 323-ФЗ */}
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										padding: "6px 8px",
										borderRadius: "6px",
										backgroundColor: member.proxy323FzStatus === "active_legal_proxy" ? "var(--teal-soft, #f0fdfa)" : "var(--paper-soft, #f8fafc)",
										border: "1px solid var(--line, rgba(0,0,0,0.06))",
										fontSize: "11px",
									}}
								>
									<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
										{member.proxy323FzStatus === "active_legal_proxy" ? (
											<ShieldCheck size={13} style={{ color: "var(--teal, #0d9488)" }} />
										) : (
											<ShieldAlert size={13} style={{ color: "var(--muted, #64748b)" }} />
										)}
										<span style={{ color: member.proxy323FzStatus === "active_legal_proxy" ? "var(--teal-strong, #0f766e)" : "var(--muted, #64748b)" }}>
											{member.proxy323FzStatus === "active_legal_proxy" ? "Согласие 323-ФЗ активно" : "Право оплаты 323-ФЗ"}
										</span>
									</div>

									{member.lastVisitDateRu && (
										<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", display: "flex", alignItems: "center", gap: "4px" }}>
											<span>Визит: {member.lastVisitDateRu}</span>
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* 4. ИНФОРМАЦИОННЫЙ БЛОК О БЕЗОПАСНОСТИ СЕМЕЙНОГО СЧЁТА */}
			<div
				style={{
					borderRadius: "8px",
					padding: "10px 12px",
					backgroundColor: "var(--paper-soft, #f8fafc)",
					border: "1px solid var(--line, rgba(13, 148, 136, 0.2))",
					fontSize: "11px",
					display: "flex",
					gap: "8px",
					alignItems: "flex-start",
					color: "var(--muted, #64748b)",
				}}
			>
				<Info size={15} style={{ flexShrink: 0, marginTop: "1px", color: "var(--teal, #0d9488)" }} />
				<div>
					<strong>Защита семейных средств: </strong>
					Все списания фиксируются в фискальном чеке клиники с указанием члена семьи, получившего лечение. Владелец счёта получает мгновенное SMS/PUSH уведомление о каждом списании.
				</div>
			</div>

			{/* 5. МОДАЛЬНОЕ ОКНО ПОПОЛНЕНИЯ СБП */}
			{isTopUpModalOpen && (
				<div
					role="dialog"
					aria-modal="true"
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						backgroundColor: "rgba(15, 23, 42, 0.65)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 9999,
						padding: "16px",
					}}
				>
					<div
						style={{
							backgroundColor: "var(--paper-strong, #ffffff)",
							borderRadius: "14px",
							maxWidth: "380px",
							width: "100%",
							padding: "18px",
							boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
							display: "flex",
							flexDirection: "column",
							gap: "14px",
						}}
					>
						{/* Заголовок */}
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
							<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
								<QrCode size={18} style={{ color: "var(--teal, #0d9488)" }} />
								<h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
									Пополнение семейного счёта
								</h4>
							</div>
							<button
								type="button"
								onClick={() => setIsTopUpModalOpen(false)}
								style={{
									background: "transparent",
									border: "none",
									color: "var(--muted, #64748b)",
									cursor: "pointer",
									padding: "4px",
								}}
								title="Закрыть"
							>
								<X size={18} />
							</button>
						</div>

						{/* Быстрый выбор суммы */}
						<div>
							<div style={{ fontSize: "12px", color: "var(--muted, #64748b)", marginBottom: "6px" }}>
								Выберите сумму пополнения:
							</div>
							<div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px" }}>
								{TOPUP_PRESETS_RUB.map((sum) => {
									const isSelected = topUpRubInput === sum;
									return (
										<button
											key={sum}
											type="button"
											onClick={() => setTopUpRubInput(sum)}
											style={{
												padding: "8px 4px",
												borderRadius: "6px",
												border: isSelected
													? "1px solid var(--teal, #0d9488)"
													: "1px solid var(--line, rgba(0,0,0,0.1))",
												backgroundColor: isSelected ? "var(--teal-soft, #ccfbf1)" : "var(--paper-soft, #f8fafc)",
												color: isSelected ? "var(--teal-strong, #0f766e)" : "var(--ink, #0f172a)",
												fontSize: "12px",
												fontWeight: 700,
												cursor: "pointer",
												textAlign: "center",
											}}
										>
											{`${(sum / 1000).toFixed(0)}k ₽`}
										</button>
									);
								})}
							</div>
						</div>

						{/* Блок QR кода СБП */}
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								padding: "12px",
								borderRadius: "10px",
								backgroundColor: "var(--paper-soft, #f8fafc)",
								border: "1px solid var(--line, rgba(0,0,0,0.1))",
							}}
						>
							{/* Имитация четкого QR кода СБП */}
							<div
								style={{
									width: "160px",
									height: "160px",
									backgroundColor: "var(--paper-strong, #ffffff)",
									borderRadius: "8px",
									border: "1px solid rgba(0,0,0,0.1)",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									padding: "8px",
									position: "relative",
								}}
							>
								<QrCode size={130} style={{ color: "var(--ink, #0f172a)" }} />
								<div
									style={{
										position: "absolute",
										padding: "2px 4px",
										backgroundColor: "var(--paper-strong, #ffffff)",
										borderRadius: "4px",
										boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
										fontSize: "9px",
										fontWeight: 800,
										color: "var(--ink, #0f172a)",
									}}
								>
									СБП
								</div>
							</div>

							<div style={{ marginTop: "10px", textAlign: "center" }}>
								<div style={{ fontSize: "18px", fontWeight: 800, color: "var(--teal-strong, #0f766e)" }}>
									{formatKopecksToCurrencyRu(topUpRubInput * 100)}
								</div>
								<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", marginTop: "2px" }}>
									Без комиссии • Моментальное зачисление
								</div>
							</div>
						</div>

						{/* Кнопки банков для оплаты в 1 клик на смартфоне */}
						{activeSbpModel && (
							<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
								<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontWeight: 600 }}>
									Оплатить в мобильном банке:
								</div>
								<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
									{activeSbpModel.deepLinks.slice(0, 4).map((bank) => (
									<a
										key={bank.bankId}
										href={bank.appUrl}
										target="_blank"
										rel="noreferrer"
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											gap: "4px",
											padding: "8px 6px",
											borderRadius: "6px",
											backgroundColor: "var(--paper-soft, #f1f5f9)",
											border: "1px solid var(--line, rgba(0,0,0,0.1))",
											color: "var(--ink, #0f172a)",
											fontSize: "11px",
											fontWeight: 600,
											textDecoration: "none",
										}}
									>
										<Smartphone size={12} />
										<span>{bank.bankNameRu}</span>
									</a>
								))}
							</div>
						</div>
						)}

						{/* Копирование ссылки и кнопка подтверждения */}
						<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
							<button
								type="button"
								onClick={handleCopyNspk}
								style={{
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									gap: "6px",
									padding: "8px",
									borderRadius: "6px",
									backgroundColor: "transparent",
									border: "1px solid var(--line, rgba(0,0,0,0.15))",
									color: "var(--ink, #0f172a)",
									fontSize: "12px",
									cursor: "pointer",
								}}
							>
								{copiedNspkLink ? <Check size={14} style={{ color: "var(--teal, #0d9488)" }} /> : <Copy size={14} />}
								<span>{copiedNspkLink ? "Ссылка скопирована!" : "Скопировать платёжную ссылку"}</span>
							</button>

							<button
								type="button"
								onClick={handleConfirmTopUpMock}
								disabled={isSimulatingTopUp}
								style={{
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									gap: "6px",
									padding: "10px",
									borderRadius: "8px",
									backgroundColor: "var(--teal, #0d9488)",
									color: "var(--on-teal, #ffffff)",
									border: "none",
									fontSize: "13px",
									fontWeight: 700,
									cursor: "pointer",
									minHeight: "44px",
								}}
							>
								{isSimulatingTopUp ? (
									<span>Проверка оплаты в банке...</span>
								) : (
									<>
										<Check size={16} />
										<span>Я оплатил через СБП</span>
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
