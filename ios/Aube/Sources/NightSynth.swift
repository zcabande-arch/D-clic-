import AVFoundation
import Foundation

/// Fabrique les sons en direct (pluie, vagues, oiseaux, carillon), comme la version web,
/// et calcule leur volume d'après l'heure : aucune minuterie n'est nécessaire, même écran verrouillé.
final class NightSynth {
    var sampleRate: Double = 44100
    /// Coupé depuis l'écran verrouillé (bouton pause) pendant l'endormissement.
    var sleepMuted = false

    private let lock = NSLock()
    private var plan: NightPlan?
    private var sleepVoice: AmbientVoice?
    private var wakeVoice: AmbientVoice?
    private var dither = XorShift(seed: 0x9E3779B9)

    func setPlan(_ p: NightPlan?) {
        lock.lock()
        defer { lock.unlock() }
        plan = p
        if let p {
            sleepVoice = p.sleepSnd == "none" ? nil : AmbientVoice(name: p.sleepSnd, sampleRate: sampleRate)
            wakeVoice = AmbientVoice(name: p.wakeSnd, sampleRate: sampleRate)
        } else {
            sleepVoice = nil
            wakeVoice = nil
        }
    }

    /// Volumes (endormissement, aube) à l'instant t, en ms depuis 1970.
    private func gains(at t: Double) -> (Float, Float) {
        guard let p = plan else { return (0, 0) }
        var s = 0.0
        if p.sleepSnd != "none", !sleepMuted, t < p.sunEnd, p.sunEnd > p.t0 {
            let prog = min(1, max(0, (t - p.t0) / (p.sunEnd - p.t0)))
            let fadeIn = min(1, max(0, (t - p.t0) / 2000))
            s = p.vol * 0.5 * (1 - prog) * fadeIn
        }
        var w = 0.0
        let target = max(0.003, p.vol * 0.9)
        if t >= p.dawnStart {
            if t < p.wake {
                // Montée exponentielle : d'abord presque rien, puis de plus en plus fort, comme la lumière.
                let prog = (t - p.dawnStart) / max(1, p.wake - p.dawnStart)
                w = 0.002 * pow(target / 0.002, prog)
            } else if t < p.wake + AlarmEngine.ringLimit {
                w = target
            }
        }
        return (Float(s), Float(w))
    }

    func render(frames: Int, into buffers: UnsafeMutableAudioBufferListPointer) {
        lock.lock()
        defer { lock.unlock() }
        let now = Date().timeIntervalSince1970 * 1000
        let (s0, w0) = gains(at: now)
        let (s1, w1) = gains(at: now + Double(frames) / sampleRate * 1000)
        let channels = buffers.map { UnsafeMutableBufferPointer<Float>($0) }
        let n = Float(max(1, frames))
        for i in 0..<frames {
            let k = Float(i) / n
            let gs = s0 + (s1 - s0) * k
            let gw = w0 + (w1 - w0) * k
            var v: Float = 0
            if gs > 0, let sv = sleepVoice { v += sv.next() * gs }
            if gw > 0, let wv = wakeVoice { v += wv.next() * gw }
            // Souffle inaudible (-100 dB) : le son ne s'arrête jamais complètement pendant la nuit.
            v += (dither.unit() * 2 - 1) * 0.00001
            v = max(-1, min(1, v))
            for ch in channels where i < ch.count { ch[i] = v }
        }
    }
}

struct XorShift {
    private var s: UInt32
    init(seed: UInt32) { s = seed == 0 ? 1 : seed }
    mutating func next() -> UInt32 {
        s ^= s << 13
        s ^= s >> 17
        s ^= s << 5
        return s
    }
    /// Nombre entre 0 et 1.
    mutating func unit() -> Float { Float(next() >> 8) / Float(1 << 24) }
}

/// Une ambiance sonore : bruit rose filtré (pluie, vagues), chants d'oiseaux ou carillon.
final class AmbientVoice {
    private enum Kind { case pluie, vagues, oiseaux, carillon }

    private struct Chirp { var start: Int; var base: Float; var ratio: Float; var phase: Float }
    private struct Partial { var start: Int; var freq: Float; var amp: Float; var phase: Float }

