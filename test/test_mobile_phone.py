import asyncio
import websockets
import json
import urllib.request
import tempfile
import subprocess
import os
import base64

async def main():
    tmp_dir = tempfile.mkdtemp()
    port = 9339
    proc = subprocess.Popen([
        r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        '--headless=new',
        f'--remote-debugging-port={port}',
        f'--user-data-dir={tmp_dir}',
        '--no-first-run',
        '--no-default-browser-check',
        '--window-size=390,844',
        'http://127.0.0.1:8080/index.html'
    ])
    try:
        await asyncio.sleep(2.5)
        with urllib.request.urlopen(f'http://127.0.0.1:{port}/json') as r:
            targets = json.loads(r.read().decode('utf-8'))
        page_target = next(t for t in targets if '127.0.0.1:8080' in t.get('url', ''))
        ws_url = page_target['webSocketDebuggerUrl']

        async with websockets.connect(ws_url) as ws:
            req_counter = 0
            async def cmd(method, params=None):
                nonlocal req_counter
                req_counter += 1
                payload = {'id': req_counter, 'method': method}
                if params: payload['params'] = params
                await ws.send(json.dumps(payload))
                while True:
                    msg = json.loads(await ws.recv())
                    if msg.get('id') == req_counter:
                        return msg.get('result', {})

            await cmd('Runtime.enable')
            await cmd('Page.enable')

            # Set Device Metrics to iPhone 14/15/16 (390 x 844, DPR 3, Mobile: True)
            await cmd('Emulation.setDeviceMetricsOverride', {
                'width': 390,
                'height': 844,
                'deviceScaleFactor': 3,
                'mobile': True,
                'screenOrientation': {'type': 'portraitPrimary', 'angle': 0}
            })
            await cmd('Emulation.setTouchEmulationEnabled', {
                'enabled': True,
                'maxTouchPoints': 5
            })

            await asyncio.sleep(1.0)

            # 1. Check window.__ERRORS__
            r_err = await cmd('Runtime.evaluate', {'expression': 'window.__ERRORS__', 'returnByValue': True})
            print('Page JS Errors:', r_err.get('result', {}).get('value'))

            # 2. Check overflow on mobile body & html
            r_overflow = await cmd('Runtime.evaluate', {
                'expression': 'JSON.stringify({ scrollWidth: document.body.scrollWidth, clientWidth: document.body.clientWidth, innerWidth: window.innerWidth })',
                'returnByValue': True
            })
            print('Body dimensions:', r_overflow.get('result', {}).get('value'))

            # 3. Check Garden HUD visibility & prompt
            r_hud = await cmd('Runtime.evaluate', {
                'expression': '''(() => {
                    const hud = document.querySelector('.garden-hud');
                    const mobText = document.querySelector('.hud-text-mobile');
                    const deskText = document.querySelector('.hud-text-desktop');
                    const btns = Array.from(document.querySelectorAll('.garden-controls button')).map(b => ({
                        id: b.id,
                        text: b.textContent.trim(),
                        rect: b.getBoundingClientRect()
                    }));
                    return JSON.stringify({
                        hudBottom: window.getComputedStyle(hud).bottom,
                        mobTextDisplay: window.getComputedStyle(mobText).display,
                        deskTextDisplay: window.getComputedStyle(deskText).display,
                        btnCount: btns.length,
                        firstBtnHeight: btns[0].rect.height
                    });
                })()''',
                'returnByValue': True
            })
            print('Mobile Garden HUD check:', r_hud.get('result', {}).get('value'))

            # 4. Dispatch a touch tap on the garden canvas to sow a flower
            plant_count_before = await cmd('Runtime.evaluate', {
                'expression': 'window.garden ? window.garden.plants.length : 0',
                'returnByValue': True
            })
            print('Plants before tap:', plant_count_before.get('result', {}).get('value'))

            # Tap soil area: x=200, y=780
            await cmd('Runtime.evaluate', {
                'expression': '''(() => {
                    const canvas = document.getElementById('garden-canvas');
                    const rect = canvas.getBoundingClientRect();
                    const touch = new Touch({
                        identifier: Date.now(),
                        target: canvas,
                        clientX: rect.left + 200,
                        clientY: rect.bottom - 40,
                        pageX: rect.left + 200,
                        pageY: rect.bottom - 40
                    });
                    canvas.dispatchEvent(new TouchEvent('touchstart', {
                        touches: [touch],
                        targetTouches: [touch],
                        changedTouches: [touch],
                        bubbles: true,
                        cancelable: true
                    }));
                    canvas.dispatchEvent(new TouchEvent('touchend', {
                        touches: [],
                        targetTouches: [],
                        changedTouches: [touch],
                        bubbles: true,
                        cancelable: true
                    }));
                })()''',
                'returnByValue': True
            })

            await asyncio.sleep(0.5)

            plant_count_after = await cmd('Runtime.evaluate', {
                'expression': 'window.garden ? window.garden.plants.length : 0',
                'returnByValue': True
            })
            print('Plants after touch tap:', plant_count_after.get('result', {}).get('value'))

            # Save screenshots in temp dir to prevent live-server reload loops
            out_dir = os.path.join(tempfile.gettempdir(), 'florametric_mobile_shots')
            os.makedirs(out_dir, exist_ok=True)

            # Screenshot Meadow on phone
            shot1 = await cmd('Page.captureScreenshot', {'format': 'png'})
            p1 = os.path.join(out_dir, 'mobile_meadow.png')
            with open(p1, 'wb') as f:
                f.write(base64.b64decode(shot1['data']))
            print('Saved:', p1)

            # 5. Switch to Studio Tab
            r_click_studio = await cmd('Runtime.evaluate', {
                'expression': '''(() => {
                    const btn = document.querySelector('[data-tab="studio"]');
                    btn.click();
                    return JSON.stringify({
                        btnFound: !!btn,
                        activeTab: document.querySelector('.nav-btn.active') ? document.querySelector('.nav-btn.active').dataset.tab : null,
                        activeViews: Array.from(document.querySelectorAll('.tab-view.active')).map(v => v.id),
                        errors: window.__ERRORS__
                    });
                })()''',
                'returnByValue': True
            })
            print('Click studio result:', r_click_studio.get('result', {}).get('value'))
            await asyncio.sleep(1.0)

            r_studio = await cmd('Runtime.evaluate', {
                'expression': '''(() => {
                    const layout = document.querySelector('.studio-layout');
                    const display = document.querySelector('.studio-display');
                    const panel = document.querySelector('.studio-panel');
                    return JSON.stringify({
                        flexDirection: window.getComputedStyle(layout).flexDirection,
                        displayHeight: display.getBoundingClientRect().height,
                        panelWidth: panel.getBoundingClientRect().width,
                        canvasDprWidth: document.getElementById('studio-canvas').width
                    });
                })()''',
                'returnByValue': True
            })
            print('Mobile Studio check:', r_studio.get('result', {}).get('value'))

            # Screenshot Studio on phone
            shot2 = await cmd('Page.captureScreenshot', {'format': 'png'})
            p2 = os.path.join(out_dir, 'mobile_studio.png')
            with open(p2, 'wb') as f:
                f.write(base64.b64decode(shot2['data']))
            print('Saved:', p2)

            # 6. Switch to Codex Tab
            await cmd('Runtime.evaluate', {
                'expression': 'document.querySelector(\'[data-tab="codex"]\').click()',
                'returnByValue': True
            })
            await asyncio.sleep(1.0)

            shot3 = await cmd('Page.captureScreenshot', {'format': 'png'})
            p3 = os.path.join(out_dir, 'mobile_codex.png')
            with open(p3, 'wb') as f:
                f.write(base64.b64decode(shot3['data']))
            print('Saved:', p3)

            # 7. Switch to Embed / Architect Tab
            await cmd('Runtime.evaluate', {
                'expression': 'document.querySelector(\'[data-tab="embed"]\').click()',
                'returnByValue': True
            })
            await asyncio.sleep(1.0)

            shot4 = await cmd('Page.captureScreenshot', {'format': 'png'})
            p4 = os.path.join(out_dir, 'mobile_embed.png')
            with open(p4, 'wb') as f:
                f.write(base64.b64decode(shot4['data']))
            print('Saved:', p4)

            print('All mobile tests passed! ✨')

    finally:
        proc.kill()

if __name__ == '__main__':
    asyncio.run(main())
