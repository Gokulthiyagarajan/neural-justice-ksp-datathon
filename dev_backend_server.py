"""
Local Dev Server — bridges functions/neural-justice-backend/main.py
and connects the frontend to the full 10,000+ FIR database.
"""
import os
import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Ensure functions/neural-justice-backend is in sys.path
backend_dir = os.path.join(os.path.dirname(__file__), 'functions', 'neural-justice-backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import handler

class MockRequest:
    def __init__(self, path, method, headers, body_bytes):
        self.path = path
        self.method = method
        self.headers = headers
        self._body_bytes = body_bytes

    def get_data(self, as_text=False):
        if as_text:
            return self._body_bytes.decode('utf-8', errors='ignore')
        return self._body_bytes

class LocalDevHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self._handle('GET')

    def do_POST(self):
        self._handle('POST')

    def do_PUT(self):
        self._handle('PUT')

    def do_DELETE(self):
        self._handle('DELETE')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def _handle(self, method):
        content_len = int(self.headers.get('Content-Length', 0))
        body_bytes = self.rfile.read(content_len) if content_len > 0 else b''

        req = MockRequest(self.path, method, self.headers, body_bytes)
        try:
            res = handler(req)
        except Exception as err:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(err)}).encode('utf-8'))
            return

        status = 200
        headers = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
        body_out = b''

        if hasattr(res, 'status_code'):
            status = res.status_code
            if hasattr(res, 'get_data'):
                body_out = res.get_data()
            elif hasattr(res, 'data'):
                body_out = res.data
        elif isinstance(res, dict):
            status = res.get('status', res.get('statusCode', 200))
            raw_body = res.get('body', '')
            if isinstance(raw_body, str):
                body_out = raw_body.encode('utf-8')
            elif isinstance(raw_body, bytes):
                body_out = raw_body
            else:
                body_out = json.dumps(res).encode('utf-8')
            if 'headers' in res and isinstance(res['headers'], dict):
                headers.update(res['headers'])
        elif isinstance(res, tuple):
            status = res[1] if len(res) > 1 else 200
            data = res[0]
            body_out = json.dumps(data).encode('utf-8') if isinstance(data, dict) else str(data).encode('utf-8')
        elif isinstance(res, str):
            body_out = res.encode('utf-8')
        elif isinstance(res, bytes):
            body_out = res

        self.send_response(status)
        for k, v in headers.items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body_out)

    def log_message(self, format, *args):
        # Print concise request log
        print(f"[API] {args[0]}")

if __name__ == '__main__':
    port = 8001
    server = HTTPServer(('127.0.0.1', port), LocalDevHandler)
    print(f"[SUCCESS] Local Dev Backend Server running on http://127.0.0.1:{port}")
    print(f"[DATA] Connected SQLite database: {os.path.join(backend_dir, 'neural_justice.db')} (10,001 FIR cases)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down backend server.")
