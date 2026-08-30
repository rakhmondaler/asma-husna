#!/usr/bin/env python3
"""Двусторонняя синхронизация CONTENT.md <-> Obsidian vault (Mind Palace).

export: парсит CONTENT.md и раскладывает 99 имён по заметкам
        "01 All Notes/Имя <Имя>.md" (+ индексный MOC "99 имён Аллаха.md").
import: собирает CONTENT.md обратно из заметок vault, сохраняя
        строки-маркеры (### N. Имя (арабский) и **МЕТКИ**).

Маппинг секций (маркер в CONTENT.md <-> заголовок в заметке):
  **ПЕРЕВОДЫ**                <-> ## Переводы
  **ТОЛКОВАНИЕ**              <-> ## Толкование
  **ТАХАЛЛУК**                <-> ## Тахаллук
  **ТЕНЬ ЭГО**                <-> ## Тень эго
  **МУРАКАБА**                <-> ## Муракаба
  **ФАКТ (скрыт с сайта, ...)** <-> ## Факт
  **ТЕКСТ ПАРЫ (a/b)**        <-> ## Текст пары (a/b)
  **СНОСКА О СПИСКАХ**        <-> ## Сноска о списках
"""

import argparse
import re
import sys
import unicodedata
from pathlib import Path

CONTENT = Path("/Users/daler/asma-husna/CONTENT.md")
VAULT = Path("/Users/daler/Documents/Mind Palace/01 All Notes")
MOC_NAME = "99 имён Аллаха.md"
DATE = "2026-08-30"

FACT_MARKER = "ФАКТ (скрыт с сайта, можно переписать в параллель)"

MARKER_TO_HEADING = {
    "ПЕРЕВОДЫ": "Переводы",
    "ТОЛКОВАНИЕ": "Толкование",
    "ТАХАЛЛУК": "Тахаллук",
    "ТЕНЬ ЭГО": "Тень эго",
    "МУРАКАБА": "Муракаба",
    FACT_MARKER: "Факт",
    "СНОСКА О СПИСКАХ": "Сноска о списках",
}
HEADING_TO_MARKER = {v: k for k, v in MARKER_TO_HEADING.items()}

PAIR_RE = re.compile(r"^ТЕКСТ ПАРЫ \((\d+)/(\d+)\)$")
ENTRY_RE = re.compile(r"^### (\d+)\. (.+) \(([^()]+)\)\s*$")
MARKER_RE = re.compile(r"^\*\*(.+)\*\*\s*$")


def parse_content(path=CONTENT):
    """-> (preamble, entries). entry: dict(number, name, arabic, sections=[(marker, text)])"""
    text = path.read_text(encoding="utf-8")
    lines = text.split("\n")
    entries = []
    preamble_lines = []
    cur = None
    cur_marker = None
    buf = []

    def flush_section():
        nonlocal cur_marker, buf
        if cur is not None and cur_marker is not None:
            body = "\n".join(buf).strip("\n").strip()
            cur["sections"].append((cur_marker, body))
        cur_marker, buf = None, []

    for line in lines:
        m = ENTRY_RE.match(line)
        if m:
            flush_section()
            cur = {
                "number": int(m.group(1)),
                "name": m.group(2).strip(),
                "arabic": m.group(3).strip(),
                "sections": [],
            }
            entries.append(cur)
            continue
        if cur is None:
            preamble_lines.append(line)
            continue
        mm = MARKER_RE.match(line)
        if mm:
            flush_section()
            marker = mm.group(1).strip()
            if marker not in MARKER_TO_HEADING and not PAIR_RE.match(marker):
                sys.exit(f"Неизвестный маркер: **{marker}** (имя {cur['number']})")
            cur_marker = marker
            continue
        if line.strip() == "---":
            flush_section()
            continue
        if cur_marker is not None:
            buf.append(line)
    flush_section()

    preamble = "\n".join(preamble_lines).strip("\n")
    if len(entries) != 99:
        sys.exit(f"Ожидалось 99 записей, найдено {len(entries)}")
    return preamble, entries


def translations_to_aliases(perevody_text):
    aliases = []
    for line in perevody_text.split("\n"):
        line = line.strip()
        if not line.startswith("- "):
            continue
        val = line[2:].split("| примечание:")[0].strip()
        if val:
            aliases.append(val)
    return aliases


