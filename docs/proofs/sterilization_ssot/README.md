# Журналы стерилизации и СанПиН DENTE (SSOT)

## 4-State Visual Proofs (Red Team Audit)

Данная директория содержит инструментальные доказательства корректности отображения и эргономики модуля «Журналы стерилизации и дезинфекции» (SanPiN & Sterilization):

1. **PC Light (1440×900)**: [`pc_light_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/sterilization_ssot/pc_light_1440x900.png)
   - Светлая тема рабочего места.
   - 4 канонические вкладки: «Журнал автоклавирования», «Контроль очистки инструментов», «Учет ламп и уборок», «Оборудование стерилизационной».
   - Ровно ОДНА главная кнопка Primary CTA `var(--teal, #0d9488)`: «Запустить цикл стерилизации».
   - Кнопки периода («Сегодня», «Неделя», «Месяц»), выбор автоклава, экспорт и печать.

2. **PC Dark (1440×900)**: [`pc_dark_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/sterilization_ssot/pc_dark_1440x900.png)
   - Темная тема рабочего места. Глубокий slate фон, высокая контрастность бейджей статусов («Завершен», «В процессе», «Тест пройден»).

3. **PC Dark — Контроль очистки инструментов (1440×900)**: [`pc_dark_cleaning_control_1440x900.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/sterilization_ssot/pc_dark_cleaning_control_1440x900.png)
   - Вкладка предстерилизационной очистки.
   - Экспресс-действие «✓ Заполнить норму за смену (1 клик)».
   - Фиксация азопирамовой и фенолфталеиновой проб без советских форм («Форма 366/у» заменена на чистый русский язык).

4. **Mobile Light (390×844 — iPhone 14/15/16)**: [`mobile_light_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/sterilization_ssot/mobile_light_390x844.png)
   - Сенсорный минимум $\ge 44\times 44\text{px}$, высота строк карточек $\ge 52\text{px}$.
   - 0px паразитного горизонтального скролла (`overflow-x: clip; max-width: 100vw;`).
   - Плавающий нижний бар (Floating Bottom Bar) со стеклянным размытием и Primary CTA кнопкой в Natural Thumb Zone (нижняя треть экрана).

5. **Mobile Dark (390×844 — iPhone 14/15/16)**: [`mobile_dark_390x844.png`](file:///C:/Clinic_MVP/dental-crm/docs/proofs/sterilization_ssot/mobile_dark_390x844.png)
   - Мобильная темная тема.
   - Учет Safe Area Insets (`env(safe-area-inset-bottom)`).

---

## Архитектурные инварианты

- **Мандат 8x (Ликвидация птичьего языка)**: Устранены советские приказы и формы («Форма 257/у», «Форма 366/у», «ПСО»). Интерфейс говорит на живом понятном медицинском языке.
- **Мандат 8e (Автономия врача)**: Запрет на блокирующие модалки. Стерилизация не блокирует приём пациентов врачом.
- **Мандат 8b (Sweet Spot 200–300 строк)**:
  - `AutoclaveJournalTab.tsx`: 262 строки.
  - `CleaningControlTab.tsx`: 265 строк.
  - `UvAndCleaningTab.tsx`: 144 строки.
  - `SanpinRegisters.tsx`: 124 строки.
- **Мандат 8am (Единый дизайн-код кнопок)**: Ровно 1 Primary CTA на видимый экран.
