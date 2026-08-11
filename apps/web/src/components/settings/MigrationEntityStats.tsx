export function MigrationEntityStats(props: {
	totalLines?: number;
	patientRows?: number;
	imagingRows?: number;
	clinicFields?: number;
	readyRows?: number;
	warningRows?: number;
	blockedRows?: number;
}) {
	return (
		<div className="import-stats">
			{props.totalLines !== undefined && <span>{props.totalLines} строк</span>}
			{props.readyRows !== undefined && <span>{props.readyRows} готово</span>}
			{props.warningRows !== undefined && <span>{props.warningRows} предупреждения</span>}
			{props.blockedRows !== undefined && <span>{props.blockedRows} к исправлению</span>}
			
			{props.patientRows !== undefined && <span>{props.patientRows} пациентов</span>}
			{props.imagingRows !== undefined && <span>{props.imagingRows} снимков</span>}
			{props.clinicFields !== undefined && <span>{props.clinicFields} реквизитов</span>}
		</div>
	);
}
