import argparse
import os
import re
import sys
from pathlib import Path

try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

PATIENT_PATTERNS = [
    r"Nome do Beneficiário\s*[:\-]?\s*(.+?)\s*(?:\r?\n|$)",
    r"Nome do Titular\s*[:\-]?\s*(.+?)\s*(?:\r?\n|$)",
    r"Nome do paciente\s*[:\-]?\s*(.+?)\s*(?:\r?\n|$)",
    r"Paciente\s*[:\-]?\s*(.+?)\s*(?:\r?\n|$)",
    r"Beneficiário\s*[:\-]?\s*(.+?)\s*(?:\r?\n|$)",
]
GUIDE_PATTERNS = [
    r"Guia\s*(?:N(?:º|o|º?)|\#)?\s*[:\-]?\s*(\d+)",
    r"N[oº] da guia\s*[:\-]?\s*(\d+)",
    r"Número da guia\s*[:\-]?\s*(\d+)",
    r"Guia TISS\s*[:\-]?\s*(\d+)",
]

INVALID_FILENAME_CHARS = r'[<>:"/\\|?*]'


def extract_text_from_pdf(pdf_path: Path) -> str:
    if PdfReader is None:
        raise RuntimeError("PyPDF2 is not installed. Install it with 'pip install -r requirements.txt'.")
    reader = PdfReader(str(pdf_path))
    text_parts = []
    for page in reader.pages:
        try:
            page_text = page.extract_text() or ""
        except Exception:
            page_text = ""
        text_parts.append(page_text)
    return "\n".join(text_parts)


def normalize_name(value: str) -> str:
    value = value.strip()
    value = re.sub(r"\s+", "_", value)
    value = re.sub(INVALID_FILENAME_CHARS, "", value)
    return value


def find_patient_names(text: str) -> list[str]:
    results = []
    for pattern in PATIENT_PATTERNS:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            patient = match.group(1).strip()
            if patient and patient not in results:
                results.append(patient)
    return results


def find_guide_numbers(text: str) -> list[str]:
    results = []
    for pattern in GUIDE_PATTERNS:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            guide = match.group(1).strip()
            if guide and guide not in results:
                results.append(guide)
    return results


def build_renamed_filename(patient: str, guide: str, original_path: Path) -> str:
    safe_patient = normalize_name(patient)
    safe_guide = normalize_name(guide)
    if not safe_patient:
        safe_patient = original_path.stem
    if not safe_guide:
        safe_guide = "guia"
    return f"{safe_patient}_{safe_guide}{original_path.suffix}"


def select_pair(patients: list[str], guides: list[str], requested_guide: str | None = None) -> tuple[str, str] | None:
    if requested_guide:
        for guide in guides:
            if guide == requested_guide:
                idx = guides.index(guide)
                if idx < len(patients):
                    return patients[idx], guide
                return patients[0], guide
    if patients and guides:
        pair_count = min(len(patients), len(guides))
        return patients[0], guides[0]
    if patients:
        return patients[0], guides[0] if guides else ("", "")
    if guides:
        return ("", guides[0])
    return None


def rename_pdf(input_path: Path, output_dir: Path | None = None, guide_number: str | None = None) -> Path:
    text = extract_text_from_pdf(input_path)
    patients = find_patient_names(text)
    guides = find_guide_numbers(text)
    pair = select_pair(patients, guides, request_guide=guide_number)

    if pair is None:
        raise ValueError("Não foi possível extrair o nome do paciente ou número da guia do PDF.")

    patient, guide = pair
    if not patient:
        patient = input_path.stem
    if not guide:
        guide = "guia"

    new_filename = build_renamed_filename(patient, guide, input_path)
    output_dir = output_dir or input_path.parent
    output_path = output_dir / new_filename

    if output_path.exists() and output_path.samefile(input_path):
        return output_path

    input_path.replace(output_path)
    return output_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Renomeia PDFs de guias com base no nome da paciente e número da guia.")
    parser.add_argument("pdfs", type=Path, nargs="+", help="Caminho(s) para o arquivo(s) PDF.")
    parser.add_argument("--output-dir", type=Path, help="Diretório de saída para os PDFs renomeados.")
    parser.add_argument("--guide", dest="guide_number", help="Número da guia para selecionar o paciente correto quando existem vários.")
    args = parser.parse_args()

    had_error = False
    for pdf_path in args.pdfs:
        if not pdf_path.exists():
            print(f"Arquivo não encontrado: {pdf_path}")
            had_error = True
            continue

        try:
            output_path = rename_pdf(pdf_path, args.output_dir, args.guide_number)
            print(f"PDF renomeado com sucesso: {output_path}")
        except Exception as exc:
            print(f"Erro ao processar {pdf_path}: {exc}")
            had_error = True

    return 1 if had_error else 0


if __name__ == "__main__":
    raise SystemExit(main())