    private static let penta: [Float] = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]

    private let kind: Kind
    private let sr: Float
    private var rng = XorShift(seed: UInt32.random(in: 1...UInt32.max))
    private var t = 0
    private var nextEvent = 0

    // bruit rose + filtre passe-bas
    private var p0: Float = 0, p1: Float = 0, p2: Float = 0
    private var fb0: Float = 0, fb1: Float = 0, fb2: Float = 0, fa1: Float = 0, fa2: Float = 0
    private var x1: Float = 0, x2: Float = 0, y1: Float = 0, y2: Float = 0
    private var lfoPhase: Float = 0

    private var chirps: [Chirp] = []
    private var partials: [Partial] = []

    init(name: String, sampleRate: Double) {
        switch name {
        case "pluie": kind = .pluie
        case "vagues": kind = .vagues
        case "carillon": kind = .carillon
        default: kind = .oiseaux
        }
        sr = Float(sampleRate)
        chirps.reserveCapacity(16)
        partials.reserveCapacity(16)
        setLowpass(kind == .pluie ? 2200 : 650)
    }

    private func setLowpass(_ fc: Float) {
        let w0 = 2 * Float.pi * fc / sr
        let alpha = sin(w0) / (2 * 0.7071)
        let c = cos(w0)
        let a0 = 1 + alpha
        fb0 = (1 - c) / 2 / a0
        fb1 = (1 - c) / a0
        fb2 = fb0
        fa1 = -2 * c / a0
        fa2 = (1 - alpha) / a0
    }

    private func noise() -> Float {
        let w = rng.unit() * 2 - 1
        p0 = 0.99765 * p0 + w * 0.099
        p1 = 0.963 * p1 + w * 0.2965
        p2 = 0.57 * p2 + w * 1.0526
        let x = (p0 + p1 + p2 + w * 0.1848) * 0.11
        let y = fb0 * x + fb1 * x1 + fb2 * x2 - fa1 * y1 - fa2 * y2
        x2 = x1; x1 = x; y2 = y1; y1 = y
        return y
    }

    private func waves() -> Float {
        lfoPhase += 2 * Float.pi * 0.09 / sr
        if lfoPhase > 2 * Float.pi { lfoPhase -= 2 * Float.pi }
        return noise() * (0.5 + 0.45 * sin(lfoPhase))
    }

    func next() -> Float {
        defer { t += 1 }
        switch kind {
        case .pluie: return noise() * 0.9
        case .vagues: return waves()
        case .oiseaux: return waves() + birds()
        case .carillon: return chimes()
        }
    }

    private func birds() -> Float {
        if t >= nextEvent {
            chirps.removeAll { Float(t - $0.start) / sr > 0.1 }
            let count = 2 + Int(rng.unit() * 4)
            let base = 2400 + rng.unit() * 1800
            for i in 0..<count {
                let offset = Float(i) * (0.09 + rng.unit() * 0.05)
                chirps.append(Chirp(start: t + Int(offset * sr), base: base, ratio: 1.2 + rng.unit() * 0.5, phase: 0))
            }
            nextEvent = t + Int((0.5 + rng.unit() * 1.8) * sr)
        }
        var out: Float = 0
        for j in chirps.indices {
            let dt = Float(t - chirps[j].start) / sr
            if dt < 0 || dt > 0.09 { continue }
            let f = chirps[j].base * pow(chirps[j].ratio, min(dt, 0.07) / 0.07)
            chirps[j].phase += 2 * Float.pi * f / sr
            let env: Float = dt < 0.015 ? 0.18 * dt / 0.015 : 0.18 * pow(0.001 / 0.18, (dt - 0.015) / 0.075)
            out += sin(chirps[j].phase) * env
        }
        return out
    }

    private func chimes() -> Float {
        if t >= nextEvent {
            partials.removeAll { Float(t - $0.start) / sr > 3 }
            let f = Self.penta[min(Self.penta.count - 1, Int(rng.unit() * Float(Self.penta.count)))]
            partials.append(Partial(start: t, freq: f, amp: 0.25, phase: 0))
            partials.append(Partial(start: t, freq: f * 2.01, amp: 0.05, phase: 0))
            nextEvent = t + Int((0.7 + rng.unit() * 0.9) * sr)
        }
        var out: Float = 0
        for j in partials.indices {
            let dt = Float(t - partials[j].start) / sr
            if dt > 3 { continue }
            partials[j].phase += 2 * Float.pi * partials[j].freq / sr
            if partials[j].phase > 2 * Float.pi { partials[j].phase -= 2 * Float.pi }
            let a = partials[j].amp
            let env: Float = dt < 0.01 ? a * dt / 0.01 : a * pow(0.001 / a, (dt - 0.01) / 2.99)
            out += sin(partials[j].phase) * env
        }
        return out
    }
}
