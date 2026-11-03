import SwiftUI
import WebKit

/// Affiche l'interface (index.html) et relie ses boutons au moteur natif.
struct WebContainer: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(context.coordinator, name: "aube")

        let webView = WKWebView(frame: .zero, configuration: config)
        let bg = UIColor(red: 7 / 255, green: 6 / 255, blue: 11 / 255, alpha: 1)
        webView.isOpaque = false
        webView.backgroundColor = bg
        webView.scrollView.backgroundColor = bg
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        webView.navigationDelegate = context.coordinator
        context.coordinator.webView = webView
        context.coordinator.load()

        AlarmEngine.shared.onStopped = { [weak webView] in
            webView?.evaluateJavaScript("window.aubeNativeEvent&&window.aubeNativeEvent({type:'stopped'})")
        }
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        weak var webView: WKWebView?

        /// Recharge la page en lui indiquant la nuit en cours (utile si iOS a vidé la page pendant la nuit).
        func load() {
            guard let webView, let url = Bundle.main.url(forResource: "index", withExtension: "html") else { return }
            let ucc = webView.configuration.userContentController
            ucc.removeAllUserScripts()
            var active = "null"
            if let plan = AlarmEngine.shared.plan,
               let data = try? JSONEncoder().encode(plan),
               let json = String(data: data, encoding: .utf8) {
                active = json
            }
            let js = "window.AUBE_NATIVE={v:1,active:\(active)};"
            ucc.addUserScript(WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: true))
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { load() }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let body = message.body as? [String: Any], let cmd = body["cmd"] as? String else { return }
            let engine = AlarmEngine.shared
            switch cmd {
            case "start":
                guard let dict = body["plan"],
                      let data = try? JSONSerialization.data(withJSONObject: dict),
                      let plan = try? JSONDecoder().decode(NightPlan.self, from: data) else { return }
                engine.start(plan)
            case "snooze":
                if let wake = body["wake"] as? Double { engine.snooze(until: wake) }
            case "stop":
                engine.stop(notify: false)
            default:
                break
            }
        }
    }
}
