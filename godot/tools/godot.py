#!/usr/bin/env python3
"""고도 실행기 — 엔진이 없으면 받아 놓고(~/.cache/godot-wuxia), 받은 인자를 그대로 넘겨 돌린다.
   python tools/godot.py --headless --script res://test.gd
   웹 내보내기 틀(1.2GB 묶음 중 9MB 한 개)은 범위 요청으로 그것만 꺼낸다."""
import os, sys, io, zipfile, subprocess, urllib.request, shutil
VER = '4.6.1'
BASE = 'https://github.com/godotengine/godot/releases/download/%s-stable/' % VER
CACHE = os.path.expanduser('~/.cache/godot-wuxia')
BIN = os.path.join(CACHE, 'Godot_v%s-stable_linux.x86_64' % VER)
TPL_DIR = os.path.expanduser('~/.local/share/godot/export_templates/%s.stable' % VER)
PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def _get(url, rng=None):
    req = urllib.request.Request(url, headers={'Range': 'bytes=%d-%d' % rng} if rng else {})
    with urllib.request.urlopen(req, timeout=300) as r: return r.read()

class _Remote:                       # zipfile 이 읽을 수 있는 원격 파일 (1MB 덩어리 캐시)
    B = 1 << 20
    def __init__(self, url):
        self.url, self.p, self.c = url, 0, {}
        req = urllib.request.Request(url, method='HEAD')
        with urllib.request.urlopen(req, timeout=60) as r: self.n = int(r.headers['Content-Length'])
    def seekable(self): return True
    def tell(self): return self.p
    def seek(self, o, w=0):
        self.p = o if w == 0 else self.p + o if w == 1 else self.n + o
        return self.p
    def read(self, k=-1):
        if k is None or k < 0: k = self.n - self.p
        if k == 0 or self.p >= self.n: return b''
        a, b = self.p, min(self.n, self.p + k) - 1
        out, blk = [], a // self.B
        while blk * self.B <= b:
            if blk not in self.c:
                self.c[blk] = _get(self.url, (blk * self.B, min(self.n, (blk + 1) * self.B) - 1))
                if len(self.c) > 48: self.c.pop(next(iter(self.c)))
            out.append(self.c[blk]); blk += 1
        d = b''.join(out)[a - (a // self.B) * self.B:][:b - a + 1]
        self.p += len(d)
        return d

def ensure(web=False):
    os.makedirs(CACHE, exist_ok=True)
    if not os.path.exists(BIN):
        print('고도 %s 받는 중…' % VER, file=sys.stderr)
        z = zipfile.ZipFile(io.BytesIO(_get(BASE + 'Godot_v%s-stable_linux.x86_64.zip' % VER)))
        z.extract(os.path.basename(BIN), CACHE); os.chmod(BIN, 0o755)
    if web:
        t = os.path.join(TPL_DIR, 'web_nothreads_release.zip')
        if not os.path.exists(t):
            os.makedirs(TPL_DIR, exist_ok=True)
            c = os.path.join(CACHE, 'templates', 'web_nothreads_release.zip')
            if os.path.exists(c): shutil.copy(c, t)
            else:
                print('웹 내보내기 틀 받는 중…', file=sys.stderr)
                z = zipfile.ZipFile(_Remote(BASE + 'Godot_v%s-stable_export_templates.tpz' % VER))
                open(t, 'wb').write(z.read('templates/web_nothreads_release.zip'))
    return BIN

def run(args, **kw):
    return subprocess.run([ensure(), '--path', PROJ] + list(args), **kw)

if __name__ == '__main__':
    sys.exit(run(sys.argv[1:]).returncode)
