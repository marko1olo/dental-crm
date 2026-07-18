import React from "react";
import { User, Image as ImageIcon, CheckCircle, Clock } from "lucide-react";

interface DoctorMiniOnboardingProps {
	onComplete: () => void;
}

export const DoctorMiniOnboarding: React.FC<DoctorMiniOnboardingProps> = ({ onComplete }) => {
	return (
		<div style={{
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			minHeight: "100vh",
			background: "var(--paper-soft)",
			padding: "20px"
		}}>
			<div style={{
				background: "var(--surface)",
				padding: "32px",
				borderRadius: "16px",
				boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
				maxWidth: "500px",
				width: "100%"
			}}>
				<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
					<div style={{ background: "var(--brand-100)", padding: "12px", borderRadius: "12px", color: "var(--brand-600)" }}>
						<User size={28} />
					</div>
					<div>
						<h1 style={{ fontSize: "20px", margin: 0 }}>Добро пожаловать в клинику!</h1>
						<p style={{ margin: "4px 0 0 0", color: "var(--muted)", fontSize: "14px" }}>
							Владелец уже настроил ваши права и расписание. Осталась пара личных штрихов.
						</p>
					</div>
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
					
					{/* TODO: Граница ответственности (Врач настраивает личное) */}
					
					<div style={{ padding: "16px", border: "1px solid var(--line)", borderRadius: "8px" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
							<ImageIcon size={20} color="var(--brand-500)" />
							<span style={{ fontWeight: 500 }}>Фото и подпись</span>
						</div>
						<p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "var(--muted)" }}>
							TODO: Добавить загрузку аватара и скан личной подписи (для ИДС).
						</p>
						<button disabled className="secondary-button" style={{ fontSize: "13px" }}>Загрузить фото</button>
					</div>

					<div style={{ padding: "16px", border: "1px solid var(--line)", borderRadius: "8px" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
							<Clock size={20} color="var(--brand-500)" />
							<span style={{ fontWeight: 500 }}>Ваши приемы (По умолчанию)</span>
						</div>
						<p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "var(--muted)" }}>
							Сколько времени в среднем занимает ваш типичный прием?
						</p>
						<select className="appointment-editor-select" style={{ width: "100%" }} defaultValue="60">
							<option value="30">30 минут</option>
							<option value="45">45 минут</option>
							<option value="60">1 час</option>
							<option value="90">1.5 часа</option>
						</select>
					</div>

				</div>

				<div style={{ marginTop: "32px", display: "flex", justifyContent: "flex-end" }}>
					<button 
						className="primary-button" 
						onClick={async () => {
							// TODO: Отправить на бэк userProfile.isOnboarded = true
							// Пока просто пропускаем
							onComplete();
						}}
					>
						Начать работу
						<CheckCircle size={18} style={{ marginLeft: "8px" }} />
					</button>
				</div>

				<div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--line)", fontSize: "12px", color: "var(--muted-light)", textAlign: "center" }}>
					<p style={{ margin: 0 }}>* Ваша роль, процент оплаты и доступные кресла настраиваются администратором клиники.</p>
				</div>
			</div>
		</div>
	);
};
