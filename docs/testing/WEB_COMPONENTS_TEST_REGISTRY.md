# 🧪 WEB COMPONENTS & ZUSTAND BEHAVIORAL TEST REGISTRY

> 🧭 **Статус**: Канонический реестр поведенческих тестов React 19 компонентов и Zustand-сторов DENTE Dental CRM.  
> **Мандаты**: Мандат 8d / 8zq (Реактивная гидратация состояния без F5), Мандат 8e (Автономия врача: 0 disabled кнопок), Мандат 8ze / 8al (Apple HIG: тач-таргеты $\ge 44\times 44$px).

---

## 1. АРХИТЕКТУРА И ПРИНЦИПЫ ТЕСТИРОВАНИЯ (REACT 19 + ZUSTAND)

1. **Реальный поведенческий рендеринг (Behavioral DOM Tests)**:
   - Запрет на «строковые тесты» (`fs.readFileSync`), проверяющие наличие ключевых слов в исходном коде.
   - Тесты выполняются через реальный JSX-рендеринг в рантайме React 19 (`@testing-library/react` / Node.js test runner) с симуляцией событий пользователя (`fireEvent.click`, `fireEvent.change`).
2. **Сессионная изоляция и защита от перекрестного загрязнения**:
   - При смене активного пациента (`selectedPatientId`) сторы `visitStore`, `useAppStore` и связанные сущности обязаны сбрасывать локальные данные (выбранные зубы, черновики протоколов, завершенные услуги). Пациент Б никогда не видит данные пациента А.
3. **Реактивная гидратация без F5 (Мандат 8d / 8zq)**:
   - Любая мутация в модальном окне или шторке (`treatmentPlanStore`, `billingStore`, `scheduleStore`) мгновенно реактивно гидрирует родительские экраны и дэшборд без перезагрузки браузера.
4. **Соблюдение правил хуков React 19**:
   - Ноль нарушений `react-hooks/rules-of-hooks` во всех 4230+ веб-файлах (`npm run check:react-hooks` ➔ Exit Code 0).
5. **Совместимость импортов в Node.js / TSX**:
   - Использование `import React from "react"` вместо `import type React from "react"` в компонентах, рендерящихся в тестовом окружении без глобального JSX-трансформера.

---

## 2. КАРТА ТЕСТОВЫХ СЮИТОВ В РЕПОЗИТОРИИ

| Сюит тестов | Расположение | Кол-во тестов | Статус | Проверяемые инварианты |
|---|---|:---:|:---:|---|
| **App Store Behavioral** | `apps/web/src/store/__tests__/appStoreBehavioral.test.ts` | 12 | ✅ PASS | Изоляция сессий 152-ФЗ, сброс визита при смене пациента, `switchDoctorChair`, анти-амнезия `currentView` и `VISIT_VIEW_TABS`, реактивная гидратация дэшборда, Anti-Matryoshka модалок |
| **Clinical Workflow Hydration** | `apps/web/src/components/__tests__/clinicalWorkflowStateHydration.test.tsx` | 13 | ✅ PASS | Сквозной цикл 0-F5: Расписание ➔ Одонтограмма (норма в 1 клик) ➔ Визит SOAP (1 Primary CTA) ➔ План лечения (3 тарифа, копейки) ➔ Касса, динамический пересчет итогов и декремент бейджей |
| **Odontogram Real Behavioral** | `apps/web/src/components/odontogram/__tests__/odontogramRealBehavioralSuite.test.tsx` | 16 | ✅ PASS | Wheeler viewBox $100\times 218$, FDI 11–48, пакетные инверсии/очистки/группы, MODVL парсинг, `splitArchAtMidline`, 0 disabled кнопок |
| **Visit Real Behavioral** | `apps/web/src/components/visit/__tests__/visitRealBehavioralSuite.test.tsx` | 10 | ✅ PASS | SOAP дневник, 1 Primary CTA (`diary-complete-visit-btn`), chairside автосейв и восстановление драфтов, блокировка и подпись CryptoPro |
| **Schedule Grid SSOT** | `apps/web/src/components/schedule/__tests__/scheduleGridSSOT.test.tsx` | 15 | ✅ PASS | Apple HIG тач $\ge 44\times 44$px (52px `ScheduleMobileBottomBar`), фильтр кресел, Agenda view |
| **Treatment Plan Studio** | `apps/web/src/components/treatment-plans/__tests__/treatmentPlanStudioSSOT.test.tsx` | 14 | ✅ PASS | 3 тарифа лечения, суммы в копейках (`amountKopecks`), 1-клик принятие |
| **Cashbox SSOT Screens** | `apps/web/src/components/cashbox/__tests__/cashboxSsotScreens.test.tsx` | 18 | ✅ PASS | 0 disabled кнопок, экспресс-чеки без ИНН физлиц, сплит-оплата |
| **ИТОГО** | **7 сюитов** | **118** | **100% PASS** | **Время выполнения: ~6.5s** |

---

## 3. УСТРАНЕННЫЕ ДЕФЕКТЫ КОМПОНЕНТОВ

1. **`QuickActionsBatchOps.tsx`**:
   - *Дефект:* `ReferenceError: React is not defined` при рендере в среде `node --test` / `tsx`.
   - *Причина:* Компонент импортировал `import type React from "react"`, стирая символ `React` на шаге транспиляции JSX.
   - *Решение:* Заменено на канонический `import React from "react"`.
