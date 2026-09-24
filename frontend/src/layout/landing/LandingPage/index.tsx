import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Navbar,
  Hero,
  ProblemSection,
  Features,
  HowItWorks,
  TechStack,
  CTASection,
  Footer,
} from "../landing-components";
import { LoginModal } from "../../../page/auth/LoginPage";

function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginPath = location.pathname === "/login";
  const [isLoginOpen, setIsLoginOpen] = useState(isLoginPath);

  useEffect(() => {
    setIsLoginOpen(isLoginPath);
  }, [isLoginPath]);

  const handleLoginOpenChange = (open: boolean) => {
    setIsLoginOpen(open);
    if (!open && isLoginPath) {
      navigate("/");
    }
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen font-sans flex flex-col text-slate-900 scroll-smooth">
      <Navbar />
      <main className="grow">
        <section id="hero" className="animate-fadeIn">
          <Hero />
        </section>

        <section id="solution">
          <ProblemSection />
        </section>

        <section id="features">
          <Features />
        </section>

        <section id="how-it-works">
          <HowItWorks />
        </section>

        <TechStack />

        <section id="cta">
          <CTASection />
        </section>
      </main>
      <Footer />
      <LoginModal open={isLoginOpen} onOpenChange={handleLoginOpenChange} />
    </div>
  );
}

export default LandingPage;