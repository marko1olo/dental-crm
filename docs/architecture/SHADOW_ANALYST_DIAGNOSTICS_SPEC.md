# SHADOW ANALYST & AMBIENT CLINICAL HUD SPECIFICATION

## 1. Архитектурная цель и клинический контекст
Система теневого анализа и эмбиентной диагностики (**Shadow Analyst & Ambient Clinical HUD**) в DENTE CRM обеспечивает фоновый анализ клинических данных (ЭМК, снимки КЛКТ/RVG, соматический анамнез, лекарственные взаимодействия) без навязывания бюрократии врачу.

Ассистент непрерывно сопоставляет данные снимков и одонтограммы с клиническими рекомендациями Стоматологической Ассоциации России (СтАР), формулируя высокоточные выводы без «птичьего канцелярита» и без блокировки интерфейса (Мандат 8e: Автономия врача).

---

## 2. Модульная декомпозиция стилей (Мандат 8b: строго $\le 120$ строк)

Монолитный файл `apps/web/src/styles/shadow-analyst.css` (675 строк) полностью декомпозирован в поддиректорию `apps/web/src/styles/shadowAnalystStyles/`. Исходный файл превращен в тонкий фасад `@import` (10 строк).

| Микро-модуль | Строк | Зона ответственности |
|---|:---:|---|
| [`shadowAnalystHud.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/shadowAnalystStyles/shadowAnalystHud.css) | 114 | Базовая плавающая карточка HUD (`.sa-hud-card`, `.sa-panel`), анимации `sa-slide-up`, сворачивание в пилюлю (`.sa-hud-pill`), заголовки и структура |
| [`shadowAnalystFindings.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/shadowAnalystStyles/shadowAnalystFindings.css) | 68 | Клинические находки (`.sa-finding-item`), аллергические стоп-факторы, DDI-алерты, спиннер анализа рентгена (`.sa-analyze-overlay`) |
| [`shadowAnalystOdontogramHints.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/shadowAnalystStyles/shadowAnalystOdontogramHints.css) | 40 | Сетка зубов FDI (`.sa-tooth-grid`, `.sa-tooth-row`), индикаторы критических патологий, предупреждения по скрытым каналам MB2 |
| [`shadowAnalystActions.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/shadowAnalystStyles/shadowAnalystActions.css) | 89 | Кнопки быстрого принятия рекомендаций (`.sa-action-apply`), тумблеры улучшения контраста рентгена (`.sa-enhance-toggle`), бегунок сравнения |
| [`shadowAnalystDarkTheme.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/shadowAnalystStyles/shadowAnalystDarkTheme.css) | 93 | Глубокая контрастная темная тема (темы `dark`, `night`, `cyber_xray`, `ocean`), соответствие стандарту WCAG AAA, контрастные токены `--ink` |
| [`shadowAnalystMobile.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/shadowAnalystStyles/shadowAnalystMobile.css) | 101 | Сенсорная мобильная адаптация: тач-таргеты $\ge 44\times 44$px (Apple HIG), безопасные зоны `env(safe-area-inset-top/bottom)`, 0px дрифта |
| [`shadow-analyst.css`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/styles/shadow-analyst.css) | 10 | **Тонкий фасад `@import`** (Мандат 8b $\le 12$ строк) |

---

## 3. Клинические инварианты DENTE (Мандаты 8e, 8n, 8am)

1. **Автономия врача (Мандат 8e)**:
   - Все рекомендации эмбиентного ассистента носят строго **совещательный** характер.
   - Кнопки «Принять» или «Скрыть» **никогда не блокируют** клинический приём и никогда не бывают в состоянии `disabled` из-за второстепенных валидаций.
   - Врач может принять рекомендацию в 1 клик, отклонить или свернуть HUD в компактную пилюлю.
2. **Фокус на частной клинике и соло-враче (Мандат 8n)**:
   - Высокоточные клинические формулировки EBM:
     * **MB2 канал 16/26**: автоматическое определение анатомического риска пропущенного мезиально-щечного второго канала на срезах КЛКТ.
     * **Дозировки анестетиков**: контроль артикаина 4% ($\le 7$ мг/кг; при сопутствующей терапии бета-блокаторами — ограничение вазоконстриктора 1:200 000 до 2 карпул / 4.0 мл).
     * **Аллергии**: экспресс-подсказка препарата выбора при аллергии на пенициллины (клиндамицин 300 мг).
   - Запрет на бюрократический сленг: никаких номеров приказов в UI.
3. **Apple HIG & Сенсорный комфорт**:
   - Сенсорные цели $\ge 44\times 44$px.
   - На смартфонах карточка преобразуется в нативный компактный вид с 0px горизонтального дрифта (`max-width: 100vw; overflow-x: clip;`).
   - Кнопка Primary CTA («Принять все в карту») занимает ведущую позицию в нижней части экрана.

---

## 4. Доказательства работоспособности (Visual Proofs)

Все 4 скриншота сняты из живого Chromium Playwright, имеют размер $> 20$ КБ и лично проверены через `read_file`:

- ☀️ **PC Light (1440×900)**: [`docs/proofs/shadow_analyst/01_shadow_analyst_pc_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/shadow_analyst/01_shadow_analyst_pc_light.png) (53 843 байт)
- 🌙 **PC Dark (1440×900)**: [`docs/proofs/shadow_analyst/02_shadow_analyst_pc_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/shadow_analyst/02_shadow_analyst_pc_dark.png) (59 304 байт)
- 📱 **Mobile Light (390×844)**: [`docs/proofs/shadow_analyst/03_shadow_analyst_mobile_light.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/shadow_analyst/03_shadow_analyst_mobile_light.png) (49 985 байт)
- 📱 **Mobile Dark (390×844)**: [`docs/proofs/shadow_analyst/04_shadow_analyst_mobile_dark.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/shadow_analyst/04_shadow_analyst_mobile_dark.png) (54 120 байт)
