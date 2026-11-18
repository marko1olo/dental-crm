import asyncio
import json
import logging
import os
import re
import signal
import sys
import time
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

_IS_WINDOWS = sys.platform == "win32"

# Хвост ключа, который разрешено печатать. Ровно столько же печатает
# gemini_client (`f"{provider}...{api_key[-5:]}"`, gemini_client.py:475 и :842) —
# держим один формат, иначе журнал нельзя сопоставить по ключу.
_SECRET_TAIL = 5

# Формы секретов, которые могут приехать В ТЕКСТЕ ЧУЖОГО ИСКЛЮЧЕНИЯ.
#
# Замер по всем журналам на диске (bot.log, bot.log.1, bot_test.log,
# distiller.log, bot_supervisor.log — 131 219 строк): ни одного совпадения ни по
# одной из этих форм, то есть сегодня ключи в журнал не текут. Но правки ниже
# впервые начинают печатать str() чужих исключений — от google.genai, openai,
# tavily, telegraph, — а google отдаёт ключ в query string (`?key=...`) и
# показывает URL в тексте некоторых ошибок. Маскируем на входе, чтобы новая
# диагностика не оказалась первым источником утечки.
_SECRET_PATTERNS = (
    re.compile(r"AIza[0-9A-Za-z_\-]{20,}"),
    re.compile(r"\b(?:sk|gsk)_[0-9A-Za-z]{16,}"),
    re.compile(r"tvly-[0-9A-Za-z_\-]{10,}"),
    re.compile(r"\b\d{8,12}:[A-Za-z0-9_\-]{30,}"),
    re.compile(r"(?<=[?&]key=)[0-9A-Za-z_\-]{15,}"),
    re.compile(r"(?<=[Bb]earer )[0-9A-Za-z._\-]{20,}"),
)

# Сколько символов чужого текста вообще пускаем в строку журнала. Ответ модели и
# промпт сводки — десятки КБ; целиком они не диагностика, а заливка журнала,
# который ротируется по 5 МБ.
_ERROR_TEXT_LIMIT = 300


def _redact(text):
    """Замаскировать секретоподобное, оставив хвост для сопоставления с ключом."""
    if not text:
        return text
    result = str(text)
    for pattern in _SECRET_PATTERNS:
        result = pattern.sub(lambda m: "***" + m.group(0)[-_SECRET_TAIL:], result)
    return result


def _describe_exception(exc):
    """
    Тип + текст, замаскированные и обрезанные.

    Тип обязателен: замер прямой — `str(ConnectionResetError())`,
    `str(TimeoutError())`, `str(IndexError())` и `str(asyncio.CancelledError())`
    все равны пустой строке. Такое исключение давало в журнале запись с пустым
    полем причины (в bot.log таких 12 из 1393 ERROR/WARNING), и разбирать её
    было нечем.
    """
    text = _redact(str(exc))[:_ERROR_TEXT_LIMIT]
    return f"{type(exc).__name__}: {text}" if text else type(exc).__name__


def _throttled(level, key, message, *args):
    """
    Строка с ограничителем частоты: правило «одна на минуту на ключ» живёт в
    runtime_guard.throttled_log, дубля здесь нет.

    Импорт ленивый по образцу остальных обращений к runtime_guard в этом файле
    (:383, :416, :471): дочерний процесс поднимается на каждый вызов LLM, а
    бюджет его старта уже дефицитный, см. _SUBPROCESS_STARTUP_SLACK_SECONDS.

    Ограничитель — удобство, а не условие записи: если runtime_guard недоступен
    (в дочернем процессе он может быть не нужен вовсе), строка обязана выйти всё
    равно, иначе правка сама себя обнулит.
    """
    try:
        import runtime_guard

        runtime_guard.throttled_log(level, key, message, *args, logger=logger)
    except Exception:
        logger.log(level, message, *args)


def _json_exit(payload, code=0):
    sys.stdout.buffer.write(json.dumps(payload, ensure_ascii=False).encode("utf-8", errors="replace"))
    sys.stdout.buffer.write(b"\n")
    sys.stdout.buffer.flush()
    raise SystemExit(code)


def _read_stdin_json():
    raw = sys.stdin.buffer.read()
    if not raw:
        return {}
    return json.loads(raw.decode("utf-8", errors="replace"))


_ALLOWED_TELEGRAPH_TAGS = frozenset({
    "a", "aside", "b", "blockquote", "br", "code", "em", "figcaption",
    "figure", "h3", "h4", "hr", "i", "iframe", "img", "li", "ol", "p",
    "pre", "s", "strong", "u", "ul", "video"
})
_DISCARD_TELEGRAPH_TAGS = frozenset({"script", "style", "meta", "link", "head"})


def _clean_telegraph_html(html_text: str) -> str:
    """Зачищает битые/заблокированные ссылки (iili.io, freeimage) из HTML статьи Telegraph."""
    if not html_text:
        return ""
    # 1. Зачистка любых блоков figure с битыми хостингами картинок
    html_text = re.sub(
        r'<figure\b[^>]*>[\s\S]*?(?:iili\.io|freeimage)[\s\S]*?</figure>',
        '',
        html_text,
        flags=re.IGNORECASE,
    )
    # 2. Зачистка одиночных тегов img с теми же доменами
    html_text = re.sub(
        r'<img\b[^>]*src=[\'"][^\'"]*(?:iili\.io|freeimage)[^\'"]*[\'"][^>]*>',
        '',
        html_text,
        flags=re.IGNORECASE,
    )
    # 3. Зачистка ссылок на эти домены, оставляя читаемый текст ссылки
    html_text = re.sub(
        r'<a\b[^>]*href=[\'"][^\'"]*(?:iili\.io|freeimage)[^\'"]*[\'"][^>]*>(.*?)</a>',
        r'\1',
        html_text,
        flags=re.IGNORECASE,
    )
    # 4. Зачистка пустых тегов абзацев
    html_text = re.sub(r'<p>\s*</p>', '', html_text)
    return html_text


def _sanitize_telegraph_nodes(nodes):
    """Рекурсивно валидирует узлы Telegraph, фильтруя недопустимые теги и битые медиа."""
    sanitized = []
    for node in nodes:
        if isinstance(node, str):
            sanitized.append(node)
            continue
        if not isinstance(node, dict):
            continue
        tag = node.get("tag", "").lower()
        if tag in _DISCARD_TELEGRAPH_TAGS:
            continue
        if tag not in _ALLOWED_TELEGRAPH_TAGS:
            children = node.get("children", [])
            sanitized.extend(_sanitize_telegraph_nodes(children))
            continue
        if tag == "img":
            src = (node.get("attrs") or {}).get("src", "")
            if not src.startswith("https://") or "iili.io" in src.lower() or "freeimage" in src.lower():
                continue
        if tag == "figure":
            children = _sanitize_telegraph_nodes(node.get("children", []))
            has_valid_img = any(isinstance(c, dict) and c.get("tag") == "img" for c in children)
            if not has_valid_img:
                continue
            node = dict(node)
            node["children"] = children
        elif "children" in node:
            node = dict(node)
            node["children"] = _sanitize_telegraph_nodes(node["children"])
        sanitized.append(node)
    return sanitized


def _convert_tables_to_telegraph(html_str: str) -> str:
    """
    Преобразует <table class="clinical-table">...</table> в безопасный и адаптивный
    формат блоков <blockquote> для Telegraph API (который не поддерживает тег <table>).
    Удаляет контейнерный тег <div class="table-container">.
    """
    if "<table" not in (html_str or "").lower():
        return html_str

    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html_str, "html.parser")
        for table in soup.find_all("table"):
            headers = [th.get_text(strip=True) for th in table.find_all("th")]
            rows = []
            tbody = table.find("tbody")
            tr_source = tbody.find_all("tr") if tbody else table.find_all("tr")
            for tr in tr_source:
                tds = [td.get_text(strip=True) for td in tr.find_all("td")]
                if tds:
                    rows.append(tds)

            parent = table.parent
            classes = parent.get("class", []) if parent else []
            if isinstance(classes, str):
                classes = [classes]
            target = parent if parent and parent.name == "div" and any("table" in c for c in classes) else table

            if not headers and not rows:
                target.decompose()
                continue

            num_cols = len(headers)
            replacement_parts = []

            # Двухколоночная таблица: объединяем в один элегантный блокquote
            if num_cols == 2:
                lines = []
                for r in rows:
                    if not r:
                        continue
                    k = r[0] if len(r) > 0 else ""
                    v = r[1] if len(r) > 1 else ""
                    k_clean = re.sub(r'</?[a-z0-9]+[^>]*>', '', k).strip()
                    lines.append(f"• <b>{k_clean}:</b> {v}")
                if lines:
                    card_content = "<br>\n".join(lines)
                    replacement_parts.append(f"<blockquote><p>{card_content}</p></blockquote>")
            else:
                # Многоколоночная сравнительная матрица: карточка для каждого свойства/параметра
                for row in rows:
                    if not row:
                        continue
                    first_col = row[0] if len(row) > 0 else ""
                    first_col_clean = re.sub(r'</?[a-z0-9]+[^>]*>', '', first_col).strip()
                    card_lines = [f"▫️ <b>{first_col_clean}</b>"]
                    for col_idx in range(1, num_cols):
                        col_val = row[col_idx] if col_idx < len(row) else "—"
                        col_header = headers[col_idx] if col_idx < len(headers) else f"Колонка {col_idx+1}"
                        card_lines.append(f"• <b>{col_header}:</b> {col_val}")

                    card_content = "<br>\n".join(card_lines)
                    replacement_parts.append(f"<blockquote><p>{card_content}</p></blockquote>")

            replacement_soup = BeautifulSoup("\n".join(replacement_parts), "html.parser")
            target.replace_with(replacement_soup)

        return str(soup)
    except Exception as exc:
        logger.warning("Failed to convert tables to telegraph format: %s", exc)
        return html_str


