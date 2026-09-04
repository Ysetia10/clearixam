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

    stem = re.sub(r"\s+", " ", stem).strip()
    for k, v in list(options.items()):
        options[k] = re.sub(r"\s+", " ", v).strip()

    correct = LETTER_TO_KEY.get(correct_letter) if correct_letter else None
    return stem, options, correct


def parse_slot_from_name(path: Path) -> str:
    name = path.name.upper()
    m = re.search(r"S(\d)", name)
    return m.group(1) if m else "1"


def build_paper(raw_path: Path, year: int = 2025) -> dict:
    raw = clean_text(raw_path.read_text(encoding="utf-8", errors="replace"))
    slot = parse_slot_from_name(raw_path)
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
        "title": f"SSC CGL 2025 Tier-I Slot {slot} (12 Sep)",
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
