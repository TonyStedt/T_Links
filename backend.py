import sqlite3
import json
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

DB_FILE = "synapsis.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS links (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            description TEXT,
            category TEXT,
            icon TEXT
        )
    ''')
    conn.commit()
    conn.close()

def db_get_all():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM links')
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def db_add(link):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT INTO links (id, name, url, description, category, icon)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (link['id'], link['name'], link['url'], link.get('description', ''), link.get('category', ''), link.get('icon', '')))
    conn.commit()
    conn.close()

def db_update(link_id, link):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        UPDATE links 
        SET name=?, url=?, description=?, category=?, icon=?
        WHERE id=?
    ''', (link['name'], link['url'], link.get('description', ''), link.get('category', ''), link.get('icon', ''), link_id))
    conn.commit()
    conn.close()

def db_delete(link_id):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('DELETE FROM links WHERE id=?', (link_id,))
    conn.commit()
    conn.close()

class APIHandler(SimpleHTTPRequestHandler):
    # Important: Do not allow caching to prevent stale JSON data from serving
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/links':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            links = db_get_all()
            self.wfile.write(json.dumps(links).encode('utf-8'))
        else:
            super().do_GET()
            
    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/links':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            link = json.loads(post_data.decode('utf-8'))
            db_add(link)
            self.send_response(201)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode('utf-8'))
        elif parsed.path == '/api/links/bulk':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))
            replace = payload.get('replace', False)
            links = payload.get('links', [])
            
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            if replace:
                c.execute('DELETE FROM links')
            
            for link in links:
                if not replace:
                    c.execute('SELECT 1 FROM links WHERE id=?', (link['id'],))
                    if c.fetchone():
                        continue
                c.execute('''
                    INSERT INTO links (id, name, url, description, category, icon)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (link['id'], link['name'], link['url'], link.get('description', ''), link.get('category', ''), link.get('icon', '')))
            conn.commit()
            conn.close()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode('utf-8'))
        else:
            self.send_error(404)

    def do_PUT(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith('/api/links/'):
            link_id = parsed.path.split('/')[-1]
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            link = json.loads(post_data.decode('utf-8'))
            db_update(link_id, link)
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode('utf-8'))
        else:
            self.send_error(404)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith('/api/links/'):
            link_id = parsed.path.split('/')[-1]
            db_delete(link_id)
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode('utf-8'))
        else:
            self.send_error(404)

if __name__ == '__main__':
    init_db()
    server_address = ('', 8080)
    httpd = HTTPServer(server_address, APIHandler)
    print("Serving on port 8080... Open http://localhost:8080 in your browser.")
    httpd.serve_forever()