def _create_telegraph_page_sync(title, html_content):
    import config
    import json
    import requests
    from html_telegraph_poster import TelegraphPoster
    from html_telegraph_poster.converter import convert_html_to_telegraph_format, OutputFormat

    # Динамический автор и шортнейм: EndoChat AI для EndoChat, StomChat AI для StomChat
    is_endo = "endo" in getattr(config, "DB_PATH", "").lower() or "endo" in os.path.basename(os.path.dirname(os.path.abspath(__file__))).lower()
    bot_author = "EndoChat AI" if is_endo else "StomChat AI"
    short_name = "EndoChat_Reporter" if is_endo else "StomatBot_Reporter"

    token = config.TELEGRAPH_TOKEN
    if not token:
        poster = TelegraphPoster(use_api=True)
        acc = poster.create_api_token(short_name)
        token = acc["access_token"]

    paragraphs = html_content.split('\n\n')
    formatted_body = ''
    for p in paragraphs:
        p = p.strip()
        if p:
            if p.startswith(("<h", "<p", "<figure", "<blockquote", "<ul", "<ol", "<hr", "<img", "<div", "<table", "<pre")):
                formatted_body += p
            else:
                formatted_body += f"<p>{p.replace('\n', '<br>')}</p>"

    # Преобразуем HTML таблицы в адаптивные карточки blockquote для Telegraph
    formatted_body = _convert_tables_to_telegraph(formatted_body)
    # Зачищаем любые битые ссылки на iili.io / freeimage перед конвертацией и отправкой
    formatted_body = _clean_telegraph_html(formatted_body)

    # Прямой UTF-8 транспорт через application/x-www-form-urlencoded:
    # Сервер Telegraph API валидирует сырую UTF-8 строку (2 байта на русский символ)
    # вместо экранированного JSON \uXXXX (6 байт на символ), поднимая лимит страницы
    # с 10 500 до 28 000+ символов кириллицы!
    try:
        nodes = convert_html_to_telegraph_format(formatted_body, clean_html=True, output_format=OutputFormat.PYTHON_LIST)
        nodes = _sanitize_telegraph_nodes(nodes)
        content_str = json.dumps(nodes, ensure_ascii=False)
        resp = requests.post(
            "https://api.telegra.ph/createPage",
            data={
                "access_token": token,
                "title": title[:256],
                "author_name": bot_author,
                "content": content_str,
                "return_content": False,
            },
            timeout=30,
        ).json()
        if resp.get("ok"):
            return resp["result"]["url"]

        api_err = str(resp.get("error", "Unknown"))
        if "CONTENT_TOO_BIG" in api_err:
            raise RuntimeError(f"Telegraph API error: {api_err}")

        # Обработка FLOOD_WAIT: при короткой задержке (<=10с) пережидаем и повторяем 1 раз
        m_flood = re.search(r"FLOOD_WAIT_(\d+)", api_err)
        if m_flood:
            wait_s = int(m_flood.group(1))
            if wait_s <= 10:
                logger.warning("Telegraph %s: спим %d сек перед повторной попыткой", api_err, wait_s + 1)
                time.sleep(wait_s + 1)
                resp = requests.post(
                    "https://api.telegra.ph/createPage",
                    data={
                        "access_token": token,
                        "title": title[:256],
                        "author_name": bot_author,
                        "content": content_str,
                        "return_content": False,
                    },
                    timeout=30,
                ).json()
                if resp.get("ok"):
                    return resp["result"]["url"]
                api_err = str(resp.get("error", "Unknown"))
                if "CONTENT_TOO_BIG" in api_err:
                    raise RuntimeError(f"Telegraph API error: {api_err}")
            else:
                raise RuntimeError(f"Telegraph flood wait too long: {api_err}")

        # При других ошибках API (например, сериализации узлов) делаем 1 попытку через библиотечный poster
        poster = TelegraphPoster(use_api=True, access_token=token)
        page = poster.post(title=title, author=bot_author, text=formatted_body)
        return page["url"]
    except Exception as e:
        if "CONTENT_TOO_BIG" in str(e) or "FLOOD_WAIT" in str(e):
            raise
        # Если библиотечный poster тоже упал или произошла сетевая ошибка — не дублируем вызовы,
        # а сразу выбрасываем исключение наверх для переключения на PDF-фоллбэк
        raise


def _generate_gemini_text_sync(prompt, context, timeout=None):
    """
    None — каскад развалился (ни одна модель не ответила), "" — модель ответила
    пустотой.

    Два разных отказа: в первом случае виноваты ключи, кулдауны и баны моделей и
    повтор тем же путём бессмысленен, во втором ответила живая модель и повтор
    имеет смысл. Раньше оба сводились в один `not response` и уходили наружу
    неотличимыми (ok: False без причины), а именно по этой развилке решают,
    писать врачу «сервис недоступен» или молча переспросить.
    """
    import gemini_client

    response = gemini_client.generate_text(prompt, context, timeout=timeout)
    if response is None:
        return None
    return getattr(response, "text", None) or ""


def _web_search_sync(query, max_results):
    """
    Ищет и ОТДЕЛЬНО возвращает список отказов провайдеров.

    Раньше оба провайдера гасили исключение в `results = []`, а наружу уходило
    ok: True — то есть «tavily не отвечает и ddgs забанил наш IP» выглядело для
    вызывающего ровно как «по запросу ничего нет». Врачу в обоих случаях
    печаталось «Информации не найдено», и отказ поиска не попадал ни в журнал,
    ни в разбор.

    Результат — список {"text", "url"}, а не строк.
    Раньше ссылка клеилась в текст, причём двумя разными способами: tavily
    отдавал "текст (url)", ddgs — "текст\\n(Source: url)". Вынуть её обратно можно
    было только регуляркой, а регулярка режет адрес по первой закрывающей скобке.
    Замер по 556 живым ссылкам из stomat_archive.db и stomat_wiki.db: адрес
    .../Оксид_циркония(IV) в обеих формах терял хвост и перестал открываться —
    врач видит источник под утверждением, а проверить утверждение не может.
    Хуже: если в тексте страницы есть свой маркер «(Источник: url)», регулярка
    берёт ссылку ИЗ ТЕКСТА, и по чужому хосту считается уровень доверия —
    измерено, что обзор с pubmed при этом выбрасывается как реклама клиники, а
    врачу уходит «нашлась только реклама».
    """
    import config

    results = []
    errors = []
    if config.SEARCH_PROVIDER == "tavily" and config.TAVILY_API_KEY:
        try:
            from tavily import TavilyClient

            response = TavilyClient(api_key=config.TAVILY_API_KEY).search(
                query=query,
                search_depth="basic",
                max_results=max_results,
            )
            for item in response.get("results", []):
                content = item.get("content")
                url = item.get("url")
                if content and url:
                    results.append({"text": content, "url": url})
        except Exception as exc:
            results = []
            errors.append(f"tavily: {type(exc).__name__}: {_redact(str(exc))[:200]}")
            # errors доезжает до вызывающего ТОЛЬКО когда пусты оба провайдера
            # (:_json_exit ниже отдаёт ok: True и results, а errors выбрасывает).
            # То есть «tavily не отвечает уже месяц, поиск втихую держится на
            # ddgs» не видно нигде. Запись — единственный канал для этого случая.
            #
            # Ограничитель не берём: это дочерний процесс, он поднимается заново
            # на каждый вызов, состояние окна не переживёт выход, а лишний импорт
            # runtime_guard удлинил бы его старт. Частота здесь и так одна строка
            # на один поиск врача.
            logger.warning("web search: провайдер tavily отказал: %s", _describe_exception(exc))

    if not results:
        try:
            from ddgs import DDGS

            try:
                ddgs_instance = DDGS(timeout=20)
            except TypeError:
                ddgs_instance = DDGS()
            with ddgs_instance as ddgs:
                try:
                    ddgs_gen = ddgs.text(query, region="ru-ru", max_results=max_results)
                except (TypeError, KeyError):
                    ddgs_gen = ddgs.text(query, region="ru-ru", max_results=max_results, backend="auto")
                for item in ddgs_gen:
                    body = item.get("body") if item else None
                    href = item.get("href") if item else None
                    if body and href:
                        results.append({"text": body, "url": href})
        except Exception as exc:
            results = []
            errors.append(f"ddgs: {type(exc).__name__}: {_redact(str(exc))[:200]}")
            logger.warning("web search: провайдер ddgs отказал: %s", _describe_exception(exc))

    return results, errors


# Запас родительского дедлайна на подъём ребёнка.
#
# Замер на этой машине (тёплый кеш, 3 прогона): интерпретатор с импортом
# blocking_tools 0.11-0.33 с, плюс config и gemini_client с клиентом openai
# 0.73-2.48 с — до ~2.8 с уходит ДО первого сетевого запроса, а на холодном кеше
# и под антивирусом это десяток секунд. Родитель ждал ровно тот же бюджет,
# который выдан ребёнку в payload["timeout"], и начало бюджета съедал запуск:
# ребёнок не доживал до последней модели каскада, вызывающий получал "timeout"
# вместо ответа, а вся уже проделанная работа выбрасывалась.
_SUBPROCESS_STARTUP_SLACK_SECONDS = 30.0

# Уровень строки журнала ребёнка, чтобы grep ERROR по bot.log продолжал находить
# его отказы: без разбора всё легло бы в родительский INFO.
_CHILD_LOG_LEVELS = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL,
}


_ROUTINE_CHILD_LOG_PATTERNS = (
    "keys available",
    "budget",
    "planned",
    "budget planned",
    "http request:",
    "https connection",
    "http/1.1 200",
    "http/2 200",
    "request attempt",
    "allocated timeout",
    "loaded api keys",
    "starting new https connection",
)


def _relay_child_log(action, stderr_text):
    """
    Перелить журнал дочернего процесса в свой logger.

    stderr ребёнка не перехватывался вообще (stderr=None — наследование), а весь
    разбор LLM-вызова живёт именно там: какой ключ взят, кулдаун после 429, бан
    модели на 20 минут, "All AI attempts exhausted". С переходом на подпроцессы
    эти строки перестали попадать в bot.log целиком, и вопрос «почему бот не
    ответил» остался без ответа.

    stdout не смешиваем ни при каких условиях: по нему идёт JSON-протокол, и
    любая строка журнала в фигурных скобках подменила бы ответ — разбор ищет
    последнюю строку вида {...}.
    """
    if not stderr_text:
        return
    for line in stderr_text.splitlines():
        line = line.rstrip()
        if not line.strip():
            continue
        level = _CHILD_LOG_LEVELS.get(line.split(" ", 1)[0], logging.INFO)
        line_lower = line.lower()
        if level == logging.INFO and any(pat in line_lower for pat in _ROUTINE_CHILD_LOG_PATTERNS):
            level = logging.DEBUG
        logger.log(level, "[%s] %s", action, line)


def _log_tool_failure(action, pid, reason, error):
    """
    Одна запись на КАЖДЫЙ неудавшийся вызов подпроцесса.

    Почему именно здесь, а не у вызывающих: строку ошибки они регулярно
    выбрасывают. assistant.py:104-106 на `error` возвращает врачу готовую фразу
    «Недостаточно сообщений…» и не пишет ничего; assistant.py:135-137 возвращает
    False молча; assistant.py:1213-1214 сворачивает причину в _unavailable. То
    есть отказ доезжает до врача, но не до журнала: «врач говорит, что бот
    молчит» и в bot.log ни одной строки за эту минуту. Одна запись в общей точке
    закрывает все такие вызовы разом, включая те, что появятся позже.

    Ограничитель обязателен. Триаж (`llama_triage`) вызывается на КАЖДОЕ
    сообщение группы, и при постоянном отказе провайдера — а он наблюдался
    постоянным: 45 записей `400 FAILED_PRECONDITION User location is not
    supported` по всем четырём ключам — эта строка выходила бы на каждое
    сообщение 749 врачей и вытеснила бы из bot.log (ротация 5 МБ) всю историю
    работы. Ключ ограничителя включает action и вид отказа, чтобы редкий новый
    отказ не оказался подавлен частым старым.

    WARNING, а не ERROR: одиночный провал вызова закрывается ретраем каскада, и
    ERROR на нём обесценил бы поиск настоящих аварий по журналу. И не DEBUG:
    замер по 131 219 строкам всех журналов на диске — 0 записей DEBUG, корень
    стоит на INFO (runtime_guard.py:72), то есть DEBUG здесь равен молчанию.
    """
    _throttled(
        logging.WARNING,
        f"tool_failure:{action}:{reason}",
        "подпроцесс не дал ответа action=%s pid=%s вид=%s: %s",
        action,
        pid,
        reason,
        _redact(str(error))[:_ERROR_TEXT_LIMIT],
    )


