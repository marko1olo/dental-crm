# 📊 Архитектурная спецификация маркетинга, окупаемости каналов (ROMI) и промокодов DENTE CRM

> **Статус:** Внедрено и подтверждено 4-состояным визуальным пруфом (Exit Code 0).  
> **Соблюдение мандатов:** Мандат 8ap (Анти-враньё: ноль чужих брендов), Мандат 8e (Автономия врача), Мандат 8n (Суверенитет соло-клиники), Apple HIG (сенсорный минимум $\ge 44\times 44\text{px}$, 0px горизонтального скролла).

---

## 1. Назначение и Архитектурная Цель

Маркетинговый контур DENTE CRM предназначен для владельца стоматологической практики (соло-врача или клиники на 1–3 кресла) для прозрачного, точного и сквозного учета эффективности рекламных каналов, окупаемости инвестиций (ROMI) и управления маркетинговыми акциями.

### Ключевые принципы:
1. **Никакой абстрактной псевдонауки**: Никаких 3-летних прогнозных кривых LTV или вымышленных regex-парсеров заметок. Расчёт строится строго на нормализованных данных CRM: реальные первичные пациенты, приемы и проводки оплат.
2. **Точные копеечные расчеты**: Все денежные суммы в бэкенде и расчётном ядре хранятся в целочисленных копейках (`amountKopecks`, `spentKopecks`, `revenueKopecks`), исключая ошибки плавающей запятой (`IEEE 754 float`).
3. **Ликвидация чужих брендов (Мандат 8ap)**: Все структуры рекламных источников очищены от чужих брендов конкурентов и переведены на канонический нейминг DENTE (`ch_dente_*`).
4. **Надёжная персистенция в PostgreSQL 18**: Сохранение фактических расходов клиники переведено с хрупкого `localStorage` на PostgreSQL 18 через Fastify API с мультиарендной изоляцией по организациям (`organizations.workspaceFeatureFlags.marketingRomiChannels`).

---

## 2. 10 Канонических Стоматологических Каналов DENTE

В пакете `@dental/shared/src/marketing/marketingRomiEngine.ts` зафиксированы 10 канонических каналов привлечения пациентов:

| ID Канала | Ключ | Название | Категория | Тип затрат |
|---|---|---|---|---|
| `ch_dente_2gis` | `2gis` | 2GIS | Гео-сервисы | Платный (подписка) |
| `ch_dente_yandex_maps` | `yandex_maps` | Яндекс Карты | Гео-сервисы | Платный (приоритет) |
| `ch_dente_prodoctorov` | `prodoctorov` | ПроДокторов | Мед-агрегаторы | Платный |
| `ch_dente_word_of_mouth` | `word_of_mouth` | Сарафанное радио | Органика | Бесплатный (0 ₽) |
| `ch_dente_website` | `website` | Сайт клиники (SEO) | Веб | Фиксированный |
| `ch_dente_vk` | `vk` | ВКонтакте | Соцсети | Таргет |
| `ch_dente_sberhealth` | `sberhealth` | СберЗдоровье | Мед-агрегаторы | Комиссионный |
| `ch_dente_outdoor` | `outdoor` | Вывеска и наружка | Офлайн | Аренда |
| `ch_dente_instagram` | `instagram` | Instagram / Блог | Соцсети | Контент |
| `ch_dente_flyers` | `flyers` | Листовки и промо | Офлайн | Печать |

---

## 3. Математическое Ядро и Формулы ROMI

Чистые функции в `@dental/shared/src/marketing/marketingRomiEngine.ts`:

### 1. Окупаемость инвестиций (ROMI):
$$\text{ROMI} = \frac{\text{Выручка} - \text{Затраты}}{\text{Затраты}} \times 100\%$$
- При $\text{Затраты} = 0$:
  - Если $\text{Выручка} > 0$ (например, Сарафанное радио): $\text{ROMI} = 100\%$ (чистая органика).
  - Если $\text{Выручка} = 0$: $\text{ROMI} = 0\%$.

### 2. Стоимость привлечения первичного пациента (CAC):
$$\text{CAC} = \frac{\text{Затраты}}{\text{Количество первичных пациентов}}$$
- При отсутствии первичных пациентов: $\text{CAC} = 0\text{ ₽}$ (защита от деления на ноль).

### 3. Доходимость из лидов в первичный прием:
$$\text{Доходимость} = \frac{\text{Первичные пациенты}}{\text{Лиды}} \times 100\%$$

---

## 4. Спецификация API Fastify в PostgreSQL 18

Эндпоинты зарегистрированы в `apps/api/src/routes/marketingPromosRoutes.ts`:

### 1. `GET /api/marketing/romi-channels`
- **Доступ**: Требуется роль авторизованного сотрудника клиники (`requireClinicalReadAccess`).
- **Логика**: Читает сохраненные каналы и затраты организации из `organizations.workspaceFeatureFlags.marketingRomiChannels`. Если клиника открывает модуль впервые, выполняется автоматическое сидирование 10 эталонных каналов DENTE с нулевыми остатками.
- **Ответ**:
  ```json
  {
    "success": true,
    "organizationId": "01a00000-0000-0000-0003-000000000001",
    "channels": [ ... ]
  }
  ```

