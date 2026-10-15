import UIKit
import Capacitor
import WebKit

class PlannerViewController: CAPBridgeViewController {
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        applySafeArea()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in self?.applySafeArea() }
        #if DEBUG
        checkLaunch(attempt: 0)
        #endif
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        applySafeArea()
    }

    private func applySafeArea() {
        let insets = view.safeAreaInsets
        let script = """
        if(document.documentElement){
          document.documentElement.style.setProperty('--native-safe-top','\(insets.top)px');
          document.documentElement.style.setProperty('--native-safe-right','\(insets.right)px');
          document.documentElement.style.setProperty('--native-safe-bottom','\(insets.bottom)px');
          document.documentElement.style.setProperty('--native-safe-left','\(insets.left)px');
          dispatchEvent(new Event('resize'));
        }
        """
        webView?.evaluateJavaScript(script, completionHandler: nil)
    }

    #if DEBUG
    private func checkLaunch(attempt: Int) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            guard let self = self else { return }
            self.applySafeArea()
            let script = """
            JSON.stringify({stage:window.plannerBoot?.stage||'no-boot-script',error:window.plannerBoot?.error||null,ready:window.plannerBoot?.stage==='ready',headerTop:document.querySelector('header')?.getBoundingClientRect().top,frameReady:!!document.getElementById('plannerFrame')?.contentWindow?.plannerAdapter})
            """
            self.webView?.evaluateJavaScript(script) { value, error in
                let report = (value as? String) ?? "{\"ready\":false,\"stage\":\"javascript-unavailable\"}"
                let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
                try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                try? report.write(to: directory.appendingPathComponent("launch-diagnostics.json"), atomically: true, encoding: .utf8)
                NSLog("Planner launch: %@", report)
                if let error = error { NSLog("Planner evaluation: %@", error.localizedDescription) }
                if !report.contains("\"ready\":true") && attempt < 20 { self.checkLaunch(attempt: attempt + 1) }
            }
        }
    }
    #endif
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = PlannerViewController()
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