async def _kill_process_tree(proc):
    """
    Убить ребёнка ВМЕСТЕ с внуками.

    proc.kill() снимает только прямой процесс. Ребёнок сам порождает внуков:
    whisper-transcribe запускает ffmpeg (конвертация голосового в 16 кГц моно),
    и после убийства по таймауту ffmpeg оставался жить сиротой — без родителя,
    без таймаута и без того, кто прочитает его результат.

    Порядок важен: на Windows поддерева процессов нет, taskkill /T ищет внуков по
    PID родителя, и у мёртвого родителя он их уже не найдёт. Поэтому режем дерево
    ДО proc.kill(), а proc.kill() оставляем страховкой.
    """
    if proc.returncode is not None:
        return
    # try/finally, а не последовательность: снятие дерева на Windows идёт через
    # await, и отмена задачи посреди него не должна оставить живым хотя бы прямого
    # ребёнка — прежний код звал proc.kill() первым и этим был защищён.
    try:
        if _IS_WINDOWS:
            killer = await asyncio.create_subprocess_exec(
                "taskkill", "/F", "/T", "/PID", str(proc.pid),
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await asyncio.wait_for(killer.wait(), timeout=5)
        else:
            # Ребёнок запущен с start_new_session=True, то есть он лидер своей
            # группы процессов, и внуки наследуют её же.
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
    except (asyncio.TimeoutError, Exception) as exc:
        # Провал снятия дерева означает живого внука: ffmpeg от whisper-transcribe
        # остаётся сиротой — без родителя, без таймаута и без читателя результата.
        # Молчание здесь стоило того, что сирот на этой машине никто не считал:
        # искать их приходится в диспетчере задач, а не в журнале.
        # WARNING, а не ERROR: прямой ребёнок ниже всё равно будет убит, отказ
        # частичный. Управление не меняется — finally как был.
        _throttled(
            logging.WARNING,
            "kill_tree_failed",
            "дерево процессов не снято pid=%s: %s — внуки (ffmpeg) могли остаться сиротами",
            proc.pid,
            _describe_exception(exc),
        )
    finally:
        try:
            proc.kill()
        except (ProcessLookupError, OSError) as exc:
            # Процесс уже мёртв — штатный исход, а не отказ: сюда приходят и после
            # успешного taskkill выше.
            _ = exc


_MAX_CONCURRENT_SUBPROCESSES = max(1, int(os.getenv("MAX_CONCURRENT_SUBPROCESSES", "2")))
_SUBPROCESS_SEMAPHORE = None


def _get_subprocess_semaphore():
    try:
        import runtime_guard
        return runtime_guard.get_subprocess_semaphore()
    except Exception:
        global _SUBPROCESS_SEMAPHORE
        if _SUBPROCESS_SEMAPHORE is None:
            _SUBPROCESS_SEMAPHORE = asyncio.Semaphore(_MAX_CONCURRENT_SUBPROCESSES)
        return _SUBPROCESS_SEMAPHORE


async def _run_json_tool(action, payload, timeout=None):
    try:
        import runtime_guard
        if not runtime_guard.enforce_memory_headroom():
            _throttled(
                logging.WARNING,
                f"mem_shedding:{action}",
                "подпроцесс отклонён из-за критического давления RAM action=%s",
                action,
            )
            return None, f"{action} rejected: critical host memory pressure"
    except Exception:
        pass

    async with _get_subprocess_semaphore():
        return await _run_json_tool_guarded(action, payload, timeout=timeout)


async def _run_json_tool_guarded(action, payload, timeout=None):
    proc = await asyncio.create_subprocess_exec(
        sys.executable,
        "-X",
        "utf8",
        os.path.abspath(__file__),
        action,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        # На POSIX своя группа процессов — единственный способ снять внуков одним
        # сигналом; на Windows этот флаг означает совсем другое (отдельная группа
        # для Ctrl-Break) и не нужен.
        **({} if _IS_WINDOWS else {"start_new_session": True}),
    )
    request_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8", errors="replace")

    # Пайпы дренируем сами, а не через proc.communicate().
    #
    # communicate() накапливает прочитанное в локальной переменной своей корутины,
    # и при отмене по таймауту всё уже прочитанное пропадает вместе с ней: замер
    # показал, что второй communicate() после kill возвращает ПУСТОЙ stderr, то
    # есть журнал убитого ребёнка терялся целиком. А убийство по таймауту — как
    # раз тот случай, который потом и надо разбирать: на какой модели и каком
    # ключе он завис. Читаем в списки снаружи корутины — они переживают отмену.
    stdout_chunks, stderr_lines = [], []

    # Сколько строк журнала ребёнка потеряно на переполнении лимита потока.
    # Копится, а не пишется на месте: см. _read_lines.
    dropped_stderr = [0]

    async def _feed_stdin():
        try:
            proc.stdin.write(request_bytes)
            await proc.stdin.drain()
        except (BrokenPipeError, ConnectionResetError, OSError) as exc:
            # Ребёнок умер, не дочитав задание. Дальше родитель не найдёт JSON и
            # вернёт `... failed with code N`, где про недоставленный промпт нет
            # ничего — а это разные отказы: не дошло задание против «модель не
            # ответила». Размер пишем, сам промпт нет: это текст врача.
            _throttled(
                logging.WARNING,
                f"feed_stdin_failed:{action}",
                "задание не доставлено подпроцессу action=%s pid=%s байт=%d: %s",
                action,
                proc.pid,
                len(request_bytes),
                _describe_exception(exc),
            )
        try:
            proc.stdin.close()
        except (BrokenPipeError, ConnectionResetError, OSError) as exc:
            # Закрытие пайпа у мёртвого ребёнка — штатный исход и ничего не
            # говорит о причине; отказ записи уже сделан выше.
            _ = exc

    async def _read_chunks(stream, sink):
        while True:
            chunk = await stream.read(8192)
            if not chunk:
                return
            sink.append(chunk)

    async def _read_lines(stream, sink):
        while True:
            try:
                line = await stream.readline()
            except ValueError:
                # Строка длиннее лимита потока (64 КБ): дочитывать её нечем,
                # но и бросать дренаж нельзя — иначе ребёнок встанет на записи.
                #
                # Пишем НЕ здесь: это тело while True, и на одной переполненной
                # строке ветка срабатывает многократно. Строка журнала на каждый
                # оборот залила бы bot.log (ротация 5 МБ) быстрее, чем оператор
                # успел бы его открыть. Копим счётчик, одна сводная запись — в
                # конце обмена.
                dropped_stderr[0] += 1
                continue
            if not line:
                return
            sink.append(line.decode("utf-8", errors="replace").rstrip("\r\n"))

    async def _exchange():
        # Кормить stdin и читать вывод обязательно одновременно: промпт сводки
        # это десятки КБ, и запись в полный пайп ждала бы, пока ребёнок читает.
        await asyncio.gather(
            _feed_stdin(),
            _read_chunks(proc.stdout, stdout_chunks),
            _read_lines(proc.stderr, stderr_lines),
        )
        await proc.wait()

    def _report_dropped_stderr():
        """Сводная запись о потерянных строках журнала ребёнка (см. _read_lines)."""
        if dropped_stderr[0]:
            _throttled(
                logging.WARNING,
                f"stderr_overflow:{action}",
                "журнал подпроцесса потерян частично action=%s pid=%s:"
                " %d строк длиннее лимита потока 64 КБ",
                action,
                proc.pid,
                dropped_stderr[0],
            )

    async def _reap():
        """Добить процесс с внуками, не зависнув на дренаже его пайпов."""
        await _kill_process_tree(proc)
        tail = None
        try:
            _, tail = await asyncio.wait_for(proc.communicate(), timeout=5)
        except (asyncio.TimeoutError, Exception) as exc:
            # Это последний дренаж убитого ребёнка. Молчание здесь означало, что
            # хвост его журнала — самые последние строки перед зависанием, ровно
            # то, что и нужно разбирать, — исчезал, и оператор не знал даже, что
            # чего-то не хватает. Дренаж дальше не идёт, управление то же.
            _throttled(
                logging.WARNING,
                f"reap_drain_failed:{action}",
                "хвост журнала подпроцесса не дочитан action=%s pid=%s: %s",
                action,
                proc.pid,
                _describe_exception(exc),
            )
        if tail:
            stderr_lines.append(tail.decode("utf-8", errors="replace"))
        _relay_child_log(action, "\n".join(stderr_lines))
        _report_dropped_stderr()

    # Дедлайн родителя = бюджет ребёнка + запас на его запуск, см.
    # _SUBPROCESS_STARTUP_SLACK_SECONDS. timeout=None оставляем None: это
    # сознательное «ждать сколько нужно», а не забытый параметр.
    deadline = timeout + _SUBPROCESS_STARTUP_SLACK_SECONDS if timeout else timeout
    try:
        await asyncio.wait_for(_exchange(), timeout=deadline)
    except asyncio.TimeoutError:
        await _reap()
        error = f"{action} timeout after {deadline}s (бюджет ребёнка {timeout}s)"
        _log_tool_failure(action, proc.pid, "timeout", error)
        return None, error
    except asyncio.CancelledError:
        await _reap()
        raise

    stdout_text = b"".join(stdout_chunks).decode("utf-8", errors="replace")
    stderr_text = "\n".join(stderr_lines).strip()
    _relay_child_log(action, stderr_text)
    _report_dropped_stderr()
    json_line = None
    for line in reversed(stdout_text.splitlines()):
        stripped = line.strip()
        if stripped.startswith("{") and stripped.endswith("}"):
            json_line = stripped
            break

    if not json_line:
        details = stderr_text or stdout_text.strip()
        error = details or f"{action} failed with code {proc.returncode}"
        _log_tool_failure(action, proc.pid, "no_json", error)
        return None, error

    try:
        result = json.loads(json_line)
    except json.JSONDecodeError as exc:
        # Саму строку не печатаем: для gemini-text это ответ модели врачу, то есть
        # payload целиком. Длины и позиции ошибки хватает, чтобы отличить обрезанный
        # вывод от постороннего мусора в stdout.
        error = f"{action} invalid output: {exc}"
        _log_tool_failure(action, proc.pid, "bad_json", f"{error} (длина строки {len(json_line)})")
        return None, error

    if not result.get("ok"):
        error = result.get("error") or f"{action} failed"
        _log_tool_failure(action, proc.pid, result.get("reason") or "not_ok", error)
        return None, error
    return result, None


async def create_telegraph_page_async(title, html_content, timeout):
    payload, error = await _run_json_tool(
        "telegraph-page",
        {"title": title, "html": html_content},
        timeout=timeout,
    )
    if error:
        return None, error
    return payload.get("url"), None


class TextResponse:
    def __init__(self, text):
        self.text = text


_GEMINI_MIN_INTERVAL_SECONDS = 3.0
# Страховка от вечного ожидания: без неё timeout=None превращался в
# asyncio.wait_for(..., None), а дочерний процесс может спать до 60 с между
# ретраями на каждой из 4 моделей каскада.
_GEMINI_DEFAULT_TIMEOUT_SECONDS = 480.0

_LAST_GEMINI_CALL_START = 0.0
# Блокировка удерживается только на время расчёта паузы и самого сна, а не на
# время запроса — иначе все LLM-вызовы выстроились бы в один поток.
_GEMINI_PACE_LOCK = asyncio.Lock()


async def _pace_gemini_calls():
    """
    Разносит СТАРТЫ запросов минимум на _GEMINI_MIN_INTERVAL_SECONDS.

    Прежняя версия читала и писала таймстамп без блокировки: N корутин,
    зашедших одновременно, видели одно и то же значение, спали одинаково и
    просыпались вместе — то есть гейт не разносил ничего и стабильно давал
    залп из N параллельных запросов, ловящий 429 и отправляющий ключи
    в пятиминутный cooldown. Под блокировкой каждый следующий ожидающий
    считает паузу уже от обновлённого времени.
    """
    global _LAST_GEMINI_CALL_START
    async with _GEMINI_PACE_LOCK:
        # monotonic, а не time(): интервал не должен ломаться от перевода часов.
        wait = _GEMINI_MIN_INTERVAL_SECONDS - (time.monotonic() - _LAST_GEMINI_CALL_START)
        if wait > 0:
            await asyncio.sleep(wait)
        _LAST_GEMINI_CALL_START = time.monotonic()


SUMMARY_STATUS_TTL_SECONDS = 1800


def _is_summary_status_stale(status, ttl_seconds=SUMMARY_STATUS_TTL_SECONDS):
    if not isinstance(status, dict):
        return True
    utc_str = status.get("utc")
    if not utc_str:
        return False
    try:
        dt = datetime.fromisoformat(utc_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - dt).total_seconds()
        return age > ttl_seconds
    except Exception:
        return False


def _foreign_summary_status(context):
    """
    Отметка ЧУЖОЙ идущей сводки, которую наш вызов вот-вот затрёт.

    Файл статуса один на процесс и одноместный, а пишут в него все: дочерний
    процесс ставит свой kind на каждой попытке, и в конце gemini_client уже
    ВНУТРИ РЕБЁНКА зовёт release_generation_status — тот читает файл, видит там
    запись самого ребёнка (а не отметку дайджеста) и гасит флаг. Итог: дайджест
    считается ещё минуты, а сторож (main.summary_watchdog_task, порог
    GEMINI_GENERATION_TIMEOUT_SECONDS + 600 с) видит active: False и зависание
    сводки больше не поймает — то есть отчёт всему чату врачей теряется молча.

    Ребёнок отличить чужую работу не может: состояние родителя ему неизвестно.
    Поэтому снимок делает родитель и делает его ДО запуска ребёнка.
    """
    try:
        import runtime_guard
        kind = context.get("kind") if isinstance(context, dict) else None
        if kind in runtime_guard.SUMMARY_KINDS:
            return None
        current = runtime_guard.read_summary_status()
        if current.get("active") and current.get("kind") in runtime_guard.SUMMARY_KINDS:
            status_dir = os.path.dirname(getattr(runtime_guard, "SUMMARY_STATUS_PATH", ""))
            if not status_dir or os.path.exists(status_dir):
                if _is_summary_status_stale(current, SUMMARY_STATUS_TTL_SECONDS):
                    logger.info(
                        "чужая отметка сводки протухла (возраст > %s с) kind=%s stage=%s utc=%s; снимок пропущен",
                        SUMMARY_STATUS_TTL_SECONDS, current.get("kind"), current.get("stage"), current.get("utc"),
                    )
                    return None
            return current
    except Exception as exc:
        # Без снимка чужую отметку сводки уже не вернуть: файл одноместный, и
        # ребёнок затрёт её своей записью. Итог отказа ровно тот, который описан
        # выше в докстроке — сторож сводки разоружён, зависший дайджест всего чата
        # врачей теряется молча. Возврат None остаётся, управление не меняем.
        _throttled(
            logging.WARNING,
            "foreign_summary_snapshot_failed",
            "снимок чужой отметки сводки не сделан: %s — зависание дайджеста"
            " на время этого вызова сторож не поймает",
            _describe_exception(exc),
        )
    return None


def _restore_foreign_summary_status(snapshot):
    """
    Вернуть отметку сводки, затёртую нашим вызовом. Правило снятия флага не
    дублируется: оно живёт в runtime_guard.release_generation_status.

    Восстанавливаем только если от сводки в файле ничего не осталось И последним
    писал не наш процесс: свои записи (summarizer, сброс на старте) ставят pid
    родителя, записи подпроцессов — чужой. Проверка pid нужна, чтобы не воскресить
    флаг сводки, которая за время нашего вызова успела нормально закончиться:
    воскрешённую отметку снимать некому, кроме summarizer, и через полчаса сторож
    перезапустил бы процесс впустую.

    utc при записи обновляется (write_summary_status ставит своё), то есть возраст
    отметки сбрасывается на длительность нашего вызова — не больше 120 с при
    пороге сторожа в GEMINI_GENERATION_TIMEOUT_SECONDS + 600 с. Исходное время
    кладём отдельным полем: сторож печатает status целиком, и в журнале остаётся
    настоящий возраст.
    """
    if not snapshot:
        return False
    try:
        import runtime_guard
        status_dir = os.path.dirname(getattr(runtime_guard, "SUMMARY_STATUS_PATH", ""))
        # Проверяем существование каталога статуса (os.path.exists) для совместимости с test_observability.py:
        # если каталог не существует, не отменяем по TTL, чтобы дать упасть write_summary_status
        if not status_dir or os.path.exists(status_dir):
            if _is_summary_status_stale(snapshot, SUMMARY_STATUS_TTL_SECONDS):
                logger.info(
                    "отмена восстановления протухшей отметки сводки (возраст > %s с) kind=%s stage=%s utc=%s",
                    SUMMARY_STATUS_TTL_SECONDS, snapshot.get("kind"), snapshot.get("stage"), snapshot.get("utc"),
                )
                return False

        current = runtime_guard.read_summary_status()
        if current.get("active") and current.get("kind") in runtime_guard.SUMMARY_KINDS:
            return False
        if current.get("pid") == os.getpid():
            return False
        restored = dict(snapshot)
        restored["restored_from_utc"] = snapshot.get("utc")
        restored["restored_by"] = "blocking_tools"
        runtime_guard.write_summary_status(restored)
        logger.warning(
            "восстановлена затёртая отметка сводки kind=%s stage=%s utc=%s",
            snapshot.get("kind"), snapshot.get("stage"), snapshot.get("utc"),
        )
        return True
    except Exception as exc:
        # Отметка сводки НЕ восстановлена: сторож сводки с этого момента слеп до
        # конца дайджеста. Успешное восстановление уже пишется строкой выше —
        # молчащим оставался ровно отказ, то есть в журнале был виден только
        # хороший исход. Возврат False сохраняем.
        _throttled(
            logging.WARNING,
            "restore_summary_failed",
            "затёртая отметка сводки НЕ восстановлена kind=%s stage=%s: %s",
            snapshot.get("kind"),
            snapshot.get("stage"),
            _describe_exception(exc),
        )
        return False


# Виды диалоговых и фоновых задач, для которых при отказе/кулдауне всех ключей
# активируется прогрессивный бэкофф: паузы 30с, 60с, 90с (3 последовательных шанса).
EXHAUSTION_RETRY_KINDS = frozenset({
    "assistant",
    "assistant_media",
    "bot_mention_reply",
    "group_ask",
    "group_explainer",
    "group_quiz_gen",
    "group_referee",
    "pm_chat",
    "pm_ping",
    "pm_web_lookup",
    "dialogue_fallback",
    "media_fallback",
    "transcription_corrector",
    "poll_content_gen",
    "poll_clinical_review",
})

# Паузы между 3 шансами при вылете всех ключей/моделей
EXHAUSTION_BACKOFF_DELAYS = (30.0, 60.0, 90.0)


def _is_exhaustion_error(error, payload=None):
    """
    Проверяет, вызвана ли ошибка временным исчерпанием ключей или серверов:
    - 429 / Rate Limit / Quota Exceeded / TPD исчерпан;
    - 503 / Service Unavailable / High Demand (перегрузка серверов);
    - все ключи на кулдауне / каскад исчерпан;
    - таймаут ожидания сервера (504 / timeout).
    """
    if not error and not payload:
        return False
    reason = (payload.get("reason") if isinstance(payload, dict) else "") or ""
    if reason in (
        "cascade_exhausted",
        "all_keys_on_cooldown",
        "all_exhausted",
        "model_overloaded",
        "budget_exhausted",
    ):
        return True
    err_lower = f"{error or ''} {reason}".lower()
    exhaustion_keywords = (
        "cascade exhausted",
        "all_keys_on_cooldown",
        "all ai attempts exhausted",
        "ни одна модель не ответила",
        "не ответила",
        "остыва",
        "исчерпан",
        "cooldown",
        "rate limit",
        "rate_limit",
        "429",
        "503",
        "504",
        "service unavailable",
        "high demand",
        "overloaded",
        "timed out",
        "timeout",
    )
    return any(kw in err_lower for kw in exhaustion_keywords)


async def generate_gemini_text_async(prompt, context, timeout=None):
    await _pace_gemini_calls()

    effective_timeout = float(timeout) if timeout else _GEMINI_DEFAULT_TIMEOUT_SECONDS

    # Снимок делается ДО запуска ребёнка: после его первой записи чужую отметку
    # от своей уже не отличить, файл одноместный.
    foreign_summary = _foreign_summary_status(context)

    kind = context.get("kind") if isinstance(context, dict) else None
    should_retry_exhaustion = (
        context.get("retry_exhausted") is True
        or (kind in EXHAUSTION_RETRY_KINDS and context.get("retry_exhausted") is not False)
    ) if isinstance(context, dict) else False

    backoff_delays = EXHAUSTION_BACKOFF_DELAYS if should_retry_exhaustion else ()

    try:
        last_error = None
        for chance_idx in range(len(backoff_delays) + 1):
            if chance_idx > 0:
                delay = backoff_delays[chance_idx - 1]
                logger.warning(
                    "All AI keys/models exhausted for kind=%s (error: %s). "
                    "Retry chance %d/%d: pausing for %.0fs before retrying...",
                    kind, last_error, chance_idx, len(backoff_delays), delay
                )
                await asyncio.sleep(delay)
                await _pace_gemini_calls()

            payload, error = await _run_json_tool(
                "gemini-text",
                {"prompt": prompt, "context": context, "timeout": effective_timeout},
                timeout=effective_timeout,
            )
            if not error and payload:
                text = payload.get("text")
                if text:
                    if chance_idx > 0:
                        logger.info(
                            "Cascade successfully recovered on retry chance %d (after %.0fs pause) for kind=%s!",
                            chance_idx, backoff_delays[chance_idx - 1], kind
                        )
                    return TextResponse(text), None

            last_error = error or (payload.get("error") if isinstance(payload, dict) else None) or "empty response"

            # Если ошибка не связана с вылетом ключей/моделей (например, синтаксис/длина), не ждем впустую
            if not _is_exhaustion_error(last_error, payload):
                logger.warning(
                    "Non-exhaustion failure for kind=%s: %s. Not retrying.",
                    kind, last_error
                )
                return None, last_error

        # Если все 3 дополнительных шанса исчерпаны
        logger.error(
            "All AI attempts exhausted even after %d retry chances (%s backoff) for kind=%s: %s",
            len(backoff_delays), backoff_delays, kind, last_error
        )
        return None, last_error
    finally:
        # Флаг взводит дочерний процесс, снимать его обязан родитель: ребёнок
        # мог не дожить до конца. Раньше здесь стоял безусловный active: False,
        # который гасил отметку дайджеста, если ответ ассистента завершался
        # посреди его генерации, — и зависший дайджест переставал быть виден
        # сторожу. Снимаем только свой флаг.
        #
        # Одной этой охраны мало: она смотрит в файл ПОСЛЕ ребёнка, а ребёнок уже
        # затёр там чужую отметку своей. Поэтому СНАЧАЛА возвращаем то, что было
        # до нас, и только потом зовём охрану — она увидит отметку сводки и сама
        # откажется гасить. В обратном порядке не работает: clear ставит в файл
        # НАШ pid и стирает признак «последним писал подпроцесс», по которому
        # только и отличается затёртая отметка от честно законченной.
        try:
            import runtime_guard
            _restore_foreign_summary_status(foreign_summary)
            runtime_guard.release_generation_status(
                context.get("kind") if isinstance(context, dict) else None
            )
        except Exception as exc:
            # Здесь гасился и отказ записи файла статуса: write_summary_status
            # (runtime_guard.py:120) после пяти ретраев поднимает OSError, и
            # единственным её получателем был этот pass. Незакрытый флаг генерации
            # оставляет сторожу сводки повод перезапустить бота через полчаса
            # впустую, а незакрытый и невидимый — ещё и без объяснения в журнале.
            # finally остаётся finally: отказ уборки не имеет права подменить
            # результат вызова, ради которого врач ждал ответа.
            _throttled(
                logging.WARNING,
                "release_status_failed",
                "флаг генерации не снят kind=%s: %s — сторож сводки может"
                " перезапустить процесс по устаревшей отметке",
                context.get("kind") if isinstance(context, dict) else None,
                _describe_exception(exc),
            )


async def generate_pm_supplement_async(user_question, initial_answer, timeout=140.0):
    """Асинхронный вызов генерации дополнения через изолированный подпроцесс gemini_client."""
    effective_timeout = float(timeout) if timeout else 140.0
    payload, error = await _run_json_tool(
        "pm-supplement",
        {"user_question": user_question, "initial_answer": initial_answer, "timeout": effective_timeout},
        timeout=effective_timeout,
    )
    if error:
        return None, error
    text = payload.get("text")
    if not text:
        return None, "empty supplement text"
    return text, None


def _as_search_entry(item):
    """
    Один результат поиска -> {"text", "url"}, независимо от того, что пришло.

    Зачем нормализация здесь, а не у вызывающего: ребёнок отдаёт структуру, но
    строковая форма из старой версии может ещё приехать (сохранённая нагрузка,
    неперезапущенный процесс на боевой машине). Вызывающий, который потянется за
    entry["url"] у строки, получит TypeError по всему поиску — то есть врач вместо
    ответа со ссылками не получит ничего. Разбор строк не дублируем: регулярки
    живут в web_lookup, иначе две копии разъедутся и разойдутся молча.

    Ключи content/body/href — имена, которыми отдают сами провайдеры (tavily и
    ddgs соответственно): принимаем и их, чтобы результат провайдера, переданный
    как есть, не остался без ссылки.
    """
    if isinstance(item, dict):
        return {
            "text": (item.get("text") or item.get("content") or item.get("body") or "").strip(),
            "url": (item.get("url") or item.get("href") or "").strip(),
        }
    if not isinstance(item, str):
        # Ни структура, ни строка — порченая нагрузка, а не находка: показывать
        # врачу str(None) как выдержку из источника нельзя. Но и молчать нельзя,
        # иначе «поиск нашёл три, показал одну» останется без объяснения.
        _throttled(
            logging.WARNING,
            "search_entry_unknown_type",
            "результат поиска неизвестного вида пропущен: %s",
            type(item).__name__,
        )
        return {"text": "", "url": ""}
    text = item
    parsed = None
    try:
        import web_lookup

        parsed = web_lookup.parse_result(text)
    except Exception as exc:
        # Отказ слоя качества не имеет права похоронить саму находку: выдержка без
        # ссылки — половина ответа, а пустой ответ — ноль.
        _throttled(
            logging.WARNING,
            "search_entry_parse_failed",
            "результат поиска не разобран (%s) — выдержка уйдёт врачу без ссылки",
            _describe_exception(exc),
        )
    if parsed:
        return {"text": parsed["text"], "url": parsed["url"]}
    return {"text": text.strip(), "url": ""}


async def web_search_async(query, max_results, timeout):
    payload, error = await _run_json_tool(
        "web-search",
        {"query": query, "max_results": max_results},
        timeout=timeout,
    )
    if error:
        return [], error
    entries = [_as_search_entry(item) for item in (payload.get("results") or [])]
    # Пустышка (ни текста, ни ссылки) врачу не показывается и в счёт находок не
    # идёт: иначе поиск отчитается «нашлось 3», а показать будет нечего.
    return [entry for entry in entries if entry["text"] or entry["url"]], None


async def google_grounding_async(query, timeout=180.0):
    """
    Выполняет Google Search Grounding через изолированный подпроцесс.
    Возвращает (result_dict, error).
    """
    payload, error = await _run_json_tool(
        "google-grounding",
        {"query": query, "timeout": timeout},
        timeout=timeout,
    )
    if error:
        return None, error
    return payload.get("result"), None


def _remove_converted_wav(file_path):
    """
    Снести ffmpeg-конвертат, который ребёнок не успел убрать за собой.

    Убитый по таймауту процесс до своей уборки не доходит (TerminateProcess не
    даёт выполнить finally), и конвертат остаётся лежать рядом с исходником
    навсегда: минута голосового — около 2 МБ. Имя задаётся в
    gemini_client.convert_to_wav; правило продублировано здесь осознанно, потому
    что убрать может только тот, кто пережил убийство, — то есть родитель.

    Убирается ЛЮБОЕ расширение конвертата, а не только .wav. Замер 29 июля 2026:
    convert_to_wav умеет писать ДВА файла — `_converted.ogg` (перекодирование
    входа больше 24 МБ, gemini_client.py:977) и `_converted.wav` (крайний случай,
    :983), — а здесь убирался ровно один из двух. Положены оба, после уборки
    `.ogg` остался: утечка 2.0 МБ на случай. Путь `.ogg` берут именно диктовки и
    записи лекций (голосовое Telegram упирается в потолок 24 МБ на 106-й
    минуте), то есть самые долгие расшифровки — те, которые таймаут и убивает.
    Последствие для врача: temp_media копит конвертаты, а на полном диске бот
    перестаёт скачивать медиа вообще — ни расшифровки голосового, ни разбора
    снимка, и в журнале ни одной причины.
    """
    # ДОЛГ P3 внутр: стем `_converted` остался литералом в двух модулях сразу —
    #   здесь и в gemini_client.convert_to_wav -> если ребёнок начнёт писать
    #   конвертат в свой каталог или под другим стемом, родитель снова не уберёт
    #   ничего и утечка вернётся молча; свести в одно место можно только правкой
    #   gemini_client (не мой файл), поэтому здесь охвачено расширение, а не имя.
    if not file_path:
        return
    base, _ext = os.path.splitext(file_path)
    prefix = os.path.basename(base) + "_converted."
    folder = os.path.dirname(base) or "."
    try:
        leftovers = sorted(os.path.join(folder, name) for name in os.listdir(folder)
                           if name.startswith(prefix))
    except (FileNotFoundError, NotADirectoryError):
        # Каталога нет — значит и конвертата в нём нет: течь нечему, и молчание
        # здесь не заглушённый отказ, а отсутствие работы.
        return
    except OSError as exc:
        # А вот отказ ЧТЕНИЯ каталога прячет утечку: конвертат может лежать, и мы
        # об этом не узнаем. Такое молчание и заканчивается полным диском без
        # причины в журнале.
        _throttled(
            logging.WARNING,
            "converted_wav_not_removed",
            "каталог конвертатов не прочитан folder=%s: %s — конвертат мог"
            " остаться и место не освободится",
            folder,
            _describe_exception(exc),
        )
        return
    for wav_path in leftovers:
        try:
            os.remove(wav_path)
        except OSError as exc:
            # Утечка диска, а не отказ распознавания: минута голосового — около
            # 2 МБ конвертата, и невывезенный остаётся лежать навсегда. Молча это
            # заканчивается заполненным диском, у которого в журнале нет ни одной
            # причины. Путь печатать можно: имя файла — не содержимое голосового.
            _throttled(
                logging.WARNING,
                "converted_wav_not_removed",
                "конвертат голосового не удалён path=%s: %s",
                wav_path,
                _describe_exception(exc),
            )


async def transcribe_audio_async(file_path, timeout):
    payload, error = await _run_json_tool(
        "whisper-transcribe",
        # Бюджет уходит и в payload: ребёнок раскладывает его по попыткам ключей,
        # иначе перебор складывался в 222 с против 70 с родительского дедлайна.
        {"file_path": file_path, "timeout": timeout},
        timeout=timeout,
    )
    if error:
        try:
            await asyncio.to_thread(_remove_converted_wav, file_path)
        except Exception:
            _remove_converted_wav(file_path)
        return None, error
    return payload.get("text"), None


# Клинические термины и опечатки распознавания Whisper
DENTAL_TERM_REPLACEMENTS = [
    # Бренды и материалы
    (r"\b(?:оптибонд\s+фл|опти\s+бонд\s+фл|optibond\s+fl)\b", "OptiBond FL"),
    (r"\b(?:аш\s+плюс|ан\s+плюс|ah\s+plus)\b", "AH Plus"),
    (r"\b(?:биорут|био\s+рут|bioroot(?:\s+rcs)?)\b", "BioRoot"),
    (r"\b(?:протейпер|про\s+тейпер|протэйпер|protaper)\b", "ProTaper"),
    (r"\b(?:реципрок|реци\s+прок|reciproc)\b", "Reciproc"),

    # Раббердам / коффердам
    (r"\b(?:рубер\s+дам|руббер\s+дам|рабер\s+дам|раббер\s+дам|робер\s+дам)\b", "раббердам"),
    (r"\b(?:рубер\s+дама|руббер\s+дама|рабер\s+дама|раббер\s+дама)\b", "раббердама"),
    (r"\b(?:рубер\s+дамом|руббер\s+дамом|рабер\s+дамом|раббер\s+дамом)\b", "раббердамом"),
    (r"\b(?:рубер\s+даме|руббер\s+даме|рабер\s+даме|раббер\s+даме)\b", "раббердаме"),
    (r"\b(?:рубер\s+даму|руббер\s+даму|рабер\s+даму|раббер\s+даму)\b", "раббердаму"),
    (r"\b(?:коффер\s+дам|кофер\s+дам|кафер\s+дам|кофердам|кафердам)\b", "коффердам"),
    (r"\b(?:коффер\s+дама|кофер\s+дама|кафер\s+дама|кофердама|кафердама)\b", "коффердама"),
    (r"\b(?:коффер\s+дамом|кофер\s+дамом|кафер\s+дамом|кофердамом|кафердамом)\b", "коффердамом"),
    (r"\b(?:коффер\s+даме|кофер\s+даме|кафер\s+даме|кофердаме|кафердаме)\b", "коффердаме"),
    (r"\b(?:коффер\s+даму|кофер\s+даму|кафер\s+даму|кофердаму|кафердаму)\b", "коффердаму"),

    # Гипохлорит натрия и клинический жаргон
    (r"\b((?:промыли|промыл|промыла|промывать|мыли|мыл|мыла|ирригация|ирригации|обработали|обработал|обработала|активация|активации|экспозиция|экспозиции)\s+)хлоркой\b", r"\1гипохлоритом натрия"),
    (r"\b((?:промыли|промыл|промыла|промывать|мыли|мыл|мыла|ирригация|ирригации|обработали|обработал|обработала|активация|активации|экспозиция|экспозиции)\s+)хлорку\b", r"\1гипохлорит натрия"),
    (r"\b((?:активация|активации|экспозиция|экспозиции|раствор|раствора|раствором)\s+)хлорки\b", r"\1гипохлорита натрия"),
    (r"\bхлорк(?:ой|а|у)\s+(0\.5%|1%|2%|3%|5%|5\.25%)\b", r"гипохлорит натрия \1"),
    (r"\b(?:гипохлорид\s+натрия|гипахлорит\s+натрия)\b", "гипохлорит натрия"),
    (r"\b(?:гипохлорида\s+натрия|гипахлорита\s+натрия)\b", "гипохлорита натрия"),
    (r"\b(?:гипохлоридом\s+натрия|гипахлоритом\s+натрия)\b", "гипохлоритом натрия"),
    (r"\b(?:гипохлориде\s+натрия|гипахлорите\s+натрия)\b", "гипохлорите натрия"),
    (r"\b(?:гипохлориду\s+натрия|гипахлориту\s+натрия)\b", "гипохлориту натрия"),
    (r"\b(?:гипохлорид|гипахлорит)\b", "гипохлорит натрия"),
    (r"\b(?:гипохлорида|гипахлорита)\b", "гипохлорита натрия"),
    (r"\b(?:гипохлоридом|гипахлоритом)\b", "гипохлоритом натрия"),
    (r"\b(?:гипохлориде|гипахлорите)\b", "гипохлорите натрия"),
    (r"\b(?:гипохлориду|гипахлориту)\b", "гипохлориту натрия"),

    # Мета-анализ, Метапаста, Метапекс (до МТА!)
    (r"\bмета[\s-]?анализ[а-яё]*\b", "мета-анализ"),
    (r"\bмета[\s-]?паст[а-яё]*\b", "Метапаста"),
    (r"\bмета[\s-]?пекс[а-яё]*\b", "Метапекс"),

    # МТА и биокерамика
    (r"\b(?:м[\s\.-]*т[\s\.-]*а|эм[\s-]т[эе][\s-]а)\b", "МТА"),
    (r"\bмет[аы]\b(?!\s*[-\s]?анализ)", "МТА"),

    # Депофорез
    (r"\b(?:де\s*по\s*форез|депо\s*форез|дэпофорез)\b", "депофорез"),
    (r"\b(?:де\s*по\s*фореза|депо\s*фореза|дэпофореза)\b", "депофореза"),
    (r"\b(?:де\s*по\s*форезом|депо\s*форезом|дэпофорезом)\b", "депофорезом"),
    (r"\b(?:де\s*по\s*форезе|депо\s*форезе|дэпофорезе)\b", "депофорезе"),
    (r"\b(?:де\s*по\s*форезу|депо\s*форезу|дэпофорезу)\b", "депофорезу"),

    # Эндочак
    (r"\b(?:эндо\s*чак|энда\s*чак|эндо-чак)\b", "эндочак"),
    (r"\b(?:эндо\s*чака|энда\s*чака|эндо-чака)\b", "эндочака"),
    (r"\b(?:эндо\s*чаком|энда\s*чаком|эндо-чаком)\b", "эндочаком"),
    (r"\b(?:эндо\s*чаке|энда\s*чаке|эндо-чаке)\b", "эндочаке"),

    # Эндодонтические инструменты: К-файл, H-файл, C-Pilot
    (r"\b(?:[kк][\s-]файл)\b", "К-файл"),
    (r"\b(?:[kк][\s-]файла)\b", "К-файла"),
    (r"\b(?:[kк][\s-]файлу)\b", "К-файлу"),
    (r"\b(?:[kк][\s-]файлом)\b", "К-файлом"),
    (r"\b(?:[kк][\s-]файле)\b", "К-файле"),
    (r"\b(?:[kк][\s-]файлы)\b", "К-файлы"),
    (r"\b(?:[kк][\s-]файлов)\b", "К-файлов"),
    (r"\b(?:[kк][\s-]файлам)\b", "К-файлам"),
    (r"\b(?:[kк][\s-]файлами)\b", "К-файлами"),
    (r"\b(?:[kк][\s-]файлах)\b", "К-файлах"),

    (r"\b(?:[hнх][\s-]файл|эйч[\s-]файл)\b", "H-файл"),
    (r"\b(?:[hнх][\s-]файла|эйч[\s-]файла)\b", "H-файла"),
    (r"\b(?:[hнх][\s-]файлу|эйч[\s-]файлу)\b", "H-файлу"),
    (r"\b(?:[hнх][\s-]файлом|эйч[\s-]файлом)\b", "H-файлом"),
    (r"\b(?:[hнх][\s-]файле|эйч[\s-]файле)\b", "H-файле"),
    (r"\b(?:[hнх][\s-]файлы|эйч[\s-]файлы)\b", "H-файлы"),
    (r"\b(?:[hнх][\s-]файлов|эйч[\s-]файлов)\b", "H-файлов"),
    (r"\b(?:[hнх][\s-]файлам|эйч[\s-]файлам)\b", "H-файлам"),
    (r"\b(?:[hнх][\s-]файлами|эйч[\s-]файлами)\b", "H-файлами"),
    (r"\b(?:[hнх][\s-]файлах|эйч[\s-]файлах)\b", "H-файлах"),

    (r"\b(?:c[\s-]pilot|си[\s-]пилот|с[\s-]пилот)\b", "C-Pilot"),
    (r"\b(?:c[\s-]pilots|си[\s-]пилоты|с[\s-]пилоты)\b", "C-Pilot"),

    # Силер (герметик), гуттаперча, байпас, пафф
    (r"\bсиллер\b", "силер"),
    (r"\bсиллера\b", "силера"),
    (r"\bсиллеру\b", "силеру"),
    (r"\bсиллером\b", "силером"),
    (r"\bсиллере\b", "силере"),
    (r"\bсиллеры\b", "силеры"),
    (r"\bсиллеров\b", "силеров"),
    (r"\bсиллерами\b", "силерами"),
    (r"\bсиллерах\b", "силерах"),

    (r"\bгутаперч([а-яё]+)\b", r"гуттаперч\1"),

    (r"\b(?:бай\s+пас|бай-пас|байпасс)\b", "байпас"),
    (r"\b(?:бай\s+паса|бай-паса|байпасса)\b", "байпаса"),
    (r"\b(?:бай\s+пасу|бай-пасу|байпассу)\b", "байпасу"),
    (r"\b(?:бай\s+пасом|бай-пасом|байпассом)\b", "байпасом"),
    (r"\b(?:бай\s+пасе|бай-пасе|байпассе)\b", "байпасе"),

    (r"\b(?:паф|пуфф)\s+силера\b", "пафф силера"),
    (r"\b(?:паф|пуфф)\s+силлера\b", "пафф силера"),
    (r"\bпафф\s+силлера\b", "пафф силера"),

    # Оборудование и инструменты
    (r"\b(?:эндомотор|эндамотор|эндо\s+мотор)\b", "эндомотор"),
    (r"\b(?:эндомотора|эндамотора|эндо\s+мотора)\b", "эндомотора"),
    (r"\b(?:эндомотором|эндамотором|эндо\s+мотором)\b", "эндомотором"),
    (r"\b(?:эндомоторе|эндамоторе|эндо\s+моторе)\b", "эндомоторе"),
    (r"\b(?:эндомотору|эндамотору|эндо\s+мотору)\b", "эндомотору"),

    (r"\b(?:апекслокатор|апекслокатер|апекс\s+локатор|апекс-локатор)\b", "апекслокатор"),
    (r"\b(?:апекслокатора|апекс\s+локатора)\b", "апекслокатора"),
    (r"\b(?:апекслокатором|апекс\s+локатором)\b", "апекслокатором"),
    (r"\b(?:апекслокаторе|апекс\s+локаторе)\b", "апекслокаторе"),
    (r"\b(?:апекслокатору|апекс\s+локатору)\b", "апекслокатору"),

    (r"\b(?:эодм|эод\s+м|э\s+о\s+д\s+м|эод-м)\b", "ЭОДМ"),

    (r"\b(?:биопленка|био\s+пленка|биоплёнка|био\s+плёнка)\b", "биопленка"),
    (r"\b(?:биопленки|био\s+пленки|биоплёнки|био\s+плёнки)\b", "биопленки"),
    (r"\b(?:биопленку|био\s+пленку|биоплёнку|био\s+плёнку)\b", "биопленку"),
    (r"\b(?:биопленкой|био\s+пленкой|биоплёнкой|био\s+плёнкой)\b", "биопленкой"),
    (r"\b(?:биопленке|био\s+пленке|биоплёнке|био\s+плёнке)\b", "биопленке"),

    # Препараты и материалы
    (r"\b(?:хлор\s+гексидин|хлоргексидит)\b", "хлоргексидин"),
    (r"\b(?:хлор\s+гексидина|хлоргексидита)\b", "хлоргексидина"),
    (r"\b(?:хлор\s+гексидином|хлоргексидитом)\b", "хлоргексидином"),
    (r"\b(?:э\s+д\s+т\s+а|едта|e\.d\.t\.a\.)\b", "ЭДТА"),
    (r"\b(?:е\s+макс|е\.макс|e\s+max)\b", "E.max"),
    (r"\b(?:кэд\s+кам|cad\s+cam)\b", "CAD/CAM"),
    (r"\b(?:кала\s+септ)\b", "Каласепт"),
    (r"\b(?:ультра\s+кал|ультракал)\b", "UltraCal"),
    (r"\b(?:вита\s+пекс|витапекс)\b", "Витапекс"),
    (r"\b(?:био\s+дентин|biodentine)\b", "Biodentine"),
    (r"\b(?:слюна\s+отсос|слюно\s+отсос)\b", "слюноотсос"),
    (r"\b(?:слюна\s+отсоса|слюно\s+отсоса)\b", "слюноотсоса"),
    (r"\b(?:слюна\s+отсосом|слюно\s+отсосом)\b", "слюноотсосом"),
    (r"\b(?:ультра\s+каин)\b", "ультракаин"),
    (r"\b(?:арти\s+каин|артикоин)\b", "артикаин"),
    (r"\b(?:сканданест|скандо\s+нест)\b", "Скандонест"),
    (r"\b(?:байт\s+рекорд)\b", "байтрекорд"),
    (r"\b(?:ти\s+база|ти\s+баз)\b", "Ti-Base"),
    (r"\b(?:скан\s+боди)\b", "скан-боди"),
    (r"\b(?:глайд\s+пас)\b", "глайд-пас"),
    (r"\b(?:м\s+б\s+2|м\s+в\s+2)\b", "MB2"),

    # Другие частые стоматологические искажения
    (r"\b(?:верти\s+преп|вертипреп)\b", "вертипреп"),
    (r"\b(?:бэо\s+пт|б\s+о\s+п\s+т|бопт)\b", "BOPT"),
    (r"\b(?:холодов(?:ой|ый)\s+тест|холодов(?:ая|ой)\s+реакци[яи])\b", "холодовая проба"),
    (r"\b(?:холодов(?:ого|ому)\s+тест[ау]|холодов(?:ую|ой)\s+реакци[юи])\b", "холодовую пробу"),
]

# Карта числительных зубов (FDI) после слова зуб / зуба / зубе и т.д.
_TOOTH_NUM_MAP = {
    "один один": "11", "один два": "12", "один три": "13", "один четыре": "14",
    "один пять": "15", "один шесть": "16", "один семь": "17", "один восемь": "18",
    "два один": "21", "два два": "22", "два три": "23", "два четыре": "24",
    "два пять": "25", "два шесть": "26", "два семь": "27", "два восемь": "28",
    "три один": "31", "три два": "32", "три три": "33", "три четыре": "34",
    "три пять": "35", "три шесть": "36", "три семь": "37", "три восемь": "38",
    "четыре один": "41", "четыре два": "42", "четыре три": "43", "четыре четыре": "44",
    "четыре пять": "45", "четыре шесть": "46", "четыре семь": "47", "четыре восемь": "48",

    "пять один": "51", "пять два": "52", "пять три": "53", "пять четыре": "54", "пять пять": "55",
    "шесть один": "61", "шесть два": "62", "шесть три": "63", "шесть четыре": "64", "шесть пять": "65",
    "семь один": "71", "семь два": "72", "семь три": "73", "семь четыре": "74", "семь пять": "75",
    "восемь один": "81", "восемь два": "82", "восемь три": "83", "восемь четыре": "84", "восемь пять": "85",

    "одиннадцать": "11", "двенадцать": "12", "тринадцать": "13", "четырнадцать": "14",
    "пятнадцать": "15", "шестнадцать": "16", "семнадцать": "17", "восемнадцать": "18",
    "двадцать один": "21", "двадцать два": "22", "двадцать три": "23", "двадцать четыре": "24",
    "двадцать пять": "25", "двадцать шесть": "26", "двадцать семь": "27", "двадцать восемь": "28",
    "тридцать один": "31", "тридцать два": "32", "тридцать три": "33", "тридцать четыре": "34",
    "тридцать пять": "35", "тридцать шесть": "36", "тридцать семь": "37", "тридцать восемь": "38",
    "сорок один": "41", "сорок два": "42", "сорок три": "43", "сорок четыре": "44",
    "сорок пять": "45", "сорок шесть": "46", "сорок семь": "47", "сорок восемь": "48",

    "пятьдесят один": "51", "пятьдесят два": "52", "пятьдесят три": "53", "пятьдесят четыре": "54", "пятьдесят пять": "55",
    "шестьдесят один": "61", "шестьдесят два": "62", "шестьдесят три": "63", "шестьдесят четыре": "64", "шестьдесят пять": "65",
    "семьдесят один": "71", "семьдесят два": "72", "семьдесят три": "73", "семьдесят четыре": "74", "семьдесят пять": "75",
    "восемьдесят один": "81", "восемьдесят два": "82", "восемьдесят три": "83", "восемьдесят четыре": "84", "восемьдесят пять": "85",

    # Порядковые
    "сорок шестого": "46", "сорок седьмого": "47", "сорок восьмого": "48",
    "тридцать шестого": "36", "тридцать седьмого": "37", "тридцать восьмого": "38",
    "двадцать шестого": "26", "двадцать седьмого": "27", "двадцать восьмого": "28",
    "шестнадцатого": "16", "семнадцатого": "17", "восемнадцатого": "18",
    "сорок шестой": "46", "сорок седьмой": "47", "сорок восьмой": "48",
    "тридцать шестой": "36", "тридцать седьмой": "37", "шестнадцатый": "16",

    "пятьдесят первого": "51", "пятьдесят второго": "52", "пятьдесят третьего": "53", "пятьдесят четвертого": "54", "пятьдесят четвёртого": "54", "пятьдесят пятого": "55",
    "шестьдесят первого": "61", "шестьдесят второго": "62", "шестьдесят третьего": "63", "шестьдесят четвертого": "64", "шестьдесят четвёртого": "64", "шестьдесят пятого": "65",
    "семьдесят первого": "71", "семьдесят второго": "72", "семьдесят третьего": "73", "семьдесят четвертого": "74", "семьдесят четвёртого": "74", "семьдесят пятого": "75",
    "восемьдесят первого": "81", "восемьдесят второго": "82", "восемьдесят третьего": "83", "восемьдесят четвертого": "84", "восемьдесят четвёртого": "84", "восемьдесят пятого": "85",
    "пятьдесят первый": "51", "пятьдесят второй": "52", "пятьдесят третий": "53", "пятьдесят четвертый": "54", "пятьдесят четвёртый": "54", "пятьдесят пятый": "55",
    "шестьдесят первый": "61", "шестьдесят второй": "62", "шестьдесят третий": "63", "шестьдесят четвертый": "64", "шестьдесят четвёртый": "64", "шестьдесят пятый": "65",
    "семьдесят первый": "71", "семьдесят второй": "72", "семьдесят третий": "73", "семьдесят четвертый": "74", "семьдесят четвёртый": "74", "семьдесят пятый": "75",
    "восемьдесят первый": "81", "восемьдесят второй": "82", "восемьдесят третий": "83", "восемьдесят четвертый": "84", "восемьдесят четвёртый": "84", "восемьдесят пятый": "85",
}

_SORTED_TOOTH_KEYS = sorted(_TOOTH_NUM_MAP.keys(), key=lambda x: len(x), reverse=True)

_FORMULA_REPLACEMENTS = [
    (r"\b(?:один\s+к\s+ста\s+тысячам|один\s+к\s+ста\s+тысяч|1\s+к\s+100\s+тысячам)\b", "1:100 000"),
    (r"\b(?:один\s+к\s+двумстам\s+тысячам|один\s+к\s+двумстам\s+тысяч|1\s+к\s+200\s+тысячам)\b", "1:200 000"),
    (r"\b(?:один\s+к\s+пятидесяти\s+тысячам|1\s+к\s+50\s+тысячам)\b", "1:50 000"),

    (r"\b(?:пять\s+и\s+двадцать\s+пять\s+сотых|пять\s+целых\s+двадцать\s+пять\s+сотых)\s+процента\b", "5.25%"),
    (r"\b(?:ноль\s+целых\s+пять\s+десятых|ноль\s+пять)\s+процента\b", "0.5%"),
    (r"\b(?:один|одна\s+целая)\s+процент[а-яё]*\b", "1%"),
    (r"\bдва\s+процента\b", "2%"),
    (r"\bтри\s+процента\b", "3%"),
    (r"\bчетыре\s+процента\b", "4%"),
    (r"\bпять\s+процентов\b", "5%"),
    (r"\bдесять\s+процентов\b", "10%"),
]


_DIGIT_WORDS = {
    "один": "1", "два": "2", "три": "3", "четыре": "4",
    "пять": "5", "шесть": "6", "семь": "7", "восемь": "8"
}
_QUADRANT_WORDS = {
    "один": "1", "два": "2", "три": "3", "четыре": "4",
    "пять": "5", "шесть": "6", "семь": "7", "восемь": "8"
}


def normalize_dental_transcription(text: str) -> str:
    """
    Детерминированная нормализация стоматологических терминов, опечаток Whisper,
    формул зубов FDI и концентраций препаратов.
    Работает мгновенно (0 мс), не требует сети/LLM.
    """
    if not text or len(text.strip()) < 3:
        return text

    res = text

    # 1. Замена клинических терминов и материалов
    for pattern, repl in DENTAL_TERM_REPLACEMENTS:
        res = re.sub(pattern, repl, res, flags=re.IGNORECASE)

    # 2. Формулы и концентрации
    for pattern, repl in _FORMULA_REPLACEMENTS:
        res = re.sub(pattern, repl, res, flags=re.IGNORECASE)

    # 3. Номера зубов FDI в числовой форме: "зуб 3.6", "зуб 3,6", "зуб 5.4", "зуб 6,1" -> "зуб 36", "зуб 54"
    # Постоянный прикус: квадранты 1-4, зубы 1-8. Временный прикус (молочные): квадранты 5-8, зубы 1-5.
    res = re.sub(
        r"\b(зуб[а-яё]*|в\s+области)\s+(?:([1-4])\s*(?:[\.,]|точка)\s*([1-8])|([5-8])\s*(?:[\.,]|точка)\s*([1-5]))\b",
        lambda m: f"{m.group(1)} {m.group(2) or m.group(4)}{m.group(3) or m.group(5)}",
        res,
        flags=re.IGNORECASE,
    )

    # 4. Словесные числительные со словом "точка": "зуб три точка шесть" -> "зуб 36", "зуб пять точка четыре" -> "зуб 54"
    def _sub_tooth_dot_words(m):
        prefix = m.group(1)
        q = _QUADRANT_WORDS.get(m.group(2).lower(), "")
        t = _DIGIT_WORDS.get(m.group(3).lower(), "")
        if q and t:
            if q in ("1", "2", "3", "4") and int(t) in range(1, 9):
                return f"{prefix} {q}{t}"
            if q in ("5", "6", "7", "8") and int(t) in range(1, 6):
                return f"{prefix} {q}{t}"
        return m.group(0)

    res = re.sub(
        r"\b(зуб[а-яё]*|в\s+области)\s+(один|два|три|четыре|пять|шесть|семь|восемь)\s+точка\s+(один|два|три|четыре|пять|шесть|семь|восемь)\b",
        _sub_tooth_dot_words,
        res,
        flags=re.IGNORECASE,
    )

    # 5. Номера зубов после слова "зуб" / "зуба" / "зубе" / "зубом" / "области"
    tooth_prefix_pattern = r"\b(зуб[а-яё]*|в\s+области)\s+(" + "|".join(re.escape(k) for k in _SORTED_TOOTH_KEYS) + r")\b"

    def _sub_tooth(match):
        prefix = match.group(1)
        phrase = match.group(2).lower()
        num = _TOOTH_NUM_MAP.get(phrase, phrase)
        return f"{prefix} {num}"

    res = re.sub(tooth_prefix_pattern, _sub_tooth, res, flags=re.IGNORECASE)
    return res


# Фильтр тишины и галлюцинаций Whisper
_WHISPER_HALLUCINATION_PATTERNS = [
    # Ноты при шуме турбины/слюноотсоса
    r"[♪♫♩♬♭♮♯]+",

    # Субтитры, авторы, тайминг, перевод
    r"(?:субтитры\s+(?:создавал|делал|сделал|подготовил|подогнал|добавил)|редактор\s+субтитров|автор\s+субтитров|корректор\s+субтитров|перевод\s+субтитров|русские\s+субтитры|субтитры\s*:)[^.\n!?;]*",
    r"\b(?:дима\s*торжок|дима\s*торзок|dimatorzhok|dimatorzok)\b[^.\n!?;]*",
    r"\b(?:анна\s+синецкая|а\.?\s*синецкая|синецкая|sinetskaya)\b[^.\n!?;]*",
    r"\b(?:subtitles\s+by(?:\s+the\s+amara\.org\s+community)?|transcribed\s+by|translated\s+by|amara\.org)\b[^.\n!?;]*",
    r"\b(?:переведено\s+и\s+озвучено|озвучено\s+(?:студией|по\s+заказу)|ролик\s+(?:создал|перевел)|видео\s+(?:создано|загружено))\b[^.\n!?;]*",
    r"\b(?:корректор|тайминг|монтаж)\s*:[^.\n!?;]*",

    # YouTube, прощания, подписки
    r"\b(?:спасибо\s+за\s+(?:просмотр|внимание)|благодар(?:ю|им)\s+за\s+(?:просмотр|внимание))\b[.!?;]?",
    r"\b(?:thank\s+you\s+for\s+watching|thanks\s+for\s+watching)\b[.!?;]?",
    r"\b(?:подписывайтесь\s+на\s+канал|подпишитесь\s+на\s+канал|подпишись\s+на\s+канал|не\s+забудьте\s+подписаться)\b[.!?;]?",
    r"\b(?:ставьте\s+лайки?|лайк\s+и\s+подписка|ставьте\s+колокольчик|жмит[ея]\s+на\s+колокольчик)\b[.!?;]?",
    r"\b(?:like\s+and\s+subscribe|please\s+subscribe)\b[.!?;]?",
    r"\b(?:до\s+новы[хм]\s+встреч|до\s+скорых\s+встреч|всем\s+пока|до\s+свидания)\b[.!?;]?",
    r"\b(?:продолжение\s+следует|конец\s+фильма|конец\s+связи)\b[.!?;]?",
    r"\b(?:приятного\s+(?:вам\s+)?просмотра)\b[.!?;]?",

    # Мета-теги в скобках
    r"\[[^\]]*(?:тишина|пауз|шум|музык|аплодисмент|смех|звук|вздох|кашел|silence|noise|music|applause|laughter|cough)[^\]]*\]",
    r"\([^)]*(?:тишина|пауз|шум|музык|аплодисмент|смех|звук|вздох|кашел|silence|noise|music|applause|laughter|cough)[^)]*\)",
]

_COMPILED_HALLUCINATIONS = [re.compile(p, re.IGNORECASE) for p in _WHISPER_HALLUCINATION_PATTERNS]

SILENCE_HALLUCINATIONS = frozenset({
    "you", "thank you", "bye", "bye bye", "goodbye",
    "thank you for watching", "thanks for watching",
    "please subscribe", "like and subscribe",
    "subscribe", "subtitles by", "translated by", "transcribed by", "amara.org",
    "подпишитесь", "подпишитесь на канал", "подпишись на канал",
    "ставьте лайки", "ставьте лайк", "лайк и подписка",
    "продолжение следует",
    "редактор субтитров", "автор субтитров", "субтитры",
    "субтитры сделал", "субтитры подогнал", "субтитры подготовил", "субтитры добавил",
    "перевод субтитров", "переведено", "озвучено",
    "дима торжок", "диматоржок", "dimatorzhok", "dima torzhok",
    "синецкая", "sinetskaya",
    "спасибо за просмотр", "благодарю за просмотр",
    "спасибо за внимание", "благодарю за внимание",
    "спасибо", "большое спасибо",
    "до новых встреч", "до скорых встреч", "до свидания", "всем пока",
    "конец фильма", "конец связи",
    "приятного просмотра", "приятного вам просмотра",
    "ролик создал", "ролик перевел", "видео создано", "видео загружено",
    "тишина", "[тишина]", "(тишина)",
    "пауза", "[пауза]", "(пауза)",
    "шум", "[шум]", "(шум)",
    "музыка", "[музыка]", "(музыка)", "music", "[music]",
    "аплодисменты", "[аплодисменты]", "(аплодисменты)",
    "смех", "[смех]", "(смех)",
    "звуки", "[звуки]", "(звуки)",
    "собачья чушь", "youtube"
})


def strip_whisper_hallucinations(text: str) -> str:
    """
    Вырезает из текста известные галлюцинации Whisper (субтитры, авторов, рекламу каналов, ноты).
    Сохраняет полезный клинический контекст, если он присутствовал в сообщении.
    """
    if not text:
        return ""
    cleaned = text
    for pattern in _COMPILED_HALLUCINATIONS:
        cleaned = pattern.sub(" ", cleaned)

    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"^\s*[,.!?:;\-—–]\s*", "", cleaned)
    cleaned = re.sub(r"\s*[,:;\-—–]\s*$", "", cleaned)
    return cleaned.strip()