### 2. `POST /api/marketing/romi-channels`
- **Доступ**: Требуется право мутации (`requireClinicalMutationAccess`).
- **Тело запроса**: Массив объектов `AdvertisingChannelInput`, валидируемый схемой `z.array(advertisingChannelInputSchema)`.
- **Логика**: Атомарно обновляет фактические затраты и параметры каналов в PostgreSQL 18 для текущего тенанта.

### 3. `POST /api/marketing/romi-channels/reset`
- **Логика**: Сбрасывает рекламные каналы клиники к эталонному каталогу DENTE с нулевыми расходами.

---

## 5. Доказательства Работоспособности (4-State Visual Proof)

Скриншот-пруфы сняты на живом стенде приложения `http://127.0.0.1:5173/?demo=true#marketing` с реальным PostgreSQL 18:

| Состояние | Разрешение | Файл скриншота | Результат проверки |
|---|---|---|---|
| ☀️ **PC Light (Акции)** | $1440 \times 900$ | `docs/proofs/marketing/marketing_promos_pc_light_1440x900.png` | Чистая сводка промокодов и акций, 1 Primary CTA ("+ Запустить акцию"), карточки с метриками |
| 🌙 **PC Dark (Акции)** | $1440 \times 900$ | `docs/proofs/marketing/marketing_promos_pc_dark_1440x900.png` | Темная тема промокодов, контрастные бейджи, нулевые утечки токенов |
| 📱 **Mobile Light (Акции)** | $390 \times 844$ | `docs/proofs/marketing/marketing_promos_mobile_light_390x844.png` | Мобильный список акций, тач-таргеты $\ge 44\text{px}$, 0px горизонтального скролла |
| 📱 **Mobile Dark (Акции)** | $390 \times 844$ | `docs/proofs/marketing/marketing_promos_mobile_dark_390x844.png` | Нативная мобильная темная тема промокодов |
| ☀️ **PC Light (ROMI)** | $1440 \times 900$ | `docs/proofs/marketing/marketing_romi_pc_light_1440x900.png` | Чистая сводная таблица ROMI, KPI-карточки, 10 каналов DENTE, 1 Primary CTA |
| 🌙 **PC Dark (ROMI)** | $1440 \times 900$ | `docs/proofs/marketing/marketing_romi_pc_dark_1440x900.png` | OLED темная тема ROMI, нулевые белые дыры, идеальный контраст инпутов |
| 📱 **Mobile Light (ROMI)** | $390 \times 844$ | `docs/proofs/marketing/marketing_romi_mobile_light_390x844.png` | Группированные карточки (Apple Health style), 0px горизонтального скролла, тач-таргеты $\ge 44\text{px}$ |
| 📱 **Mobile Dark (ROMI)** | $390 \times 844$ | `docs/proofs/marketing/marketing_romi_mobile_dark_390x844.png` | Нативная мобильная темная тема ROMI, правильное позиционирование нижнего Apple Tab Bar |

---

## 6. Итоги Инквизиции и Рефакторинга (Мандаты 8b, 8e, 8am, 8ap)

1. **Тотальная ликвидация игрушечных симуляторов (Мандат 8ap)**:
   - Полностью выпилены `Message Preview Simulator` и `marketing-chat-simulator`. Вместо бутафорского чата реализована профессиональная карточка сообщения (`MarketingCampaignMessageCard.tsx`) с предпросмотром реального текста шаблона, переменными вставки и расчетом тарифа отправки по каналам (SMS, WhatsApp, Telegram, Push).
2. **Декомпозиция монолитов под потолок $\le 120$ строк (Мандат 8b)**:
   - Все файлы в `apps/web/src/components/marketing/` декомпозированы и строго укладываются в лимит $\le 120$ строк:
     - `MarketingCampaignDetail.tsx` (95 строк) + `useCampaignSegments.ts` (106), `MarketingCampaignHeader.tsx` (78), `MarketingCampaignConditions.tsx` (27), `MarketingCampaignAnalytics.tsx` (95), `MarketingCampaignMessageCard.tsx` (102), `MarketingCampaignLaunchSection.tsx` (112).
     - `MarketingRomiTable.tsx` (93 строки) + `MarketingRomiTableHeader.tsx` (75), `MarketingRomiMobileCard.tsx` (96), `useMarketingRomiChannels.ts` (106), `MarketingRomiTableRow.tsx` (104), `MarketingRomiAddChannelForm.tsx` (99), `MarketingRomiQuickPresets.tsx` (40), `marketingRomiPresets.ts` (115).
     - `MarketingPromosList.tsx` (103 строки) + `MarketingPromoCard.tsx` (76).
     - `MarketingNewPromoModal.tsx` (50 строк) + `MarketingNewPromoForm.tsx` (104).
     - `marketingPresets.ts` (14 строк) + `marketingSegmentsPresets.ts` (31), `marketingActivePromosPresets.ts` (88), `marketingArchivedPromosPresets.ts` (41).
3. **Автономия врача и персонала (Мандат 8e)**:
   - Кнопки запуска кампаний, тестовой отправки и добавления каналов никогда не блокируются (`disabled`).
4. **Единый дизайн-код (Мандат 8am)**:
   - Ровно 1 Primary CTA на видимый контекст (`+ Запустить акцию` / `+ Добавить канал`), второстепенные действия оформлены через Secondary/Outline кнопки.
5. **Чистый клинический язык (Мандат 8x)**:
   - Запрещен канцелярит и номера законов в интерфейсе (убраны упоминания «38-ФЗ»).
