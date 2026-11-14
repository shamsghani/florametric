import asyncio
import websockets
import json
import urllib.request
import tempfile
import subprocess

async def main():
    tmp_dir = tempfile.mkdtemp()
    port = 9338
    proc = subprocess.Popen([
        r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        '--headless=new',
        f'--remote-debugging-port={port}',
        f'--user-data-dir={tmp_dir}',
        '--no-first-run',
        '--no-default-browser-check',
        '--window-size=1280,900',
        'http://127.0.0.1:8080/index.html'
    ])
    try:
        await asyncio.sleep(2.5)
        with urllib.request.urlopen(f'http://127.0.0.1:{port}/json') as r:
            targets = json.loads(r.read().decode('utf-8'))
        page_target = next(t for t in targets if '127.0.0.1:8080' in t.get('url', ''))
        ws_url = page_target['webSocketDebuggerUrl']

        async with websockets.connect(ws_url) as ws:
            async def cmd(req_id, method, params=None):
                payload = {'id': req_id, 'method': method}
                if params: payload['params'] = params
                await ws.send(json.dumps(payload))
                while True:
                    msg = json.loads(await ws.recv())
                    if msg.get('id') == req_id: return msg.get('result', {})

            await cmd(1, 'Runtime.enable')

            # 1. Check window.__ERRORS__
            r_err1 = await cmd(2, 'Runtime.evaluate', {'expression': 'window.__ERRORS__', 'returnByValue': True})
            print('Initial page errors:', r_err1.get('result', {}).get('value'))

            # 2. Switch to Embed tab
            await cmd(3, 'Runtime.evaluate', {
                'expression': 'document.querySelector(\'[data-tab="embed"]\').click()',
                'returnByValue': True
            })
            await asyncio.sleep(0.8)

            # 3. Check code output in Embed tab
            r_code = await cmd(4, 'Runtime.evaluate', {
                'expression': 'document.getElementById("gen-code-output").textContent',
                'returnByValue': True
            })
            code_text = r_code.get('result', {}).get('value')
            print('\nGenerated code snippet in Architect:\n', code_text[:350] if code_text else 'None')

            # 4. Check time scrub button (+1d)
            r_scrub = await cmd(5, 'Runtime.evaluate', {
                'expression': '''(() => {
                    const btn = document.querySelector('.scrub-pill[data-shift="86400000"]');
                    if (btn) btn.click();
                    return {
                        stage: document.getElementById("gen-stat-stage").textContent,
                        elapsed: document.getElementById("gen-stat-elapsed").textContent
                    };
                })()''',
                'returnByValue': True
            })
            print('\nSimulate Revisit (+1 Day):\n', r_scrub.get('result', {}).get('value'))

            # 5. Check window.__ERRORS__ at end
            r_err2 = await cmd(6, 'Runtime.evaluate', {'expression': 'window.__ERRORS__', 'returnByValue': True})
            print('\nFinal page errors:', r_err2.get('result', {}).get('value'))
    finally:
        proc.kill()

asyncio.run(main())
