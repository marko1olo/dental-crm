# Доказательства верификации: Модуль ДМС и сплит со-оплаты (Insurance & DMS Co-Pay)

## 1. Архитектурный манифест декомпозиции (Мандат 8b)
- **100% файлов домена $\le 120$ строк**: Всего 143 файла в `apps/web/src/components/insurance/` декомпозированы и соответствуют жесткому лимиту.
- **Ноль монолитов**: Все 17 исходных монолитов распилены на модульные директории с тонкими фасадами (`dmsSplitEngine/`, `dmsRegistryExport/`, `dmsGuaranteeLetter/`, `insuranceMath/`, `insuranceCatalogs/`, `dmsInsurancePresets/`, `dmsInsuranceEngine/`, `dmsQuickActions/`, `dmsNomenclatureSelector/`, `dmsLimitsAndFranchise/`, `insurancePrintAct/`, `dmsBillSplitCalculator/`).

## 2. Клиническая автономия и ликвидация бюрократии (Мандаты 8e, 8n, 8x)
- **1-Клик сплит в кассе**: Автоматическое разделение счета на долю страховой компании и сооплату пациента (франшиза / превышение лимита гарантийного письма).
- **Экстренная помощь (острая боль)**: Режим «Гарантия в пути» моментально разблокирует прием и сплит без ожидания ответа страховой.
- **Ноль блокирующих кнопок**: Кнопка «Сохранить» никогда не блокируется (`disabled`).
- **Человеческий клинический язык**: Запрет на советские номера приказов («804н», «043/у») и чужие бренды в UI.

## 3. 4-State Red Team Visual Proofs (Apple iOS HIG & Desktop)
Скриншоты сняты в живом браузере Chromium через Playwright (`scripts/capture-insurance-4state-proofs.mjs`) и лично проверены аудитором:

1. **☀️ PC Light (1440x900)**: `01_insurance_dms_guarantee_letter_pc_light.png`
   - Чистая типографика, сводный баннер покрытия, быстрые чипы страховых (СОГАЗ, Ингосстрах, РЕСО, Альфа, ВСК, Согласие), 1 Primary CTA.
2. **🌙 PC Dark (1440x900)**: `02_insurance_dms_guarantee_letter_pc_dark.png`
   - Полная поддержка системных токенов темной темы без белых пятен, акцентные янтарные и циан индикаторы.
3. **📱 Mobile Light (390x844)**: `03_insurance_dms_guarantee_letter_mobile_light.png`
   - Нативный Apple iOS Bottom Sheet: Drag handle 36x5px, `rounded-t-[24px]`, безопасная зона `env(safe-area-inset-bottom)`, тач-таргеты $\ge 44$px, кнопки в Natural Thumb Zone.
4. **📱 Mobile Dark (390x844)**: `04_insurance_dms_guarantee_letter_mobile_dark.png`
   - Идеальная ночная эргономика на смартфоне, перенос бейджей без обрезания слов, четкий контраст.

## 4. Тестовый гейт
- **64 теста из 64 успешно пройдены** (`node --import tsx --test`).
- **0 ошибок TypeScript** в `apps/web/src/components/insurance`.