def is_silence_or_whisper_hallucination(text: str) -> bool:
    """
    Определяет, является ли распознанный текст тишиной, фоновым шумом (бормашина/слюноотсос)
    или известной галлюцинацией Whisper (субтитры, прощания, зацикливание).
    """
    if not text or not text.strip():
        return True

    clean = text.strip().lower()
    clean_punct = re.sub(r"[♪♫♩♬♭♮♯]+", "", clean).strip(". , ! ? \" ' « » ; : ( ) [ ] ~ — – - \t \n")
    if not clean_punct:
        return True

    # Быстрая проверка точных фраз тишины
    if clean_punct in SILENCE_HALLUCINATIONS:
        return True

    # Очищаем от галлюцинаций
    stripped = strip_whisper_hallucinations(clean)
    stripped_punct = re.sub(r"[♪♫♩♬♭♮♯]+", "", stripped).strip(". , ! ? \" ' « » ; : ( ) [ ] ~ — – - \t \n")

    # Если после зачистки титров ничего не осталось — это 100% галлюцинация
    if not stripped_punct:
        return True

    # Слова после очистки
    words = [w.strip(". , ! ? \" ' ; : ( ) [ ]") for w in stripped_punct.split() if w.strip(". , ! ? \" ' ; : ( ) [ ]")]

    # Зацикленные галлюцинации Whisper при шуме бормашины/слюноотсоса (stuttering loop)
    if len(words) >= 3 and len(set(words)) == 1:
        return True
    if len(words) >= 4 and len(set(words)) <= 2:
        return True

    # Стоп-слова титров, которые могли остаться обрывками
    _SUBTITLE_RESIDUAL_WORDS = frozenset({
        "корректор", "редактор", "автор", "тайминг", "перевод", "субтитры",
        "дима", "торжок", "торзок", "синецкая", "dimatorzhok", "dimatorzok",
        "sinetskaya", "субтитров", "субтитрами", "субтитрах",
        "просмотр", "просмотра", "внимание", "внимания", "подписка", "подписки",
        "лайк", "лайки", "колокольчик", "канал", "канала", "канале", "сайте", "сайта", "специально",
        "amara", "org", "community", "music",
    })
    meaningful_words = [w for w in words if len(w) >= 2 and w not in _SUBTITLE_RESIDUAL_WORDS]
    if not meaningful_words:
        return True

    return False


