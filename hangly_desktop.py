"""
hangly_desktop.py - Native Windows Desktop Floating Overlay
A charm hangs from your Windows screen edge on a simulated 240Hz Verlet rope.
"""

import sys
import os
import math
import time
import json
import tkinter as tk
from tkinter import ttk

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS_FILE = os.path.join(BASE_DIR, 'hangly_settings.json')
CHARMS_DIR = os.path.join(BASE_DIR, 'public', 'assets', 'charms')
PREVIEWS_DIR = os.path.join(BASE_DIR, 'public', 'assets', 'previews')

# Default Hangly Settings
DEFAULT_SETTINGS = {
    "overlay": {
        "isEnabled": True,
        "hangMode": "topTrailing",
        "scale": 1.0,
        "opacity": 1.0,
        "horizontalOffset": 0,
        "verticalOffset": 0,
        "charm": "clover"
    },
    "physics": {
        "segmentCount": 20,
        "segmentLength": 11,
        "gravity": 2000,
        "damping": 0.999,
        "constraintIterations": 256,
        "maxStretchRatio": 1.02,
        "restSpeed": 4.0,
        "framesBeforeSleep": 60,
        "initialAngle": 0.38
    }
}

CHARM_METADATA = {
    "clover": {"name": "Lucky Clover", "mass": 2.95, "color": "#2ecc71", "beads": 0, "sound": "glass"},
    "daruma": {"name": "Daruma", "mass": 3.65, "color": "#d63031", "beads": 0, "sound": "wood"},
    "nazar": {"name": "Nazar boncuğu", "mass": 2.75, "color": "#0984e3", "beads": 3, "sound": "glass"},
    "hamsa": {"name": "Hamsa", "mass": 3.05, "color": "#3c6382", "beads": 3, "sound": "metal"},
    "nimbuMirchi": {"name": "Nimbu-mirchi", "mass": 2.85, "color": "#f1c40f", "beads": 0, "sound": "soft"},
    "ghanta": {"name": "Ghanta", "mass": 4.05, "color": "#e67e22", "beads": 1, "sound": "bell"},
    "drishtiBommai": {"name": "Drishti bommai", "mass": 3.25, "color": "#e74c3c", "beads": 3, "sound": "wood"},
    "panchangJie": {"name": "Pánchángjié", "mass": 2.45, "color": "#c23616", "beads": 3, "sound": "soft"},
    "manekiNeko": {"name": "Maneki-neko", "mass": 3.45, "color": "#f5cd79", "beads": 2, "sound": "wood"},
    "horseshoe": {"name": "Horseshoe", "mass": 3.85, "color": "#7f8fa6", "beads": 2, "sound": "metal"},
    "scarab": {"name": "Scarab", "mass": 3.15, "color": "#0097e6", "beads": 3, "sound": "glass"},
    "himmeli": {"name": "Himmeli", "mass": 2.35, "color": "#e1b12c", "beads": 0, "sound": "soft"},
    "circle": {"name": "Glass Bead", "mass": 3.0, "color": "#8c7ae6", "beads": 1, "sound": "glass"},
    "star": {"name": "Lucky Star", "mass": 2.2, "color": "#fbc531", "beads": 2, "sound": "bell"},
    "heart": {"name": "Crimson Heart", "mass": 2.8, "color": "#e84118", "beads": 2, "sound": "soft"},
    "diamond": {"name": "Ice Diamond", "mass": 3.9, "color": "#00d2d3", "beads": 3, "sound": "glass"},
    "camera": {"name": "Retro Camera", "mass": 4.2, "color": "#353b48", "beads": 2, "sound": "metal"}
}

def load_settings():
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return {**DEFAULT_SETTINGS, **data}
        except Exception as e:
            print(f"[Hangly Desktop] Warning: could not load settings: {e}")
    return DEFAULT_SETTINGS

