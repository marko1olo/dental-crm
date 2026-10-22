import React from "react";

export const StageServicesTableHeader: React.FC = () => {
	return (
		<div className="stage-table-header" data-testid="stage-services-table-header">
			<div className="stage-col-service">Услуга / Процедура</div>
			<div className="stage-col-tooth">Зуб</div>
			<div className="stage-col-doctor">Врач</div>
			<div className="stage-col-qty">Кол-во</div>
			<div className="stage-col-price">Цена / ед.</div>
			<div className="stage-col-disc">Скидка</div>
			<div className="stage-col-total">Итого</div>
			<div className="stage-col-actions">Действия</div>
		</div>
	);
};
