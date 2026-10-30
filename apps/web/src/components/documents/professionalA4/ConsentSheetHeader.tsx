import React from "react";

export function ConsentSheetHeader({
	// biome-ignore lint/suspicious/noExplicitAny: clinic
	cl,
	contractDate,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: clinic
	cl: any;
	contractDate: string;
}): React.JSX.Element {
	return (
		<>
			<header className="a4-header">
				<div className="a4-clinic-name">{cl.legalName || cl.name}</div>
				<div className="a4-clinic-requisites">
					Адрес: {cl.actualAddress || cl.address} · Тел: {cl.phone} · ИНН:{" "}
					{cl.inn} · ОГРН: {cl.ogrn}
					<br />
					Лицензия на осуществление медицинской деятельности: №{" "}
					{cl.licenseNumber}
				</div>
			</header>

			<h1 className="a4-doc-title">
				ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ НА МЕДИЦИНСКОЕ ВМЕШАТЕЛЬСТВО
			</h1>
			<div className="a4-doc-subtitle">
				в соответствии со статьей 20 Федерального закона от 21.11.2011 № 323-ФЗ
				<br />и Приказом Министерства здравоохранения Российской Федерации от
				12.11.2021 № 1051н
			</div>

			<div className="a4-meta-row">
				<div>{cl.city || "г. Москва"}</div>
				<div>«{contractDate}» г.</div>
			</div>
		</>
	);
}
