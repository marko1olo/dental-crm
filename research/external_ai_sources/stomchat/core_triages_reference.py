"""
core_triages_reference.py
Изолированная реализация ключевых проверок и триажей StomChat.
"""
import re

# 1. ПЕДИАТРИЧЕСКИЕ СТОП-ФАКТОРЫ (Синхронный медицинский фильтр)
def check_pediatric_anesthesia_safety(text: str):
    """
    Проверяет текст на наличие смертельно опасных педиатрических ошибок.
    Возвращает (is_safe: bool, warning_message: str).
    """
    t = (text or "").lower()
    
    # Аспирин детям до 15 лет (синдром Рея)
    if any(k in t for k in ["аспирин", "ацетилсалицил"]) and any(w in t for w in ["ребен", "дет", "лет", "месяц", "год", "малыш"]):
        age_match = re.search(r"(\d+)\s*(?:лет|год)", t)
        if age_match and int(age_match.group(1)) < 15:
            return False, "🚨 <b>КЛИНИЧЕСКИЙ СТОП-ФАКТОР (EBM):</b> Аспирин категорически противопоказан детям и подросткам до 15 лет из-за риска летального <b>синдрома Рея</b> (острая печеночная энцефалопатия). Препарат выбора для анальгезии и антипиреза у детей — <b>Парацетамол</b> (10–15 мг/кг) или <b>Ибупрофен</b> (5–10 мг/кг)."

    # Нимесулид детям до 12 лет (гепатотоксичность)
    if "нимесулид" in t or "найз" in t or "нимесил" in t:
        age_match = re.search(r"(\d+)\s*(?:лет|год)", t)
        if age_match and int(age_match.group(1)) < 12:
            return False, "🚨 <b>КЛИНИЧЕСКИЙ СТОП-ФАКТОР (FDA/EMA):</b> Нимесулид (Найз/Нимесил) категорически противопоказан детям до 12 лет ввиду высокой гепатотоксичности. Применяйте парацетамол или ибупрофен."

    # Лидокаин-гели при прорезывании зубов у младенцев
    if any(k in t for k in ["калгель", "камистад", "дентинокс", "лидокаин"]) and any(w in t for w in ["прорезыван", "десен", "груднич", "младен", "зубки"]):
        return False, "🚨 <b>КЛИНИЧЕСКИЙ СТОП-ФАКТОР (FDA Black Box):</b> Применение гелей с местными анестетиками (лидокаин) при прорезывании зубов у младенцев запрещено (риск судорог, метгемоглобинемии и аспирации). Рекомендованы охлажденные силиконовые прорезыватели."

    return True, ""

# 2. АВТО-ОЧИСТКА ОТВЕТА ОТ СЛУЖЕБНЫХ ШТАМПОВ И ВЕРДИКТОВ
def sanitize_doctor_response(text: str) -> str:
    """
    Срезает любые просочившиеся в текст ответа судейские и служебные штампы:
    'Вердикт:', 'EBM-Арбитраж:', 'Арбитраж:', 'Решение:' и т.д.
    """
    cleaned = re.sub(
        r"^(?:⚖️\s*)?(?:(?:EBM[- ]?)?Арбитраж|Вердикт|Заключение|Решение|Резюме)[:\s—–-]*",
        "",
        (text or "").strip(),
        flags=re.IGNORECASE
    )
    return cleaned.strip()

# 3. АНТИ-ДЖЕЙЛБРЕЙК СКАНИРОВАНИЕ
_JAILBREAK_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous\s+)?instructions", re.IGNORECASE),
    re.compile(r"забудь\s+(все\s+)?(предыдущие\s+)?инструкции", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+in\s+developer\s+mode", re.IGNORECASE),
    re.compile(r"jailbreak", re.IGNORECASE),
    re.compile(r"system\s*prompt", re.IGNORECASE),
    re.compile(r"системный\s*промпт", re.IGNORECASE),
]

def is_jailbreak_attempt(text: str) -> bool:
    for pat in _JAILBREAK_PATTERNS:
        if pat.search(text):
            return True
    return False