def marker_to_heading(marker):
    pm = PAIR_RE.match(marker)
    if pm:
        return f"Текст пары ({pm.group(1)}/{pm.group(2)})"
    return MARKER_TO_HEADING[marker]


def heading_to_marker(heading):
    pm = re.match(r"^Текст пары \((\d+)/(\d+)\)$", heading)
    if pm:
        return f"ТЕКСТ ПАРЫ ({pm.group(1)}/{pm.group(2)})"
    if heading not in HEADING_TO_MARKER:
        sys.exit(f"Неизвестный заголовок секции: ## {heading}")
    return HEADING_TO_MARKER[heading]


def find_pairs(entries):
    """номер -> номер партнёра (по секциям ТЕКСТ ПАРЫ)."""
    pairs = {}
    for e in entries:
        for marker, _ in e["sections"]:
            pm = PAIR_RE.match(marker)
            if pm:
                a, b = int(pm.group(1)), int(pm.group(2))
                pairs[a], pairs[b] = b, a
    return pairs


def note_title(entry):
    return f"Имя {entry['name']}"


def yaml_quote(s):
    return '"' + s.replace('"', '\\"') + '"'


def render_note(entry, by_number, pairs):
    n = entry["number"]
    aliases = [entry["name"], entry["arabic"]]
    for marker, body in entry["sections"]:
        if marker == "ПЕРЕВОДЫ":
            aliases += translations_to_aliases(body)
    seen = set()
    aliases = [a for a in aliases if not (a in seen or seen.add(a))]

    # цепочка пред/след для листания по порядку; парные имена смежны и входят в неё
    links = []
    for m in (n - 1, n + 1, pairs.get(n)):
        if m and m in by_number:
            link = f"[[{note_title(by_number[m])}]]"
            if link not in links:
                links.append(link)

    fm = ["---", f"date: {DATE}", "tags:", "  - islam/asma", "  - quest/AI"]
    fm.append("aliases:")
    for a in aliases:
        fm.append(f"  - {yaml_quote(a)}")
    if links:
        fm.append("links:")
        for l in links:
            fm.append(f'  - "{l}"')
    else:
        fm.append("links:")
    fm += [
        f"number: {n}",
        f"name: {yaml_quote(entry['name'])}",
        f"arabic: {yaml_quote(entry['arabic'])}",
        "---",
    ]

    body_parts = []
    for marker, text in entry["sections"]:
        body_parts.append(f"## {marker_to_heading(marker)}\n\n{text}")
    body = "\n\n".join(body_parts)

    source = (
        "> [!source]- Источники\n"
        f"> Контент приложения asma-husna — CONTENT.md, запись {n}. "
        "Толкования опираются на аль-Газали, «аль-Максад аль-асна»."
    )
    return "\n".join(fm) + "\n\n" + body + "\n\n" + source + "\n"


def render_moc(entries):
    fm = [
        "---",
        f"date: {DATE}",
        "tags:",
        "  - islam/asma",
        "  - quest/AI",
        "aliases:",
        '  - "Асма аль-хусна"',
        '  - "MOC 99 имён"',
        "links:",
        "---",
    ]
    intro = (
        "Девяносто девять имён Аллаха (асма аль-хусна) — не список эпитетов, а карта качеств, "
        "по которой суфийская традиция выстраивает работу над характером: каждое имя Бога задаёт "
        "человеку упражнение-тахаллук, тень эго и вопросы для муракабы (самонаблюдения). "
        "Каждая заметка кластера держит все слои одного имени: переводы, толкование, практику, "
        "тень и вопросы. Нумерация — по списку ат-Тирмизи."
    )
    lines = []
    for e in entries:
        first_translation = ""
        for marker, body in e["sections"]:
            if marker == "ПЕРЕВОДЫ":
                als = translations_to_aliases(body)
                if als:
                    first_translation = als[0]
                break
        lines.append(f"{e['number']}. [[{note_title(e)}|{e['name']}]] — {first_translation}")
    return "\n".join(fm) + "\n" + intro + "\n\n" + "\n".join(lines) + "\n"


