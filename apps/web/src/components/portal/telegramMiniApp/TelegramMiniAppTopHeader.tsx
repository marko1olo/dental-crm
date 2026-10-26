/**
 * DENTE POCKET CLINIC — Telegram Mini App Top Header & Family Strip
 */

import React from "react";
import { Activity, ShieldCheck, Sparkles, User, Users } from "lucide-react";

export interface FamilyMember {
	id: string;
	name: string;
	relation: string;
	age?: number;
}

export interface TelegramMiniAppTopHeaderProps {
	patientName: string;
	bonusPoints: number;
	familyMembers: readonly FamilyMember[];
	activeFamilyMemberId: string;
	onSelectFamilyMember: (id: string) => void;
}

export const TelegramMiniAppTopHeader: React.FC<TelegramMiniAppTopHeaderProps> = ({
	patientName,
	bonusPoints,
	familyMembers,
	activeFamilyMemberId,
	onSelectFamilyMember,
}) => (
	<>
		<header className="tg-app-header">
			<div className="tg-app-brand">
				<div className="tg-app-logo">
					<Activity size={20} />
				</div>
				<div>
					<div className="tg-app-title">DENTE Pocket Clinic</div>
					<div className="tg-app-subtitle">
						<ShieldCheck size={12} className="text-teal-400" />
						<span>Здравствуйте, {patientName}!</span>
					</div>
				</div>
			</div>

			<div className="tg-bonus-chip" title="Ваш бонусный баланс DENTE">
				<Sparkles size={13} />
				<span>{bonusPoints.toLocaleString("ru-RU")} ₽</span>
			</div>
		</header>

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
