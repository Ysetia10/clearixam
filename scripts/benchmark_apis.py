#!/usr/bin/env python3
"""Benchmark CleariXam production APIs and rank by latency."""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import re
import statistics
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DEFAULT_BASE = "https://clearixam-backend.onrender.com"
SERVICE_ID = "srv-d6htap9drdic73crkq8g"
EMAIL = "yashansetia7@gmail.com"


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def mint_jwt(email: str, secret: str, ttl_s: int = 86400) -> str:
    header = b64url(b'{"alg":"HS256"}')
    now = int(time.time())
    payload = b64url(
        json.dumps(
            {"sub": email, "iat": now, "exp": now + ttl_s},
            separators=(",", ":"),
        ).encode()
    )
    sig = hmac.new(
        secret.encode(), f"{header}.{payload}".encode(), hashlib.sha256
    ).digest()
    return f"{header}.{payload}.{b64url(sig)}"


def load_jwt_secret() -> str:
    raw = Path.home().joinpath(".render/cli.yaml").read_text()
    key = re.search(r"key:\s*(\S+)", raw).group(1)
    req = urllib.request.Request(
        f"https://api.render.com/v1/services/{SERVICE_ID}/env-vars?limit=100",
        headers={"Authorization": f"Bearer {key}", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        items = json.load(resp)
    env = {
        item.get("envVar", item)["key"]: item.get("envVar", item).get("value")
        for item in items
    }
    return env["JWT_SECRET"]


def request(
    base: str,
    method: str,
    path: str,
    token: str | None = None,
    body: dict | bytes | None = None,
    timeout: float = 120,
) -> tuple[int, float, bytes, str | None]:
    data = None
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        if isinstance(body, dict):
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        else:
            data = body
    req = urllib.request.Request(
        base.rstrip("/") + path, data=data, headers=headers, method=method
    )
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            payload = resp.read()
            return resp.status, (time.perf_counter() - t0) * 1000, payload, None
    except urllib.error.HTTPError as e:
        payload = e.read()
        return e.code, (time.perf_counter() - t0) * 1000, payload, payload[:300].decode(
            "utf-8", "replace"
        )
    except Exception as e:
        return 0, (time.perf_counter() - t0) * 1000, b"", str(e)


def timed_runs(
    base: str,
    name: str,
    method: str,
    path: str,
    token: str | None,
    body: dict | None,
    runs: int,
) -> dict:
    samples: list[float] = []
    status = 0
    err = None
    last_body = b""
    for i in range(runs):
        status, ms, last_body, err = request(base, method, path, token, body)
        samples.append(ms)
        if status == 0 or status >= 500:
            break
        if i == 0 and runs > 1:
            time.sleep(0.15)
    ok = status and status < 400
    return {
        "name": name,
        "method": method,
        "path": path,
        "status": status,
        "ok": bool(ok),
        "error": err,
        "runs": len(samples),
        "ms": {
            "min": round(min(samples), 1),
            "avg": round(statistics.mean(samples), 1),
            "p50": round(statistics.median(samples), 1),
            "max": round(max(samples), 1),
        },
        "bytes": len(last_body),
    }


def as_list(payload) -> list:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("content", "items", "data", "results", "topics", "papers", "attempts", "mocks"):
            val = payload.get(key)
            if isinstance(val, list):
                return val
    return []


def discover(base: str, token: str) -> dict:
    ids: dict = {
        "exam_id": None,
        "exam_name": None,
        "paper_id": None,
        "paper_exam": None,
        "attempt_id": None,
        "mock_id": None,
        "subject_id": None,
        "goal_id": None,
        "sectional_id": None,
        "topic_name": None,
        "ssc_exam_id": None,
        "cat_exam_id": None,
    }

    st, _, body, _ = request(base, "GET", "/api/exams/ordered", token)
    if st == 200:
        exams = as_list(json.loads(body))
        if exams:
            ids["exam_id"] = exams[0]["id"]
            ids["exam_name"] = exams[0]["name"]
            for e in exams:
                if e.get("name") == "SSC":
                    ids["ssc_exam_id"] = e["id"]
                if e.get("name") == "CAT":
                    ids["cat_exam_id"] = e["id"]

    st, _, body, _ = request(base, "GET", "/api/papers", token)
    if st == 200:
        papers = as_list(json.loads(body))
        if papers:
            ids["paper_id"] = papers[0]["id"]
            ids["paper_exam"] = papers[0].get("examName") or papers[0].get("exam")

    st, _, body, _ = request(base, "GET", "/api/attempts/recent?limit=5", token)
    if st == 200:
        attempts = as_list(json.loads(body))
        if attempts:
            ids["attempt_id"] = attempts[0].get("id") or attempts[0].get("attemptId")

    st, _, body, _ = request(base, "GET", "/api/mocks", token)
    if st == 200:
        mocks = as_list(json.loads(body))
        if mocks:
            ids["mock_id"] = mocks[0]["id"]

    st, _, body, _ = request(base, "GET", "/api/subjects", token)
    if st == 200:
        subjects = as_list(json.loads(body))
        if subjects:
            ids["subject_id"] = subjects[0]["id"]

    st, _, body, _ = request(base, "GET", "/api/goals", token)
    if st == 200:
        goals = as_list(json.loads(body))
        if goals:
            ids["goal_id"] = goals[0]["id"]

    st, _, body, _ = request(base, "GET", "/api/sectional-tests", token)
    if st == 200:
        sections = as_list(json.loads(body))
        if sections:
            ids["sectional_id"] = sections[0]["id"]

    exam_q = ids["exam_id"] or ""
    st, _, body, _ = request(
        base,
        "GET",
        f"/api/attempts/topic-performance?examId={exam_q}",
        token,
    )
    if st == 200:
        topics = json.loads(body)
        rows = as_list(topics)
        if rows:
            ids["topic_name"] = rows[0].get("topic") or rows[0].get("name")

    return ids


def build_suite(ids: dict) -> list[dict]:
    exam = ids.get("exam_id") or ""
    ssc = ids.get("ssc_exam_id") or exam
    cat = ids.get("cat_exam_id") or exam
    paper = ids.get("paper_id") or ""
    attempt = ids.get("attempt_id") or ""
    mock = ids.get("mock_id") or ""
    subject = ids.get("subject_id") or ""
    goal = ids.get("goal_id") or ""
    sectional = ids.get("sectional_id") or ""
    topic = urllib.parse.quote(ids.get("topic_name") or "Arithmetic")

    suite = [
        {"name": "health", "method": "GET", "path": "/health", "auth": False},
        {"name": "exams_ordered", "method": "GET", "path": "/api/exams/ordered", "auth": True},
        {"name": "papers_list", "method": "GET", "path": "/api/papers", "auth": True},
        {
            "name": "paper_detail",
            "method": "GET",
            "path": f"/api/papers/{paper}",
            "auth": True,
            "skip": not paper,
        },
        {
            "name": "attempts_recent",
            "method": "GET",
            "path": "/api/attempts/recent?limit=10",
            "auth": True,
        },
        {
            "name": "topic_performance_default",
            "method": "GET",
            "path": f"/api/attempts/topic-performance?examId={exam}",
            "auth": True,
            "skip": not exam,
        },
        {
            "name": "topic_performance_ssc",
            "method": "GET",
            "path": f"/api/attempts/topic-performance?examId={ssc}",
            "auth": True,
            "skip": not ssc,
        },
        {
            "name": "topic_performance_cat",
            "method": "GET",
            "path": f"/api/attempts/topic-performance?examId={cat}",
            "auth": True,
            "skip": not cat,
        },
        {
            "name": "topic_questions",
            "method": "GET",
            "path": f"/api/attempts/topic-performance/questions?examId={exam}&topic={topic}",
            "auth": True,
            "skip": not exam,
        },
        {
            "name": "attempt_detail",
            "method": "GET",
            "path": f"/api/attempts/{attempt}",
            "auth": True,
            "skip": not attempt,
        },
        {
            "name": "attempt_analysis",
            "method": "GET",
            "path": f"/api/attempts/{attempt}/analysis",
            "auth": True,
            "skip": not attempt,
        },
        {"name": "mocks_list", "method": "GET", "path": "/api/mocks", "auth": True},
        {
            "name": "mock_detail",
            "method": "GET",
            "path": f"/api/mocks/{mock}",
            "auth": True,
            "skip": not mock,
        },
        {"name": "subjects_list", "method": "GET", "path": "/api/subjects", "auth": True},
        {
            "name": "subjects_for_exam",
            "method": "GET",
            "path": f"/api/subjects?examId={exam}",
            "auth": True,
            "skip": not exam,
        },
        {"name": "goals_list", "method": "GET", "path": "/api/goals", "auth": True},
        {
            "name": "sectional_list",
            "method": "GET",
            "path": "/api/sectional-tests",
            "auth": True,
        },
        {
            "name": "sectional_analytics",
            "method": "GET",
            "path": "/api/sectional-tests/analytics",
            "auth": True,
        },
        {
            "name": "performance_list",
            "method": "GET",
            "path": "/api/performance",
            "auth": True,
        },
        {
            "name": "analytics_overview",
            "method": "GET",
            "path": f"/api/analytics/overview?examId={exam}",
            "auth": True,
            "skip": not exam,
        },
        {
            "name": "analytics_trend",
            "method": "GET",
            "path": f"/api/analytics/trend?examId={exam}",
            "auth": True,
            "skip": not exam,
        },
        {
            "name": "analytics_subjects",
            "method": "GET",
            "path": f"/api/analytics/subjects?examId={exam}",
            "auth": True,
            "skip": not exam,
        },
        {
            "name": "analytics_subjects_neglect",
            "method": "GET",
            "path": f"/api/analytics/subjects/neglect?examId={exam}",
            "auth": True,
            "skip": not exam,
        },
        {
            "name": "analytics_attempt_accuracy",
            "method": "GET",
            "path": f"/api/analytics/attempt-accuracy?examId={exam}",
            "auth": True,
            "skip": not exam,
        },
        {
            "name": "analytics_improvement",
            "method": "GET",
            "path": f"/api/analytics/improvement?examId={exam}",
            "auth": True,
            "skip": not exam,
        },
        {
            "name": "analytics_adaptive_strength",
            "method": "GET",
            "path": f"/api/analytics/adaptive-strength?examId={exam}",
            "auth": True,
            "skip": not exam,
        },
        {
            "name": "analytics_insights",
            "method": "GET",
            "path": f"/api/analytics/insights?examId={exam}",
            "auth": True,
            "skip": not exam,
        },
        {
            "name": "mcq_topic_performance",
            "method": "GET",
            "path": "/api/mcq/topic-performance",
            "auth": True,
        },
        {
            "name": "mcq_recent_corrections",
            "method": "GET",
            "path": "/api/mcq/recent-corrections",
            "auth": True,
        },
        {
            "name": "mcq_process_text",
            "method": "POST",
            "path": "/api/mcq/process-text",
            "auth": True,
            "body": {
                "text": "Q1. 2+2=?\n(a) 3\n(b) 4\n(c) 5\n(d) 6\nAns: b",
                "examId": exam or None,
            },
            "runs": 1,
        },
        {
            "name": "backup_export",
            "method": "GET",
            "path": "/api/backup/export",
            "auth": True,
            "runs": 1,
        },
        {
            "name": "report_performance_pdf",
            "method": "GET",
            "path": f"/api/reports/performance?examId={exam}",
            "auth": True,
            "skip": not exam,
            "runs": 1,
        },
        # unused ids kept for readability / future write benches
        {"name": "_subject", "skip": True, "method": "GET", "path": f"/noop/{subject}"},
        {"name": "_goal", "skip": True, "method": "GET", "path": f"/noop/{goal}"},
        {"name": "_sectional", "skip": True, "method": "GET", "path": f"/noop/{sectional}"},
    ]
    return [s for s in suite if not s.get("skip")]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default=DEFAULT_BASE)
    parser.add_argument("--runs", type=int, default=3)
    parser.add_argument(
        "--out",
        default=str(
            Path(__file__).resolve().parent / "api_benchmark_results.json"
        ),
    )
    args = parser.parse_args()

    print("Loading JWT secret from Render…")
    secret = load_jwt_secret()
    token = mint_jwt(EMAIL, secret)
    print(f"Warming {args.base}…")
    request(args.base, "GET", "/health")

    print("Discovering IDs…")
    ids = discover(args.base, token)
    print(json.dumps(ids, indent=2))

    suite = build_suite(ids)
    results = []
    for item in suite:
        runs = item.get("runs", args.runs)
        print(f"→ {item['name']} ({item['method']} {item['path']}) x{runs}")
        result = timed_runs(
            args.base,
            item["name"],
            item["method"],
            item["path"],
            token if item.get("auth", True) else None,
            item.get("body"),
            runs,
        )
        results.append(result)
        status = result["status"]
        ms = result["ms"]["avg"]
        flag = "OK" if result["ok"] else f"ERR:{result.get('error')}"
        print(f"  {status} avg={ms}ms {flag}")

    ranked = sorted(results, key=lambda r: r["ms"]["avg"], reverse=True)
    out = {
        "base": args.base,
        "email": EMAIL,
        "ids": ids,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "ranked_slowest_first": ranked,
        "results": results,
    }
    Path(args.out).write_text(json.dumps(out, indent=2))
    print("\n=== Slowest endpoints ===")
    for r in ranked[:15]:
        print(
            f"{r['ms']['avg']:8.1f}ms  {r['status']:3}  {r['name']:32}  {r['method']} {r['path']}"
        )
    print(f"\nWrote {args.out}")


if __name__ == "__main__":
    main()
