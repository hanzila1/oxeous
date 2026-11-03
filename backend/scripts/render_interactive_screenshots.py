import os
import subprocess

html_path = os.path.abspath('reports/EUDR_Compliance_Audit_Report_Thailand_Rubber_Interactive.html')
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

# 1. Scientific Deep Dive Active
html_deep = html.replace('<body>', '<body class="deep-dive-active">')
deep_html_path = os.path.abspath('reports/interactive_deep_temp.html')
with open(deep_html_path, 'w', encoding='utf-8') as f:
    f.write(html_deep)

p1 = os.path.abspath('reports/interactive_preview_deep_dive.png')
subprocess.run([
    edge_path, '--headless', '--disable-gpu', '--window-size=1280,1800',
    f'--screenshot={p1}', deep_html_path
], check=True)

# 2. Drawer Open State
html_drawer = html.replace('<div id="methodology-drawer">', '<div id="methodology-drawer" class="open">')
html_drawer = html_drawer.replace('<div class="drawer-overlay" id="drawer-overlay"', '<div class="drawer-overlay active" id="drawer-overlay"')
drawer_html_path = os.path.abspath('reports/interactive_drawer_temp.html')
with open(drawer_html_path, 'w', encoding='utf-8') as f:
    f.write(html_drawer)

p2 = os.path.abspath('reports/interactive_preview_drawer.png')
subprocess.run([
    edge_path, '--headless', '--disable-gpu', '--window-size=1280,1800',
    f'--screenshot={p2}', drawer_html_path
], check=True)

# Clean up temp htmls
if os.path.exists(deep_html_path): os.remove(deep_html_path)
if os.path.exists(drawer_html_path): os.remove(drawer_html_path)

print(f"[OK] Rendered Deep Dive Screenshot: {p1}")
print(f"[OK] Rendered Drawer Screenshot: {p2}")
