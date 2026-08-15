#!/usr/bin/env python3
"""Initialize, merge, validate, and export candidate profiles."""
from __future__ import annotations
import argparse, copy, json
from pathlib import Path
from typing import Any

RESTRICTED_KEYS = {"national_id", "passport_number", "bank_account", "health", "disability", "emergency_contact", "reference_contact", "password", "verification_code"}

def blank_profile() -> dict[str, Any]:
    return {
        "schema_version": "1.0",
        "personal": {"full_name": "", "preferred_name": "", "phone": "", "email": "", "gender": "", "birth_date": "", "current_city": "", "district": "", "hometown": "", "political_status": "", "github": "", "portfolio": ""},
        "intent": {"target_roles": [], "preferred_cities": [], "employment_type": "", "availability": "", "days_per_week": "", "internship_months": "", "salary_monthly": ""},
        "education": [], "experience": [], "projects": [],
        "skills": {"summary": "", "languages": ""},
        "answers": {"self_introduction": "", "motivation": ""},
        "sensitive": {"national_id": "", "health": "", "emergency_contact": "", "reference_contact": ""}
    }

def load_json(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(data, dict):
        raise ValueError("Profile must be a JSON object")
    return data

def deep_merge(base: Any, patch: Any) -> Any:
    if isinstance(base, dict) and isinstance(patch, dict):
        merged = copy.deepcopy(base)
        for key, value in patch.items():
            merged[key] = deep_merge(merged.get(key), value)
        return merged
    return copy.deepcopy(patch)

def validate(profile: dict[str, Any]) -> list[str]:
    errors = []
    if profile.get("schema_version") != "1.0":
        errors.append("schema_version must be 1.0")
    for section in ("personal", "intent", "skills", "answers"):
        if not isinstance(profile.get(section), dict):
            errors.append(section + " must be an object")
    for section in ("education", "experience", "projects"):
        if not isinstance(profile.get(section), list):
            errors.append(section + " must be an array")
    personal = profile.get("personal", {})
    email = personal.get("email", "") if isinstance(personal, dict) else ""
    if email and ("@" not in email or "." not in email.split("@")[-1]):
        errors.append("personal.email does not look valid")
    return errors

def redact_restricted(value: Any, parent_key: str = "") -> Any:
    if isinstance(value, dict):
        result = {}
        for key, item in value.items():
            if key == "sensitive" or key in RESTRICTED_KEYS or parent_key == "sensitive":
                continue
            result[key] = redact_restricted(item, key)
        return result
    if isinstance(value, list):
        return [redact_restricted(item, parent_key) for item in value]
    return value

def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")

def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    command = sub.add_parser("init"); command.add_argument("--output", required=True, type=Path)
    command = sub.add_parser("merge"); command.add_argument("--profile", required=True, type=Path); command.add_argument("--patch", required=True, type=Path); command.add_argument("--output", required=True, type=Path)
    command = sub.add_parser("validate"); command.add_argument("--profile", required=True, type=Path)
    command = sub.add_parser("export-extension"); command.add_argument("--profile", required=True, type=Path); command.add_argument("--output", required=True, type=Path); command.add_argument("--include-restricted", action="store_true")
    args = parser.parse_args()
    if args.command == "init":
        write_json(args.output, blank_profile()); print("Created blank profile: " + str(args.output)); return 0
    profile = load_json(args.profile)
    if args.command == "merge":
        merged = deep_merge(profile, load_json(args.patch))
        errors = validate(merged)
        if errors: print("\n".join(errors)); return 1
        write_json(args.output, merged); print("Merged profile: " + str(args.output)); return 0
    if args.command == "validate":
        errors = validate(profile)
        if errors: print("\n".join(errors)); return 1
        print("Profile is valid"); return 0
    write_json(args.output, profile if args.include_restricted else redact_restricted(profile))
    print("Exported extension profile: " + str(args.output)); return 0

if __name__ == "__main__":
    raise SystemExit(main())
