import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  FaMicrophone, FaBrain, FaFolderOpen, FaFilePdf, 
  FaChartArea, FaUserShield, FaChartPie, FaCheckCircle, 
  FaHeartbeat, FaInfoCircle, FaFileMedicalAlt, FaLinkedin, FaGithub, FaTwitter 
} from "react-icons/fa";

export default function Landing() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.15 } 
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className="landing-page" style={{ overflow: "hidden" }}>
      {/* HERO SECTION */}
      <section className="hero-section" style={{ padding: "80px 0", position: "relative" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "center" }}>
          <motion.div 
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="hero-content"
          >
            <span style={{ 
              background: "rgba(2, 132, 199, 0.1)", 
              color: "var(--primary-color)", 
              padding: "6px 16px", 
              borderRadius: "20px", 
              fontSize: "13px", 
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              display: "inline-block",
              marginBottom: "20px"
            }}>
              ✨ Advanced Clinical AI
            </span>
            <h1 style={{ fontSize: "48px", lineHeight: "1.15", marginBottom: "20px" }}>
              AI-Powered <span style={{ background: "linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Parkinson's Disease</span> Prediction System
            </h1>
            <p style={{ fontSize: "17px", color: "var(--text-secondary)", marginBottom: "36px", lineHeight: "1.7" }}>
              A high-precision acoustic screening platform that evaluates Parkinson's disease risk using voice micro-vibrations, speech pattern analysis, and machine learning models.
            </p>
            <div style={{ display: "flex", gap: "16px" }}>
              <Link to="/register" className="btn-primary btn-large">Get Started</Link>
              <Link to="/login" className="btn-secondary btn-large">Login Portal</Link>
            </div>
          </motion.div>

          <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            style={{ display: "flex", justifyContent: "center" }}
          >
            {/* SVG Healthcare Brain Waveform Illustration */}
            <svg width="450" height="400" viewBox="0 0 500 450" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#0d9488" stopOpacity="0.8"/>
                </linearGradient>
                <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2"/>
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.2"/>
                </linearGradient>
              </defs>
              <motion.circle 
                animate={{ scale: [1, 1.05, 1] }} 
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                cx="250" cy="225" r="180" fill="url(#grad2)" 
              />
              {/* Voice waves */}
              <motion.path 
                animate={{ d: [
                  "M 100 225 Q 175 125 250 225 T 400 225", 
                  "M 100 225 Q 175 325 250 225 T 400 225",
                  "M 100 225 Q 175 125 250 225 T 400 225"
                ] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                stroke="url(#grad1)" strokeWidth="4" fill="none" 
              />
              <motion.path 
                animate={{ d: [
                  "M 120 225 Q 190 275 250 225 T 380 225",
                  "M 120 225 Q 190 175 250 225 T 380 225",
                  "M 120 225 Q 190 275 250 225 T 380 225"
                ] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                stroke="#4f46e5" strokeWidth="2" strokeDasharray="5,5" fill="none" 
              />
              {/* Brain node shapes */}
              <circle cx="250" cy="150" r="16" fill="#0284c7" />
              <circle cx="180" cy="200" r="12" fill="#0d9488" />
              <circle cx="320" cy="200" r="12" fill="#0d9488" />
              <circle cx="250" cy="225" r="22" fill="#4f46e5" />
              <circle cx="210" cy="270" r="14" fill="#0284c7" />
              <circle cx="290" cy="270" r="14" fill="#0284c7" />
              <line x1="250" y1="150" x2="250" y2="225" stroke="var(--text-light)" strokeWidth="2" />
              <line x1="180" y1="200" x2="250" y2="225" stroke="var(--text-light)" strokeWidth="2" />
              <line x1="320" y1="200" x2="250" y2="225" stroke="var(--text-light)" strokeWidth="2" />
              <line x1="210" y1="270" x2="250" y2="225" stroke="var(--text-light)" strokeWidth="2" />
              <line x1="290" y1="270" x2="250" y2="225" stroke="var(--text-light)" strokeWidth="2" />
            </svg>
          </motion.div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="features-section" style={{ padding: "100px 0", background: "rgba(148, 163, 184, 0.03)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <h2 style={{ fontSize: "36px", marginBottom: "12px" }}>Platform System Features</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "16px", maxWidth: "600px", margin: "0 auto" }}>
              Explore the advanced features engineered for non-invasive voice screening.
            </p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "30px" }}
          >
            {[
              { icon: <FaMicrophone />, title: "Voice-Based Prediction", desc: "Upload or record vocal samples directly using our standard acoustic speech protocol." },
              { icon: <FaBrain />, title: "Machine Learning Models", desc: "Random Forest models classify inputs and calculate confidence probability." },
              { icon: <FaFolderOpen />, title: "Secure History Logs", desc: "Every voice assessment record is stored securely in encrypted Mongo databases." },
              { icon: <FaFilePdf />, title: "Clinical Reports", desc: "Generate and download clinical hospital-style PDF reports with acoustic metrics." },
              { icon: <FaChartArea />, title: "Progress Tracker", desc: "Monitor risk fluctuations and vocal tremor stability over time with charts." },
              { icon: <FaUserShield />, title: "Secure Auth & Access", desc: "Strict JWT authentication with segregated role access for User vs Admin." },
              { icon: <FaChartPie />, title: "Dashboard Insights", desc: "Gain visual medical telemetry on your voice features from deep analysis." }
            ].map((feat, idx) => (
              <motion.div 
                key={idx} 
                variants={itemVariants}
                className="glass-card" 
                style={{ display: "flex", flexDirection: "column", gap: "16px" }}
              >
                <div style={{ 
                  width: "50px", 
                  height: "50px", 
                  background: "rgba(2, 132, 199, 0.12)", 
                  color: "var(--primary-color)", 
                  borderRadius: "12px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  fontSize: "22px"
                }}>
                  {feat.icon}
                </div>
                <h3>{feat.title}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{feat.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works-section" style={{ padding: "100px 0" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <h2 style={{ fontSize: "36px", marginBottom: "12px" }}>How It Works</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "16px" }}>Follow our simple workflow to obtain immediate screening analytics.</p>
          </div>

          <div className="timeline-wrapper">
            <div className="timeline-line"></div>
            {[
              { step: "Step 1", title: "Patient Registration", desc: "Create a secure account with your basic contact profile." },
              { step: "Step 2", title: "Secure Login", desc: "Sign into the platform using role-based authentication." },
              { step: "Step 3", title: "Record or Upload Audio", desc: "Use the Web Recorder or upload a WAV/MP3 speech baseline." },
              { step: "Step 4", title: "Biomarker Extraction", desc: "The microservice extracts 22 micro-vocal properties like jitter & shimmer." },
              { step: "Step 5", title: "AI Model Prediction", desc: "Our trained classifiers calculate risk classification and confidence indices." },
              { step: "Step 6", title: "Download PDF Report", desc: "Receive immediate detailed recommendations and print the PDF log." }
            ].map((item, idx) => (
              <div key={idx} className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <span style={{ fontSize: "12px", fontWeight: "800", color: "var(--text-light)" }}>{item.step}</span>
                  <h3 style={{ margin: "4px 0 10px" }}>{item.title}</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARKINSON'S INFORMATION */}
      <section className="parkinsons-info-section" style={{ padding: "100px 0", background: "rgba(148, 163, 184, 0.03)" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "60px" }}>
          <div>
            <h2 style={{ fontSize: "32px", marginBottom: "20px" }}>Understanding Parkinson's Disease</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
              Parkinson's disease is a progressive neurodegenerative disorder that primarily affects dopamine-producing neurons in a specific area of the brain called the substantia nigra.
            </p>
            <p style={{ color: "var(--text-secondary)", marginBottom: "30px" }}>
              Voice and speech changes, such as decreased volume, hoarseness, and slurred speech (hypokinetic dysarthria), can occur early in the disease progression. These voice changes are often early biomarkers that machine learning models can detect.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "30px" }}>
              <div className="glass-card" style={{ padding: "20px" }}>
                <h4 style={{ color: "var(--primary-color)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <FaHeartbeat /> Key Symptoms
                </h4>
                <ul style={{ paddingLeft: "20px", fontSize: "14px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <li>Tremors in hands or fingers</li>
                  <li>Slow movement (Bradykinesia)</li>
                  <li>Impaired balance & posture</li>
                  <li>Muscle stiffness & rigidity</li>
                  <li>Microscopic speech alterations</li>
                </ul>
              </div>
              
              <div className="glass-card" style={{ padding: "20px" }}>
                <h4 style={{ color: "var(--secondary-color)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <FaInfoCircle /> Lifestyle & Health Tips
                </h4>
                <ul style={{ paddingLeft: "20px", fontSize: "14px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <li>Regular physical exercise</li>
                  <li>Healthy balanced diet (Antioxidants)</li>
                  <li>Vocal speech exercises</li>
                  <li>Cognitive stimulating activities</li>
                  <li>Frequent screening tracker updates</li>
                </ul>
              </div>
            </div>

            <div className="instructions-card" style={{ background: "rgba(245, 158, 11, 0.08)", borderColor: "rgba(245, 158, 11, 0.2)" }}>
              <h4 style={{ color: "var(--orange)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <FaFileMedicalAlt /> IMPORTANT MEDICAL DISCLAIMER
              </h4>
              <p style={{ color: "var(--text-secondary)", fontSize: "13.5px" }}>
                This application is an AI-assisted screening tool designed solely for baseline vocal biomarker assessment. It does not constitute, and should not replace, professional clinical diagnosis, counseling, or consultations from a licensed neurologist or healthcare specialist.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div className="glass-card" style={{ borderLeft: "5px solid var(--primary-color)" }}>
              <h3 style={{ marginBottom: "16px" }}>When to Consult a Doctor</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
                If you or a family member experience persistent tremors, noticeable difficulties in speech articulation, slowness during daily activities, or loss of balance, consider scheduling a consult with a specialist.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "var(--primary-color)", fontWeight: "700" }}>
                <FaCheckCircle /> Speak with a Neurologist
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "var(--card-bg)", borderTop: "1px solid var(--card-border)", padding: "60px 0 30px" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "40px", marginBottom: "40px" }}>
          <div>
            <h3>🎙️ Parkinson.AI</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "12px", maxWidth: "360px" }}>
              Engineering clinical voice biomarkers to assist in early prediction screening and motor analysis.
            </p>
          </div>
          <div>
            <h4>Quick Links</h4>
            <ul style={{ listStyle: "none", marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
              <li><Link to="/" style={{ textDecoration: "none", color: "var(--text-secondary)" }}>Dashboard</Link></li>
              <li><Link to="/predict" style={{ textDecoration: "none", color: "var(--text-secondary)" }}>Assessments</Link></li>
              <li><Link to="/history" style={{ textDecoration: "none", color: "var(--text-secondary)" }}>History Log</Link></li>
            </ul>
          </div>
          <div>
            <h4>Connect with Us</h4>
            <div style={{ display: "flex", gap: "16px", marginTop: "16px", fontSize: "20px" }}>
              <a href="#" style={{ color: "var(--text-secondary)" }}><FaLinkedin /></a>
              <a href="#" style={{ color: "var(--text-secondary)" }}><FaGithub /></a>
              <a href="#" style={{ color: "var(--text-secondary)" }}><FaTwitter /></a>
            </div>
          </div>
        </div>
        <div className="container" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "20px", textAlign: "center", fontSize: "13px", color: "var(--text-light)" }}>
          <p>© {new Date().getFullYear()} Parkinson.AI Prediction System. All rights reserved. Built for Clinical Research Portfolio.</p>
        </div>
      </footer>
    </div>
  );
}
