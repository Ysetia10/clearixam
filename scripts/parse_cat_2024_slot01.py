#!/usr/bin/env python3
"""Parse CAT 2024 Slot-I question + answer-key PDFs into structured PYQ JSON.

Handles A/B/C/D options (mapped to 1–4), separate answer-key PDF, chart sets,
jumbles / odd-sentence / para-completion cues, and known PDF math OCR fixes.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

LETTER_TO_KEY = {"A": "1", "B": "2", "C": "3", "D": "4"}
KEY_TO_LETTER = {v: k for k, v in LETTER_TO_KEY.items()}

NOISE_RE = re.compile(
    r"===== PAGE \d+ =====|"
    r"Actual CAT 2024\s*Slot\s*-?\s*I|"
    r"hitbullseye|"
    r"-- \d+ of \d+ --|"
    r"^\s*\d{1,2}\s*$",
    re.I | re.M,
)

Q_START_RE = re.compile(r"(?m)^\s*(\d{1,2})\.\s+")
DIR_RE = re.compile(
    r"DIRECTIONS for questions?\s+(\d[\d\s&]*)\s*(?:to|&)\s*(\d[\d\s]*)\s*:?",
    re.I,
)
DIR_SINGLE_RE = re.compile(r"DIRECTIONS for the question\s*:?", re.I)
ANSWER_KEY_HDR = re.compile(r"(?i)Answer Key Actual CAT Slot")
EXPL_HDR = re.compile(r"(?i)Explanation Actual CAT Slot")

SECTION_CUTS = [
    (1, 24, "Verbal Ability and Reading Comprehension", "VARC"),
    (25, 46, "Data Interpretation and Logical Reasoning", "DILR"),
    (47, 68, "Quantitative Ability", "QA"),
]

CHART_HINT = re.compile(
    r"(?i)(chart below|figure below|candlestick|shown in the (?:figure|chart|graph))"
)

TITA_HINT = re.compile(
    r"key in the (sequence|number)|odd sentence out|key in that|"
    r"then the (value|difference|number|sum|total|investment period|length|initial quantity)|"
    r"then,? the value of|equals\.?\s*$",
    re.I,
)

QUESTIONISH = re.compile(
    r"^(?:"
    r"Which|What|How|Why|Who|Whom|Whose|Where|When|Choose|"
    r"All of|None of|To which|On the basis|"
    r"The passage|Study|Five jumbled|The given|"
    r"The four sentences|The primary|The mention|The goal|From the context|"
    r"According to|In a |In the |If |Let |The number|The ratio|The \(|"
    r"A value|A container|A train|A shopkeeper|A cafeteria|A round table|"
    r"At a |Among |Sentence:|Paragraph:|Certain codes|"
    r"The author|There are|There is|Non[- ]|"
    r"When |Two places|Consider |Suppose |Renu |ABCD |"
    r"For any|The sum|The selling|The surface|A glass|A fruit|"
    r"An amount|In September|Daily |Cartographers|Scientific research|"
    r"We can infer|The most recent|The text uses|"
    r"\d+\.\s+"  # jumble sentence starts
    r")",
    re.I,
)

CONSTRAINTISH = re.compile(
    r"^(?:"
    r"Each team|In Round|The numbers of stars|Two surfers|Half of the|"
    r"USA \(in ROW\)|China \(in Asia\)|France \(in Europe\)|"
    r"The total numbers of stars|D received more|Segment |"
    r"Exactly \d+|Among the seats|No tickets|The number of tickets"
    r")",
    re.I,
)

# qNo -> overrides applied after automatic parse
MANUAL_FIXES: dict[int, dict] = {
    53: {
        "stem": (
            "If the equations x² + mx + 9 = 0, x² + nx + 17 = 0 and "
            "x² + (m + n)x + 35 = 0 have a common negative root, then the value of (2m + 3n) is"
        ),
    },
    54: {
        "stem": (
            "If x is a positive real number such that "
            "4 log₁₀ x + 4 log₁₀₀ x + 8 log₁₀₀₀ x = 13, then the greatest integer not exceeding x, is"
        ),
    },
    55: {
        "stem": (
            "Let x, y, and z be real numbers satisfying 4(x² + y² + z²) = a and "
            "4(x − y − z) = 3 + a. Then a equals"
        ),
        "options": {"1": "3/11", "2": "3", "3": "1", "4": "4"},
    },
    56: {
        "stem": (
            "In the XY-plane, the area, in sq. units, of the region defined by the inequalities "
            "y ≥ x + 4 and −4 ≤ x² + y² + 5(x − y) ≤ 0 is"
        ),
        "options": {"1": "3π", "2": "2π", "3": "π", "4": "4π"},
    },
    59: {
        "options": {"1": "1125π/2", "2": "750π/2", "3": "1125π", "4": "750π"},
    },
    62: {
        "stem": (
            "If (a + b√n) is the positive square root of (29 − 12√5), where a and b are integers, "
            "and n is a natural number, then the maximum possible value of (a + b + n) is"
        ),
    },
    65: {
        "stem": (
            "The sum of all real values of k for which "
            "(1/8)^k × (1/32768)^(1/3) = (1/8) × (1/32768)^(1/k), is"
        ),
        "options": {"1": "−4/3", "2": "−2/3", "3": "4/3", "4": "2/3"},
    },
    66: {
        "stem": (
            "Suppose x₁, x₂, x₃, …, x₁₀₀ are in arithmetic progression such that x₅ = −4 and "
            "2x₆ + 2x₉ = x₁₁ + x₁₃. Then x₁₀₀ equals"
        ),
    },
    68: {
        "stem": (
            "For any natural number n, let aₙ be the largest integer not exceeding √n. "
            "Then the value of a₁ + a₂ + … + a₅₀ is"
        ),
    },
}

CHART_IMAGES = {
    (30, 33): ["assets/CAT-2024-Slot-01-Q30-33-chart.png"],
    (34, 37): ["assets/CAT-2024-Slot-01-Q34-37-chart.png"],
    (38, 41): ["assets/CAT-2024-Slot-01-Q38-41-chart.png"],
}


def squash(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def clean_body(raw: str) -> str:
    text = NOISE_RE.sub("", raw)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


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
        peek = body[end : end + 300]
        peek_l = peek.lstrip()
        if CONSTRAINTISH.match(peek_l):
            continue
        # Summary/passage stems often start mid-sentence; accept long capitalised peeks.
        sequential_safe = len(peek_l) > 40 and bool(peek_l[:1].isupper())
        dilr_safe = next_q >= 25 and len(peek_l) > 20
        if next_q == 1 or looks_like_question(peek) or sequential_safe or dilr_safe:
            starts[next_q] = start
            next_q += 1
        if next_q > expected:
            break
    return starts


def parse_int_token(token: str) -> int:
    return int(re.sub(r"[^\d]", "", token))


def parse_answer_key(answers_raw: str) -> dict[int, str]:
    m = ANSWER_KEY_HDR.search(answers_raw)
    if not m:
        raise ValueError("Answer key header not found")
    end = EXPL_HDR.search(answers_raw, m.end())
    table = answers_raw[m.end() : end.start() if end else len(answers_raw)]
    answers: dict[int, str] = {}
    # Tokens like "1. D" "25. 8" "47. C"
    for qno_s, ans in re.findall(r"(\d{1,2})\.\s*([A-D]|\d+(?:\.\d+)?)", table):
        qno = int(qno_s)
        if 1 <= qno <= 68:
            answers[qno] = ans.strip()
    return answers


def parse_explanations(answers_raw: str, expected: int) -> dict[int, str]:
    m = EXPL_HDR.search(answers_raw)
    if not m:
        return {}
    body = answers_raw[m.end() :]
    # Numbered explanation starts: "1. Option" or "20. Sentence" or "25. As shown"
    matches = list(re.finditer(r"(?m)^(\d{1,2})\.\s+", body))
    expl: dict[int, str] = {}
    for i, mm in enumerate(matches):
        qno = int(mm.group(1))
        if not (1 <= qno <= expected):
            continue
        # Prefer first occurrence for each qno
        if qno in expl:
            continue
        end = len(body)
        for nxt in matches[i + 1 :]:
            nq = int(nxt.group(1))
            if 1 <= nq <= expected and nq != qno:
                end = nxt.start()
                break
        text = squash(body[mm.end() : end])
        text = re.sub(r"(?i)^No\.?\s*Explanation\s*", "", text).strip()
        if text:
            expl[qno] = text
    return expl


def extract_abcd_options(block_body: str) -> tuple[dict[str, str] | None, str]:
    """Extract A/B/C/D options — either stacked lines or inline 'A. .. B. ..'."""
    markers = [
        (m.start(), m.end(), m.group(1).upper())
        for m in re.finditer(r"(?m)(?:^|\s)([A-D])\.\s*", block_body)
    ]
    # Keep only markers that look like option labels (not mid-word).
    markers = [
        (s, e, lab)
        for s, e, lab in markers
        # Require start-of-line or whitespace before; already in regex.
        # Skip blank-slot markers like ___(1)___ nearby? not ABCD.
        if True
    ]
    if not markers:
        return None, block_body

    # First complete A–B–C–D run
    seq = None
    for i, (_, _, label) in enumerate(markers):
        if label != "A":
            continue
        run = [markers[i]]
        expect = ["B", "C", "D"]
        j = i + 1
        ei = 0
        while j < len(markers) and ei < 3:
            if markers[j][2] == expect[ei]:
                run.append(markers[j])
                ei += 1
            elif markers[j][2] == "A":
                break
            j += 1
            if j - i > 16:
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
        text = squash(block_body[a:b])
        text = re.sub(
            r"\s*(DIRECTIONS for|SECTION:|DATA INTERPRETATION|QUANTITATIVE).*$",
            "",
            text,
            flags=re.I,
        ).strip()
        # Drop a leading letter fragment if any
        text = re.sub(r"^[A-D]\.\s*", "", text).strip()
        opts[str(idx + 1)] = text
    if not all(opts.get(str(k)) for k in range(1, 5)):
        return None, block_body
    return opts, stem


def format_jumble_stem(stem: str) -> str:
    """Put each numbered jumble/odd sentence on its own line for the frontend."""
    if not re.search(r"(?i)jumbled|odd sentence", stem):
        # Still split if stem itself is "1. ... 2. ..."
        if not re.search(r"(?m)^\s*1\.\s+", stem) and not re.search(r"\s1\.\s+.+\s2\.\s+", stem):
            return squash(stem)
    # Keep instruction + numbered sentences
    text = stem
    text = re.sub(r"\s+(?=[1-5]\.\s+)", "\n", text)
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    return "\n".join(lines)


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
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        first_q_start = None
        for qno, start in ordered:
            if raw_lo <= qno <= raw_hi and start >= m.start():
                first_q_start = start
                break
        stimulus = body[m.end() : first_q_start if first_q_start else end]
        stimulus = squash(stimulus)
        stimulus = re.sub(
            r"(?i)^(The passage below is accompanied by.*?choose the\s+)?best answer "
            r"(to|for) each question\.?\s*",
            "",
            stimulus,
            count=1,
        )
        stimulus = re.sub(
            r"(?i)^Based on the passage,? choose the best answer.*?\.\s*",
            "",
            stimulus,
            count=1,
        )
        stimulus = re.sub(
            r"(?i)^Read the information given below and answer the question that follows\.?\s*",
            "",
            stimulus,
            count=1,
        )
        stimulus = squash(stimulus)
        chart_dependent = bool(CHART_HINT.search(stimulus)) or (raw_lo, raw_hi) in CHART_IMAGES
        images = CHART_IMAGES.get((raw_lo, raw_hi))
        sets.append(
            {
                "qFrom": raw_lo,
                "qTo": raw_hi,
                "labelFrom": raw_lo,
                "labelTo": raw_hi,
                "stimulus": stimulus,
                "chartDependent": chart_dependent,
                **({"images": images} if images else {}),
            }
        )
    return sets


def normalize_answer(ans: str, opts: dict[str, str] | None) -> tuple[str, str | None]:
    """Return (correctAnswer stored value, correctOption 1-4 or None)."""
    ans = ans.strip()
    if ans.upper() in LETTER_TO_KEY:
        key = LETTER_TO_KEY[ans.upper()]
        return key, key if opts and key in opts else key
    # TITA numeric / string
    return ans, None


def classify(stem: str, opts: dict | None, ans: str) -> tuple[str, dict | None]:
    if opts and all(opts.get(str(k)) for k in range(1, 5)):
        if ans.upper() in LETTER_TO_KEY or ans in {"1", "2", "3", "4"}:
            return "MCQ", opts
    # Numeric / non-letter answers are TITA even if stray options parsed
    if ans.upper() not in LETTER_TO_KEY and ans not in {"1", "2", "3", "4"}:
        return "TITA", None
    if TITA_HINT.search(stem) and not (opts and all(opts.get(str(k)) for k in range(1, 5))):
        return "TITA", None
    if opts and all(opts.get(str(k)) for k in range(1, 5)):
        return "MCQ", opts
    return "TITA", None


def parse_paper(questions_raw: Path, answers_raw: Path) -> dict:
    q_raw = questions_raw.read_text(encoding="utf-8")
    a_raw = answers_raw.read_text(encoding="utf-8")
    answers = parse_answer_key(a_raw)
    expected = max(answers) if answers else 68
    explanations = parse_explanations(a_raw, expected)

    cleaned = clean_body(q_raw)
    starts = find_question_starts(cleaned, expected)
    missing = [n for n in range(1, expected + 1) if n not in starts]
    if missing:
        raise RuntimeError(f"Failed to locate question starts: {missing}")

    sets = extract_sets(cleaned, starts)
    set_by_q: dict[int, dict] = {}
    chart_q: set[int] = set()
    for s in sets:
        for n in range(s["qFrom"], s["qTo"] + 1):
            set_by_q[n] = s
            if s.get("chartDependent"):
                chart_q.add(n)

    # Attach single-question VARC directions into stem when useful
    ordered = sorted(starts.items())
    questions = []
    for i, (qno, start) in enumerate(ordered):
        end = ordered[i + 1][1] if i + 1 < len(ordered) else len(cleaned)
        block = cleaned[start:end].strip()
        block_body = re.sub(rf"^\s*{qno}\.\s*", "", block, count=1).strip()

        # Pull preceding single-question DIRECTIONS into this block when present
        prev_chunk = cleaned[ordered[i - 1][1] if i else 0 : start]
        dir_single = list(DIR_SINGLE_RE.finditer(prev_chunk))
        if dir_single and qno not in set_by_q:
            # Include direction text that sits after previous question's content
            dstart = dir_single[-1].start()
            preface = prev_chunk[dstart:].strip()
            # Avoid pulling multi-question directions
            if not DIR_RE.search(preface):
                block_body = squash(preface) + "\n" + block_body

        dir_cut = re.search(r"(?i)DIRECTIONS for questions", block_body)
        if dir_cut:
            block_body = block_body[: dir_cut.start()].strip()

        opts, stem = extract_abcd_options(block_body)
        stem = format_jumble_stem(stem if opts else block_body)
        stem = re.sub(r"(?i)^DIRECTIONS for the question:\s*", "", stem).strip()

        ans = answers[qno]
        qtype, options = classify(stem, opts, ans)
        if qtype == "TITA":
            options = None
        correct_answer, correct_option = normalize_answer(ans, options)
        if qtype == "MCQ" and correct_option is None and correct_answer in {"1", "2", "3", "4"}:
            correct_option = correct_answer

        section, section_code = section_for(qno)
        shared = set_by_q.get(qno)
        chart_dependent = qno in chart_q
        images = (shared.get("images") if shared else None) if chart_dependent else None

        # Apply manual OCR fixes
        fix = MANUAL_FIXES.get(qno, {})
        if "stem" in fix:
            stem = fix["stem"]
        if "options" in fix:
            options = fix["options"]
            qtype = "MCQ"
            if correct_answer in LETTER_TO_KEY:
                correct_answer = LETTER_TO_KEY[correct_answer]
            correct_option = correct_answer if correct_answer in {"1", "2", "3", "4"} else correct_option

        needs_review = bool(
            (chart_dependent and not images)
            or not stem
            or (qtype == "MCQ" and (not options or any(not options.get(str(k)) for k in range(1, 5))))
            or (qtype == "MCQ" and correct_option not in {"1", "2", "3", "4"})
        )

        q: dict = {
            "qNo": qno,
            "section": section,
            "sectionCode": section_code,
            "type": qtype,
            "stem": stem,
            "options": options,
            "correctAnswer": correct_answer,
            "correctOption": correct_option,
            "stimulus": shared["stimulus"] if shared else None,
            "setRange": [shared["qFrom"], shared["qTo"]] if shared else None,
            "images": images,
            "chartDependent": chart_dependent,
            "needsManualReview": needs_review,
        }
        if explanations.get(qno):
            q["explanation"] = explanations[qno]
        questions.append(q)

    questions.sort(key=lambda q: q["qNo"])
    mcq = [q for q in questions if q["type"] == "MCQ"]
    tita = [q for q in questions if q["type"] == "TITA"]
    mapped = sum(
        1
        for q in mcq
        if q["options"] and q["correctOption"] in q["options"] and q["options"][q["correctOption"]]
    )
    chart_sets = [s for s in sets if s.get("chartDependent")]
    notes = [
        "Parsed from Actual CAT 2024 Slot-I question paper + answer-key/explanations PDF.",
        "MCQ options originally labelled A–D; stored as 1–4 for the app.",
        "Explanations retained from the answer-key PDF where available.",
        "Manual OCR fixes applied for broken QA math (Q53–56, Q59, Q62, Q65–66, Q68).",
    ]
    for s in chart_sets:
        imgs = s.get("images") or []
        span = f"Q{s['qFrom']}–{s['qTo']}"
        if imgs:
            notes.append(f"{span} chart image(s): {', '.join(imgs)}.")
        else:
            notes.append(f"{span} need chart/figure image(s) from the PDF.")

    return {
        "exam": "CAT",
        "year": 2024,
        "slot": "1",
        "title": "CAT 2024 Slot 1",
        "durationMinutes": 120,
        "sourceFile": "CAT-2024-Slot-01.pdf",
        "marking": {"correct": 3, "incorrect": 1, "unattempted": 0},
        "notes": notes,
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
            "chartDependentQuestionNos": sorted(chart_q),
            "explanationCount": sum(1 for q in questions if q.get("explanation")),
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
            f"TITA: {v['titaCount']} | Explanations: {v.get('explanationCount', 0)}"
        ),
        (
            f"Chart figures: {v['chartDependentQuestionNos']}"
        ),
        f"Needs manual review: {v['needsManualReview'] or 'none'}",
        "",
    ]
    for q in qs:
        if q["type"] == "MCQ" and q["options"] and q["correctOption"] in q["options"]:
            letter = KEY_TO_LETTER.get(q["correctOption"], q["correctOption"])
            detail = f"({letter}/{q['correctOption']}) {q['options'][q['correctOption']][:90]}"
            status = "MATCH"
        elif q["type"] == "TITA":
            detail = f"TITA={q['correctAnswer']}"
            status = "MATCH"
        else:
            detail = f"ans={q['correctAnswer']} options_missing"
            status = "REVIEW"
        if q["chartDependent"]:
            status += "+CHART"
        if q.get("explanation"):
            status += "+EXPL"
        if not q["stem"]:
            status = "REVIEW"
        lines.append(
            f"Q{q['qNo']:02d} [{q['sectionCode']}] {q['type']:<4} {status:<18} {detail}"
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Parse CAT 2024 Slot 1 PYQ")
    parser.add_argument(
        "--questions-raw",
        type=Path,
        default=Path("content/pyq/CAT-2024-Slot-01.raw.txt"),
    )
    parser.add_argument(
        "--answers-raw",
        type=Path,
        default=Path("content/pyq/CAT-2024-Slot-01-answers.raw.txt"),
    )
    parser.add_argument("--out-dir", type=Path, default=Path("content/pyq"))
    args = parser.parse_args()
    paper = parse_paper(args.questions_raw, args.answers_raw)
    stem = "CAT-2024-Slot-01"
    json_path = args.out_dir / f"{stem}.json"
    ver_path = args.out_dir / f"{stem}.verification.txt"
    json_path.write_text(json.dumps(paper, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_verification(paper, ver_path)
    v = paper["verification"]
    print(f"Wrote {json_path}")
    print(f"Wrote {ver_path}")
    print(
        f"Questions {v['parsedCount']}/{v['expectedCount']} | "
        f"answers {v['answerKeyCount']} | "
        f"MCQ mapped {v['mcqWithMappedAnswerText']}/{v['mcqCount']} | "
        f"TITA {v['titaCount']} | expl {v['explanationCount']} | "
        f"review {v['needsManualReview']}"
    )


if __name__ == "__main__":
    main()
