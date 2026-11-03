"""Fabrique les sons de réveil (30 s max, pour l'alarme système) et l'icône de l'app.
Usage : python3 tools/make_assets.py   (depuis ios/Aube)"""
import wave, numpy as np
from PIL import Image, ImageDraw, ImageFilter

SR, DUR = 22050, 28
rng = np.random.default_rng(7)
n = SR * DUR
t = np.arange(n) / SR


def pink_noise():
    w = rng.uniform(-1, 1, n).astype(np.float64)
    out = np.empty(n); b0 = b1 = b2 = 0.0
    for i in range(n):
        x = w[i]; b0 = .99765*b0 + x*.099; b1 = .963*b1 + x*.2965; b2 = .57*b2 + x*1.0526
        out[i] = (b0+b1+b2+x*.1848)*.11
    return out

def lowpass(x, fc, q=0.7071):
    w0 = 2*np.pi*fc/SR; a = np.sin(w0)/(2*q); c = np.cos(w0); a0 = 1+a
    b = [(1-c)/2/a0, (1-c)/a0, (1-c)/2/a0]; aa = [-2*c/a0, (1-a)/a0]
    y = np.zeros_like(x); x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        v = b[0]*x[i]+b[1]*x1+b[2]*x2-aa[0]*y1-aa[1]*y2; x2, x1, y2, y1 = x1, x[i], y1, v; y[i] = v
    return y

PN = pink_noise()
def waves(): return lowpass(PN, 650) * (0.5 + 0.45*np.sin(2*np.pi*0.09*t + 1.2))
def rain(): return lowpass(PN, 2200) * 0.9

def birds():
    out = waves() * 0.6; s = 0.2
    while s < DUR - 1:
        k = 2 + rng.integers(0, 4); base = 2400 + rng.random()*1800
        for i in range(k):
            st = s + i*(.09 + rng.random()*.05); ratio = 1.2 + rng.random()*.5
            i0 = int(st*SR); m = int(.1*SR); dt = np.arange(m)/SR
            f = base*ratio**(np.minimum(dt, .07)/.07); ph = 2*np.pi*np.cumsum(f)/SR
            env = np.where(dt < .015, .18*dt/.015, .18*(.001/.18)**((dt-.015)/.075)); env[dt > .09] = 0
            out[i0:i0+m] += (np.sin(ph)*env)[:max(0, min(m, n-i0))]
        s += .5 + rng.random()*1.8
    return out

def chimes():
    out = np.zeros(n); s = 0.1; P = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]
    while s < DUR - .5:
        f = P[rng.integers(0, len(P))]; i0 = int(s*SR); m = min(int(3*SR), n-i0); dt = np.arange(m)/SR
        for mul, a in ((1, .25), (2.01, .05)):
            env = np.where(dt < .01, a*dt/.01, a*(.001/a)**((dt-.01)/2.99))
            out[i0:i0+m] += np.sin(2*np.pi*f*mul*dt)*env
        s += .7 + rng.random()*.9
    return out

def save(name, x):
    fade = int(.3*SR); x = x.copy(); x[:fade] *= np.linspace(0, 1, fade); x[-fade:] *= np.linspace(1, 0, fade)
    x = x / np.max(np.abs(x)) * 0.89
    with wave.open(f"Resources/Sounds/reveil-{name}.wav", "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x*32767).astype("<i2").tobytes())

save("oiseaux", birds()); save("carillon", chimes()); save("vagues", waves()); save("pluie", rain())

# Icône : soleil levant sur fond nuit
S = 1024
img = Image.new("RGB", (S, S), (7, 6, 11))
glow = Image.new("RGB", (S, S), (0, 0, 0)); g = ImageDraw.Draw(glow)
for r, col in ((520, (106, 75, 216)), (420, (178, 56, 126)), (320, (224, 50, 74))):
    g.ellipse((S/2-r, S*0.78-r, S/2+r, S*0.78+r), fill=col)
glow = glow.filter(ImageFilter.GaussianBlur(120))
img = Image.blend(img, glow, 0.75)
sun = Image.new("L", (S, S), 0); ImageDraw.Draw(sun).ellipse((S/2-210, S*0.62-210, S/2+210, S*0.62+210), fill=255)
grad = Image.new("RGB", (S, S)); gd = ImageDraw.Draw(grad)
for y in range(S):
    k = min(1, max(0, (y - S*0.42) / (S*0.42)))
    gd.line((0, y, S, y), fill=(255, int(210 - 150*k), int(154 - 110*k)))
img.paste(grad, (0, 0), sun.filter(ImageFilter.GaussianBlur(2)))
d = ImageDraw.Draw(img); d.rectangle((0, int(S*0.70), S, S), fill=(7, 6, 11))
d.rectangle((0, int(S*0.70), S, int(S*0.70)+6), fill=(255, 191, 107))
img.save("Resources/Assets.xcassets/AppIcon.appiconset/icon-1024.png")
