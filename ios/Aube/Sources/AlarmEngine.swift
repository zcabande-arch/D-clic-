import AVFoundation
import MediaPlayer
import UIKit

/// La nuit telle que l'interface l'a réglée. Les heures sont en millisecondes depuis 1970 (comme Date.now() en JS).
struct NightPlan: Codable {
    var t0: Double
    var sunEnd: Double
    var dawnStart: Double
    var wake: Double
    var sleepSnd: String
    var wakeSnd: String
    var vol: Double
    var keepScreenOn: Bool?
}

/// Joue toute la nuit en arrière-plan (mode audio d'iOS), écran verrouillé compris :
/// son pour s'endormir qui s'éteint, silence, puis son de l'aube qui monte jusqu'au réveil.
final class AlarmEngine {
    static let shared = AlarmEngine()

    /// Combien de temps le réveil sonne au maximum si personne ne l'arrête.
    static let ringLimit: Double = 30 * 60 * 1000

    private(set) var plan: NightPlan?
    var onStopped: (() -> Void)?
    var isActive: Bool { plan != nil }

    private let synth = NightSynth()
    private var engine: AVAudioEngine?
    private var watchdog: Timer?
    private var observers: [NSObjectProtocol] = []
    private var remoteReady = false

    private init() {}

    // MARK: - Commandes venant de l'interface

    func start(_ newPlan: NightPlan) {
        plan = newPlan
        synth.setPlan(newPlan)
        synth.sleepMuted = false
        activateSession()
        startEngine()
        observe()
        setupRemote()
        updateNowPlaying()
        UIApplication.shared.isIdleTimerDisabled = newPlan.keepScreenOn ?? false
        watchdog?.invalidate()
        watchdog = Timer.scheduledTimer(withTimeInterval: 10, repeats: true) { [weak self] _ in self?.tick() }
        Task { await AlarmScheduler.shared.schedule(wakeAt: newPlan.wake, sound: newPlan.wakeSnd) }
    }

    func snooze(until wake: Double) {
        guard var p = plan else { return }
        let now = Date().timeIntervalSince1970 * 1000
        p.sunEnd = min(p.sunEnd, now)
        p.dawnStart = now
        p.wake = wake
        plan = p
        synth.setPlan(p)
        updateNowPlaying()
        Task { await AlarmScheduler.shared.schedule(wakeAt: wake, sound: p.wakeSnd) }
    }

    func stop(notify: Bool) {
        guard plan != nil else { return }
        plan = nil
        synth.setPlan(nil)
        watchdog?.invalidate()
        watchdog = nil
        engine?.stop()
        engine = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        UIApplication.shared.isIdleTimerDisabled = false
        Task { await AlarmScheduler.shared.cancelAll() }
        if notify { onStopped?() }
    }

    // MARK: - Audio

    private func activateSession() {
        let s = AVAudioSession.sharedInstance()
        try? s.setCategory(.playback, mode: .default, options: [])
        try? s.setActive(true)
    }

    private func startEngine() {
        if let engine, engine.isRunning { return }
        let e = engine ?? makeEngine()
        engine = e
        do { try e.start() } catch { print("Aube: moteur audio non démarré", error) }
    }

    private func makeEngine() -> AVAudioEngine {
        let e = AVAudioEngine()
        let out = e.outputNode.inputFormat(forBus: 0)
        let sr = out.sampleRate > 0 ? out.sampleRate : 44100
        let format = AVAudioFormat(standardFormatWithSampleRate: sr, channels: 2)!
        synth.sampleRate = sr
        let synth = self.synth
        let node = AVAudioSourceNode(format: format) { _, _, frameCount, bufferList -> OSStatus in
            synth.render(frames: Int(frameCount), into: UnsafeMutableAudioBufferListPointer(bufferList))
            return noErr
        }
        e.attach(node)
        e.connect(node, to: e.mainMixerNode, format: format)
        e.mainMixerNode.outputVolume = 1
        e.prepare()
        return e
    }

    private func observe() {
        guard observers.isEmpty else { return }
        let nc = NotificationCenter.default
        let session = AVAudioSession.sharedInstance()
        observers.append(nc.addObserver(forName: AVAudioSession.interruptionNotification, object: session, queue: .main) { [weak self] note in
            guard let self, self.plan != nil,
                  let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                  AVAudioSession.InterruptionType(rawValue: raw) == .ended else { return }
            self.activateSession()
            self.startEngine()
        })
        observers.append(nc.addObserver(forName: AVAudioSession.mediaServicesWereResetNotification, object: session, queue: .main) { [weak self] _ in
            guard let self, self.plan != nil else { return }
            self.engine = nil
            self.activateSession()
            self.startEngine()
        })
        observers.append(nc.addObserver(forName: .AVAudioEngineConfigurationChange, object: nil, queue: .main) { [weak self] _ in
            guard let self, self.plan != nil else { return }
            self.engine?.stop()
            self.engine = nil
            self.startEngine()
        })
    }

    /// Toutes les 10 s : relance le son s'il s'est arrêté, coupe le réveil après 30 min.
    private func tick() {
        guard let p = plan else { return }
        let now = Date().timeIntervalSince1970 * 1000
        if now > p.wake + Self.ringLimit { stop(notify: true); return }
        if engine?.isRunning != true { activateSession(); startEngine() }
    }

    // MARK: - Écran verrouillé (lecture en cours)

    private func updateNowPlaying() {
        guard let p = plan else { return }
        let f = DateFormatter()
        f.dateFormat = "HH:mm"
        let wake = f.string(from: Date(timeIntervalSince1970: p.wake / 1000))
        MPNowPlayingInfoCenter.default().nowPlayingInfo = [
            MPMediaItemPropertyTitle: "Aube",
            MPMediaItemPropertyArtist: "Réveil à \(wake)",
            MPNowPlayingInfoPropertyPlaybackRate: 1.0,
        ]
    }

    private func setupRemote() {
        guard !remoteReady else { return }
        remoteReady = true
        let cc = MPRemoteCommandCenter.shared()
        // Pause sur l'écran verrouillé : la nuit, coupe seulement le son d'endormissement ;
        // à l'aube ou pendant la sonnerie, arrête le réveil.
        let pause: (MPRemoteCommandEvent) -> MPRemoteCommandHandlerStatus = { [weak self] _ in
            guard let self, let p = self.plan else { return .noActionableNowPlayingItem }
            let now = Date().timeIntervalSince1970 * 1000
            if now >= p.dawnStart { self.stop(notify: true) } else { self.synth.sleepMuted = true }
            return .success
        }
        cc.pauseCommand.addTarget(handler: pause)
        cc.togglePlayPauseCommand.addTarget(handler: pause)
        cc.playCommand.addTarget { [weak self] _ in
            self?.synth.sleepMuted = false
            return .success
        }
        cc.nextTrackCommand.isEnabled = false
        cc.previousTrackCommand.isEnabled = false
    }
}