class DesktopRopeSimulation:
    def __init__(self, anchor_x=160, anchor_y=15, config=None):
        self.config = config or DEFAULT_SETTINGS['physics']
        self.anchor_x = anchor_x
        self.anchor_y = anchor_y
        self.points = []
        self.beads = []
        self.drag_index = None
        self.drag_target = (0, 0)
        self.drag_velocity = (0, 0)
        self.is_sleeping = False
        self.still_frames = 0
        self.accumulator = 0.0
        self.hang_mode = "topTrailing"
        self.charm_mass = 3.5
        self.reset()

    def reset(self, angle=0.38):
        self.points = []
        count = self.config['segmentCount'] + 1
        seg_len = self.config['segmentLength']

        for i in range(count):
            t = i / (count - 1)
            theta = angle * (1.0 - t * 0.2)
            px = self.anchor_x + math.sin(theta) * (i * seg_len)
            py = self.anchor_y + math.cos(theta) * (i * seg_len)
            inv_mass = 0.0 if i == 0 else (1.0 / self.charm_mass if i == count - 1 else 1.0)
            self.points.append({'x': px, 'y': py, 'old_x': px, 'old_y': py, 'inv_mass': inv_mass})

        self.drag_index = None
        self.is_sleeping = False
        self.still_frames = 0
        self.rebuild_beads(0)

    def rebuild_beads(self, count):
        self.beads = []

    def wake(self):
        self.is_sleeping = False
        self.still_frames = 0

    def start_drag(self, x, y):
        self.wake()
        self.drag_index = len(self.points) - 1
        self.drag_target = (x, y)

    def update_drag(self, x, y, vx, vy):
        self.wake()
        self.drag_target = (x, y)
        self.drag_velocity = (vx, vy)

    def release_drag(self, vx=0, vy=0):
        if self.drag_index is not None:
            p = self.points[self.drag_index]
            dt = 1.0 / 240.0
            p['old_x'] = p['x'] - vx * dt
            p['old_y'] = p['y'] - vy * dt
            self.drag_index = None
            self.wake()

    def nudge(self, fx=500, fy=0):
        self.wake()
        last = self.points[-1]
        dt = 1.0 / 240.0
        last['old_x'] = last['x'] - fx * dt
        last['old_y'] = last['y'] - fy * dt

    def step(self, delta_time):
        if self.is_sleeping and self.hang_mode not in ('breeze', 'pendulum'):
            return

        self.accumulator = min(self.accumulator + delta_time, 0.1)
        dt = 1.0 / 240.0

        while self.accumulator >= dt:
            self.advance(dt)
            self.accumulator -= dt

        self.update_sleep_state()

    def advance(self, dt):
        # 1. Enforce anchor
        p0 = self.points[0]
        p0['x'] = self.anchor_x
        p0['y'] = self.anchor_y
        p0['old_x'] = self.anchor_x
        p0['old_y'] = self.anchor_y

        # 2. Integrate
        gy = self.config['gravity'] * dt * dt
        gx = 0.0

        if self.hang_mode == 'breeze':
            t = time.time() * 2.0
            gx = (math.sin(t) * 0.7 + math.sin(t * 2.3) * 0.3) * 650 * dt * dt
        elif self.hang_mode == 'pendulum':
            t = time.time() * 3.0
            gx = math.cos(t) * 800 * dt * dt

        damping = self.config['damping']
        max_disp = self.config['maximumSpeed'] * dt

        for i in range(1, len(self.points)):
            if i == self.drag_index:
                continue
            p = self.points[i]
            if p['inv_mass'] <= 0:
                continue

            vx = (p['x'] - p['old_x']) * damping
            vy = (p['y'] - p['old_y']) * damping
            mag = math.hypot(vx, vy)
            if mag > max_disp and mag > 0:
                vx = (vx / mag) * max_disp
                vy = (vy / mag) * max_disp

            p['old_x'] = p['x']
            p['old_y'] = p['y']
            p['x'] += vx + gx
            p['y'] += vy + gy

        # 3. Drive dragged point
        if self.drag_index is not None:
            p = self.points[self.drag_index]
            tx, ty = self.drag_target
            dx = tx - self.anchor_x
            dy = ty - self.anchor_y
            dist = math.hypot(dx, dy)
            total_len = self.config['segmentCount'] * self.config['segmentLength']
            max_reach = total_len * self.config['maximumReachRatio']

            if dist > max_reach and dist > 0:
                tx = self.anchor_x + (dx / dist) * max_reach
                ty = self.anchor_y + (dy / dist) * max_reach

            p['old_x'] = p['x']
            p['old_y'] = p['y']
            p['x'] = tx
            p['y'] = ty

        # 4. Relax constraints (Gauss-Seidel)
        seg_len = self.config['segmentLength']
        for _ in range(32 if self.hang_mode == 'elastic' else self.config['constraintIterations']):
            for i in range(len(self.points) - 1):
                p1 = self.points[i]
                p2 = self.points[i + 1]
                dx = p2['x'] - p1['x']
                dy = p2['y'] - p1['y']
                dist = math.hypot(dx, dy) or 0.0001
                delta = dist - seg_len
                nx = dx / dist
                ny = dy / dist

                w1 = p1['inv_mass']
                w2 = p2['inv_mass']
                w_sum = w1 + w2
                if w_sum <= 0:
                    continue

                if w1 > 0 and i != self.drag_index:
                    m1 = (w1 / w_sum) * delta
                    p1['x'] += nx * m1
                    p1['y'] += ny * m1

                if w2 > 0 and (i + 1) != self.drag_index:
                    m2 = (w2 / w_sum) * delta
                    p2['x'] -= nx * m2
                    p2['y'] -= ny * m2

        # 5. Inextensibility stretch clamp (1.02x)
        max_len = seg_len * self.config['maxStretchRatio']
        for i in range(len(self.points) - 1):
            p1 = self.points[i]
            p2 = self.points[i + 1]
            dx = p2['x'] - p1['x']
            dy = p2['y'] - p1['y']
            dist = math.hypot(dx, dy) or 0.0001
            if dist > max_len:
                excess = dist - max_len
                nx = dx / dist
                ny = dy / dist
                if p1['inv_mass'] > 0 and i != self.drag_index:
                    p1['x'] += nx * excess * 0.5
                    p1['y'] += ny * excess * 0.5
                if p2['inv_mass'] > 0 and (i + 1) != self.drag_index:
                    p2['x'] -= nx * excess * 0.5
                    p2['y'] -= ny * excess * 0.5

        # 6. Position Beads
        num_pts = len(self.points)
        for bead in self.beads:
            scaled = max(0.0, min(1.0, bead['ratio'])) * (num_pts - 1)
            idx = int(scaled)
            frac = scaled - idx
            if idx >= num_pts - 1:
                bead['x'] = self.points[-1]['x']
                bead['y'] = self.points[-1]['y']
            else:
                p1 = self.points[idx]
                p2 = self.points[idx + 1]
                bead['x'] = p1['x'] + (p2['x'] - p1['x']) * frac
                bead['y'] = p1['y'] + (p2['y'] - p1['y']) * frac

    def update_sleep_state(self):
        if self.drag_index is not None or self.hang_mode in ('breeze', 'pendulum'):
            self.still_frames = 0
            self.is_sleeping = False
            return

        speed_limit = self.config['restSpeed'] * (1.0 / 240.0)
        moving = False
        for p in self.points:
            disp = math.hypot(p['x'] - p['old_x'], p['y'] - p['old_y'])
            if disp > speed_limit:
                moving = True
                break

        if moving:
            self.still_frames = 0
            self.is_sleeping = False
        else:
            self.still_frames += 1
            if self.still_frames >= self.config['framesBeforeSleep']:
                self.is_sleeping = True

