export interface DentalLabMaterial {
	id: string;
	nameRu: string;
	manufacturerRu: string;
	strengthMpa: number;
	indicationsRu: string;
	isBiocompatible: boolean;
}

export const LAB_MATERIALS: Record<string, DentalLabMaterial> = {
	zirconia_katana_ml: {
		id: 'zirconia_katana_ml',
		nameRu: 'Katana Zirconia HTML / Prettau Dispersive',
		manufacturerRu: 'Kuraray Noritake / Zirkonzahn',
		strengthMpa: 1150,
		indicationsRu: 'Одиночные коронки фронтальной и жевательной зоны, мостовидные протезы любой протяженности.',
		isBiocompatible: true
	},
	emax_press: {
		id: 'emax_press',
		nameRu: 'IPS e.max Press (дисиликат лития)',
		manufacturerRu: 'Ivoclar Vivadent',
		strengthMpa: 470,
		indicationsRu: 'Виниры, вкладки Inlay/Onlay/Overlay, анатомические коронки во фронтальном отделе.',
		isBiocompatible: true
	},
	feldspathic_refractory: {
		id: 'feldspathic_refractory',
		nameRu: 'Полевошпатная керамика Noritake EX-3 / Creation CC',
		manufacturerRu: 'Noritake / Creation Willi Geller',
		strengthMpa: 120,
		indicationsRu: 'Ультратонкие виниры без препарирования, жакетные коронки, микропротезы.',
		isBiocompatible: true
	},
	zirconia_tibase: {
		id: 'zirconia_tibase',
		nameRu: 'ZrO₂ на титановом основании (Ti-Base / Medentika)',
		manufacturerRu: 'Straumann / Medentika / Zirkonzahn',
		strengthMpa: 1200,
		indicationsRu: 'Одиночные и мостовидные коронки с винтовой фиксацией на дентальных имплантатах.',
		isBiocompatible: true
	},
	cobalt_chromium_bredent: {
		id: 'cobalt_chromium_bredent',
		nameRu: 'Co-Cr сплав Bego Wironit + замки Bredent VKS-SG',
		manufacturerRu: 'BEGO / Bredent',
		strengthMpa: 850,
		indicationsRu: 'Бюгельные протезы сложной архитектоники, комбинированные конструкции с фрезерованными балками.',
		isBiocompatible: true
	},
	titanium_bar_pmma_zirconia: {
		id: 'titanium_bar_pmma_zirconia',
		nameRu: 'Фрезерованный титан Grade 5 + Multi-Unit коннекторы',
		manufacturerRu: 'Dentsply Sirona / Zfx / Schutz Dental',
		strengthMpa: 950,
		indicationsRu: 'Тотальные балочные конструкции при протоколах All-on-4, All-on-6, Trefoil.',
		isBiocompatible: true
	},
	photopolymer_biocompatible: {
		id: 'photopolymer_biocompatible',
		nameRu: 'Биосовместимый полимер NextDent SG / Formlabs Dental SG',
		manufacturerRu: '3D Systems / Formlabs',
		strengthMpa: 110,
		indicationsRu: 'Хирургические навигационные шаблоны, позиционеры, прикусные сплинты.',
		isBiocompatible: true
	},
	pmma_cad_cam: {
		id: 'pmma_cad_cam',
		nameRu: 'PMMA CAD/CAM (фрезерованный полимер)',
		manufacturerRu: 'Yamahachi Dental / Huge Dental',
		strengthMpa: 130,
		indicationsRu: 'Провизорные фрезерованные коронки и мостовидные протезы длительного ношения.',
		isBiocompatible: true
	},
	pfm_cocr_duceram: {
		id: 'pfm_cocr_duceram',
		nameRu: 'Металлокерамика Co-Cr + Duceram Plus / Kiss',
		manufacturerRu: 'Dentsply Sirona / BEGO Wirobond',
		strengthMpa: 650,
		indicationsRu: 'Классические металлокерамические коронки и мостовидные конструкции.',
		isBiocompatible: true
	},
	aligner_polyurethane_duran: {
		id: 'aligner_polyurethane_duran',
		nameRu: 'Термопластический полиуретан / PETG (Duran / Erkodur 0.75-1.0 мм)',
		manufacturerRu: 'Scheu Dental / Erkodent',
		strengthMpa: 95,
		indicationsRu: 'Ортодонтические элайнеры, ретенционные каппы, бруксо-сплинты.',
		isBiocompatible: true
	},
	orthodontic_acrylic_leocryl: {
		id: 'orthodontic_acrylic_leocryl',
		nameRu: 'Ортодонтический акрил холодной полимеризации Leocryl + винт Бертони',
		manufacturerRu: 'Dentaurum / Leone',
		strengthMpa: 85,
		indicationsRu: 'Съемные ортодонтические пластинки с расширяющими винтами, ретенционные аппараты.',
		isBiocompatible: true
	}
};