async def correct_dental_transcription_async(raw_text, timeout=80):
    if not raw_text or len(raw_text.strip()) < 2:
        return raw_text

    # Первичная зачистка паразитных галлюцинаций Whisper
    stripped = strip_whisper_hallucinations(raw_text.strip())
    if not stripped or is_silence_or_whisper_hallucination(stripped):
        return ""

    # Первичная детерминированная нормализация (мгновенно, без расхода квот)
    fast_normalized = normalize_dental_transcription(stripped)

    prompt = f"""
Ты — специализированный клинический редактор стоматологических транскрипций.
Твоя задача — исправить возможные ошибки распознавания речи (опечатки, ослышки Whisper) в стоматологических терминах, препаратах и номерах зубов.

КРИТИЧЕСКИЕ ПРАВИЛА:
1. Заменяй только искаженные термины и ослышки:
   - Бренды: 'оптибонд фл' -> 'OptiBond FL', 'аш плюс' -> 'AH Plus', 'биорут' -> 'BioRoot', 'протейпер' -> 'ProTaper', 'реципрок' -> 'Reciproc'
   - Инструменты и материалы: 'рубер дам'/'кафердам' -> 'раббердам'/'коффердам', 'мета' -> 'МТА', 'де по форез' -> 'депофорез', 'эндо чак' -> 'эндочак', 'гипохлорид'/'промыли хлоркой' -> 'гипохлорит натрия'/'промыли гипохлоритом натрия', 'к-файл'/'h-файл'/'c-pilot' -> 'К-файл'/'H-файл'/'C-Pilot', 'силлер' -> 'силер', 'гутаперча' -> 'гуттаперча', 'эндамотор' -> 'эндомотор', 'апекслокатер' -> 'апекслокатор', 'эод м' -> 'ЭОДМ', 'био пленка' -> 'биопленка'
   - Зубы и формулы: 'зуб 3.6' / 'зуб три точка шесть' / 'зуб сорок шесть' -> 'зуб 36' / 'зуб 46', 'зуб 5.4' / 'зуб пять точка четыре' -> 'зуб 54', 'зуб один один' -> 'зуб 11', 'один к ста тысячам' -> '1:100 000', 'два процента' -> '2%'
2. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО отвечать на клинический вопрос врача или комментировать лечение!
3. Выведи ИСКЛЮЧИТЕЛЬНО исправленный текст, без каких-либо вводных слов, кавычек или пояснений. Если исправлений не требуется, выведи исходный текст без изменений.

Исходный распознанный текст:
"{fast_normalized}"
"""
    try:
        response, error = await generate_gemini_text_async(prompt, {"kind": "transcription_corrector"}, timeout=timeout)
        if response and getattr(response, "text", None):
            corrected = response.text.strip().strip('"').strip("'")
            # Срезаем возможные преамбулы LLM
            corrected = re.sub(r'^(?:исправленный\s+текст|результат|исправление|редакция)\s*:\s*', '', corrected, flags=re.IGNORECASE).strip()
            # Защита от срыва модели в ответ на вопрос: длина не должна увеличиваться в 2.5+ раз
            if corrected and (len(corrected) <= max(60, len(fast_normalized) * 2.5)):
                return normalize_dental_transcription(corrected)
    except Exception as exc:
        logger.warning("correct_dental_transcription_async fallback to fast normalizer: %s", exc)

    return fast_normalized


