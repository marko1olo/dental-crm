# Clinical Odontogram & Radial Menu SSOT — 4-State Visual Proofs

## 📸 Red Team 4-State Inspection Gate (Domain 36: Wheeler 2.5D Odontogram & Pediatric Dentition)

| State | Dimensions | Path | Size |
|---|---|---|---|
| ☀️ **PC Light** | 1440×900 | [`docs/proofs/odontogram/01_odontogram_pc_light_1440x900.png`](./01_odontogram_pc_light_1440x900.png) | 165 KB |
| 🌙 **PC Dark** | 1440×900 | [`docs/proofs/odontogram/02_odontogram_pc_dark_1440x900.png`](./02_odontogram_pc_dark_1440x900.png) | 174 KB |
| ☀️ **Pediatric PC Light** | 1440×900 | [`docs/proofs/odontogram/03_odontogram_pediatric_pc_light_1440x900.png`](./03_odontogram_pediatric_pc_light_1440x900.png) | 132 KB |
| 🌙 **Pediatric PC Dark** | 1440×900 | [`docs/proofs/odontogram/06_odontogram_pediatric_pc_dark_1440x900.png`](./06_odontogram_pediatric_pc_dark_1440x900.png) | 142 KB |
| 📱 **Mobile Light** | 390×844 | [`docs/proofs/odontogram/03_odontogram_mobile_light_390x844.png`](./03_odontogram_mobile_light_390x844.png) | 217 KB |
| 📱 **Mobile Dark** | 390×844 | [`docs/proofs/odontogram/04_odontogram_mobile_dark_390x844.png`](./04_odontogram_mobile_dark_390x844.png) | 221 KB |
| 📱 **Pediatric Mobile Light** | 390×844 | [`docs/proofs/odontogram/03_pediatric_mobile_light_390x844.png`](./03_pediatric_mobile_light_390x844.png) | 218 KB |
| 📱 **Pediatric Mobile Dark** | 390×844 | [`docs/proofs/odontogram/04_pediatric_mobile_dark_390x844.png`](./04_pediatric_mobile_dark_390x844.png) | 227 KB |

---

## 🎯 Architectural Invariants & Autopsy Summary

1. **Toolbar Consolidation & Anti-Desktop-Squeeze (Mandates 8b, 8al, 8aw):**
   - Плавный перенос на 2 строки на мобильных устройствах (390px) без сжатия кнопок в частокол и без горизонтального скролла страницы.
   - Переключатели режимов (Анатомия / 2D / Таблица) и прикуса (Взрослый / Детский / Сменный) в формате Apple Segmented Control.

2. **Single Primary CTA Button Rule (Мандат 8am):**
   - Строго 1 Primary CTA: `Физиологическая норма` (`#0d9488`, иконка щита, белый текст). Искоренен дев-сленг «1 клик» по Мандату 8zg.
   - Все остальные кнопки — нейтральные Secondary с `var(--line)`.

3. **Wheeler 2.5D Anatomical Integrity & Pediatric Dentition (Мандат 8bj):**
   - Честная анатомия Wheeler/Hess: дифференциальные ширины зубов (резцы 48px, клыки 54px, премоляры 60px, моляры 68px).
   - Честные молочные моляры (54, 55, 64, 65 с 3 корнями сверху, 74, 75, 84, 85 с 2 корнями снизу).
   - Временный прикус: 20 молочных зубов (51..85), сменный прикус: 20 молочных + 4 постоянных моляра (16, 26, 36, 46).
   - Окклюзионная плоскость смыкания (`order-2`) соосно отцентрована между челюстями.
   - Заголовки челюстей в чистом sentence case без капслока.

4. **Apple HIG Touch Ergonomics (390×844):**
   - Хитбоксы кнопок $\ge 44\times 44$px в сенсорных зонах.
   - 0px горизонтального дрифта (`overflow-x: clip; max-width: 100vw;`).
