import UIKit
import Capacitor

final class NextSessionBridgeViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        // Die Web-Inhalte verwalten ihre Safe Areas selbst. UIKit darf deshalb
        // weder zusätzliche Insets noch den Gummi-/Überzieheffekt hinzufügen.
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceVertical = false

        // Aktiviert die vertraute iOS-Geste vom linken Rand für Einträge im
        // Browser-Verlauf, den die React-Navigation über pushState pflegt.
        webView?.allowsBackForwardNavigationGestures = true
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = NextSessionBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
