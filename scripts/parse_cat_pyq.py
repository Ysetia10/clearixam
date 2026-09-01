#!/usr/bin/env python3
"""Parse a CAT PYQ PDF text dump into structured JSON + a Q↔answer checklist.

Designed for CAT 2025 Slot 1 style papers:
- Questions numbered 1..N at line starts
- MCQ options labelled (1) (2) (3) (4)
- Shared RC / DILR stimuli under "Directions for questions X to Y"
- Answer key table on the last page
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


NOISE_RE = re.compile(
    r"CAT ACTUAL PAPER 2025|"
    r"CAT 2025\s*-?\s*SLOT\s*-?\s*I\s*\d+|"
    r"CAT 2025 Slot 01|"
    r"Response Sheet|"
    r"Slot 01|"
    r"-- \d+ of 15 --",
    re.I,
)

Q_START_RE = re.compile(r"(?m)^\s*(\d{1,2})\.\s+")
DIR_RE = re.compile(
    r"Directions for questions\s+(\d[\d\s]*)\s+to\s+(\d[\d\s]*)\s*:?",
    re.I,
)
ANSWER_KEY_RE = re.compile(r"(?i)Answer\s+Key")

QUESTIONISH = re.compile(
    r"^(?:"
    r"Which|What|How|All of|The passage|Study|Five jumbled|The given|"
    r"The four sentences|The primary|The mention|The goal|From the context|"
    r"According to|In a |In the |If |Let |The number|The ratio|The \(|"
    r"A value|A container|A train|A shopkeeper|A cafeteria|A round table|"
    r"At a |At Innovate|Among |Who |Arun|Kamala|Shruti|Stocks |For any|"
    r"For how|Five countries|Alia,"
    r")",
    re.I,
)

TITA_HINT = re.compile(
    r"key in the (sequence|number)|odd sentence out|key in that",
    re.I,
)

SECTION_CUTS = [
    (1, 24, "Verbal Ability and Reading Comprehension", "VARC"),
    (25, 46, "Data Interpretation and Logical Reasoning", "DILR"),
    (47, 68, "Quantitative Ability", "QA"),
]

CHART_Q = {30, 31, 32, 33}
# First RC is labelled "3 to 5" in the PDF but Q2 belongs to that passage.
RANGE_OVERRIDES = {(3, 5): (2, 5)}


def clean_text(raw: str) -> str:
    text = NOISE_RE.sub("", raw)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def parse_int_token(token: str) -> int:
    return int(re.sub(r"\s+", "", token))


def looks_like_question(peek: str) -> bool:
    peek = peek.lstrip()
    if not peek:
        return False
    if peek[0] in "\"“'‘":
        return True
    if QUESTIONISH.search(peek):
        return True
    if "?" in peek[:500]:
        return True
    return False


def find_question_starts(body: str, expected: int) -> dict[int, int]:
    candidates = [
        (int(m.group(1)), m.start(), m.end())
        for m in Q_START_RE.finditer(body)
        if 1 <= int(m.group(1)) <= expected
    ]
    starts: dict[int, int] = {}
    next_q = 1
    for num, start, end in candidates:
        if num != next_q:
            continue
        peek = body[end : end + 240]
        # After VARC, numbered DILR constraints only appear for already-accepted
        # question numbers, so a sequential hit is the real next question.
        sequential_safe = next_q >= 25 and len(peek.strip()) > 40
        if next_q == 1 or looks_like_question(peek) or sequential_safe:
            starts[next_q] = start
            next_q += 1
        if next_q > expected:
            break
    return starts


def parse_answer_key(raw: str) -> dict[int, str]:
    m = ANSWER_KEY_RE.search(raw)
    if not m:
        raise ValueError("Answer Key section not found")
    table = raw[m.end() :]
    # Rows look like: "1 2143   25 3  47 2"
    answers: dict[int, str] = {}
    for line in table.splitlines():
        parts = line.split()
        if len(parts) < 2 or not parts[0].isdigit():
            continue
        # triples of (q, ans)
        i = 0
        while i + 1 < len(parts) and parts[i].isdigit():
            qno = int(parts[i])
            ans = parts[i + 1]
            if 1 <= qno <= 68:
                answers[qno] = ans
            i += 2
    return answers


def extract_options(block_body: str) -> tuple[dict[str, str] | None, str]:
    # Q45 PDF typo: last option labelled (3) instead of (4)
    tail = block_body[-450:]
    if re.search(r"\(1\).*\(2\).*\(3\).*\(3\)", tail, re.S) and "(4)" not in tail:
        idx = block_body.rfind("(3)")
        if idx != -1:
            block_body = block_body[:idx] + "(4)" + block_body[idx + 3 :]

    markers = []
    for m in re.finditer(r"\((\d)\)\s*", block_body):
        before = block_body[max(0, m.start() - 4) : m.start()]
        # Sentence-insertion blanks look like ____(1)____ — not MCQ labels
        if "_" in before:
            continue
        markers.append((m.start(), m.end(), int(m.group(1))))
    if not markers:
        return None, block_body

    # First complete (1)(2)(3)(4) run — later sets belong to following questions
    seq = None
    for i, (_, _, label) in enumerate(markers):
        if label != 1:
            continue
        run = [markers[i]]
        expected = 2
        j = i + 1
        while j < len(markers) and expected <= 4:
            if markers[j][2] == expected:
                run.append(markers[j])
                expected += 1
            elif markers[j][2] == 1:
                break
            j += 1
            if j - i > 12:
                break
        if len(run) == 4:
            seq = run
            break

    if not seq:
        return None, block_body

    stem = block_body[: seq[0][0]].strip()
    opts: dict[str, str] = {}
    for idx in range(4):
        a = seq[idx][1]
        b = seq[idx + 1][0] if idx < 3 else len(block_body)
        text = re.sub(r"\s+", " ", block_body[a:b]).strip()
        text = re.sub(
            r"\s*(DATA INTERPRETATION|QUANTITATIVE APTITUDE|VERBAL ABILITY|"
            r"Directions for questions).*$",
            "",
            text,
            flags=re.I,
        ).strip()
        opts[str(idx + 1)] = text
    return opts, stem


def squash(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def section_for(qno: int) -> tuple[str, str]:
    for lo, hi, name, code in SECTION_CUTS:
        if lo <= qno <= hi:
            return name, code
    return "Unknown", "UNK"


def extract_sets(body: str, q_starts: dict[int, int]) -> list[dict]:
    sets: list[dict] = []
    matches = list(DIR_RE.finditer(body))
    ordered = sorted(q_starts.items())
    for i, m in enumerate(matches):
        raw_lo, raw_hi = parse_int_token(m.group(1)), parse_int_token(m.group(2))
        q_from, q_to = RANGE_OVERRIDES.get((raw_lo, raw_hi), (raw_lo, raw_hi))
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        # Stimulus is directions text until the first question in this set
        first_q_start = None
        for qno, start in ordered:
            if q_from <= qno <= q_to and start >= m.start():
                first_q_start = start
                break
        stimulus = body[m.end() : first_q_start if first_q_start else end]
        stimulus = squash(stimulus)
        stimulus = re.sub(
            r"(?i)^(The passage below is accompanied by.*?choose the\s+)?best answer for each question\.\s*",
            "",
            stimulus,
            count=1,
        )
        sets.append(
            {
                "qFrom": q_from,
                "qTo": q_to,
                "labelFrom": raw_lo,
                "labelTo": raw_hi,
                "stimulus": squash(stimulus),
                "chartDependent": any(n in CHART_Q for n in range(q_from, q_to + 1)),
            }
        )
    return sets


def classify(stem: str, opts: dict | None, ans: str) -> tuple[str, dict | None, str | None]:
    if TITA_HINT.search(stem):
        return "TITA", None, None
    if opts and all(opts.get(str(k)) for k in range(1, 5)):
        return "MCQ", opts, ans if ans in opts else None
    if ans in {"1", "2", "3", "4"} and opts:
        return "MCQ", opts, ans
    return "TITA", None, None


def discover_chart_images(raw_path: Path) -> list[str]:
    """Pick up companion chart PNGs saved next to the paper (assets/)."""
    assets = raw_path.parent / "assets"
    if not assets.is_dir():
        return []
    stem = raw_path.name.replace(".raw.txt", "")
    hits = sorted(assets.glob(f"{stem}*chart*.png")) + sorted(
        assets.glob(f"{stem}*Q30*.png")
    )
    # de-dupe while preserving order
    seen: set[str] = set()
    rels: list[str] = []
    for p in hits:
        rel = f"assets/{p.name}"
        if rel not in seen:
            seen.add(rel)
            rels.append(rel)
    return rels


def parse_paper(raw_path: Path) -> dict:
    raw = raw_path.read_text(encoding="utf-8")
    answers = parse_answer_key(raw)
    expected = max(answers) if answers else 68
    chart_images = discover_chart_images(raw_path)

    cleaned = clean_text(raw)
    ak = ANSWER_KEY_RE.search(cleaned)
    body = cleaned[: ak.start()] if ak else cleaned

    starts = find_question_starts(body, expected)
    missing = [n for n in range(1, expected + 1) if n not in starts]
    if missing:
        raise RuntimeError(f"Failed to locate question starts: {missing}")

    sets = extract_sets(body, starts)
    set_by_q = {}
    for s in sets:
        for n in range(s["qFrom"], s["qTo"] + 1):
            set_by_q[n] = s
        if s.get("chartDependent") and chart_images:
            s["images"] = chart_images

    ordered = sorted(starts.items())
    questions = []
    for i, (qno, start) in enumerate(ordered):
        end = ordered[i + 1][1] if i + 1 < len(ordered) else len(body)
        block = body[start:end].strip()
        block_body = re.sub(rf"^\s*{qno}\.\s*", "", block, count=1).strip()
        # Don't let the next RC/DILR directions leak into this stem
        dir_cut = re.search(r"(?i)Directions for questions", block_body)
        if dir_cut:
            block_body = block_body[: dir_cut.start()].strip()

        opts, stem = extract_options(block_body)
        stem = squash(stem)
        ans = answers[qno]
        qtype, options, correct_option = classify(stem, opts, ans)
        section, section_code = section_for(qno)
        shared = set_by_q.get(qno)
        chart_dependent = qno in CHART_Q
        images = chart_images if chart_dependent else None
        needs_review = bool(
            (chart_dependent and not images)
            or not stem
            or (qtype == "MCQ" and (not options or any(not options.get(str(k)) for k in range(1, 5))))
            or (qtype == "MCQ" and correct_option not in {"1", "2", "3", "4"})
        )
        questions.append(
            {
                "qNo": qno,
                "section": section,
                "sectionCode": section_code,
                "type": qtype,
                "stem": stem,
                "options": options,
                "correctAnswer": ans,
                "correctOption": correct_option,
                "stimulus": shared["stimulus"] if shared else None,
                "setRange": [shared["qFrom"], shared["qTo"]] if shared else None,
                "images": images,
                "chartDependent": chart_dependent,
                "needsManualReview": needs_review,
            }
        )

    questions.sort(key=lambda q: q["qNo"])
    mcq = [q for q in questions if q["type"] == "MCQ"]
    tita = [q for q in questions if q["type"] == "TITA"]
    mapped = sum(
        1
        for q in mcq
        if q["options"] and q["correctOption"] in q["options"] and q["options"][q["correctOption"]]
    )
    return {
        "exam": "CAT",
        "year": 2025,
        "slot": "1",
        "title": "CAT 2025 Slot 1",
        "durationMinutes": 120,
        "sourceFile": raw_path.name.replace(".raw.txt", ".pdf"),
        "marking": {"correct": 3, "incorrect": 1, "unattempted": 0},
        "notes": [
            "Topics not tagged yet — deferred until 4–5 papers are ingested.",
            "Q45 source PDF labels the last option as '(3)' twice; corrected to '(4)'.",
            "First RC directions say questions 3–5; Q2 is on the same passage.",
        ]
        + (
            [f"Q30–33 chart image saved at {chart_images[0]} (radar + bar)."]
            if chart_images
            else ["Q30–33 need radar/bar chart images (option text is parsed)."]
        ),
        "sets": sets,
        "questions": questions,
        "verification": {
            "expectedCount": expected,
            "parsedCount": len(questions),
            "answerKeyCount": len(answers),
            "allQuestionsHaveAnswers": all(q["correctAnswer"] for q in questions),
            "mcqCount": len(mcq),
            "titaCount": len(tita),
            "mcqWithMappedAnswerText": mapped,
            "titaQuestionNos": [q["qNo"] for q in tita],
            "chartDependentQuestionNos": sorted(CHART_Q),
            "chartImage": chart_images[0] if chart_images else None,
            "needsManualReview": [q["qNo"] for q in questions if q["needsManualReview"]],
        },
    }


def write_verification(paper: dict, path: Path) -> None:
    qs = paper["questions"]
    v = paper["verification"]
    lines = [
        f"{paper['title']} — Question ↔ Answer verification",
        "=" * 70,
        (
            f"Parsed: {v['parsedCount']}/{v['expectedCount']} | "
            f"Answer key: {v['answerKeyCount']}/{v['expectedCount']} | "
            f"MCQ: {v['mcqCount']} (mapped text: {v['mcqWithMappedAnswerText']}) | "
            f"TITA: {v['titaCount']}"
        ),
        (
            f"Chart figures: {v['chartDependentQuestionNos']} -> {v['chartImage']}"
            if v.get("chartImage")
            else f"Chart figures missing: {v['chartDependentQuestionNos']}"
        ),
        f"Needs manual review: {v['needsManualReview'] or 'none'}",
        "",
    ]
    for q in qs:
        if q["type"] == "MCQ" and q["options"] and q["correctOption"] in q["options"]:
            detail = f"({q['correctOption']}) {q['options'][q['correctOption']][:90]}"
            status = "MATCH"
        elif q["type"] == "TITA":
            detail = f"TITA={q['correctAnswer']}"
            status = "MATCH"
        else:
            detail = f"ans={q['correctAnswer']} options_missing"
            status = "REVIEW"
        if q["chartDependent"]:
            status += "+CHART"
        if not q["stem"]:
            status = "REVIEW"
        lines.append(
            f"Q{q['qNo']:02d} [{q['sectionCode']}] {q['type']:<4} {status:<14} {detail}"
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Parse CAT PYQ raw text to JSON")
    parser.add_argument("raw", type=Path, help="Path to .raw.txt extracted from the PDF")
    parser.add_argument("--out-dir", type=Path, default=None)
    args = parser.parse_args()
    out_dir = args.out_dir or args.raw.parent
    paper = parse_paper(args.raw)
    stem = args.raw.name.replace(".raw.txt", "")
    json_path = out_dir / f"{stem}.json"
    ver_path = out_dir / f"{stem}.verification.txt"
    json_path.write_text(json.dumps(paper, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_verification(paper, ver_path)
    v = paper["verification"]
    print(f"Wrote {json_path}")
    print(f"Wrote {ver_path}")
    print(
        f"Questions {v['parsedCount']}/{v['expectedCount']} | "
        f"answers {v['answerKeyCount']} | "
        f"MCQ mapped {v['mcqWithMappedAnswerText']}/{v['mcqCount']} | "
        f"review {v['needsManualReview']}"
    )


if __name__ == "__main__":
    main()
