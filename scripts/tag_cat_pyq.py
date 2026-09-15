#!/usr/bin/env python3
"""Assign CAT section topics to parsed PYQ questions."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

VARC_RULES: list[tuple[str, re.Pattern[str]]] = [
    (
        "Odd Sentence Out",
        re.compile(r"odd sentence out|identify the odd sentence|key in the number of that sentence", re.I),
    ),
    (
        "Para Jumbles",
        re.compile(r"four sentences.*properly sequenced|when properly sequenced|jumbled up sentences.*coherent paragraph", re.I),
    ),
    (
        "Para Completion",
        re.compile(
            r"sentence is missing|missing in the paragraph|best fits among the options|"
            r"Sentence:.*Paragraph:|___\(\d\)___",
            re.I | re.S,
        ),
    ),
    (
        "Para Summary",
        re.compile(
            r"followed by four (?:alternate )?summaries|best captures the essence of the (?:passage|text)",
            re.I,
        ),
    ),
]

DILR_SET_RULES: list[tuple[str, re.Pattern[str]]] = [
    ("Charts & Graphs", re.compile(r"chart|plot|candlestick|radar|bar chart|graph below|figure below", re.I)),
    ("Tables", re.compile(r"table below|table summarizes|operator.*minutes", re.I)),
    ("Arrangements", re.compile(r"sitting in a circle|chairs|round table|seated", re.I)),
    ("Logic Games", re.compile(r"game|tournament|tapping their feet|puzzle solving competition|visual puzzle", re.I)),
    ("Puzzles", re.compile(r"promoted|demoted|rating|elite|novice|manager|innovatex|bloggers|surfers", re.I)),
    ("Scheduling", re.compile(r"training under|guru|consecutive years|timeline", re.I)),
    ("Sets & Logic", re.compile(r"spherical ball|hoop|ping|venn|subset|crafts|guild", re.I)),
    (
        "Data Interpretation",
        re.compile(
            r"train|station|ticket|trade|export|import|currency|exchange|"
            r"pollution|index|author|paper|travel cost|trade balance|normalized|"
            r"campaign|election|vote",
            re.I,
        ),
    ),
]

QA_RULES: list[tuple[str, re.Pattern[str], int]] = [
    ("Geometry", re.compile(r"\bcircle\b|\btriangle\b|\bangle\b|\bradius\b|\bchord\b|\bhexagon\b|\bsquare\b|\bparallel\b|\bcm\b|\bdegree\b", re.I), 2),
    ("Geometry", re.compile(r"\barea\b|\bperimeter\b|\bdiagonal\b|\binscribed\b|\bcircumscribed\b", re.I), 1),
    ("Functions & Graphs", re.compile(r"\bfunction\b|\bdomain\b|\brange\b|\bf\(x\)|\bg\(x\)", re.I), 3),
    ("Logarithms", re.compile(r"\blog\b|\blogarithm", re.I), 3),
    ("Quadratic Equations", re.compile(r"\bquadratic\b|\bx\^2\b|\bx²\b", re.I), 3),
    ("Inequalities", re.compile(r"\binequalit|\bgreater than\b|\bless than\b|\b≥\b|\b≤\b", re.I), 2),
    ("Algebra", re.compile(r"\bequation\b|\bpolynomial\b|\broot\b|\bvalue of x\b|\bvalues of x\b|\breal numbers\b", re.I), 2),
    ("Number Systems", re.compile(r"\bdivisor\b|\bremainder\b|\bprime\b|\bdigit\b|\bunits digit\b|\bnumber of digits\b", re.I), 2),
    ("Number Systems", re.compile(r"\bmultiple of\b|\bfactor\b|\bHCF\b|\bLCM\b|\bmod\b", re.I), 1),
    ("Modern Math", re.compile(r"\bprobability\b|\bpermutation\b|\bcombination\b|\bways\b|\bdistinct pairs\b", re.I), 2),
    ("Percentages", re.compile(r"\bpercent\b|\b%\b|\bpercentage\b", re.I), 3),
    ("Profit & Loss", re.compile(r"\bprofit\b|\bloss\b|\bmarkup\b|\bdiscount\b|\btrader\b|\bstock\b|\bcost price\b|\bselling price\b", re.I), 3),
    ("Interest", re.compile(r"\binterest\b|\bloan\b|\bcompound\b|\bsimple interest\b|\bCI\b|\bSI\b", re.I), 3),
    ("Ratio & Proportion", re.compile(r"\bratio\b|\bproportion\b|\bin the ratio\b", re.I), 3),
    ("Averages", re.compile(r"\baverage\b|\bmean\b|\bmedian\b", re.I), 3),
    ("Mixtures", re.compile(r"\bmixture\b|\balligation\b|\bsolution\b|\balcohol\b|\bmilk\b|\bwater\b", re.I), 3),
    ("Time-Speed-Distance", re.compile(r"\bspeed\b|\bdistance\b|\bkm/?h\b|\btrain\b|\bupstream\b|\bdownstream\b|\brelative speed\b", re.I), 3),
    ("Time & Work", re.compile(r"\bwork\b|\bpipe\b|\bcistern\b|\bdays to complete\b|\bman[- ]days\b", re.I), 3),
    ("Ages", re.compile(r"\bage[sd]?\b|\byears old\b", re.I), 2),
    ("Arithmetic", re.compile(r"\bclass\b|\bboys\b|\bgirls\b|\bstudents\b|\bsalary\b|\bprice\b|\bcost\b|\bmark\b|\btime\b", re.I), 1),
]


def tag_varc(q: dict) -> str:
    stem = q.get("stem") or ""
    for topic, pattern in VARC_RULES:
        if pattern.search(stem):
            return topic
    if q.get("stimulus"):
        return "Reading Comprehension"
    return "Reading Comprehension"


def tag_dilr_set(stimulus: str) -> str:
    text = stimulus or ""
    for topic, pattern in DILR_SET_RULES:
        if pattern.search(text):
            return topic
    return "Data Interpretation"


def tag_qa(q: dict) -> str:
    text = f"{q.get('stem', '')} {q.get('stimulus', '') or ''}"
    scores: dict[str, int] = {}
    for topic, pattern, weight in QA_RULES:
        if pattern.search(text):
            scores[topic] = scores.get(topic, 0) + weight
    if scores:
        return max(scores.items(), key=lambda item: item[1])[0]
    if q.get("type") == "TITA":
        return "Algebra"
    return "Arithmetic"


def apply_tags(paper: dict) -> dict:
    set_topics: dict[tuple[int, int], str] = {}
    for s in paper.get("sets", []):
        key = (s["qFrom"], s["qTo"])
        set_topics[key] = tag_dilr_set(s.get("stimulus", ""))
        s["topic"] = set_topics[key]

    for q in paper.get("questions", []):
        code = q.get("sectionCode", "")
        if code == "VARC":
            q["topic"] = tag_varc(q)
        elif code == "DILR":
            sr = q.get("setRange")
            if sr and len(sr) == 2:
                q["topic"] = set_topics.get((sr[0], sr[1]), "Data Interpretation")
            else:
                q["topic"] = tag_dilr_set(q.get("stimulus") or q.get("stem", ""))
        elif code == "QA":
            q["topic"] = tag_qa(q)
        else:
            q["topic"] = "Uncategorized"

    notes = [n for n in paper.get("notes", []) if "Topics not tagged" not in n]
    notes.insert(0, "Topics assigned via scripts/tag_cat_pyq.py (CAT taxonomy).")
    paper["notes"] = notes
    return paper


def summarize(paper: dict) -> str:
    from collections import Counter

    c = Counter(q["topic"] for q in paper["questions"])
    lines = [f"{paper['title']} — {len(paper['questions'])} questions"]
    for sec in ["VARC", "DILR", "QA"]:
        sec_qs = [q for q in paper["questions"] if q["sectionCode"] == sec]
        sec_c = Counter(q["topic"] for q in sec_qs)
        lines.append(f"  {sec}: " + ", ".join(f"{t}={n}" for t, n in sorted(sec_c.items())))
    unc = c.get("Uncategorized", 0)
    if unc:
        lines.append(f"  WARNING: {unc} uncategorized")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Tag CAT PYQ questions with topics")
    parser.add_argument("json", type=Path, nargs="+", help="Paper JSON file(s)")
    parser.add_argument("--out-dir", type=Path, default=None)
    args = parser.parse_args()

    for path in args.json:
        paper = json.loads(path.read_text(encoding="utf-8"))
        paper = apply_tags(paper)
        out = (args.out_dir or path.parent) / path.name
        out.write_text(json.dumps(paper, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(summarize(paper))
        print(f"  -> {out}\n")


if __name__ == "__main__":
    main()
