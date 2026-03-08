import SwiftUI
import WebKit
import UIKit

struct RisoWebView: UIViewRepresentable {

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()

        // Allow camera without requiring a user gesture on every frame
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        // Bridge for navigator.share → UIActivityViewController
        config.userContentController.add(context.coordinator, name: "nativeShare")

        // Inject navigator.share polyfill before any page scripts run
        let script = WKUserScript(
            source: Self.sharePolyfill,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(script)

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.isOpaque = true
        webView.backgroundColor = .black
        webView.uiDelegate = context.coordinator
        context.coordinator.webView = webView

        guard
            let indexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www"),
            let wwwURL   = Bundle.main.url(forResource: "www", withExtension: nil)
        else {
            assertionFailure("www/index.html not found in bundle — add the www folder to the Xcode target")
            return webView
        }
        webView.loadFileURL(indexURL, allowingReadAccessTo: wwwURL)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    // MARK: - navigator.share polyfill

    /// Replaces navigator.share with a version that serialises File objects to
    /// base64 and forwards them to the native message handler "nativeShare".
    private static let sharePolyfill = """
    (function () {
        Object.defineProperty(navigator, 'share', {
            configurable: true,
            value: async function (data) {
                if (!data || !data.files || data.files.length === 0) return;
                const fileData = await Promise.all(
                    Array.from(data.files).map(file => new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload  = e => resolve({
                            name: file.name,
                            type: file.type || 'image/png',
                            data: e.target.result.split(',')[1]
                        });
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    }))
                );
                window.webkit.messageHandlers.nativeShare.postMessage({ files: fileData });
            }
        });
    })();
    """

    // MARK: - Coordinator

    class Coordinator: NSObject, WKScriptMessageHandler, WKUIDelegate {
        weak var webView: WKWebView?

        // MARK: WKScriptMessageHandler

        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard
                message.name == "nativeShare",
                let body  = message.body as? [String: Any],
                let files = body["files"] as? [[String: Any]]
            else { return }

            let images: [UIImage] = files.compactMap { file in
                guard
                    let base64 = file["data"] as? String,
                    let data   = Data(base64Encoded: base64),
                    let image  = UIImage(data: data)
                else { return nil }
                return image
            }

            guard !images.isEmpty else { return }

            DispatchQueue.main.async { [weak self] in
                let vc = UIActivityViewController(activityItems: images, applicationActivities: nil)
                // iPad requires a popover anchor
                if let popover = vc.popoverPresentationController {
                    popover.sourceView = self?.webView
                    popover.sourceRect = CGRect(
                        x: (self?.webView?.bounds.midX ?? 0), y: 0, width: 1, height: 1
                    )
                }
                self?.topViewController()?.present(vc, animated: true)
            }
        }

        // MARK: WKUIDelegate — grant camera permission to the local page

        func webView(
            _ webView: WKWebView,
            requestMediaCapturePermissionFor origin: WKSecurityOrigin,
            initiatedByFrame frame: WKFrameInfo,
            type: WKMediaCaptureType,
            decisionHandler: @escaping (WKPermissionDecision) -> Void
        ) {
            decisionHandler(.grant)
        }

        // MARK: Helpers

        private func topViewController() -> UIViewController? {
            guard
                let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                let root  = scene.windows.first?.rootViewController
            else { return nil }
            var top = root
            while let presented = top.presentedViewController { top = presented }
            return top
        }
    }
}
