import type { NormalizedToothStatus } from "./formulaTypes.js";

/**
 * Генерирует векторный SVG анатомической одонтограммы 5 поверхностей зуба.
 */
export function renderToothSvg(num: number, statusInfo: NormalizedToothStatus, isUpper: boolean): string {
	const w = 26;
	const h = 32;

	// Если зуб отсутствует — рисуем крест
	if (statusInfo.category === "missing") {
		return `
      <svg width="${w}" height="${h}" viewBox="0 0 26 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; margin:0 auto;">
        <rect x="2" y="4" width="22" height="24" rx="3" stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="2 2" fill="#f8fafc"/>
        <line x1="4" y1="6" x2="22" y2="26" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="22" y1="6" x2="4" y2="26" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `;
	}

	// Если имплантат — рисуем титановый винт / абатмент
	if (statusInfo.category === "implant") {
		return `
      <svg width="${w}" height="${h}" viewBox="0 0 26 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; margin:0 auto;">
        <rect x="3" y="3" width="20" height="10" rx="2" fill="#818cf8" stroke="#4338ca" stroke-width="1.2"/>
        <path d="M7 13V27L13 30L19 27V13H7Z" fill="#e0e7ff" stroke="#4f46e5" stroke-width="1.2"/>
        <line x1="8" y1="17" x2="18" y2="17" stroke="#4338ca" stroke-width="1.2"/>
        <line x1="8" y1="21" x2="18" y2="21" stroke="#4338ca" stroke-width="1.2"/>
        <line x1="9" y1="25" x2="17" y2="25" stroke="#4338ca" stroke-width="1.2"/>
      </svg>
    `;
	}

	// Анатомическая схема коронки (5 поверхностей: Вестибулярная, Оральная, Мезиальная, Дистальная, Окклюзионная)
	const fill = statusInfo.svgFill;
	const stroke = statusInfo.svgStroke;

	return `
    <svg width="${w}" height="${h}" viewBox="0 0 26 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; margin:0 auto;">
      <!-- Корневая часть (схематично) -->
      ${
				isUpper
					? `<path d="M7 10L13 2L19 10" stroke="${stroke}" stroke-width="1" stroke-dasharray="1.5 1.5" fill="none" opacity="0.6"/>`
					: `<path d="M7 22L13 30L19 22" stroke="${stroke}" stroke-width="1" stroke-dasharray="1.5 1.5" fill="none" opacity="0.6"/>`
			}
      <!-- Внешний контур коронки -->
      <rect x="3" y="${isUpper ? "10" : "2"}" width="20" height="20" rx="4" fill="#ffffff" stroke="${stroke}" stroke-width="1.2"/>
      
      <!-- Трапеции 4-х боковых поверхностей -->
      <polygon points="3,${isUpper ? "10" : "2"} 23,${isUpper ? "10" : "2"} 19,${isUpper ? "15" : "7"} 7,${isUpper ? "15" : "7"}" fill="${statusInfo.category !== "sound" ? fill : "#ffffff"}" opacity="${statusInfo.category !== "sound" ? "0.35" : "1"}"/>
      <polygon points="3,${isUpper ? "30" : "22"} 23,${isUpper ? "30" : "22"} 19,${isUpper ? "25" : "17"} 7,${isUpper ? "25" : "17"}" fill="${statusInfo.category !== "sound" ? fill : "#ffffff"}" opacity="${statusInfo.category !== "sound" ? "0.35" : "1"}"/>
      <polygon points="3,${isUpper ? "10" : "2"} 3,${isUpper ? "30" : "22"} 7,${isUpper ? "25" : "17"} 7,${isUpper ? "15" : "7"}" fill="${statusInfo.category !== "sound" ? fill : "#ffffff"}" opacity="${statusInfo.category !== "sound" ? "0.35" : "1"}"/>
      <polygon points="23,${isUpper ? "10" : "2"} 23,${isUpper ? "30" : "22"} 19,${isUpper ? "25" : "17"} 19,${isUpper ? "15" : "7"}" fill="${statusInfo.category !== "sound" ? fill : "#ffffff"}" opacity="${statusInfo.category !== "sound" ? "0.35" : "1"}"/>

      <!-- Центральная окклюзионная поверхность -->
      <rect x="7" y="${isUpper ? "15" : "7"}" width="12" height="10" rx="1.5" fill="${fill}" stroke="${stroke}" stroke-width="0.8"/>
      
      <!-- Если пульпит — рисуем нерв/канал -->
      ${
				statusInfo.category === "pulpitis"
					? `<circle cx="13" cy="${isUpper ? "20" : "12"}" r="2" fill="#7f1d1d"/>`
					: ""
			}
    </svg>
  `;
}
