import React from "react";
import { useDocumentStore } from "../../../../store/documentStore";

export const AnesthesiaMainInputs: React.FC<{ zoneOfferedFromVisit?: string }> = React.memo(
	function AnesthesiaMainInputs({ zoneOfferedFromVisit }) {
		const {
			anesthesiaMethod, setAnesthesiaMethod,
			anesthesiaAnesthetic, setAnesthesiaAnesthetic,
			anesthesiaVasoconstrictor, setAnesthesiaVasoconstrictor,
			anesthesiaZone, setAnesthesiaZone,
		} = useDocumentStore();

		return (
			<>
				<label>
					Метод
					<input
						value={anesthesiaMethod}
						onChange={(e) => setAnesthesiaMethod(e.target.value)}
						placeholder="например: инфильтрационная"
					/>
				</label>
				<label>
					Препарат
					<input
						value={anesthesiaAnesthetic}
						onChange={(e) => setAnesthesiaAnesthetic(e.target.value)}
						placeholder="например: артикаин 4%"
					/>
				</label>
				<label>
					Вазоконстриктор
					<input
						value={anesthesiaVasoconstrictor}
						onChange={(e) => setAnesthesiaVasoconstrictor(e.target.value)}
						placeholder="например: 1:100000 или «без вазоконстриктора»"
					/>
				</label>
				<label>
					Зона
					<input
						value={anesthesiaZone}
						onChange={(e) => setAnesthesiaZone(e.target.value)}
						placeholder="например: 46 или нижняя челюсть справа"
					/>
					{zoneOfferedFromVisit ? (
						<button
							type="button"
							className="document-anamnesis-quick"
							onClick={() => setAnesthesiaZone(zoneOfferedFromVisit)}
						>
							Подставить зону приёма: {zoneOfferedFromVisit}
						</button>
					) : null}
				</label>
			</>
		);
	},
);
