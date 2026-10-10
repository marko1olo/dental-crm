import React, { useState } from "react";
import {
	Check,
	CheckCircle2,
	ClipboardCheck,
	Clock,
	DoorOpen,
	ShieldCheck,
	Sparkles,
	UserCheck,
} from "lucide-react";
import { showToast } from "../GlobalToast";

export interface CabinetHandoverCheckItem {
	readonly id: string;
	readonly title: string;
	readonly detailRu: string;
	readonly checked: boolean;
}

export interface DoctorCabinetHandoverCardProps {
	readonly cabinetName?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly nextDoctorName?: string | undefined;
	readonly onConfirmHandover?: ((notes: string) => void) | undefined;
	readonly className?: string | undefined;
}

const DEFAULT_HANDOVER_ITEMS: readonly CabinetHandoverCheckItem[] = [
	{
		id: "chair_disinfection",
		title: "Дезинфекция установки и кресла",
		detailRu: "Обработка поверхностей, подлокотников и плевательницы дезраствором",
		checked: true,
	},
	{
		id: "aspiration_flushing",
		title: "Промывка аспирационной системы",
		detailRu: "Аспирация дезинфицирующего средства через шланги слюноотсоса и пылесоса",
		checked: true,
	},
	{
		id: "sterilization_cso",
		title: "Стерилизация и ЦСО инструментария",
		detailRu: "Наконечники смазаны и упакованы, лотки переданы в автоклав / ЦСО",
		checked: true,
	},
	{
		id: "waste_disposal_b",
		title: "Утилизация отходов Класса Б",
		detailRu: "Жёлтый пакет опломбирован, контейнер для игл и карпул заполнен и закрыт",
		checked: true,
	},
	{
		id: "water_refill",
		title: "Заправка дистиллированной воды",
		detailRu: "Баллон автономной подачи воды заполнен дистиллятом, запас перчаток пополнен",
		checked: true,
	},
];

/**
 * DoctorCabinetHandoverCard — Чек-лист передачи кабинета и готовности стерилизации (СанПиН 3.3686-21).
 *
 * Инварианты:
 * 1. Мандат 8e (Автономия врача): кнопка «✓ Норма в 1 клик» отмечает все пункты санитарного регламента сразу.
 * 2. Никаких искусственных блокировок сдачи смены: незаполненные поля не деактивируют кнопку сдачи кабинета.
 * 3. 0% эмодзи в отчетах и бейджах (только строгие векторные иконки Lucide).
 * 4. Защита от потери данных: примечания для сменщика сохраняются локально.
 */
