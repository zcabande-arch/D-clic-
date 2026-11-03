import ActivityKit
import AlarmKit
import AppIntents
import SwiftUI
import UserNotifications

/// Filet de sécurité à l'heure du réveil, au cas où le son de la nuit aurait été coupé
/// (appel, autre app qui prend le son, téléphone redémarré…).
/// - iOS 26 et plus : une vraie alarme système (AlarmKit), qui sonne même en mode silencieux
///   et allume l'écran avec un gros bouton « Arrêter ».
/// - Avant iOS 26 : quelques notifications sonores après l'heure du réveil.
actor AlarmScheduler {
    static let shared = AlarmScheduler()

    private static let notifIDs = (0..<4).map { "aube-reveil-\($0)" }

    func schedule(wakeAt wakeMs: Double, sound: String) async {
        await cancelAll()
        let date = Date(timeIntervalSince1970: wakeMs / 1000)
        guard date > Date() else { return }
        let file = "reveil-\(sound).wav"
        if #available(iOS 26.0, *) {
            if await scheduleSystemAlarm(at: date, soundFile: file) { return }
        }
        await scheduleNotifications(at: date, soundFile: file)
    }

    func cancelAll() async {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: Self.notifIDs)
        center.removeDeliveredNotifications(withIdentifiers: Self.notifIDs)
        if #available(iOS 26.0, *) {
            let manager = AlarmManager.shared
            if let alarms = try? manager.alarms {
                for alarm in alarms { try? manager.cancel(id: alarm.id) }
            }
        }
    }

    @available(iOS 26.0, *)
    private func scheduleSystemAlarm(at date: Date, soundFile: String) async -> Bool {
        let manager = AlarmManager.shared
        do {
            var state = manager.authorizationState
            if state == .notDetermined { state = try await manager.requestAuthorization() }
            guard state == .authorized else { return false }
            let id = UUID()
            let stop = AlarmButton(text: "Arrêter", textColor: .white, systemImageName: "sun.max.fill")
            let alert = AlarmPresentation.Alert(title: "Bonjour", stopButton: stop)
            let attributes = AlarmAttributes<AubeAlarmData>(presentation: AlarmPresentation(alert: alert),
                                                            metadata: AubeAlarmData(),
                                                            tintColor: Color(red: 1, green: 0.48, blue: 0.27))
            let config = AlarmManager.AlarmConfiguration<AubeAlarmData>(
                countdownDuration: nil,
                schedule: .fixed(date),
                attributes: attributes,
                stopIntent: StopAubeIntent(alarmID: id.uuidString),
                secondaryIntent: nil,
                sound: .named(soundFile))
            _ = try await manager.schedule(id: id, configuration: config)
            return true
        } catch {
            print("Aube: alarme système impossible", error)
            return false
        }
    }

    private func scheduleNotifications(at date: Date, soundFile: String) async {
        let center = UNUserNotificationCenter.current()
        let granted = (try? await center.requestAuthorization(options: [.alert, .sound])) ?? false
        guard granted else { return }
        // Le son de l'app sonne déjà à l'heure pile ; les notifications arrivent juste après, au cas où.
        for (i, id) in Self.notifIDs.enumerated() {
            let content = UNMutableNotificationContent()
            content.title = "Bonjour"
            content.body = "C'est l'heure de te lever. Ouvre Aube pour arrêter le réveil."
            content.sound = UNNotificationSound(named: UNNotificationSoundName(soundFile))
            content.interruptionLevel = .timeSensitive
            let fire = date.addingTimeInterval(Double(60 + i * 120))
            let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute, .second], from: fire)
            let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
            try? await center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
        }
    }
}

@available(iOS 26.0, *)
struct AubeAlarmData: AlarmMetadata {}

/// Bouton « Arrêter » de l'alarme système : coupe aussi le son de l'aube dans l'app.
@available(iOS 26.0, *)
struct StopAubeIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Arrêter le réveil"
    static var isDiscoverable: Bool = false

    @Parameter(title: "Alarme")
    var alarmID: String

    init(alarmID: String) { self.alarmID = alarmID }
    init() { self.alarmID = "" }

    @MainActor
    func perform() async throws -> some IntentResult {
        if let id = UUID(uuidString: alarmID) { try? AlarmManager.shared.stop(id: id) }
        AlarmEngine.shared.stop(notify: true)
        return .result()
    }
}
