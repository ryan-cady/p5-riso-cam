import SwiftUI

struct ContentView: View {
    var body: some View {
        RisoWebView()
            .ignoresSafeArea()
            .background(Color.black)
            .preferredColorScheme(.dark)
    }
}
