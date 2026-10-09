import React, { memo } from "react";
import { Activity, ShieldCheck, Sparkles, User, Users } from "lucide-react";
import type { FamilyMember } from "./types";

export interface CabinetHeaderProps {
	readonly bonusBalance: number;
	readonly familyMembers: readonly FamilyMember[];
	readonly activeFamilyMemberId: string;
	readonly onSelectFamilyMember: (id: string) => void;
	readonly onOpenFinance: () => void;
}

export const CabinetHeader: React.FC<CabinetHeaderProps> = memo(({
	bonusBalance,
	familyMembers,
	activeFamilyMemberId,
	onSelectFamilyMember,
	onOpenFinance,
}) => {
	return (
		<>
			{/* Шапка Кабинета (Pocket Clinic Top Bar) */}
			<header className="tg-app-header">
				<div className="tg-app-brand">
					<div className="tg-app-logo">
						<Activity size={20} />
					</div>
					<div>
						<div className="tg-app-title">DENTE Pocket Clinic</div>
						<div className="tg-app-subtitle">
							<ShieldCheck size={12} className="text-teal-400" />
							<span>Кабинет пациента</span>
						</div>
					</div>
				</div>

				{/* Бонусный чип с переходом во вкладку финансов */}
				<button
					type="button"
					className="tg-bonus-chip"
					onClick={onOpenFinance}
					title="Ваш бонусный баланс DENTE"
				>
					<Sparkles size={13} />
					<span>{bonusBalance.toLocaleString("ru-RU")} ₽</span>
				</button>
			</header>

			{/* Семейный стрип переключения профилей */}
			<div className="tg-family-strip">
				<Users size={14} className="text-slate-400 ml-1 flex-shrink-0" />
				{familyMembers.map((m) => (
					<button
						key={m.id}
						type="button"
						className={`tg-family-pill ${activeFamilyMemberId === m.id ? "active" : ""}`}
						onClick={() => onSelectFamilyMember(m.id)}
					>
						<User size={13} />
						<span>{m.name}</span>
					</button>
				))}
			</div>
		</>
	);
});

CabinetHeader.displayName = "CabinetHeader";