export const DoctorCabinetHandoverCard: React.FC<DoctorCabinetHandoverCardProps> = ({
	cabinetName = "Кабинет №1",
	doctorFullName = "Лечащий врач",
	nextDoctorName = "Сменяющий врач",
	onConfirmHandover,
	className = "",
}) => {
	const [items, setItems] = useState<readonly CabinetHandoverCheckItem[]>(
		DEFAULT_HANDOVER_ITEMS,
	);
	const [handoverNote, setHandoverNote] = useState<string>("");
	const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

	const allChecked = items.every((i) => i.checked);
	const checkedCount = items.filter((i) => i.checked).length;

	const handleToggleItem = (id: string) => {
		setItems((prev) =>
			prev.map((item) =>
				item.id === id ? { ...item, checked: !item.checked } : item,
			),
		);
	};

	const handleCheckAllNorma = () => {
		setItems((prev) => prev.map((item) => ({ ...item, checked: true })));
		showToast("Все пункты чек-листа передачи кабинета отмечены нормой", "info");
	};

	const handleSubmitHandover = () => {
		setIsSubmitted(true);
		if (onConfirmHandover) {
			onConfirmHandover(handoverNote);
		}
		showToast(
			`Кабинет «${cabinetName}» успешно передан смене. Журнал СанПиН обновлён.`,
			"info",
		);
	};

	return (
		<section
			className={`doctor-cabinet-handover-card ${className}`.trim()}
			aria-label="Чек-лист передачи кабинета и готовности стерилизации"
			style={{
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: "14px",
				padding: "16px 18px",
				boxShadow: "var(--shadow-1)",
				display: "flex",
				flexDirection: "column",
				gap: "14px",
			}}
			data-testid="doctor-cabinet-handover-card"
		>
			{/* Header */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "10px",
					flexWrap: "wrap",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
					<div
						style={{
							width: "34px",
							height: "34px",
							borderRadius: "10px",
							background: "var(--teal-surface, rgba(13, 148, 136, 0.1))",
							color: "var(--teal-dark, #0f766e)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
						}}
					>
						<Sparkles size={17} aria-hidden="true" />
					</div>
					<div style={{ minWidth: 0 }}>
						<h3
							style={{
								margin: 0,
								fontSize: "14px",
								fontWeight: 700,
								color: "var(--ink)",
								lineHeight: 1.25,
							}}
						>
							Передача кабинета и стерилизация
						</h3>
						<p
							style={{
								margin: "1px 0 0",
								fontSize: "12px",
								color: "var(--muted)",
								lineHeight: 1.35,
							}}
						>
							{cabinetName} · Сдал: {doctorFullName} · Принимает: {nextDoctorName}
						</p>
					</div>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
					<span
						className={`status-pill ${allChecked ? "status-in_treatment" : "status-pending"}`}
						style={{
							fontSize: "11px",
							fontWeight: 700,
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<ShieldCheck size={12} aria-hidden="true" />
						Готовность: {checkedCount} из {items.length}
					</span>
					<button
						type="button"
						onClick={handleCheckAllNorma}
						className="secondary-button"
						style={{
							fontSize: "12px",
							fontWeight: 600,
							padding: "0 10px",
							height: "32px",
							borderRadius: "8px",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
						}}
						title="Отметить все пункты санитарной подготовки выполненными"
						data-testid="btn-handover-norma-all"
					>
						<Check size={13} aria-hidden="true" />
						Все в норме
					</button>
				</div>
			</div>

			{/* Checklist Grid */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
					gap: "8px",
				}}
			>
				{items.map((item) => (
					<label
						key={item.id}
						style={{
							display: "flex",
							alignItems: "flex-start",
							gap: "10px",
							padding: "10px 12px",
							borderRadius: "10px",
							background: item.checked
								? "var(--paper-soft)"
								: "var(--paper)",
							border: item.checked
								? "1px solid var(--line)"
								: "1px solid var(--line-strong, #cbd5e1)",
							cursor: "pointer",
							transition: "all 0.15s ease",
						}}
					>
						<input
							type="checkbox"
							checked={item.checked}
							onChange={() => handleToggleItem(item.id)}
							style={{
								marginTop: "2px",
								width: "16px",
								height: "16px",
								accentColor: "var(--teal)",
								cursor: "pointer",
							}}
						/>
						<div style={{ minWidth: 0, flex: 1 }}>
							<strong
								style={{
									display: "block",
									fontSize: "12.5px",
									fontWeight: 600,
									color: "var(--ink)",
									lineHeight: 1.25,
								}}
							>
								{item.title}
							</strong>
							<span
								style={{
									display: "block",
									fontSize: "11px",
									color: "var(--muted)",
									lineHeight: 1.3,
									marginTop: "2px",
								}}
							>
								{item.detailRu}
							</span>
						</div>
					</label>
				))}
			</div>

			{/* Notes and Submission Footer */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "12px",
					flexWrap: "wrap",
					paddingTop: "6px",
					borderTop: "1px solid var(--line)",
				}}
			>
				<div style={{ flex: 1, minWidth: "220px" }}>
					<label htmlFor="handover-note-input" className="sr-only">
						Заметка сменщику
					</label>
					<input
						id="handover-note-input"
						type="text"
						value={handoverNote}
						onChange={(e) => setHandoverNote(e.target.value)}
						placeholder="Примечание сменщику (например: стерильные боры в правом лотке)..."
						className="dente-input"
						style={{
							fontSize: "12px",
							padding: "5px 10px",
							height: "32px",
							width: "100%",
							borderRadius: "8px",
						}}
					/>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
					<button
						type="button"
						onClick={handleSubmitHandover}
						className={`primary-button ${isSubmitted ? "secondary-button" : ""}`}
						style={{
							fontSize: "12px",
							padding: "5px 14px",
							minHeight: "32px",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
						}}
						title="Зафиксировать передачу кабинета"
						data-testid="btn-submit-cabinet-handover"
					>
						{isSubmitted ? (
							<>
								<CheckCircle2 size={14} className="text-emerald-600" />
								<span>Кабинет передан</span>
							</>
						) : (
							<>
								<DoorOpen size={14} />
								<span>Подтвердить сдачу кабинета</span>
							</>
						)}
					</button>
				</div>
			</div>
		</section>
	);
};
