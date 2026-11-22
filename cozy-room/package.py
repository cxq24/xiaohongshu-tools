"""Build the upload ZIP from runtime files only. Run from any directory."""

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent
BUILD = ROOT / "build"
VERSION = "0.1.1"
# Accepted file types from the supplied deployment screenshot.
ALLOWED = {".jpg", ".css", ".gif", ".svg", ".png", ".js", ".jpeg",
           ".json", ".html", ".woff2", ".webp", ".woff"}


def main():
    files = sorted(path for path in BUILD.rglob("*") if path.is_file())
    if not (BUILD / "index.html").is_file():
        raise SystemExit("Missing build/index.html")
    for path in files:
        if path.is_symlink() or not path.resolve().is_relative_to(BUILD.resolve()):
            raise SystemExit(f"Unsupported linked runtime file: {path}")
        if path.suffix.lower() not in ALLOWED:
            raise SystemExit(f"Unsupported runtime file type: {path.relative_to(BUILD)}")

    output = ROOT / f"cozy-room-xiaohongshu-{VERSION}.zip"
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        for path in files:
            archive.write(path, path.relative_to(BUILD).as_posix())
    with ZipFile(output) as archive:
        assert archive.testzip() is None
        assert "index.html" in archive.namelist()
        for path in files:
            assert archive.read(path.relative_to(BUILD).as_posix()) == path.read_bytes()

    # Keep the previously shared download URL usable with fixed contents.
    (ROOT / "cozy-room-demo.zip").write_bytes(output.read_bytes())
    print(f"Built {output.name}: {output.stat().st_size} bytes")
    print("Entries:", ", ".join(path.relative_to(BUILD).as_posix() for path in files))
    print("Updated cozy-room-demo.zip with identical contents.")


if __name__ == "__main__":
    main()
