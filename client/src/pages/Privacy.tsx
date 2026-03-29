/*
 * DotHunter Privacy Policy
 * Matches the dark arcade aesthetic of the landing page
 */

import { Link } from "wouter";

export default function Privacy() {
  return (
    <div style={{ background: "#0a0a1a", color: "#fff", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Navigation */}
      <nav style={{
        padding: "16px 0",
        background: "rgba(10, 10, 26, 0.95)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#00E5FF", boxShadow: "0 0 20px #00E5FF66" }} />
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, background: "linear-gradient(135deg, #00E5FF, #9B6DFF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>DOTHUNTER</span>
          </Link>
          <Link href="/" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
            &larr; Back to Home
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "80px 24px 120px" }}>
        <h1 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: "clamp(32px, 5vw, 44px)",
          fontWeight: 800,
          color: "#fff",
          marginBottom: 8,
        }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", marginBottom: 48 }}>
          Last updated: March 29, 2026
        </p>

        <Section title="Overview">
          DotHunter is a browser-based reaction game. We are committed to protecting your privacy. This policy explains what data we collect (very little) and how we handle it.
        </Section>

        <Section title="Data We Collect">
          <strong style={{ color: "#00E5FF" }}>Game Data (Local Only)</strong> — Your scores, achievements, settings, and game progress are stored exclusively in your browser's local storage. This data never leaves your device and is not transmitted to any server.
          <br /><br />
          <strong style={{ color: "#00E5FF" }}>Account Data (Optional)</strong> — If you choose to sign in to unlock the full game, we store a minimal user profile (name, email) and your purchase status. This data is used solely to verify your purchase and restore your unlock status across sessions.
          <br /><br />
          <strong style={{ color: "#00E5FF" }}>Payment Data</strong> — Payments are processed securely through Stripe. We do not store your credit card number, CVV, or any sensitive payment details. Stripe handles all payment processing in accordance with PCI-DSS standards. We only store a reference identifier to verify your purchase.
        </Section>

        <Section title="Data We Do NOT Collect">
          <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
            <li>We do not use analytics or tracking scripts</li>
            <li>We do not collect device fingerprints</li>
            <li>We do not use advertising SDKs</li>
            <li>We do not sell or share any data with third parties</li>
            <li>We do not track your gameplay behavior on our servers</li>
          </ul>
        </Section>

        <Section title="Cookies">
          If you sign in, we use a single session cookie to maintain your login state. This cookie is strictly functional and is not used for tracking or advertising purposes.
        </Section>

        <Section title="Third-Party Services">
          <strong style={{ color: "#00E5FF" }}>Stripe</strong> — We use Stripe for payment processing. When you make a purchase, you interact directly with Stripe's secure checkout. Please review{" "}
          <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#00E5FF", textDecoration: "underline" }}>
            Stripe's Privacy Policy
          </a>{" "}
          for details on how they handle your payment information.
        </Section>

        <Section title="Children's Privacy">
          DotHunter is a general-audience game. We do not knowingly collect personal information from children under 13. The game can be played entirely without creating an account or providing any personal information.
        </Section>

        <Section title="Data Retention & Deletion">
          Local game data can be cleared at any time using the "Clear all data" option in the game menu. If you have an account and wish to have your data deleted, please contact us and we will remove your information promptly.
        </Section>

        <Section title="Changes to This Policy">
          We may update this privacy policy from time to time. Any changes will be reflected on this page with an updated "Last updated" date.
        </Section>

        <Section title="Contact">
          If you have questions about this privacy policy or your data, please reach out to us at{" "}
          <a href="mailto:privacy@dothuntergame.app" style={{ color: "#00E5FF", textDecoration: "underline" }}>
            privacy@dothuntergame.app
          </a>.
        </Section>

        {/* Back to game CTA */}
        <div style={{ textAlign: "center", marginTop: 64, paddingTop: 40, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/play" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 36px",
            fontFamily: "'Outfit', sans-serif",
            fontSize: 16,
            fontWeight: 700,
            background: "linear-gradient(135deg, #00E5FF, #00B8D4)",
            color: "#0a0a1a",
            borderRadius: 12,
            textDecoration: "none",
            transition: "all 0.3s ease",
          }}>
            Play DotHunter
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: "40px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
          &copy; {new Date().getFullYear()} DotHunter. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 22,
        fontWeight: 700,
        color: "#fff",
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        {title}
      </h2>
      <div style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  );
}