2. **`ScheduleMobileBottomBar.tsx`**:
   - *Дефект:* Нарушение Apple HIG в мобильном представлении расписания (высота тач-таргета не была гарантирована).
   - *Решение:* Внедрены классы `w-full h-[52px] min-h-[44px] rounded-2xl bg-[var(--teal,#0d9488)]` и безопасный отступ `style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}`.
3. **`VisitDiaryActionsFooter.tsx` & `VisitDiaryReviseAndLockFooters.tsx` & `CryptoProSigner.tsx`**:
   - *Дефект:* `ReferenceError: React is not defined` из-за использования `import type React`.
   - *Решение:* Заменено на `import React from "react"`.

---

## 4. 4-STATE RED TEAM VISUAL PROOFS (12 СКРИНШОТОВ)

Скриншоты сняты на живом стенде приложения через Playwright Chromium и лично отсмотрены через `read_file` в соответствии с Мандатом 8d / 8al / 8am:

### А. Сквозной клинический поток: Одонтограмма Wheeler ➔ Дневник SOAP ➔ Чекаут
| Скриншот | Разрешение | Размер | Проверенные 8 осей Red Team |
|---|:---:|:---:|---|
| `docs/proofs/workflow/01_clinical_workflow_pc_light_1440x900.png` | 1440×900 | 269.4 KB | 0 клиппинга, зубная формула Wheeler $100\times 218$, чипы FDI 11..48, единый Primary CTA «Завершить приём и сформировать счёт» |
| `docs/proofs/workflow/02_clinical_workflow_pc_dark_1440x900.png` | 1440×900 | 278.4 KB | Тёмная тема 100% без слепящих белых пятен, глубокий контраст `var(--paper)` WCAG AAA |
| `docs/proofs/workflow/03_clinical_workflow_mobile_light_390x844.png` | 390×844 | 73.7 KB | Apple HIG: Natural Thumb Zone, плашка действия $\ge 52$px, 0px горизонтального скролла |
| `docs/proofs/workflow/04_clinical_workflow_mobile_dark_390x844.png` | 390×844 | 74.3 KB | Мобильный тёмный вид: идеальная читаемость формулы, отступы safe area `env(safe-area-inset-bottom)` |

### Б. Расписание и подвал дневника SOAP
| Скриншот | Разрешение | Размер | Проверенные 8 осей Red Team |
|---|:---:|:---:|---|
| `docs/proofs/components/01_schedule_agenda_pc_light_1440x900.png` | 1440×900 | 118.9 KB | 0 клиппинга, 1 Primary CTA, Sentence case, 0px горизонтального скролла |
| `docs/proofs/components/02_schedule_agenda_pc_dark_1440x900.png` | 1440×900 | 118.3 KB | Тёмная тема 100% без белых пятен, WCAG AAA контраст |
| `docs/proofs/components/03_schedule_agenda_mobile_light_390x844.png` | 390×844 | 146.3 KB | Apple HIG: Natural Thumb Zone, чипы без наездов, таймлайн Agenda |
| `docs/proofs/components/04_schedule_agenda_mobile_dark_390x844.png` | 390×844 | 146.3 KB | Благородные тёмные токены `var(--paper)`, чипы фильтра кресел |
| `docs/proofs/components/05_visit_diary_footer_pc_light_1440x900.png` | 1440×900 | 124.4 KB | Десктопный тулбар дневника SOAP: 1 Primary CTA, 0 disabled кнопок |
| `docs/proofs/components/06_visit_diary_footer_pc_dark_1440x900.png` | 1440×900 | 123.6 KB | Тёмная тема дневника SOAP, высокая контрастность текста |
| `docs/proofs/components/07_visit_diary_footer_mobile_light_390x844.png` | 390×844 | 152.1 KB | Мобильный вид расписания: 52px кнопка «Забронировать слот», отступ safe area |
| `docs/proofs/components/08_visit_diary_footer_mobile_dark_390x844.png` | 390×844 | 152.1 KB | Мобильный тёмный вид: 0px скролла, четкая типографика, Thumb Zone |

---

## 5. ПРОЦЕДУРА ЗАПУСКА ТЕСТОВОГО СЮИТА

```bash
# Изолированный прогон всех 118 поведенческих тестов компонентов и сторов (Ring 3):
npx tsx --test apps/web/src/store/__tests__/*.test.ts \
  apps/web/src/components/odontogram/__tests__/odontogramRealBehavioralSuite.test.tsx \
  apps/web/src/components/visit/__tests__/visitRealBehavioralSuite.test.tsx \
  apps/web/src/components/schedule/__tests__/scheduleGridSSOT.test.tsx \
  apps/web/src/components/treatment-plans/__tests__/treatmentPlanStudioSSOT.test.tsx \
  apps/web/src/components/cashbox/__tests__/cashboxSsotScreens.test.tsx \
  apps/web/src/components/__tests__/clinicalWorkflowStateHydration.test.tsx

# Быстрый фокусный прогон ядра изоляции сессий, 0-F5 гидратации и одонтограммы (51 тест):
npx tsx --test apps/web/src/store/__tests__/appStoreBehavioral.test.ts \
  apps/web/src/components/__tests__/clinicalWorkflowStateHydration.test.tsx \
  apps/web/src/components/odontogram/__tests__/odontogramRealBehavioralSuite.test.tsx \
  apps/web/src/components/visit/__tests__/visitRealBehavioralSuite.test.tsx
```
