#!/usr/bin/env python3
"""Extract local resume text from PDF, DOCX, TXT, or Markdown."""
from __future__ import annotations
import argparse, json, re, sys, zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree

def extract_pdf(path: Path) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise RuntimeError("PDF extraction requires pypdf") from exc
    return "\n".join((page.extract_text() or "") for page in PdfReader(str(path)).pages)

def extract_docx(path: Path) -> str:
    with zipfile.ZipFile(path) as archive:
        root = ElementTree.fromstring(archive.read("word/document.xml"))
    parts = []
    for node in root.iter():
        if node.tag.endswith("}t") and node.text:
            parts.append(node.text)
        elif node.tag.endswith("}p"):
            parts.append("\n")
    return "".join(parts)

def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return extract_pdf(path)
    if suffix == ".docx":
        return extract_docx(path)
    if suffix in {".txt", ".md"}:
        return path.read_text(encoding="utf-8-sig")
    raise ValueError("Unsupported file type: " + suffix)

def normalize(text: str) -> str:
    text = re.sub(r"[ \t]+", " ", text.replace("\u00a0", " "))
    return re.sub(r"\n{3,}", "\n\n", text).strip()

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if not args.input.is_file():
        parser.error("Input file does not exist: " + str(args.input))
    try:
        text = normalize(extract_text(args.input))
    except Exception as exc:
        print("Extraction failed: " + str(exc), file=sys.stderr)
        return 1
    payload = {"source": args.input.name, "extracted_at": datetime.now(timezone.utc).isoformat(), "characters": len(text), "text": text}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Extracted " + str(len(text)) + " characters to " + str(args.output))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