def cmd_export(sample=None):
    _, entries = parse_content()
    by_number = {e["number"]: e for e in entries}
    pairs = find_pairs(entries)

    titles = [note_title(e) for e in entries]
    dupes = {t for t in titles if titles.count(t) > 1}
    if dupes:
        sys.exit(f"Коллизии названий: {dupes}")

    if sample is not None:
        print(render_note(by_number[sample], by_number, pairs))
        return

    for e in entries:
        path = VAULT / f"{note_title(e)}.md"
        path.write_text(render_note(e, by_number, pairs), encoding="utf-8")
    (VAULT / MOC_NAME).write_text(render_moc(entries), encoding="utf-8")
    print(f"Записано {len(entries)} заметок + MOC в {VAULT}")


def parse_note(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not m:
        sys.exit(f"Нет frontmatter: {path.name}")
    fm_text, body = m.group(1), m.group(2)
    num_m = re.search(r"^number: (\d+)$", fm_text, re.M)
    ar_m = re.search(r'^arabic: "(.+)"$', fm_text, re.M)
    if not num_m or not ar_m:
        sys.exit(f"Нет number/arabic в YAML: {path.name}")
    name_m = re.search(r'^name: "(.+)"$', fm_text, re.M)
    if name_m:
        name = name_m.group(1).replace('\\"', '"')
    else:
        name = path.stem
        if name.startswith("Имя "):
            name = name[len("Имя "):]

    # отрезаем финальный callout с источниками
    body = re.split(r"\n> \[!source\]", body)[0]

    sections = []
    cur_heading, buf = None, []

    def flush():
        nonlocal cur_heading, buf
        if cur_heading is not None:
            sections.append((heading_to_marker(cur_heading), "\n".join(buf).strip()))
        cur_heading, buf = None, []

    for line in body.split("\n"):
        hm = re.match(r"^## (.+?)\s*$", line)
        if hm:
            flush()
            cur_heading = hm.group(1)
            continue
        if cur_heading is not None:
            buf.append(line)
    flush()

    return {
        "number": int(num_m.group(1)),
        "name": name,
        "arabic": ar_m.group(1).replace('\\"', '"'),
        "sections": sections,
    }


def cmd_import(dry_run=False):
    preamble, _ = parse_content()  # преамбула сохраняется из текущего файла
    if preamble.endswith("---"):  # разделитель перед первой записью добавим сами
        preamble = preamble[:-3].rstrip("\n")
    notes = []
    for path in VAULT.glob("Имя *.md"):
        text = path.read_text(encoding="utf-8")
        if "islam/asma" not in text or "\nnumber:" not in text:
            continue
        notes.append(parse_note(path))
    notes.sort(key=lambda e: e["number"])
    numbers = [e["number"] for e in notes]
    if numbers != list(range(1, 100)):
        missing = sorted(set(range(1, 100)) - set(numbers))
        sys.exit(f"Найдено {len(notes)} заметок; нет номеров: {missing}")

    out = [preamble, ""]
    for e in notes:
        out.append("---")
        out.append("")
        out.append(f"### {e['number']}. {e['name']} ({e['arabic']})")
        out.append("")
        for marker, text in e["sections"]:
            out.append(f"**{marker}**")
            out.append(text)
            out.append("")
        # убираем последнюю пустую строку секции — разделитель добавит следующая запись
        if out[-1] == "":
            out.pop()
        out.append("")
    result = "\n".join(out).rstrip("\n") + "\n"

    if dry_run:
        sys.stdout.write(result)
    else:
        CONTENT.write_text(result, encoding="utf-8")
        print(f"Собрано {len(notes)} записей -> {CONTENT}")


def cmd_check():
    """Проверка муракабы: ровно 3 строки, каждая '- ...?'"""
    _, entries = parse_content()
    ok = True
    for e in entries:
        for marker, text in e["sections"]:
            if marker != "МУРАКАБА":
                continue
            lines = [l for l in text.split("\n") if l.strip()]
            if len(lines) != 3 or any(
                not (l.startswith("- ") and l.rstrip().endswith("?")) for l in lines
            ):
                print(f"Имя {e['number']} ({e['name']}): муракаба не по формату")
                ok = False
    print("OK" if ok else "Есть ошибки")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("command", choices=["export", "import", "check"])
    p.add_argument("--sample", type=int, help="export: показать одну заметку, не записывая")
    p.add_argument("--dry-run", action="store_true", help="import: вывести в stdout")
    args = p.parse_args()
    if args.command == "export":
        cmd_export(sample=args.sample)
    elif args.command == "import":
        cmd_import(dry_run=args.dry_run)
    else:
        cmd_check()
