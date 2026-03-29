/*
 * DotHunter Landing Page
 * Design: Dark Arcade / Neon Minimalism
 * Typography: Outfit (display) + DM Sans (body)
 * Palette: Deep navy (#0a0a1a), Cyan (#00E5FF), Magenta (#E84393), Purple (#9B6DFF)
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

// CDN image URLs
const IMAGES = {
  hero: "https://d2xsxph8kpxj0f.cloudfront.net/310519663400398716/QPZ38V44uCHsXodpEsaRTJ/dothunter-hero-9Wf3w2Uh8b7Ybds5ge2Bv9.webp",
  gameplay1: "https://d2xsxph8kpxj0f.cloudfront.net/310519663400398716/QPZ38V44uCHsXodpEsaRTJ/dothunter-gameplay1-fcJVZxSiRNyPRYJBdLYFAL.webp",
  gameplay2: "https://d2xsxph8kpxj0f.cloudfront.net/310519663400398716/QPZ38V44uCHsXodpEsaRTJ/dothunter-gameplay2-Msts3n4JybJFZztPvDtMRL.webp",
  action: "https://d2xsxph8kpxj0f.cloudfront.net/310519663400398716/QPZ38V44uCHsXodpEsaRTJ/dothunter-action-gowgRdmzr8j8dz3ytrdVAi.webp",
  banner: "https://d2xsxph8kpxj0f.cloudfront.net/310519663400398716/QPZ38V44uCHsXodpEsaRTJ/dothunter-banner-JxaxoU3SV56SCAiNgopsCn.webp",
  promoVideo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663400398716/QPZ38V44uCHsXodpEsaRTJ/dothunter-promo_51945fcd.mp4",
};

// Floating dot component for background ambiance
function FloatingDot({ delay, size, color, x, y, duration }: { delay: number; size: number; color: string; x: number; y: number; duration: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 ${size * 2}px ${color}66`,
        animation: `floatDot ${duration}s ease-in-out ${delay}s infinite`,
        opacity: 0.4,
        pointerEvents: "none",
      }}
    />
  );
}

// Animated counter for stats
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 2000;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} style={{ fontFamily: "'Outfit', sans-serif", fontSize: 48, fontWeight: 800, color: "#00E5FF" }}>
      {count.toLocaleString()}{suffix}
    </div>
  );
}

// Feature card
function FeatureCard({ icon, title, description, color }: { icon: string; title: string; description: string; color: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${hovered ? color + "66" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 16,
        padding: "32px 28px",
        transition: "all 0.3s ease",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered ? `0 8px 32px ${color}22` : "none",
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{title}</h3>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{description}</p>
    </div>
  );
}

// Game mode card
function ModeCard({ title, subtitle, description, color, image }: { title: string; subtitle: string; description: string; color: string; image?: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: `linear-gradient(135deg, ${color}11, ${color}05)`,
        border: `1px solid ${hovered ? color + "55" : color + "22"}`,
        borderRadius: 20,
        padding: 0,
        overflow: "hidden",
        transition: "all 0.3s ease",
        transform: hovered ? "scale(1.02)" : "scale(1)",
      }}
    >
      {image && (
        <div style={{ height: 200, overflow: "hidden" }}>
          <img src={image} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />
        </div>
      )}
      <div style={{ padding: "24px 28px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>{subtitle}</div>
        <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 12 }}>{title}</h3>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{description}</p>
      </div>
    </div>
  );
}

export default function Landing() {
  const [scrollY, setScrollY] = useState(0);
  const [navSolid, setNavSolid] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      setNavSolid(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Floating dots config
  const dots = [
    { delay: 0, size: 8, color: "#00E5FF", x: 5, y: 15, duration: 6 },
    { delay: 1.5, size: 12, color: "#E84393", x: 90, y: 25, duration: 8 },
    { delay: 0.8, size: 6, color: "#9B6DFF", x: 15, y: 70, duration: 7 },
    { delay: 2, size: 10, color: "#00E5FF", x: 80, y: 60, duration: 5 },
    { delay: 0.5, size: 14, color: "#E84393", x: 50, y: 10, duration: 9 },
    { delay: 1, size: 7, color: "#9B6DFF", x: 70, y: 80, duration: 6 },
    { delay: 3, size: 9, color: "#00E5FF", x: 25, y: 45, duration: 7 },
    { delay: 2.5, size: 11, color: "#E84393", x: 95, y: 90, duration: 8 },
  ];

  return (
    <div style={{ background: "#0a0a1a", color: "#fff", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", overflowX: "hidden" }}>
      {/* Global CSS animations */}
      <style>{`
        @keyframes floatDot {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
          50% { transform: translateY(-20px) scale(1.2); opacity: 0.7; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px #00E5FF44; }
          50% { box-shadow: 0 0 40px #00E5FF88; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 16px 40px;
          font-family: 'Outfit', sans-serif;
          font-size: 18px;
          font-weight: 700;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
        }
        .cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0, 229, 255, 0.3);
        }
        .cta-primary {
          background: linear-gradient(135deg, #00E5FF, #00B8D4);
          color: #0a0a1a;
        }
        .cta-secondary {
          background: transparent;
          color: #00E5FF;
          border: 2px solid #00E5FF44;
        }
        .cta-secondary:hover {
          border-color: #00E5FF;
          box-shadow: 0 8px 32px rgba(0, 229, 255, 0.15);
        }
        .section-reveal {
          animation: slideUp 0.8s ease-out forwards;
        }
      `}</style>

      {/* Navigation */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: "16px 0",
          background: navSolid ? "rgba(10, 10, 26, 0.95)" : "transparent",
          backdropFilter: navSolid ? "blur(20px)" : "none",
          borderBottom: navSolid ? "1px solid rgba(255,255,255,0.06)" : "none",
          transition: "all 0.3s ease",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#00E5FF", boxShadow: "0 0 20px #00E5FF66", animation: "pulseGlow 2s infinite" }} />
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, background: "linear-gradient(135deg, #00E5FF, #9B6DFF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>DOTHUNTER</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <a href="#features" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 14, fontWeight: 500, transition: "color 0.2s" }}>Features</a>
            <a href="#modes" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 14, fontWeight: 500, transition: "color 0.2s" }}>Game Modes</a>
            <a href="#video" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 14, fontWeight: 500, transition: "color 0.2s" }}>Trailer</a>
            <Link href="/play" className="cta-btn cta-primary" style={{ padding: "10px 24px", fontSize: 14 }}>
              Play Now
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {/* Background image */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${IMAGES.banner})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.3,
          transform: `translateY(${scrollY * 0.3}px)`,
        }} />
        {/* Gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,10,26,0.4) 0%, rgba(10,10,26,0.8) 60%, #0a0a1a 100%)" }} />

        {/* Floating dots */}
        {dots.map((d, i) => <FloatingDot key={i} {...d} />)}

        {/* Hero content */}
        <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth: 800, padding: "0 24px", animation: "slideUp 1s ease-out" }}>
          <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 100, background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)", marginBottom: 24, fontSize: 13, fontWeight: 600, color: "#00E5FF", letterSpacing: 1 }}>
            PLAY FREE IN YOUR BROWSER
          </div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(48px, 8vw, 80px)", fontWeight: 800, lineHeight: 1.05, marginBottom: 20, background: "linear-gradient(135deg, #00E5FF, #9B6DFF, #E84393)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            DOTHUNTER
          </h1>
          <p style={{ fontSize: "clamp(14px, 2vw, 18px)", color: "rgba(255,255,255,0.6)", letterSpacing: 6, textTransform: "uppercase", marginBottom: 24, fontWeight: 500 }}>
            Hunt Every Dot. Miss Nothing.
          </p>
          <p style={{ fontSize: "clamp(16px, 2vw, 20px)", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 40, maxWidth: 600, margin: "0 auto 40px" }}>
            A neon-lit reaction game that tests your speed, focus, and color perception across three intense game modes. How fast can you hunt?
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/play" className="cta-btn cta-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              Play in Browser
            </Link>
            <div className="cta-btn" style={{ padding: "16px 40px", background: "transparent", color: "rgba(255,255,255,0.35)", border: "2px solid rgba(255,255,255,0.12)", cursor: "default", opacity: 0.6 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l18 18M20.5 10.5V4h-6.5" /><path d="M9.5 14.5L3 21" /><path d="M14 10l7-7" /><path d="M3 7v14h14" /></svg>
              Google Play — Coming Soon
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", animation: "floatDot 2s ease-in-out infinite" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: "120px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#00E5FF", letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>WHY DOTHUNTER</div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, color: "#fff", marginBottom: 16 }}>Built for Speed Demons</h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>Every millisecond counts. DotHunter is designed to push your reflexes to the absolute limit.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          <FeatureCard icon="⚡" title="Lightning Reflexes" description="Dots appear and vanish in milliseconds. Each round gets faster, pushing your reaction time to the edge." color="#00E5FF" />
          <FeatureCard icon="🎨" title="Color Perception" description="Color Filter mode challenges you to tap only the right color while decoys try to trick your brain." color="#E84393" />
          <FeatureCard icon="🏆" title="16 Achievements" description="From your first tap to mastering all modes — unlock achievements that prove your skill." color="#9B6DFF" />
          <FeatureCard icon="🎵" title="Satisfying Audio" description="Every tap, miss, and combo triggers crisp sound effects generated in real-time by the Web Audio API." color="#00E5FF" />
          <FeatureCard icon="🌙" title="Dark & Light Themes" description="Play in sleek dark mode or switch to light for daytime sessions. Your eyes, your choice." color="#E84393" />
          <FeatureCard icon="🔒" title="Privacy First" description="Zero data collection. No accounts. No tracking. Your scores stay on your device." color="#9B6DFF" />
        </div>
      </section>

      {/* Game Modes Section */}
      <section id="modes" style={{ padding: "80px 24px 120px", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 0%, rgba(0,229,255,0.02) 50%, transparent 100%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E84393", letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>GAME MODES</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, color: "#fff", marginBottom: 16 }}>Three Ways to Hunt</h2>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>Each mode tests a different cognitive skill. Master all three to become the ultimate DotHunter.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 28 }}>
            <ModeCard
              title="Classic Focus"
              subtitle="Mode 01"
              description="Pure speed. Tap glowing dots as fast as they appear. Each round adds more dots and less time. Simple to learn, impossible to master."
              color="#00E5FF"
              image={IMAGES.hero}
            />
            <ModeCard
              title="Color Filter"
              subtitle="Mode 02"
              description="Only tap the target color. Decoy dots in wrong colors try to trick you. One wrong tap and you lose a life. Think fast, choose faster."
              color="#E84393"
              image={IMAGES.action}
            />
            <ModeCard
              title="Dual Hunt"
              subtitle="Mode 03"
              description="Two target colors at once. Your brain must track multiple targets simultaneously. The ultimate test of split-second decision making."
              color="#9B6DFF"
              image={IMAGES.banner}
            />
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section id="video" style={{ padding: "80px 24px 120px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#9B6DFF", letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>TRAILER</div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, color: "#fff", marginBottom: 16 }}>See It In Action</h2>
        </div>
        <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 0 60px rgba(0,229,255,0.1)" }}>
          <video
            controls
            playsInline
            poster={IMAGES.hero}
            style={{ width: "100%", display: "block", background: "#000" }}
          >
            <source src={IMAGES.promoVideo} type="video/mp4" />
          </video>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: "80px 24px", background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40, textAlign: "center" }}>
          <div>
            <AnimatedCounter target={3} />
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 8, fontWeight: 500 }}>Game Modes</div>
          </div>
          <div>
            <AnimatedCounter target={16} />
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 8, fontWeight: 500 }}>Achievements</div>
          </div>
          <div>
            <AnimatedCounter target={10} />
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 8, fontWeight: 500 }}>Rounds Per Mode</div>
          </div>
          <div>
            <AnimatedCounter target={0} />
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 8, fontWeight: 500 }}>Data Collected</div>
          </div>
        </div>
      </section>

      {/* Phone Mockup Gallery */}
      <section style={{ padding: "120px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#00E5FF", letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>SCREENSHOTS</div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, color: "#fff" }}>Designed for Mobile</h2>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
          <div style={{ width: 280, borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <img src={IMAGES.gameplay1} alt="DotHunter gameplay" style={{ width: "100%", display: "block" }} />
          </div>
          <div style={{ width: 280, borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", marginTop: 40 }}>
            <img src={IMAGES.gameplay2} alt="DotHunter color filter mode" style={{ width: "100%", display: "block" }} />
          </div>
        </div>
      </section>

      {/* Download / CTA Section */}
      <section id="download" style={{ padding: "120px 24px", position: "relative", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(0,229,255,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 10, maxWidth: 700, margin: "0 auto" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#00E5FF", boxShadow: "0 0 60px #00E5FF44", margin: "0 auto 32px", animation: "pulseGlow 2s infinite" }} />
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 800, color: "#fff", marginBottom: 16 }}>Ready to Hunt?</h2>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 40 }}>
            Play instantly in your browser. Google Play release coming soon.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/play" className="cta-btn cta-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              Play Now — Free
            </Link>
            <div className="cta-btn" style={{ padding: "16px 40px", background: "transparent", color: "rgba(255,255,255,0.35)", border: "2px solid rgba(255,255,255,0.12)", cursor: "default", opacity: 0.6 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l18 18M20.5 10.5V4h-6.5" /><path d="M9.5 14.5L3 21" /><path d="M14 10l7-7" /><path d="M3 7v14h14" /></svg>
              Google Play — Coming Soon
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "40px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#00E5FF", boxShadow: "0 0 12px #00E5FF44" }} />
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>DotHunter</span>
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
            Hunt every dot. Miss nothing. Built with care. Zero data collected.
          </p>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 16, marginBottom: 12 }}>
            <Link href="/privacy" style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none", transition: "color 0.2s" }}>Privacy Policy</Link>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
            &copy; {new Date().getFullYear()} DotHunter. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
