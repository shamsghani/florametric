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
    port = 9333
    chrome_cmd = [
        r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        '--headless=new',
        f'--remote-debugging-port={port}',
        f'--user-data-dir={tmp_dir}',
        '--no-first-run',
        '--no-default-browser-check',
        '--window-size=1280,800',
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

            # Wait 1.0s for meadow initialization
            await asyncio.sleep(1.0)

            # Evaluate garden state in page
            state = await send_cmd(ws, 10, 'Runtime.evaluate', {
                'expression': '''(() => {
                    const canvas = document.getElementById("garden-canvas");
                    const hud = document.querySelector(".garden-hud");
                    const clockBtn = document.getElementById("btn-clock-toggle");
                    return {
                        canvasWidth: canvas ? canvas.width : 0,
                        canvasHeight: canvas ? canvas.height : 0,
                        cssWidth: canvas ? canvas.clientWidth : 0,
                        cssHeight: canvas ? canvas.clientHeight : 0,
                        hasHud: !!hud,
                        clockLabel: clockBtn ? clockBtn.innerText : "none"
                    };
                })()''',
                'returnByValue': True
            })
            print("Canvas & UI State:", state.get('result', {}).get('value'))

            # Trigger sunlight shower
            blow_eval = await send_cmd(ws, 11, 'Runtime.evaluate', {
                'expression': '''(() => {
                    const btnBurst = document.getElementById("btn-sunlight-burst");
                    if (btnBurst) btnBurst.click();
                    return "Burst clicked";
                })()''',
                'returnByValue': True
            })
            print("Action triggered:", blow_eval.get('result', {}).get('value'))

            # Wait 0.5s for sunlight motes
            await asyncio.sleep(0.5)

            # Measure performance FPS over 60 frames in live browser!
            fps_result = await send_cmd(ws, 12, 'Runtime.evaluate', {
                'expression': '''new Promise(resolve => {
                    let frames = 0;
                    const start = performance.now();
                    function step() {
                        frames++;
                        if (frames < 60) {
                            requestAnimationFrame(step);
                        } else {
                            const dur = performance.now() - start;
                            const fps = (frames / (dur / 1000));
                            resolve({ frames, durMs: dur, fps });
                        }
                    }
                    requestAnimationFrame(step);
                })''',
                'awaitPromise': True,
                'returnByValue': True
            })
            perf = fps_result.get('result', {}).get('value', {})
            print(f"Browser Performance: {perf.get('fps', 0):.1f} FPS ({perf.get('durMs', 0):.1f}ms for 60 frames)")

            # Take high resolution screenshot via Page.captureScreenshot
            shot = await send_cmd(ws, 20, 'Page.captureScreenshot', {
                'format': 'png'
            })
            img_bytes = base64.b64decode(shot['data'])
            out_path = os.path.abspath('test/output/live_garden_60fps.png')
            with open(out_path, 'wb') as f:
                f.write(img_bytes)
            print(f"Captured live screenshot: {out_path} ({len(img_bytes)} bytes)")

            # 2. Trigger Dandelion blowing seeds demo
            await send_cmd(ws, 30, 'Runtime.evaluate', {
                'expression': '''(() => {
                    const dand = window.garden ? window.garden.plants.find(p => p.plant.type === 'dandelion') : null;
                    if (dand) {
                        const head = dand.plant.getHeadPosition(dand.x, window.garden.cssHeight - 50);
                        window.garden.blowDandelion(dand.plant, head.x, head.y);
                        return `Dandelion blown at (${head.x}, ${head.y})`;
                    }
                    return "No dandelion found on window.garden";
                })()''',
                'returnByValue': True
            })

            # Wait 0.8s for dandelion seeds to arch and swing through the air
            await asyncio.sleep(0.8)

            shot2 = await send_cmd(ws, 40, 'Page.captureScreenshot', {
                'format': 'png'
            })
            img_bytes2 = base64.b64decode(shot2['data'])
            out_path2 = os.path.abspath('test/output/live_dandelion_seeds.png')
            with open(out_path2, 'wb') as f:
                f.write(img_bytes2)
            print(f"Captured live dandelion seeds screenshot: {out_path2} ({len(img_bytes2)} bytes)")

    finally:
        proc.terminate()

if __name__ == '__main__':
    asyncio.run(main())