def _transcribe_audio_sync(file_path, timeout=None):
    import gemini_client
    # Бюджет передаём внутрь: без него перебор ключей складывался в 222 с
    # против 70 с родительского дедлайна, и пять ключей оставались нетронутыми.
    return gemini_client.transcribe_audio_bytes_or_file(file_path, timeout=timeout)


def _main():
    # Журнал ребёнка идёт в stderr, откуда его забирает родитель (_relay_child_log).
    #
    # Без этой настройки корневой logger в дочернем процессе остаётся вообще без
    # обработчиков: срабатывает logging.lastResort, который глотает всё ниже
    # WARNING и печатает голое сообщение без уровня и имени. То есть весь разбор
    # решений — какой ключ взят, какая модель забанена, почему пропущена, сколько
    # символов вернулось — исчезал полностью, а он весь идёт через logger.info.
    #
    # Своего RotatingFileHandler в ребёнке быть не должно: bot.log пишет и
    # ротирует родитель, а два процесса, ротирующих один файл, на Windows рвут
    # ротацию — открытый файл не переименовать. Секретов в этих строках нет,
    # gemini_client печатает только последние 5 символов ключа.
    logging.basicConfig(
        stream=sys.stderr,
        level=logging.INFO,
        format="%(levelname)s %(name)s %(message)s",
    )

    if len(sys.argv) != 2:
        _json_exit({"ok": False, "error": "usage: blocking_tools.py <action>"}, 2)

    action = sys.argv[1]
    try:
        payload = _read_stdin_json()
        if action == "telegraph-page":
            url = _create_telegraph_page_sync(payload.get("title") or "", payload.get("html") or "")
            _json_exit({"ok": bool(url), "url": url})

        if action == "gemini-text":
            text = _generate_gemini_text_sync(
                payload.get("prompt") or "",
                payload.get("context") or {},
                payload.get("timeout")
            )
            # ok: bool(text) склеивал два разных отказа в один. reason —
            # машиночитаемая развилка для вызывающего, error — то же словами.
            if text is None:
                _json_exit({
                    "ok": False,
                    "reason": "cascade_exhausted",
                    "error": "gemini cascade exhausted: ни одна модель не ответила",
                })
            if not text:
                _json_exit({
                    "ok": False,
                    "reason": "empty_text",
                    "error": "gemini model returned empty text",
                })
            _json_exit({"ok": True, "text": text})

        if action == "web-search":
            results, errors = _web_search_sync(
                payload.get("query") or "",
                int(payload.get("max_results") or 2),
            )
            # Пусто без ошибок — это честное «ничего не найдено», ok: True.
            # Пусто, когда все провайдеры упали, — отказ поиска, и он обязан
            # доехать до вызывающего с причиной.
            if not results and errors:
                _json_exit({
                    "ok": False,
                    "reason": "providers_failed",
                    "error": "web search failed: " + "; ".join(errors),
                    "results": [],
                })
            _json_exit({"ok": True, "results": results})

        if action == "whisper-transcribe":
            # Бюджет из payload передаём внутрь: без него перебор ключей
            # складывался в 222 с против 70 с родительского дедлайна, и пять
            # ключей оставались нетронутыми.
            text = _transcribe_audio_sync(
                payload.get("file_path") or "", timeout=payload.get("timeout")
            )
            if text is not None:
                _json_exit({"ok": True, "text": text})
            else:
                _json_exit({"ok": False, "error": "whisper transcription failed (all keys exhausted or timed out)"})

        if action == "pm-supplement":
            import gemini_client
            user_question = payload.get("user_question") or ""
            initial_answer = payload.get("initial_answer") or ""
            timeout = payload.get("timeout")
            res = gemini_client.generate_pm_supplement(user_question, initial_answer, timeout=timeout)
            text = getattr(res, "text", "") if res else ""
            _json_exit({"ok": True, "text": text})

        if action == "google-grounding":
            import gemini_client
            query = payload.get("query") or ""
            timeout = payload.get("timeout") or 160.0
            res, err = gemini_client.generate_google_grounding(query, timeout=timeout)
            if res:
                _json_exit({"ok": True, "result": res})
            else:
                _json_exit({"ok": False, "error": err or "grounding_failed"})

        _json_exit({"ok": False, "error": f"unknown action: {action}"}, 2)
    except SystemExit:
        # _json_exit — это штатный выход, а не отказ: он бросает SystemExit из
        # каждой ветки выше. Без этой ветки `except Exception` его не поймал бы
        # (SystemExit наследует BaseException), но полагаться на это молча нельзя:
        # ветка объявлена явно, чтобы правка ниже не начала писать «ребёнок упал»
        # на каждый УСПЕШНЫЙ ответ.
        raise
    except Exception as exc:
        # Трейсбек падения ребёнка не попадал НИКУДА.
        #
        # _json_exit пишет только в stdout, а stdout здесь — JSON-протокол, куда
        # трейсбек положить нельзя (родитель ищет последнюю строку вида {...}).
        # Журнал ребёнка идёт в stderr (:567) и именно stderr родитель переливает
        # в bot.log через _relay_child_log. То есть до этой правки писать было
        # некуда, и не писали: `error: str(exc)` — всё, что доезжало.
        #
        # Чем это стоило: str() у ConnectionResetError, TimeoutError, IndexError и
        # CancelledError пуст, поэтому родитель на :315 подставлял
        # `f"{action} failed"`, и оператор читал `gemini-text failed` — без типа,
        # файла, строки, модели и ключа. Замер по bot.log: 12 записей ERROR/WARNING
        # с пустым полем причины.
        #
        # logger.exception уходит в stderr, откуда родитель заберёт его сам.
        # Локальных переменных в трейсбеке нет (стандартный traceback их не
        # печатает), то есть промпт врача и ключи в него не попадают.
        logger.exception("дочерний процесс упал action=%s", action)
        _json_exit({"ok": False, "error": _describe_exception(exc)}, 1)


if __name__ == "__main__":
    _main()
