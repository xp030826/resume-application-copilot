#!/usr/bin/env python3
"""Return the next useful missing profile question."""
from __future__ import annotations
import argparse, json
from pathlib import Path
from typing import Any

QUESTIONS = [
    ("personal.full_name", "你的姓名是什么？", "standard"),
    ("personal.phone", "招聘方可以联系你的手机号是什么？", "standard"),
    ("personal.email", "用于网申和接收通知的邮箱是什么？", "standard"),
    ("personal.current_city", "你目前居住在哪个城市？", "standard"),
    ("intent.target_roles", "你希望投递哪些岗位？可以填写多个。", "standard"),
    ("intent.preferred_cities", "你的期望工作城市有哪些？", "standard"),
    ("intent.employment_type", "你寻找全职、实习、兼职还是其他用工形式？", "standard"),
    ("intent.availability", "你预计什么时候可以到岗？", "standard"),
    ("education", "请补充最高学历的学校、专业、学历和起止年月。", "standard"),
    ("experience", "请补充一段最相关的工作或实习经历。", "standard"),
    ("answers.self_introduction", "请用几句话介绍你的核心优势和目标方向。", "standard"),
    ("personal.birth_date", "目标网申是否要求出生日期？如要求，请填写。", "sensitive"),
    ("personal.political_status", "目标单位是否要求政治面貌？如要求，请填写。", "sensitive")
]

def get_path(profile: dict[str, Any], dotted: str) -> Any:
    value: Any = profile
    for part in dotted.split("."):
        if not isinstance(value, dict): return None
        value = value.get(part)
    return value

def next_question(profile: dict[str, Any], include_sensitive: bool = False):
    for path, question, tier in QUESTIONS:
        if tier == "sensitive" and not include_sensitive: continue
        if get_path(profile, path) in (None, "", [], {}):
            return {"path": path, "question": question, "tier": tier}
    return None

def main() -> int:
    parser = argparse.ArgumentParser(); parser.add_argument("--profile", required=True, type=Path); parser.add_argument("--include-sensitive", action="store_true")
    args = parser.parse_args()
    profile = json.loads(args.profile.read_text(encoding="utf-8-sig"))
    result = next_question(profile, args.include_sensitive)
    print(json.dumps(result if result else {"complete": True}, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
