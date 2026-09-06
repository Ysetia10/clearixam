#!/usr/bin/env python3
"""Assign SSC CGL topic labels to parsed PYQ questions."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

REASONING_RULES: list[tuple[str, re.Pattern[str]]] = [
    ("Blood Relation", re.compile(r"related to|brother|sister|father|mother|wife|son|daughter|pointing to", re.I)),
    ("Direction Sense", re.compile(r"facing (north|south|east|west)|turns? (left|right)|direction", re.I)),
    ("Seating / Arrangement", re.compile(r"seated|sitting|left of|right of|circle|row of", re.I)),
    ("Coding-Decoding", re.compile(r"coded|coding|code for|letter[- ]cluster|rearrangement|substitution rule", re.I)),
    ("Series", re.compile(r"replace the question mark|what comes next|series|letter-cluster", re.I)),
    ("Analogy", re.compile(r"::|\banalogy\b|related word|completes the analogy|:\s*\?", re.I)),
    ("Classification / Odd One Out", re.compile(r"odd one|does NOT follow|identical|addresses are identical", re.I)),
    ("Mathematical Operations", re.compile(r"@\s*=|evaluate:|symbols?.*then", re.I)),
    ("Syllogism / Venn", re.compile(r"syllogism|venn|all .* are|some .* are|conclusions?", re.I)),
    ("Non-Verbal / Figures", re.compile(r"figure|diagram|mirror|water image|paper folded|embedded", re.I)),
]

GA_RULES: list[tuple[str, re.Pattern[str], int]] = [
    (
        "Polity & Governance",
        re.compile(
            r"article|constitution|amendment|parliament|lok sabha|rajya sabha|schedule|"
            r"president|supreme court|fundamental|assembly|nomination|viceroy|"
            r"regulating act|pitt.?s india|bharatiya nyaya|bns\b|bnss\b|sanhita|sedition|"
            r"police custody|nagarik suraksha",
            re.I,
        ),
        3,
    ),
    (
        "History",
        re.compile(
            r"empire|dynasty|mughal|battle|independence|freedom|gandhi|nehru|ancient|"
            r"medieval|revolt|harappan|viceroys?|east india company|curzon",
            re.I,
        ),
        3,
    ),
    (
        "Geography",
        re.compile(
            r"river|mountain|ocean|climate|soil|plateau|tropic|latitude|longitude|"
            r"capital of|state of|landslide|coastal|sea[- ]level|weather parameter|"
            r"atmosphere|ozone|demographic|population densit|population explosion|gravitational",
            re.I,
        ),
        3,
    ),
    (
        "Economy & Industry",
        re.compile(
            r"GDP|RBI|inflation|budget|tax|GST|fiscal|bank|SEBI|NITI|industry|"
            r"light industr|heavy industr|iron and steel|mineral|aerospace|"
            r"generative design|originating train",
            re.I,
        ),
        3,
    ),
    (
        "Science & Tech",
        re.compile(
            r"physics|chemistry|biology|virus|atom|planet|ISRO|NASA|vitamin|disease|"
            r"cell|element|quantum|gland|nitrification|volcanic|atmospheric pressure|"
            r"acceleration due to gravity|instrument is used|master gland",
            re.I,
        ),
        3,
    ),
    (
        "Environment",
        re.compile(
            r"ramsar|wetland|conservation|climate|COP\d*|biodiversity|butterfly|"
            r"endemic species|environment",
            re.I,
        ),
        3,
    ),
    (
        "Schemes & Policies",
        re.compile(
            r"scheme|yojana|pm-|pranam|udan|khelo india|pmky|pm-kmy|kisan|"
            r"postmen to deliver|financial services|viability",
            re.I,
        ),
        3,
    ),
    (
        "Sports",
        re.compile(r"long jump|khelo|sports|athlet|runway|takeoff|kendriya vidyalaya", re.I),
        3,
    ),
    (
        "Art & Culture",
        re.compile(
            r"classical music|hindustani|teen taal|khali|matra|dance|festival|"
            r"temple|music tradition",
            re.I,
        ),
        3,
    ),
    (
        "Current Affairs",
        re.compile(
            r"202[0-9]|201[89]|recently|awarded|championship|olympic|world cup|"
            r"unveiled|meeting on|brics|foreign ministers",
            re.I,
        ),
        2,
    ),
    (
        "Static GK",
        re.compile(
            r"national|emblem|book|author|award|unesco|boundary between|"
            r"first viceroy|convention is related",
            re.I,
        ),
        2,
    ),
]

QA_RULES: list[tuple[str, re.Pattern[str], int]] = [
    ("Data Interpretation", re.compile(r"table|chart|graph|bar|pie|data", re.I), 3),
    ("Trigonometry", re.compile(r"sin|cos|tan|cot|sec|cosec|θ|trigonometry", re.I), 3),
    ("Geometry / Mensuration", re.compile(r"triangle|circle|radius|area|perimeter|volume|cube|cylinder|cone|sphere|angle|chord", re.I), 2),
    ("Algebra", re.compile(r"equation|polynomial|quadratic|simplify|x\b|algebra|identity", re.I), 2),
    ("Number System", re.compile(r"HCF|LCM|remainder|prime|digit|divisible|fraction", re.I), 2),
    ("Arithmetic", re.compile(r"percent|profit|loss|interest|ratio|mixture|average|speed|time|distance|work|pipe|age|partnership|invest", re.I), 2),
]

ENG_RULES: list[tuple[str, re.Pattern[str]]] = [
    ("Error Spotting", re.compile(r"contains an error|error in|find the part", re.I)),
    ("Active-Passive / Narration", re.compile(r"indirect speech|direct speech|passive voice|active voice|narration", re.I)),
    ("Synonyms / Antonyms", re.compile(r"antonym|synonym|opposite of|nearest in meaning|similar meaning", re.I)),
    ("Idioms / Phrases", re.compile(r"idiom|phrase|meaning of the", re.I)),
    ("One Word Substitution", re.compile(r"one[- ]word|substitute", re.I)),
    ("Sentence Improvement", re.compile(r"replace the highlighted|improve the|most suitable option to replace", re.I)),
    ("Fillers / Cloze", re.compile(r"blank|fill in|______|________|looked workable|most appropriate", re.I)),
    ("Reading Comprehension", re.compile(r"passage|according to the passage|comprehension", re.I)),
]


def tag_reasoning(stem: str) -> str:
    for topic, pat in REASONING_RULES:
        if pat.search(stem):
            return topic
    return "Miscellaneous Reasoning"


def tag_ga(stem: str) -> str:
    scores: dict[str, int] = {}
    for topic, pat, w in GA_RULES:
        if pat.search(stem):
            scores[topic] = scores.get(topic, 0) + w
    if not scores:
        return "Miscellaneous GA"
    return max(scores.items(), key=lambda x: x[1])[0]


def tag_qa(stem: str) -> str:
    scores: dict[str, int] = {}
    for topic, pat, w in QA_RULES:
        if pat.search(stem):
            scores[topic] = scores.get(topic, 0) + w
    if not scores:
        return "Miscellaneous Quant"
    return max(scores.items(), key=lambda x: x[1])[0]


def tag_eng(stem: str) -> str:
    for topic, pat in ENG_RULES:
        if pat.search(stem):
            return topic
    return "Miscellaneous English"


def tag_question(q: dict) -> str:
    stem = q.get("stem") or ""
    code = q.get("sectionCode") or ""
    if code == "REASONING":
        return tag_reasoning(stem)
    if code == "GA":
        return tag_ga(stem)
    if code == "QA":
        return tag_qa(stem)
    if code == "ENG":
        return tag_eng(stem)
    return "Uncategorized"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("json_path", type=Path)
    ap.add_argument("--inplace", action="store_true", default=True)
    args = ap.parse_args()

    paper = json.loads(args.json_path.read_text(encoding="utf-8"))
    counts: dict[str, int] = {}
    for q in paper.get("questions", []):
        topic = tag_question(q)
        q["topic"] = topic
        counts[topic] = counts.get(topic, 0) + 1

    notes = paper.get("notes") or []
    tag_note = "Topics assigned via scripts/tag_ssc_pyq.py (SSC taxonomy)."
    if tag_note not in notes:
        notes.append(tag_note)
    paper["notes"] = notes

    args.json_path.write_text(json.dumps(paper, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Tagged {args.json_path}")
    for topic, n in sorted(counts.items(), key=lambda x: (-x[1], x[0])):
        print(f"  {n:3d}  {topic}")


if __name__ == "__main__":
    main()
