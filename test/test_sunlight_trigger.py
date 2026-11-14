import subprocess, os

# Let's test triggering the Shower Sunlight button and capturing the sunlight motes mid-shower!
trigger_script = """
setTimeout(() => {
  const btn = document.getElementById('btn-sunlight-burst');
  if (btn) btn.click();
}, 500);
"""

# We can run chrome with a small test html or pass the click event
path = os.path.abspath('test/output/live_sunlight_burst.png')
res = subprocess.run([
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    '--headless',
    '--disable-gpu',
    '--virtual-time-budget=3000',
    f'--screenshot={path}',
    '--window-size=1280,800',
    'http://localhost:8080/index.html'
], capture_output=True, text=True)

print("Screenshot captured:", os.path.exists(path))
