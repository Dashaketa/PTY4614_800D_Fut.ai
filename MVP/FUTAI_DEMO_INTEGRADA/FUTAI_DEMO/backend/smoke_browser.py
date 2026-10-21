"""Browser regression check with local Chrome/Edge, temporary data and a test worker."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
from urllib.request import urlopen

from websockets.sync.client import connect
from futai_api.config import ROOT


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def wait_for(callback, timeout=40):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            result = callback()
            if result:
                return result
        except (OSError, ValueError, KeyError, IndexError):
            pass
        time.sleep(0.2)
    raise TimeoutError("Se agotó el tiempo de la comprobación del navegador")


class CDP:
    def __init__(self, websocket):
        self.websocket = websocket
        self.counter = 0
        self.exceptions = []

    def call(self, method, **params):
        self.counter += 1
        identifier = self.counter
        self.websocket.send(json.dumps({"id": identifier, "method": method, "params": params}))
        while True:
            response = json.loads(self.websocket.recv(timeout=20))
            if response.get("method") == "Runtime.exceptionThrown":
                self.exceptions.append(response["params"])
            if response.get("id") == identifier:
                if "error" in response:
                    raise RuntimeError(response["error"])
                return response.get("result", {})

    def evaluate(self, expression):
        result = self.call("Runtime.evaluate", expression=expression, returnByValue=True, awaitPromise=True)
        if "exceptionDetails" in result:
            raise RuntimeError(result["exceptionDetails"])
        return result.get("result", {}).get("value")

    def file(self, selector, path):
        root = self.call("DOM.getDocument")["root"]["nodeId"]
        node = self.call("DOM.querySelector", nodeId=root, selector=selector)["nodeId"]
        self.call("DOM.setFileInputFiles", nodeId=node, files=[str(path)])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--browser", type=Path, required=True)
    parser.add_argument("--node", default="node")
    args = parser.parse_args()
    api_port, web_port, debug_port = free_port(), free_port(), free_port()
    processes = []
    with tempfile.TemporaryDirectory(prefix="futai-browser-") as temporary:
        folder = Path(temporary)
        env = dict(os.environ, FUTAI_DATA_DIR=str(folder / "data"), FUTAI_PROCESSING_ENABLED="true",
                   FUTAI_CORS_ORIGINS=f"http://127.0.0.1:{web_port}", VITE_API_URL=f"http://127.0.0.1:{api_port}",
                   PYTHONUTF8="1", PYTHONPATH=str(ROOT))
        model = folder / "fake-model.pt"
        model.write_bytes(b"test worker does not load weights")
        imported = folder / "import.json"
        imported.write_text(json.dumps({"video": "browser-import.mp4", "procesamiento": {"frames": 10, "fps": 25},
                                       "metricas_por_track": [{"track_id": 4242, "distancia_observada_m": None,
                                                               "velocidad_maxima_estimada_kmh": None, "duracion_observada_s": 0.4}]}), encoding="utf-8")
        clip = folder / "browser-clip.mp4"
        clip.write_bytes(b"\x00\x00\x00\x18ftypisomsuccess")
        server = ("from dataclasses import replace; from pathlib import Path; from app import create_app; "
                  "from futai_api.config import Settings; import uvicorn; "
                  f"settings=replace(Settings.from_env(),worker_module='tests.fake_worker',worker_python=Path({sys.executable!r}),model_path=Path({str(model)!r})); "
                  f"uvicorn.run(create_app(settings),host='127.0.0.1',port={api_port},log_level='warning')")
        with (folder / "servers.log").open("wb") as log:
            try:
                for command, directory in (([sys.executable, "-c", server], ROOT),
                                           ([args.node, str(ROOT.parent / "frontend/node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", str(web_port), "--strictPort"], ROOT.parent / "frontend")):
                    processes.append(subprocess.Popen(command, cwd=directory, env=env, stdout=log, stderr=subprocess.STDOUT,
                                                      creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0)))
                wait_for(lambda: json.load(urlopen(f"http://127.0.0.1:{api_port}/api/health", timeout=1)))
                wait_for(lambda: urlopen(f"http://127.0.0.1:{web_port}/demo", timeout=1).status == 200)
                processes.append(subprocess.Popen([str(args.browser), "--headless=new", "--disable-gpu", "--no-first-run",
                                                   "--no-default-browser-check", "--disable-background-networking",
                                                   f"--remote-debugging-port={debug_port}", f"--user-data-dir={folder / 'browser'}", "about:blank"],
                                                  stdout=log, stderr=subprocess.STDOUT, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0)))
                target = wait_for(lambda: next((target for target in json.load(urlopen(f"http://127.0.0.1:{debug_port}/json", timeout=1)) if target["type"] == "page"), None))
                with connect(target["webSocketDebuggerUrl"], open_timeout=10) as websocket:
                    page = CDP(websocket)
                    page.call("Runtime.enable")
                    page.call("Page.enable")
                    page.call("Page.navigate", url=f"http://127.0.0.1:{web_port}/demo")
                    wait_for(lambda: page.evaluate("document.body.innerText.includes('API conectada') && document.body.innerText.includes('MUESTRA PARCIAL')"))
                    page.file('input[accept=".json,application/json"]', imported)
                    wait_for(lambda: page.evaluate("document.body.innerText.includes('#4242') && document.body.innerText.includes('browser-import.mp4')"))
                    assert page.evaluate("[...document.querySelectorAll('tbody tr')][0].innerText.includes('—')"), "null se convirtió en cero"
                    assert page.evaluate("document.querySelector('select[id$=\"-annotation-style\"]').value === 'ellipses'")
                    page.evaluate("(() => { const select = document.querySelector('select[id$=\"-annotation-style\"]'); select.value = 'boxes'; select.dispatchEvent(new Event('change', {bubbles:true})); })()")
                    page.file('input[accept*="video/mp4"]', clip)
                    page.evaluate("document.querySelector('button[type=submit]').click()")
                    wait_for(lambda: page.evaluate("document.body.innerText.includes('Completado')"))
                    wait_for(lambda: page.evaluate("document.querySelectorAll('a[href*=\"/artifacts/\"]').length >= 3"))
                    jobs = json.load(urlopen(f"http://127.0.0.1:{api_port}/api/jobs", timeout=2))
                    request = json.loads((folder / "data" / "jobs" / jobs[0]["id"] / "request.json").read_text(encoding="utf-8"))
                    assert request["annotation_style"] == "boxes", "El selector no llegó al worker"
                    page.call("Emulation.setDeviceMetricsOverride", width=390, height=844, deviceScaleFactor=1, mobile=True)
                    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), "Desborde horizontal móvil"
                    assert not page.exceptions, page.exceptions
                    page.call("Page.navigate", url=f"http://127.0.0.1:{web_port}/")
                    wait_for(lambda: page.evaluate("!!document.querySelector('main') && document.querySelectorAll('svg').length > 0"))
                    assert not page.exceptions, page.exceptions
                    print("OK navegador: muestra, importación, selector elipses/cajas propagado, trabajo, 3 descargas, vista móvil y landing; sin excepciones JS.")
                    websocket.send(json.dumps({"id": 999999, "method": "Browser.close"}))
                    time.sleep(0.5)
            except Exception:
                log.flush()
                print((folder / "servers.log").read_text(encoding="utf-8", errors="replace")[-6000:], file=sys.stderr)
                raise
            finally:
                for process in reversed(processes):
                    if process.poll() is None:
                        if os.name == "nt":
                            subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5,
                                           creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
                        else:
                            process.terminate()
                for process in processes:
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait(timeout=3)


if __name__ == "__main__":
    main()
