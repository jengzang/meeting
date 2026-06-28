#!/usr/bin/env python3
"""
Simple static file server with gzip support.

- Pre-compresses *.js / *.css / *.html on startup to .gz files
- Serves .gz when client sends Accept-Encoding: gzip
- Falls back to uncompressed for other file types

Usage:
  python3 server.py          # default port 3000
  python3 server.py 8080     # custom port
"""

import gzip
import mimetypes
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

GZIP_TYPES = {".js", ".css", ".html", ".json", ".svg", ".csv"}


class GzipHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        path = self.translate_path(self.path)

        # Try to serve a pre-compressed .gz if it exists and client supports it
        if os.path.isfile(path):
            ext = os.path.splitext(path)[1].lower()
            if ext in GZIP_TYPES:
                gz_path = path + ".gz"
                accept = self.headers.get("Accept-Encoding", "").lower()
                if "gzip" in accept and os.path.isfile(gz_path):
                    self._serve_gz(gz_path, path)
                    return

        super().do_GET()

    def _serve_gz(self, gz_path, orig_path):
        content_type, _ = mimetypes.guess_type(orig_path)
        self.send_response(200)
        self.send_header("Content-Type", content_type or "application/octet-stream")
        self.send_header("Content-Encoding", "gzip")
        self.send_header("Vary", "Accept-Encoding")
        self.end_headers()
        with open(gz_path, "rb") as f:
            self.wfile.write(f.read())


def precompress(root_dir):
    """gzip all .js / .css / .html files in root_dir (recursively)."""
    count = 0
    for dirpath, _, filenames in os.walk(root_dir):
        for fn in filenames:
            ext = os.path.splitext(fn)[1].lower()
            if ext not in GZIP_TYPES:
                continue
            src = os.path.join(dirpath, fn)
            dst = src + ".gz"
            # only recompress if source is newer
            if os.path.isfile(dst) and os.path.getmtime(src) <= os.path.getmtime(dst):
                continue
            with open(src, "rb") as f_in:
                with gzip.open(dst, "wb", compresslevel=9) as f_out:
                    f_out.write(f_in.read())
            count += 1
    print(f"Pre-compressed {count} files (.gz)")
    return count


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    precompress(".")

    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
    server = HTTPServer(("", port), GzipHandler)
    print(f"Serving at http://localhost:{port} (gzip enabled)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Stopped.")
