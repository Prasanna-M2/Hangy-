using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace Hangly
{
    public class RopePoint
    {
        public double X, Y, OldX, OldY, InvMass;
        public RopePoint(double x, double y, double invMass)
        {
            X = OldX = x;
            Y = OldY = y;
            InvMass = invMass;
        }
        public double Displacement()
        {
            double dx = X - OldX;
            double dy = Y - OldY;
            return Math.Sqrt(dx * dx + dy * dy);
        }
    }

    public class RopeBead
    {
        public double Ratio, X, Y;
        public RopeBead(double ratio)
        {
            Ratio = ratio;
        }
    }

    public class CharmMeta
    {
        public string Id;
        public string Name;
        public double Mass;
        public Color PrimaryColor;
        public int BeadCount;
        public string ImageFile;

        public CharmMeta(string id, string name, double mass, Color color, int beadCount, string img)
        {
            Id = id;
            Name = name;
            Mass = mass;
            PrimaryColor = color;
            BeadCount = beadCount;
            ImageFile = img;
        }
    }

    public class HanglyForm : Form
    {
        // P/Invoke for Windows window styling and click-through
        [DllImport("user32.dll", SetLastError = true)]
        static extern int GetWindowLong(IntPtr hWnd, int nIndex);
        [DllImport("user32.dll")]
        static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

        const int GWL_EXSTYLE = -20;
        const int WS_EX_LAYERED = 0x80000;
        const int WS_EX_TOOLWINDOW = 0x80;

        // Constants matching macOS RopeConfiguration
        const int SEGMENT_COUNT = 20;
        const double SEGMENT_LENGTH = 11.0;
        const double GRAVITY = 2000.0;
        const double DAMPING = 0.999;
        const int CONSTRAINT_ITERATIONS = 256;
        const double MAX_STRETCH_RATIO = 1.02;
        const double FIXED_DT = 1.0 / 240.0;

        // State
        public List<RopePoint> Points = new List<RopePoint>();
        public List<RopeBead> Beads = new List<RopeBead>();
        public new PointF Anchor = new PointF(160, 15);
        public string HangMode = "topTrailing";
        public double ScaleFactor = 1.0;
        public bool IsSleeping = false;
        public int StillFrames = 0;
        public double Accumulator = 0.0;
        public int? DragIndex = null;
        public PointF DragTarget = PointF.Empty;
        public PointF DragVelocity = PointF.Empty;
        public bool IsDragging = false;
        public Point LastMousePos = Point.Empty;
        public DateTime LastMouseTime = DateTime.UtcNow;

        public Dictionary<string, CharmMeta> Charms = new Dictionary<string, CharmMeta>();
        public string ActiveCharmId = "clover";
        public Dictionary<string, Image> CharmImages = new Dictionary<string, Image>();

        private Timer animTimer;
        private NotifyIcon trayIcon;
        private ContextMenuStrip trayMenu;
        private DateTime lastFrameTime = DateTime.UtcNow;

        public HanglyForm()
        {
            InitializeCharms();
            InitializeWindow();
            InitializePhysics();
            InitializeTray();

            animTimer = new Timer();
            animTimer.Interval = 16; // ~60fps render
            animTimer.Tick += OnAnimTick;
            animTimer.Start();
        }

        private void InitializeCharms()
        {
            Charms["clover"] = new CharmMeta("clover", "Lucky Clover", 2.95, Color.FromArgb(46, 204, 113), 0, "charm-preview-clover@2x.png");
            Charms["daruma"] = new CharmMeta("daruma", "Daruma", 3.65, Color.FromArgb(214, 48, 49), 0, "charm-preview-daruma@2x.png");
            Charms["nazar"] = new CharmMeta("nazar", "Nazar boncuğu", 2.75, Color.FromArgb(9, 132, 227), 0, "charm-preview-nazar@2x.png");
            Charms["hamsa"] = new CharmMeta("hamsa", "Hamsa", 3.05, Color.FromArgb(60, 99, 130), 0, "charm-preview-hamsa@2x.png");
            Charms["nimbuMirchi"] = new CharmMeta("nimbuMirchi", "Nimbu-mirchi", 2.85, Color.FromArgb(241, 196, 15), 0, "charm-preview-nimbuMirchi@2x.png");
            Charms["ghanta"] = new CharmMeta("ghanta", "Ghanta", 4.05, Color.FromArgb(230, 126, 34), 0, "charm-preview-ghanta@2x.png");
            Charms["drishtiBommai"] = new CharmMeta("drishtiBommai", "Drishti bommai", 3.25, Color.FromArgb(231, 76, 60), 0, "charm-preview-drishtiBommai@2x.png");
            Charms["panchangJie"] = new CharmMeta("panchangJie", "Pánchángjié", 2.45, Color.FromArgb(194, 54, 22), 0, "charm-preview-panchangJie@2x.png");
            Charms["manekiNeko"] = new CharmMeta("manekiNeko", "Maneki-neko", 3.45, Color.FromArgb(245, 205, 121), 0, "charm-preview-manekiNeko@2x.png");
            Charms["horseshoe"] = new CharmMeta("horseshoe", "Horseshoe", 3.85, Color.FromArgb(127, 143, 166), 0, "charm-preview-horseshoe@2x.png");
            Charms["scarab"] = new CharmMeta("scarab", "Scarab", 3.15, Color.FromArgb(0, 151, 230), 0, "charm-preview-scarab@2x.png");
            Charms["himmeli"] = new CharmMeta("himmeli", "Himmeli", 2.35, Color.FromArgb(225, 177, 44), 0, "charm-preview-himmeli@2x.png");

            // Classics
            Charms["circle"] = new CharmMeta("circle", "Glass Bead", 3.0, Color.FromArgb(140, 122, 230), 0, "charm-preview-circle@2x.png");
            Charms["star"] = new CharmMeta("star", "Lucky Star", 2.2, Color.FromArgb(251, 197, 49), 0, "charm-preview-star@2x.png");
            Charms["heart"] = new CharmMeta("heart", "Crimson Heart", 2.8, Color.FromArgb(232, 65, 24), 0, "charm-preview-heart@2x.png");
            Charms["diamond"] = new CharmMeta("diamond", "Ice Diamond", 3.9, Color.FromArgb(0, 210, 211), 0, "charm-preview-diamond@2x.png");
            Charms["camera"] = new CharmMeta("camera", "Retro Camera", 4.2, Color.FromArgb(53, 59, 72), 0, "charm-preview-camera@2x.png");

            // Load preview images cleanly into independent Bitmaps
            string basePath = AppDomain.CurrentDomain.BaseDirectory;
            string previewDir = Path.Combine(basePath, "public", "assets", "previews");
            if (Directory.Exists(previewDir))
            {
                foreach (var kvp in Charms)
                {
                    string file = Path.Combine(previewDir, kvp.Value.ImageFile);
                    if (File.Exists(file))
                    {
                        try
                        {
                            byte[] bytes = File.ReadAllBytes(file);
                            using (var ms = new MemoryStream(bytes))
                            using (var temp = Image.FromStream(ms))
                            {
                                Bitmap bmp = new Bitmap(temp.Width, temp.Height, System.Drawing.Imaging.PixelFormat.Format32bppArgb);
                                using (Graphics g = Graphics.FromImage(bmp))
                                {
                                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                                    g.DrawImage(temp, 0, 0, temp.Width, temp.Height);
                                }
                                CharmImages[kvp.Key] = bmp;
                            }
                        }
                        catch { }
                    }
                }
            }
        }

        private void InitializeWindow()
        {
            this.Text = "Hangly Desktop Overlay";
            this.FormBorderStyle = FormBorderStyle.None;
            this.ShowInTaskbar = false;
            this.TopMost = true;
            this.StartPosition = FormStartPosition.Manual;

            // Transparent background color
            Color transColor = Color.FromArgb(1, 2, 3);
            this.BackColor = transColor;
            this.TransparencyKey = transColor;

            // Dimensions and placement
            this.Width = 340;
            this.Height = 440;
            UpdatePositionOnScreen();

            // Double Buffering for ultra-smooth GDI+ rendering
            this.SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.OptimizedDoubleBuffer, true);
            this.UpdateStyles();

            // Set ToolWindow style so it doesn't show in Alt+Tab
            try
            {
                int exStyle = GetWindowLong(this.Handle, GWL_EXSTYLE);
                SetWindowLong(this.Handle, GWL_EXSTYLE, exStyle | WS_EX_TOOLWINDOW);
            }
            catch { }
        }

        public void UpdatePositionOnScreen()
        {
            Rectangle screen = Screen.PrimaryScreen.Bounds;
            Rectangle work = Screen.PrimaryScreen.WorkingArea;

            int x = screen.Right - this.Width - 10;
            int y = 0;

            if (HangMode == "topLeading")
            {
                x = screen.Left + 10;
                y = 0;
            }
            else if (HangMode == "topCenter")
            {
                x = screen.Left + (screen.Width - this.Width) / 2;
                y = 0;
            }
            else if (HangMode == "taskbar")
            {
                x = work.Right - this.Width - 40;
                y = work.Bottom - this.Height + 20;
            }
            else // topTrailing default
            {
                x = screen.Right - this.Width - 10;
                y = 0;
            }

            this.Location = new Point(x, y);
            Anchor = new PointF(this.Width / 2.0f, 15f);
        }

        private void InitializePhysics()
        {
            Points.Clear();
            double angle = 0.38;
            int count = SEGMENT_COUNT + 1;
            CharmMeta charm = Charms[ActiveCharmId];

            for (int i = 0; i < count; i++)
            {
                double t = (double)i / (count - 1);
                double theta = angle * (1.0 - t * 0.2);
                double px = Anchor.X + Math.Sin(theta) * (i * SEGMENT_LENGTH);
                double py = Anchor.Y + Math.Cos(theta) * (i * SEGMENT_LENGTH);
                double invMass = (i == 0) ? 0.0 : ((i == count - 1) ? 1.0 / charm.Mass : 1.0);
                Points.Add(new RopePoint(px, py, invMass));
            }

            RebuildBeads(charm.BeadCount);
            IsSleeping = false;
            StillFrames = 0;
        }

        private void RebuildBeads(int count)
        {
            Beads.Clear();
        }

        public void ApplyCharm(string id)
        {
            if (Charms.ContainsKey(id))
            {
                ActiveCharmId = id;
                CharmMeta charm = Charms[id];
                if (Points.Count > 0)
                {
                    Points[Points.Count - 1].InvMass = 1.0 / charm.Mass;
                }
                RebuildBeads(charm.BeadCount);
                Wake();
                this.Invalidate();
            }
        }

        public void SetHangMode(string mode)
        {
            HangMode = mode;
            UpdatePositionOnScreen();
            Wake();
            this.Invalidate();
        }

        public void Wake()
        {
            IsSleeping = false;
            StillFrames = 0;
        }

        public void Nudge(double fx = 600, double fy = -80)
        {
            Wake();
            if (Points.Count > 0)
            {
                RopePoint last = Points[Points.Count - 1];
                last.OldX = last.X - fx * FIXED_DT;
                last.OldY = last.Y - fy * FIXED_DT;
            }
        }

        private void InitializeTray()
        {
            trayIcon = new NotifyIcon();
            trayIcon.Text = "Hangly for Windows";

            // Load app icon
            string icoPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Hangly.ico");
            if (File.Exists(icoPath))
            {
                try { trayIcon.Icon = new Icon(icoPath); }
                catch { trayIcon.Icon = SystemIcons.Application; }
            }
            else
            {
                trayIcon.Icon = SystemIcons.Application;
            }

            trayMenu = new ContextMenuStrip();
            trayMenu.Items.Add("Hangly for Windows", null, (s, e) => { });
            trayMenu.Items[0].Font = new Font(trayMenu.Font, FontStyle.Bold);
            trayMenu.Items.Add(new ToolStripSeparator());

            // Hang Modes Submenu
            var modeSubmenu = new ToolStripMenuItem("Hang Modes");
            modeSubmenu.DropDownItems.Add("Top-Right (Screen Edge)", null, (s, e) => SetHangMode("topTrailing"));
            modeSubmenu.DropDownItems.Add("Top-Center (Notch / Bar)", null, (s, e) => SetHangMode("topCenter"));
            modeSubmenu.DropDownItems.Add("Top-Left Corner", null, (s, e) => SetHangMode("topLeading"));
            modeSubmenu.DropDownItems.Add("Windows Taskbar Hang", null, (s, e) => SetHangMode("taskbar"));
            modeSubmenu.DropDownItems.Add("Ambient Breeze Mode", null, (s, e) => SetHangMode("breeze"));
            modeSubmenu.DropDownItems.Add("Hypnotic Pendulum Mode", null, (s, e) => SetHangMode("pendulum"));
            modeSubmenu.DropDownItems.Add("Bouncy Elastic Rope", null, (s, e) => SetHangMode("elastic"));
            trayMenu.Items.Add(modeSubmenu);

            // Charms Submenu
            var charmSubmenu = new ToolStripMenuItem("Select Charm");
            foreach (var kvp in Charms)
            {
                string id = kvp.Key;
                charmSubmenu.DropDownItems.Add(kvp.Value.Name, null, (s, e) => ApplyCharm(id));
            }
            trayMenu.Items.Add(charmSubmenu);

            // Scale Submenu
            var scaleSubmenu = new ToolStripMenuItem("Size / Scale");
            scaleSubmenu.DropDownItems.Add("Small (80%)", null, (s, e) => { ScaleFactor = 0.8; Wake(); });
            scaleSubmenu.DropDownItems.Add("Normal (100%)", null, (s, e) => { ScaleFactor = 1.0; Wake(); });
            scaleSubmenu.DropDownItems.Add("Large (125%)", null, (s, e) => { ScaleFactor = 1.25; Wake(); });
            scaleSubmenu.DropDownItems.Add("Extra Large (150%)", null, (s, e) => { ScaleFactor = 1.5; Wake(); });
            trayMenu.Items.Add(scaleSubmenu);

            trayMenu.Items.Add(new ToolStripSeparator());
            trayMenu.Items.Add("Flick Charm", null, (s, e) => Nudge(600, -80));
            trayMenu.Items.Add("Reset Rest Pose", null, (s, e) => InitializePhysics());
            trayMenu.Items.Add(new ToolStripSeparator());

            trayMenu.Items.Add("Open Web Studio (http://localhost:3030)", null, (s, e) => {
                try { System.Diagnostics.Process.Start("http://localhost:3030"); } catch { }
            });

            trayMenu.Items.Add("Create Desktop Shortcut", null, (s, e) => CreateDesktopShortcut());
            trayMenu.Items.Add(new ToolStripSeparator());
            trayMenu.Items.Add("Exit Hangly", null, (s, e) => Application.Exit());

            trayIcon.ContextMenuStrip = trayMenu;
            trayIcon.Visible = true;
            this.ContextMenuStrip = trayMenu;
        }

        public void CreateDesktopShortcut()
        {
            try
            {
                string desktopFolder = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string shortcutPath = Path.Combine(desktopFolder, "Hangly.lnk");
                string exePath = Application.ExecutablePath;

                // Create shortcut using Windows Script Host
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);
                    dynamic shortcut = shell.CreateShortcut(shortcutPath);
                    shortcut.TargetPath = exePath;
                    shortcut.WorkingDirectory = Path.GetDirectoryName(exePath);
                    shortcut.Description = "Hangly for Windows — A tiny piece of motion for your desktop";
                    string icoPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Hangly.ico");
                    if (File.Exists(icoPath))
                    {
                        shortcut.IconLocation = icoPath + ",0";
                    }
                    shortcut.Save();
                    MessageBox.Show("Hangly shortcut created on your Desktop!", "Hangly for Windows", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Could not create shortcut: " + ex.Message, "Hangly", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void OnAnimTick(object sender, EventArgs e)
        {
            DateTime now = DateTime.UtcNow;
            double dt = Math.Min((now - lastFrameTime).TotalSeconds, 0.05);
            lastFrameTime = now;

            StepPhysics(dt);
            this.Invalidate();
        }

        private void StepPhysics(double dt)
        {
            if (IsSleeping && HangMode != "breeze" && HangMode != "pendulum") return;

            Accumulator = Math.Min(Accumulator + dt, 0.1);
            while (Accumulator >= FIXED_DT)
            {
                AdvancePhysics(FIXED_DT);
                Accumulator -= FIXED_DT;
            }

            UpdateSleepState();
        }

        private void AdvancePhysics(double dt)
        {
            if (Points.Count == 0) return;

            // 1. Enforce Anchor
            Points[0].X = Anchor.X;
            Points[0].Y = Anchor.Y;
            Points[0].OldX = Anchor.X;
            Points[0].OldY = Anchor.Y;

            // 2. Integrate
            double gy = GRAVITY * dt * dt;
            double gx = 0.0;

            if (HangMode == "breeze")
            {
                double t = (DateTime.UtcNow - DateTime.MinValue).TotalSeconds * 2.0;
                gx = (Math.Sin(t) * 0.7 + Math.Sin(t * 2.3) * 0.3) * 650.0 * dt * dt;
            }
            else if (HangMode == "pendulum")
            {
                double t = (DateTime.UtcNow - DateTime.MinValue).TotalSeconds * 3.0;
                gx = Math.Cos(t) * 800.0 * dt * dt;
            }

            for (int i = 1; i < Points.Count; i++)
            {
                if (i == DragIndex) continue;
                RopePoint p = Points[i];
                if (p.InvMass <= 0) continue;

                double vx = (p.X - p.OldX) * DAMPING;
                double vy = (p.Y - p.OldY) * DAMPING;

                p.OldX = p.X;
                p.OldY = p.Y;
                p.X += vx + gx;
                p.Y += vy + gy;
            }

            // 3. Drive Dragged Node
            if (DragIndex.HasValue)
            {
                RopePoint p = Points[DragIndex.Value];
                p.OldX = p.X;
                p.OldY = p.Y;
                p.X = DragTarget.X;
                p.Y = DragTarget.Y;
            }

            // 4. Relax Constraints (Gauss-Seidel)
            int iterations = (HangMode == "elastic") ? 32 : CONSTRAINT_ITERATIONS;
            for (int it = 0; it < iterations; it++)
            {
                for (int i = 0; i < Points.Count - 1; i++)
                {
                    RopePoint p1 = Points[i];
                    RopePoint p2 = Points[i + 1];
                    double dx = p2.X - p1.X;
                    double dy = p2.Y - p1.Y;
                    double dist = Math.Sqrt(dx * dx + dy * dy);
                    if (dist < 0.0001) dist = 0.0001;
                    double delta = dist - SEGMENT_LENGTH;
                    double nx = dx / dist;
                    double ny = dy / dist;

                    double wSum = p1.InvMass + p2.InvMass;
                    if (wSum <= 0) continue;

                    if (p1.InvMass > 0 && i != DragIndex)
                    {
                        double m1 = (p1.InvMass / wSum) * delta;
                        p1.X += nx * m1;
                        p1.Y += ny * m1;
                    }
                    if (p2.InvMass > 0 && (i + 1) != DragIndex)
                    {
                        double m2 = (p2.InvMass / wSum) * delta;
                        p2.X -= nx * m2;
                        p2.Y -= ny * m2;
                    }
                }
            }

            // 5. Inextensibility Stretch Ceiling (1.02x)
            if (HangMode != "elastic")
            {
                double maxLen = SEGMENT_LENGTH * MAX_STRETCH_RATIO;
                for (int i = 0; i < Points.Count - 1; i++)
                {
                    RopePoint p1 = Points[i];
                    RopePoint p2 = Points[i + 1];
                    double dx = p2.X - p1.X;
                    double dy = p2.Y - p1.Y;
                    double dist = Math.Sqrt(dx * dx + dy * dy);
                    if (dist > maxLen)
                    {
                        double excess = dist - maxLen;
                        double nx = dx / dist;
                        double ny = dy / dist;
                        if (p1.InvMass > 0 && i != DragIndex)
                        {
                            p1.X += nx * excess * 0.5;
                            p1.Y += ny * excess * 0.5;
                        }
                        if (p2.InvMass > 0 && (i + 1) != DragIndex)
                        {
                            p2.X -= nx * excess * 0.5;
                            p2.Y -= ny * excess * 0.5;
                        }
                    }
                }
            }

            // 6. Project Beads along rope curve
            int count = Points.Count;
            for (int b = 0; b < Beads.Count; b++)
            {
                RopeBead bead = Beads[b];
                double scaled = Math.Max(0.0, Math.Min(1.0, bead.Ratio)) * (count - 1);
                int idx = (int)scaled;
                double frac = scaled - idx;
                if (idx >= count - 1)
                {
                    bead.X = Points[count - 1].X;
                    bead.Y = Points[count - 1].Y;
                }
                else
                {
                    bead.X = Points[idx].X + (Points[idx + 1].X - Points[idx].X) * frac;
                    bead.Y = Points[idx].Y + (Points[idx + 1].Y - Points[idx].Y) * frac;
                }
            }
        }

        private void UpdateSleepState()
        {
            if (DragIndex.HasValue || HangMode == "breeze" || HangMode == "pendulum")
            {
                StillFrames = 0;
                IsSleeping = false;
                return;
            }

            double speedLimit = 4.0 * FIXED_DT;
            bool moving = false;
            foreach (var p in Points)
            {
                if (p.Displacement() > speedLimit)
                {
                    moving = true;
                    break;
                }
            }

            if (moving)
            {
                StillFrames = 0;
                IsSleeping = false;
            }
            else
            {
                StillFrames++;
                if (StillFrames >= 60)
                {
                    IsSleeping = true;
                }
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            if (Points.Count < 2) return;

            float s = (float)ScaleFactor;
            CharmMeta charm = Charms[ActiveCharmId];

            // 1. Draw Rope Cord with High Visibility (Contour + Rich Gold + Spiral Sheen)
            PointF[] pts = new PointF[Points.Count];
            for (int i = 0; i < Points.Count; i++)
            {
                pts[i] = new PointF((float)Points[i].X, (float)Points[i].Y);
            }

            // High-contrast outer contour/shadow (visible on all light & dark windows)
            using (Pen contourPen = new Pen(Color.FromArgb(135, 90, 15), 4.4f * s))
            {
                contourPen.StartCap = LineCap.Round;
                contourPen.EndCap = LineCap.Round;
                g.DrawCurve(contourPen, pts);
            }

            // Radiant gold core body
            using (Pen ropePen = new Pen(Color.FromArgb(255, 215, 50), 3.0f * s))
            {
                ropePen.StartCap = LineCap.Round;
                ropePen.EndCap = LineCap.Round;
                g.DrawCurve(ropePen, pts);
            }

            // Twisted silk braid highlight sheen
            using (Pen stitchPen = new Pen(Color.FromArgb(240, 255, 255, 255), 1.0f * s))
            {
                stitchPen.DashPattern = new float[] { 3.0f, 3.0f };
                g.DrawCurve(stitchPen, pts);
            }

            // 2. Draw Charm Artwork & Attachment Clasp Ring
            RopePoint lastNode = Points[Points.Count - 1];
            RopePoint prevNode = Points[Points.Count - 2];
            float cx = (float)lastNode.X;
            float cy = (float)lastNode.Y;
            float cr = 34f * s;

            // Clasp loop ring connecting rope to charm
            using (Pen loopPen = new Pen(Color.FromArgb(215, 175, 45), 2.2f * s))
            {
                g.DrawEllipse(loopPen, cx - 4f * s, cy - 4f * s, 8f * s, 8f * s);
            }

            // Rotation Angle
            double dx = lastNode.X - prevNode.X;
            double dy = lastNode.Y - prevNode.Y;
            float angleDeg = (float)(Math.Atan2(dy, dx) * (180.0 / Math.PI)) - 90f;

            GraphicsState state = g.Save();
            g.TranslateTransform(cx, cy);
            g.RotateTransform(angleDeg);

            // Draw charm image if available (crisp cutouts with clean alpha)
            if (CharmImages.ContainsKey(ActiveCharmId))
            {
                Image img = CharmImages[ActiveCharmId];
                float w = cr * 2.3f;
                float h = ((float)img.Height / img.Width) * w;

                g.DrawImage(img, -w / 2, 0, w, h);
            }
            else
            {
                RectangleF charmRect = new RectangleF(-cr, 0, cr * 2, cr * 2.1f);
                using (GraphicsPath path = new GraphicsPath())
                {
                    path.AddEllipse(charmRect);
                    using (PathGradientBrush pgb = new PathGradientBrush(path))
                    {
                        pgb.CenterColor = Color.FromArgb(255, 255, 255);
                        pgb.SurroundColors = new Color[] { charm.PrimaryColor };
                        pgb.CenterPoint = new PointF(-cr * 0.3f, cr * 0.5f);
                        g.FillEllipse(pgb, charmRect);
                    }
                }

                using (Pen borderPen = new Pen(Color.FromArgb(20, 20, 20), 2.0f * s))
                {
                    g.DrawEllipse(borderPen, charmRect);
                }

                // Face / detail markings
                using (Brush whiteBrush = new SolidBrush(Color.White))
                {
                    g.FillEllipse(whiteBrush, -cr * 0.6f, cr * 0.4f, cr * 1.2f, cr * 1.1f);
                }
                using (Brush pupilBrush = new SolidBrush(Color.Black))
                {
                    g.FillEllipse(pupilBrush, -cr * 0.35f, cr * 0.65f, cr * 0.25f, cr * 0.25f);
                    g.FillEllipse(pupilBrush, cr * 0.1f, cr * 0.65f, cr * 0.25f, cr * 0.25f);
                }
            }

            g.Restore(state);
        }

        // Win32 Hit-Testing: Allows clicking through to underlying windows everywhere except the charm!
        const int WM_NCHITTEST = 0x84;
        const int HTTRANSPARENT = -1;
        const int HTCLIENT = 1;

        public bool IsOverCharm(int clientX, int clientY)
        {
            if (Points == null || Points.Count < 2) return false;
            RopePoint lastNode = Points[Points.Count - 1];
            float s = (float)ScaleFactor;
            float cr = 34f * s;

            // Charm center hangs below lastNode
            float charmCenterX = (float)lastNode.X;
            float charmCenterY = (float)lastNode.Y + (cr * 0.95f);

            double dx = clientX - charmCenterX;
            double dy = clientY - charmCenterY;
            double distBody = Math.Sqrt(dx * dx + dy * dy);
            if (distBody <= cr * 1.25f) return true;

            // Also check near attachment loop
            double dNodeX = clientX - lastNode.X;
            double dNodeY = clientY - lastNode.Y;
            double distNode = Math.Sqrt(dNodeX * dNodeX + dNodeY * dNodeY);
            if (distNode <= cr * 0.95f) return true;

            return false;
        }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == WM_NCHITTEST)
            {
                try
                {
                    // If dragging the charm, keep capturing mouse input continuously
                    if (IsDragging)
                    {
                        m.Result = (IntPtr)HTCLIENT;
                        return;
                    }

                    if (this.IsHandleCreated && Points != null && Points.Count >= 2)
                    {
                        int p = m.LParam.ToInt32();
                        int screenX = unchecked((short)(p & 0xFFFF));
                        int screenY = unchecked((short)((p >> 16) & 0xFFFF));
                        Point clientPt = this.PointToClient(new Point(screenX, screenY));

                        if (IsOverCharm(clientPt.X, clientPt.Y))
                        {
                            m.Result = (IntPtr)HTCLIENT;
                            return;
                        }
                        else
                        {
                            // Pass ALL mouse clicks, double-clicks, and hover straight through to the underlying window!
                            // This allows browser close 'X', minimize, tabs, links, and window menus to work 100%!
                            m.Result = (IntPtr)HTTRANSPARENT;
                            return;
                        }
                    }
                }
                catch { }
            }
            base.WndProc(ref m);
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            base.OnMouseDown(e);
            if (e.Button == MouseButtons.Left && Points.Count > 0)
            {
                if (IsOverCharm(e.X, e.Y))
                {
                    IsDragging = true;
                    DragIndex = Points.Count - 1;
                    DragTarget = new PointF(e.X, e.Y);
                    LastMousePos = e.Location;
                    LastMouseTime = DateTime.UtcNow;
                    DragVelocity = PointF.Empty;
                    Wake();
                }
            }
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            base.OnMouseMove(e);
            DateTime now = DateTime.UtcNow;
            double dt = (now - LastMouseTime).TotalSeconds;

            if (dt > 0.005)
            {
                DragVelocity = new PointF((float)((e.X - LastMousePos.X) / dt), (float)((e.Y - LastMousePos.Y) / dt));
                LastMousePos = e.Location;
                LastMouseTime = now;
            }

            if (IsDragging)
            {
                DragTarget = new PointF(e.X, e.Y);
                Wake();
            }
            else
            {
                // Magnetic mode: subtle attraction
                if (HangMode == "magnetic" && Points.Count > 0)
                {
                    RopePoint last = Points[Points.Count - 1];
                    double dist = Math.Sqrt(Math.Pow(e.X - last.X, 2) + Math.Pow(e.Y - last.Y, 2));
                    if (dist < 100)
                    {
                        Nudge((e.X - last.X) * 0.2, 0);
                    }
                }
            }
        }

        protected override void OnMouseUp(MouseEventArgs e)
        {
            base.OnMouseUp(e);
            if (IsDragging && DragIndex.HasValue)
            {
                IsDragging = false;
                RopePoint p = Points[DragIndex.Value];
                p.OldX = p.X - DragVelocity.X * FIXED_DT;
                p.OldY = p.Y - DragVelocity.Y * FIXED_DT;
                DragIndex = null;
                Wake();
            }
        }

        protected override void OnMouseDoubleClick(MouseEventArgs e)
        {
            base.OnMouseDoubleClick(e);
            if (IsOverCharm(e.X, e.Y))
            {
                Nudge(600, -80);
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                if (trayIcon != null)
                {
                    trayIcon.Visible = false;
                    trayIcon.Dispose();
                }
                if (animTimer != null) animTimer.Dispose();
            }
            base.Dispose(disposing);
        }
    }

    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
                Application.ThreadException += (s, e) => {
                    try { File.AppendAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "hangly_error.log"), e.Exception.ToString() + Environment.NewLine); } catch { }
                };
                AppDomain.CurrentDomain.UnhandledException += (s, e) => {
                    try { File.AppendAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "hangly_error.log"), e.ExceptionObject.ToString() + Environment.NewLine); } catch { }
                };

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new HanglyForm());
            }
            catch (Exception ex)
            {
                string logFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "hangly_error.log");
                File.WriteAllText(logFile, ex.ToString());
                MessageBox.Show(ex.Message, "Hangly Startup Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
