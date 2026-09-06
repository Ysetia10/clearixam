#!/usr/bin/env python3
"""Parse SSC CGL Tier-I PYQ PDF text dumps into structured JSON.

Expects English-medium papers with:
- Q1. … Q100. stems
- Options (a) (b) (c) (d)
- Inline Ans.(a) / Ans.(b) …
- Standard 4×25 sections (Reasoning, GA, Quant, English)
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

NOISE_RE = re.compile(
    r"SSC CGL T-I Similar Paper \(Held on [^\)]+\)\s*[–-]\s*English|"
    r"SSC CGL.*?English|"
    r"===== PAGE \d+ =====",
    re.I,
)

Q_START_RE = re.compile(r"(?m)^Q(\d+)\.\s*")
OPT_RE = re.compile(r"(?m)^\(([a-d])\)\s*")
ANS_RE = re.compile(r"Ans\.\s*\(([a-d])\)", re.I)

SECTION_CUTS = [
    (1, 25, "General Intelligence and Reasoning", "REASONING"),
    (26, 50, "General Awareness", "GA"),
    (51, 75, "Quantitative Aptitude", "QA"),
    (76, 100, "English Comprehension", "ENG"),
]

LETTER_TO_KEY = {"a": "1", "b": "2", "c": "3", "d": "4"}


def section_for(q_no: int) -> tuple[str, str]:
    for lo, hi, name, code in SECTION_CUTS:
        if lo <= q_no <= hi:
            return name, code
    return "Unknown", "UNK"


def clean_text(raw: str) -> str:
    text = NOISE_RE.sub("", raw)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_questions(text: str) -> list[tuple[int, str]]:
    matches = list(Q_START_RE.finditer(text))
    out: list[tuple[int, str]] = []
    for i, m in enumerate(matches):
        q_no = int(m.group(1))
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        out.append((q_no, body))
    return out


def repair_stacked_fractions(text: str) -> str:
    """Rebuild fractions that PDF text dumps as stacked lines.

    Handles:
    - mixed numbers: 8\\n1\\n3 → 8 1/3
    - simple fractions: 7\\n9 → 7/9
    - π fractions: 3𝜋\\n2 → 3𝜋/2
    - continued fractions: 3 +\\n1\\n2+ 1\\n5+1\\n3 → 3 + 1/(2 + 1/(5 + 1/3))
    """
    t = text.replace("\r\n", "\n").replace("\r", "\n")

    # Continued fraction: x = a +\n1\nb+ 1\nc+1\nd  (common SSC dump shape)
    t = re.sub(
        r"([𝑥x]\s*=\s*)(\d+)\s*\+\s*\n\s*1\s*\n\s*(\d+)\s*\+\s*1\s*\n\s*(\d+)\s*\+\s*1\s*\n\s*(\d+)",
        r"\1\2 + 1/(\3 + 1/(\4 + 1/\5))",
        t,
        flags=re.I,
    )

    # Mixed number on its own stack: whole\nnum\nden
    t = re.sub(r"(?<![\d./])(\d+)\n(\d+)\n(\d+)(?!\d)", r"\1 \2/\3", t)

    # π / n stacked
    t = re.sub(r"(\d*[𝜋π])\n(\d+)(?!\d)", r"\1/\2", t)

    # Simple fraction stack: num\nden (avoid years / multi-digit glue later)
    t = re.sub(r"(?<![\d./])(\d{1,3})\n(\d{1,3})(?!\d)", r"\1/\2", t)

    return t


def _is_structural_line(ln: str) -> bool:
    if re.match(r"^\d+\.\s+\S", ln):
        return True
    if re.match(
        r"^(Statement|Conclusions?|Assumptions?|Assertion|Reason|Category|Proficient|"
        r"Total Sample Size|Read the following passage|Read the passage)\b",
        ln,
        re.I,
    ):
        return True
    if re.search(r"\b\d{6}\s*$", ln):
        return True
    if re.match(r"^[A-Z]{2,}(?:,\s*[A-Z0-9]+)+\s*,?\s*\??$", ln):
        return True
    if "::" in ln and re.search(r":\s*\?", ln):
        return True
    if re.match(r"^[IVX]+\.\s", ln):  # I. II. conclusions
        return True
    return False


def should_preserve_multiline(lines: list[str]) -> bool:
    if len(lines) < 2:
        return False
    if sum(1 for ln in lines if re.search(r"\b\d{6}\s*$", ln)) >= 2:
        return True
    if sum(1 for ln in lines if re.match(r"^\d+\.\s+\S", ln)) >= 2:
        return True
    if any(
        re.match(
            r"^(Statement|Conclusions?|Assumptions?|Assertion|Reason|Category|Proficient|"
            r"Read the following passage|Read the passage)\b",
            ln,
            re.I,
        )
        for ln in lines
    ):
        return True
    if any(re.match(r"^[A-Z]{2,}(?:,\s*[A-Z0-9]+)+\s*,?\s*\??$", ln) for ln in lines):
        return True
    if any("::" in ln and re.search(r":\s*\?", ln) for ln in lines):
        return True
    return False


def merge_soft_wraps(lines: list[str]) -> list[str]:
    """Join prose wraps; keep addresses / numbered items / series on their own lines."""
    out: list[str] = []
    buf = ""

    def flush() -> None:
        nonlocal buf
        if buf:
            out.append(buf.strip())
            buf = ""

    for ln in lines:
        if _is_structural_line(ln):
            flush()
            out.append(ln)
            continue
        if not buf:
            buf = ln
        elif re.search(r"[.?:]$", buf):
            flush()
            buf = ln
        else:
            buf = f"{buf} {ln}"
    flush()
    return out


def number_address_block(lines: list[str]) -> list[str]:
    """Prefix 1. 2. 3. … on consecutive address/pincode lines when missing."""
    pincode_idxs = [i for i, ln in enumerate(lines) if re.search(r"\b\d{6}\s*$", ln)]
    if len(pincode_idxs) < 2:
        return lines
    # Only number if they form a contiguous block and aren't already numbered
    if any(re.match(r"^\d+\.\s", lines[i]) for i in pincode_idxs):
        return lines
    first, last = pincode_idxs[0], pincode_idxs[-1]
    if pincode_idxs != list(range(first, last + 1)):
        return lines
    out = lines[:]
    for n, i in enumerate(pincode_idxs, start=1):
        out[i] = f"{n}. {out[i]}"
    return out


def finalize_stem(stem: str) -> str:
    stem = repair_stacked_fractions(stem)
    lines = [ln.strip() for ln in stem.splitlines() if ln.strip()]
    if not lines:
        return ""

    if should_preserve_multiline(lines):
        merged = number_address_block(merge_soft_wraps(lines))
        # Light cleanup per line (don't collapse across newlines)
        cleaned = []
        for ln in merged:
            t = re.sub(r"[ \t]+", " ", ln).strip()
            t = re.sub(r"%\s*of\s*", "% of ", t, flags=re.I)
            t = re.sub(r"(\d)\s*(km|m|cm|kg)\b", r"\1 \2", t, flags=re.I)
            cleaned.append(t)
        return "\n".join(cleaned)

    text = " ".join(lines)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s*([−\-÷×+])\s*", r" \1 ", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\(\s+", "(", text)
    text = re.sub(r"\s+\)", ")", text)
    text = re.sub(r"\{\s+", "{", text)
    text = re.sub(r"\s+\}", "}", text)
    text = re.sub(r"\[\s+", "[", text)
    text = re.sub(r"\s+\]", "]", text)
    text = re.sub(r"%\s*of\s*", "% of ", text, flags=re.I)
    text = re.sub(r"(\d)\s*(km|m|cm|kg)\b", r"\1 \2", text, flags=re.I)
    return text


def parse_body(body: str) -> tuple[str, dict[str, str], str | None]:
    ans_m = ANS_RE.search(body)
    correct_letter = ans_m.group(1).lower() if ans_m else None
    work = body[: ans_m.start()].strip() if ans_m else body.strip()

    opt_matches = list(OPT_RE.finditer(work))
    if len(opt_matches) < 4:
        # Fall back: options may be inline without line starts
        inline = list(re.finditer(r"\(([a-d])\)\s*", work))
        if len(inline) >= 4:
            opt_matches = inline[-4:]

    options: dict[str, str] = {}
    stem = work
    if len(opt_matches) >= 4:
        stem = work[: opt_matches[0].start()].strip()
        for i, om in enumerate(opt_matches[:4]):
            letter = om.group(1).lower()
            opt_start = om.end()
            opt_end = opt_matches[i + 1].start() if i + 1 < len(opt_matches[:4]) else (
                opt_matches[4].start() if len(opt_matches) > 4 else len(work)
            )
            options[LETTER_TO_KEY[letter]] = work[opt_start:opt_end].strip()
    else:
        # Last resort: keep stem only
        options = {}

    stem = finalize_stem(stem)
    for k, v in list(options.items()):
        options[k] = re.sub(r"\s+", " ", repair_stacked_fractions(v)).strip()

    correct = LETTER_TO_KEY.get(correct_letter) if correct_letter else None
    return stem, options, correct


def parse_slot_from_name(path: Path) -> str:
    name = path.name.upper()
    m = re.search(r"S(\d)", name)
    return m.group(1) if m else "1"


def parse_exam_day(path: Path) -> str:
    """Return day label like '12 Sep' from filename."""
    m = re.search(r"(?:Held[-_ ]on[-_ ]?)?(\d{1,2})[-_ ]Sep(?:tember)?[-_ ]?2025", path.name, re.I)
    if m:
        return f"{int(m.group(1))} Sep"
    return "12 Sep"


def build_paper(raw_path: Path, year: int = 2025) -> dict:
    raw = clean_text(raw_path.read_text(encoding="utf-8", errors="replace"))
    slot = parse_slot_from_name(raw_path)
    day_label = parse_exam_day(raw_path)
    chunks = split_questions(raw)
    questions = []
    notes: list[str] = []

    for q_no, body in chunks:
        section, code = section_for(q_no)
        stem, options, correct = parse_body(body)
        needs_review = False
        if not stem:
            needs_review = True
            notes.append(f"Q{q_no}: empty stem")
        if len(options) != 4:
            needs_review = True
            notes.append(f"Q{q_no}: expected 4 options, got {len(options)}")
        if not correct:
            needs_review = True
            notes.append(f"Q{q_no}: missing answer")

        questions.append(
            {
                "qNo": q_no,
                "section": section,
                "sectionCode": code,
                "type": "MCQ",
                "stem": stem,
                "options": options or None,
                "correctAnswer": correct,
                "correctOption": correct,
                "stimulus": None,
                "setRange": None,
                "images": None,
                "chartDependent": False,
                "topic": None,
                "needsManualReview": needs_review,
            }
        )

    questions.sort(key=lambda q: q["qNo"])
    sections_meta = [
        {
            "code": code,
            "name": name,
            "qFrom": lo,
            "qTo": hi,
            "durationMinutes": 15,
        }
        for lo, hi, name, code in SECTION_CUTS
    ]

    return {
        "exam": "SSC",
        "year": year,
        "slot": slot,
        "title": f"SSC CGL 2025 Tier-I Slot {slot} ({day_label})",
        "durationMinutes": 60,
        "timingMode": "sectional",
        "sectionDurationMinutes": 15,
        "calculator": False,
        "sourceFile": raw_path.name.replace(".raw.txt", ".pdf"),
        "marking": {"correct": 2, "incorrect": 0.5, "unattempted": 0},
        "sections": sections_meta,
        "notes": notes
        or [
            "SSC CGL Tier-I sectional timing: 15 minutes per section, sequential lock.",
            "Marking +2 / −0.5 from exam config.",
        ],
        "sets": [],
        "questions": questions,
        "verification": {
            "questionCount": len(questions),
            "withAnswers": sum(1 for q in questions if q.get("correctAnswer")),
            "needsReview": sum(1 for q in questions if q.get("needsManualReview")),
        },
    }


def write_verification(paper: dict, out: Path) -> None:
    lines = [
        f"{paper['title']}",
        f"Questions: {paper['verification']['questionCount']}",
        f"With answers: {paper['verification']['withAnswers']}",
        f"Needs review: {paper['verification']['needsReview']}",
        "",
        "Q\tAns\tSection\tStem preview",
    ]
    for q in paper["questions"]:
        preview = (q["stem"] or "")[:60].replace("\t", " ")
        lines.append(f"{q['qNo']}\t{q.get('correctAnswer') or '-'}\t{q['sectionCode']}\t{preview}")
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("raw_txt", type=Path, help="Path to .raw.txt extracted from SSC PDF")
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()

    paper = build_paper(args.raw_txt)
    out = args.out or args.raw_txt.with_suffix("").with_suffix(".json")
    # .raw.txt → strip both suffixes carefully
    if args.out is None:
        name = args.raw_txt.name
        if name.endswith(".raw.txt"):
            out = args.raw_txt.with_name(name[: -len(".raw.txt")] + ".json")
        else:
            out = args.raw_txt.with_suffix(".json")

    out.write_text(json.dumps(paper, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    ver = out.with_suffix(".verification.txt")
    write_verification(paper, ver)
    print(
        f"Wrote {out} ({paper['verification']['questionCount']} Q, "
        f"{paper['verification']['withAnswers']} answers, "
        f"{paper['verification']['needsReview']} review)"
    )
    print(f"Wrote {ver}")


if __name__ == "__main__":
    main()
