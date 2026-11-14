import asyncio
import websockets
import json
import urllib.request
import subprocess
import time
import base64
import os
import tempfile

async def send_cmd(ws, req_id, method, params=None):
    payload = {'id': req_id, 'method': method}
    if params:
        payload['params'] = params
    await ws.send(json.dumps(payload))
    while True:
        msg = json.loads(await ws.recv())
        if msg.get('id') == req_id:
            return msg.get('result', {})

async def main():
    tmp_dir = tempfile.mkdtemp()
    port = 9334
    chrome_cmd = [
        r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        '--headless=new',
        f'--remote-debugging-port={port}',
        f'--user-data-dir={tmp_dir}',
        '--no-first-run',
        '--no-default-browser-check',
        '--window-size=1280,900',
        'http://localhost:8080/index.html'
    ]
    proc = subprocess.Popen(chrome_cmd)
    try:
        await asyncio.sleep(2.0)
        with urllib.request.urlopen(f'http://localhost:{port}/json') as r:
            targets = json.loads(r.read().decode('utf-8'))
        page_target = next(t for t in targets if 'localhost:8080' in t.get('url', ''))
        ws_url = page_target['webSocketDebuggerUrl']

        async with websockets.connect(ws_url) as ws:
            await send_cmd(ws, 1, 'Runtime.enable')
            await send_cmd(ws, 2, 'Page.enable')

            # Switch to Studio tab
            await send_cmd(ws, 10, 'Runtime.evaluate', {
                'expression': '''(() => {
                    const studioBtn = document.querySelector('[data-tab="studio"]');
                    if (studioBtn) studioBtn.click();
                    return "Switched to Studio";
                })()''',
                'returnByValue': True
            })

            # Wait 1.0s for studio render
            await asyncio.sleep(1.0)

            # Capture Studio screenshot
            shot = await send_cmd(ws, 20, 'Page.captureScreenshot', {'format': 'png'})
            img_data = base64.b64decode(shot.get('data', ''))
            out_path = os.path.abspath('test/output/studio_sunflower_bounded.png')
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, 'wb') as f:
                f.write(img_data)
            print(f"Captured studio screenshot: {out_path} ({len(img_data)} bytes)")

    finally:
        proc.terminate()

if __name__ == '__main__':
    asyncio.run(main())
