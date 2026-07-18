import { Calendar, CalendarDays, Plus, Trash2 } from "lucide-react";
import type React from "react";
import type { ChangeEvent } from "react";
import type { Chair } from "@dental/shared";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement>;

interface ClinicChairsSectionProps {
	dashboard: any;
	typedChairs: Chair[];
	newChairName: string;
	setNewChairName: (name: string) => void;
	addChair: () => void;
	newChairReadyToCreate: boolean;
	newChairHasXraySensor: boolean;
	setNewChairHasXraySensor: (v: boolean | ((v: boolean) => boolean)) => void;
	newChairHasMicroscope: boolean;
	setNewChairHasMicroscope: (v: boolean | ((v: boolean) => boolean)) => void;
	newChairHasSurgeryKit: boolean;
	setNewChairHasSurgeryKit: (v: boolean | ((v: boolean) => boolean)) => void;
	deleteChair: (id: string) => void;
	hasMultipleChairs: boolean;
}

export const ClinicChairsSection: React.FC<ClinicChairsSectionProps> = ({
	dashboard,
	typedChairs,
	newChairName,
	setNewChairName,
	addChair,
	newChairReadyToCreate,
	newChairHasXraySensor,
	setNewChairHasXraySensor,
	newChairHasMicroscope,
	setNewChairHasMicroscope,
	newChairHasSurgeryKit,
	setNewChairHasSurgeryKit,
	deleteChair,
	hasMultipleChairs,
}) => {
	if (!hasMultipleChairs) {
		return null;
	}

	return (
		<section className="clinic-section-card" aria-label="Кресла и кабинеты">
			<div className="clinic-section-header">
				<div className="clinic-section-icon">
					<Calendar size={24} />
				</div>
				<div className="clinic-section-title">
					<h3>Кресла и кабинеты</h3>
					<p>Добавьте кресла и укажите доступное в них оборудование</p>
				</div>
				<div className="clinic-mode-status">
					<span className="status-pill status-confirmed">
						Кресел: {dashboard.clinicSettings.chairs.length}
					</span>
				</div>
			</div>

			<div className="chair-quick-create">
				<div className="chair-quick-create-row">
					<input
						aria-label="Новое кресло"
						placeholder="Название (например: Кабинет 1)"
						value={newChairName}
						onChange={(event: TextInputChangeEvent) =>
							setNewChairName(event.target.value)
						}
					/>
					<button
						aria-label="Добавить кресло"
						className="primary-button"
						type="button"
						onClick={addChair}
						disabled={!newChairReadyToCreate}
					>
						<Plus size={18} style={{ marginRight: "6px" }} /> Добавить
					</button>
				</div>
				<div className="chair-equipment-picker">
					<span
						style={{
							fontSize: "13px",
							color: "var(--muted)",
							alignSelf: "center",
							marginRight: "8px",
						}}
					>
						Оборудование:
					</span>
					<button
						className={newChairHasXraySensor ? "active" : ""}
						type="button"
						onClick={() => setNewChairHasXraySensor((v: boolean) => !v)}
					>
						RVG (Визиограф)
					</button>
					<button
						className={newChairHasMicroscope ? "active" : ""}
						type="button"
						onClick={() => setNewChairHasMicroscope((v: boolean) => !v)}
					>
						Микроскоп
					</button>
					<button
						className={newChairHasSurgeryKit ? "active" : ""}
						type="button"
						onClick={() => setNewChairHasSurgeryKit((v: boolean) => !v)}
					>
						Хирургия
					</button>
				</div>
			</div>

			<div className="premium-chair-grid">
				{typedChairs.map((chair) => (
					<div className="premium-chair-card" key={chair.id}>
						<div className="premium-chair-header">
							<div className="premium-chair-title">
								<div className="premium-chair-icon">
									<CalendarDays size={20} />
								</div>
								<h4>{chair.name}</h4>
							</div>
							<button
								className="icon-button"
								style={{ color: "var(--danger-color)" }}
								onClick={() => deleteChair(chair.id)}
								title="Удалить кресло"
							>
								<Trash2 size={16} />
							</button>
						</div>

						<div className="premium-chair-badges">
							{chair.hasXraySensor && (
								<span className="status-pill status-neutral">
									☢️ Визиограф
								</span>
							)}
							{chair.hasMicroscope && (
								<span className="status-pill status-neutral">
									🔬 Микроскоп
								</span>
							)}
							{chair.hasSurgeryKit && (
								<span className="status-pill status-neutral">
									🔪 Хирургия
								</span>
							)}
							{!chair.hasXraySensor &&
								!chair.hasMicroscope &&
								!chair.hasSurgeryKit && (
									<span className="status-pill status-cancelled">Базовое</span>
								)}
						</div>
					</div>
				))}
			</div>
		</section>
	);
};