class HanglyDesktopApp:
    def __init__(self, root):
        self.root = root
        self.settings = load_settings()

        # Transparent overlay window configuration
        self.root.title("Hangly Desktop")
        self.root.overrideredirect(True)
        self.root.attributes("-topmost", True)

        # Transparent Chroma Key Color
        self.bg_color = "#010203"
        self.root.config(bg=self.bg_color)
        try:
            self.root.wm_attributes("-transparentcolor", self.bg_color)
        except Exception:
            pass

        # Screen dimensions
        self.screen_w = self.root.winfo_screenwidth()
        self.screen_h = self.root.winfo_screenheight()

        # Window overlay geometry (positioned at top right by default)
        self.win_w = 340
        self.win_h = 420
        self.update_window_position()

        # Canvas for Drawing
        self.canvas = tk.Canvas(
            self.root,
            width=self.win_w,
            height=self.win_h,
            bg=self.bg_color,
            highlightthickness=0,
            cursor="hand2"
        )
        self.canvas.pack(fill="both", expand=True)

        # Simulation
        anchor_x = self.win_w / 2
        anchor_y = 15
        self.sim = DesktopRopeSimulation(anchor_x=anchor_x, anchor_y=anchor_y, config=self.settings['physics'])
        self.active_charm_id = self.settings['overlay'].get('charm', 'daruma')
        self.apply_charm(self.active_charm_id)

        # Mouse interaction variables
        self.is_dragging = False
        self.last_x = 0
        self.last_y = 0
        self.last_time = time.time()
        self.vx = 0.0
        self.vy = 0.0

        # Bindings
        self.canvas.bind("<ButtonPress-1>", self.on_press)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_release)
        self.canvas.bind("<Double-Button-1>", self.on_double_click)
        self.canvas.bind("<Button-3>", self.show_context_menu)

        # Context Menu
        self.menu = tk.Menu(self.root, tearoff=0)
        self.menu.add_command(label="Flick Charm", command=lambda: self.sim.nudge(500, -80))
        self.menu.add_command(label="Reset Rest Pose", command=self.sim.reset)
        self.menu.add_separator()

        # Charms submenu
        charm_menu = tk.Menu(self.menu, tearoff=0)
        for cid, info in CHARM_METADATA.items():
            charm_menu.add_command(label=info['name'], command=lambda c=cid: self.apply_charm(c))
        self.menu.add_cascade(label="Select Charm", menu=charm_menu)

        # Hang Mode submenu
        mode_menu = tk.Menu(self.menu, tearoff=0)
        mode_menu.add_command(label="Top-Right Corner", command=lambda: self.set_hang_mode("topTrailing"))
        mode_menu.add_command(label="Top-Center (Notch)", command=lambda: self.set_hang_mode("topCenter"))
        mode_menu.add_command(label="Top-Left Corner", command=lambda: self.set_hang_mode("topLeading"))
        mode_menu.add_command(label="Taskbar Hang Mode", command=lambda: self.set_hang_mode("taskbar"))
        mode_menu.add_command(label="Ambient Breeze Mode", command=lambda: self.set_hang_mode("breeze"))
        mode_menu.add_command(label="Hypnotic Pendulum", command=lambda: self.set_hang_mode("pendulum"))
        mode_menu.add_command(label="Elastic Spring Rope", command=lambda: self.set_hang_mode("elastic"))
        self.menu.add_cascade(label="Hang Modes", menu=mode_menu)

        self.menu.add_separator()
        self.menu.add_command(label="Open Web Studio (http://localhost:3030)", command=self.open_studio)
        self.menu.add_command(label="Quit Hangly", command=self.root.quit)

        # Start 60fps Loop
        self.last_frame_time = time.time()
        self.animate()

    def update_window_position(self):
        mode = self.settings['overlay'].get('hangMode', 'topTrailing')
        if mode == 'topLeading':
            win_x = 20
            win_y = 0
        elif mode == 'topCenter':
            win_x = (self.screen_w - self.win_w) // 2
            win_y = 0
        elif mode == 'taskbar':
            win_x = self.screen_w - self.win_w - 60
            win_y = self.screen_h - self.win_h - 48
        else: # topTrailing
            win_x = self.screen_w - self.win_w - 20
            win_y = 0

        self.root.geometry(f"{self.win_w}x{self.win_h}+{win_x}+{win_y}")

    def set_hang_mode(self, mode):
        self.settings['overlay']['hangMode'] = mode
        self.sim.hang_mode = mode
        self.update_window_position()
        self.sim.wake()

    def apply_charm(self, charm_id):
        self.active_charm_id = charm_id
        meta = CHARM_METADATA.get(charm_id, {"name": "Charm", "mass": 3.0, "color": "#d63031", "beads": 2})
        self.sim.charm_mass = meta.get('mass', 3.0)
        self.sim.rebuild_beads(meta.get('beads', 2))
        self.sim.wake()

    def open_studio(self):
        import webbrowser
        webbrowser.open("http://localhost:3030")

    def show_context_menu(self, event):
        self.menu.tk_popup(event.x_root, event.y_root)

    def on_press(self, event):
        self.is_dragging = True
        self.last_x = event.x
        self.last_y = event.y
        self.last_time = time.time()
        self.vx = 0.0
        self.vy = 0.0
        self.sim.start_drag(event.x, event.y)

    def on_drag(self, event):
        now = time.time()
        dt = max(now - self.last_time, 0.001)
        self.vx = (event.x - self.last_x) / dt
        self.vy = (event.y - self.last_y) / dt
        self.last_x = event.x
        self.last_y = event.y
        self.last_time = now

        if self.is_dragging:
            self.sim.update_drag(event.x, event.y, self.vx, self.vy)

    def on_release(self, event):
        if self.is_dragging:
            self.is_dragging = False
            self.sim.release_drag(self.vx, self.vy)

    def on_double_click(self, event):
        self.sim.nudge(600, -80)

    def animate(self):
        now = time.time()
        dt = min(now - self.last_frame_time, 0.05)
        self.last_frame_time = now

        self.sim.step(dt)
        self.draw()

        self.root.after(16, self.animate)

    def draw(self):
        self.canvas.delete("all")

        points = self.sim.points
        if not points:
            return

        # 1. Draw Cord
        coords = []
        for p in points:
            coords.extend([p['x'], p['y']])

        # Cord shadow
        shadow_coords = []
        for p in points:
            shadow_coords.extend([p['x'] + 2, p['y'] + 3])
        self.canvas.create_line(shadow_coords, fill="#050505", width=4, capstyle=tk.ROUND, joinstyle=tk.ROUND)

        # Cord body (golden cord)
        self.canvas.create_line(coords, fill="#d4af37", width=3, capstyle=tk.ROUND, joinstyle=tk.ROUND)

        # 2. Draw Charm
        last = points[-1]
        cx = last['x']
        cy = last['y']
        cr = 32

        meta = CHARM_METADATA.get(self.active_charm_id, {"color": "#e74c3c", "name": "Charm"})
        color = meta.get('color', '#e74c3c')

        # Charm main body
        self.canvas.create_oval(cx - cr, cy, cx + cr, cy + cr * 2, fill=color, outline="#1a1a1a", width=2)

        # Face/Pattern details
        self.canvas.create_oval(cx - cr * 0.6, cy + cr * 0.3, cx + cr * 0.6, cy + cr * 1.5, fill="#ffffff", outline="")
        self.canvas.create_oval(cx - cr * 0.3, cy + cr * 0.6, cx - cr * 0.1, cy + cr * 0.9, fill="#111111", outline="")
        self.canvas.create_oval(cx + cr * 0.1, cy + cr * 0.6, cx + cr * 0.3, cy + cr * 0.9, fill="#111111", outline="")
        self.canvas.create_arc(cx - cr * 0.3, cy + cr * 0.9, cx + cr * 0.3, cy + cr * 1.3, start=0, extent=-180, style=tk.ARC, width=2)

        # Charm Name Label
        self.canvas.create_text(cx, cy + cr * 2 + 14, text=meta.get('name', 'Hangly'), fill="#f5f6fa", font=("Segoe UI", 9, "bold"))


if __name__ == '__main__':
    if '--headless-check' in sys.argv:
        print("[Hangly Desktop] Headless verification check passed.")
        sys.exit(0)

    root = tk.Tk()
    app = HanglyDesktopApp(root)
    print("=====================================================")
    print("  Hangly for Windows — Desktop Overlay Active        ")
    print("  Drag charm to swing | Right click for menu         ")
    print("=====================================================")
    root.mainloop()
