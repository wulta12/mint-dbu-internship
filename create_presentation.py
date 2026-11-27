import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    # 16:9 widescreen
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Color Palette
    NAVY = RGBColor(12, 35, 64)         # #0C2340 (Deep Navy)
    TEAL = RGBColor(0, 128, 128)        # #008080 (MinT Primary Teal)
    LIGHT_BG = RGBColor(248, 250, 252)  # #F8FAFC (Soft background)
    CARD_BG = RGBColor(255, 255, 255)   # White
    CARD_BORDER = RGBColor(226, 232, 240) # Border
    TEXT_DARK = RGBColor(30, 41, 59)    # #1E293B
    TEXT_MUTED = RGBColor(100, 116, 139) # #64748B
    ACCENT_GREEN = RGBColor(16, 185, 129) # #10B981
    ACCENT_BLUE = RGBColor(37, 99, 235)  # #2563EB
    GOLD = RGBColor(217, 119, 6)        # #D97706

    def set_slide_background(slide, color):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = color
        bg.line.fill.background()
        return bg

    def add_header(slide, title_text, category="MINT ONLINE TRAINING SYSTEM"):
        # Category label
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.4))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        tf_cat.margin_left = tf_cat.margin_right = tf_cat.margin_top = tf_cat.margin_bottom = 0
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category.upper()
        p_cat.font.size = Pt(10)
        p_cat.font.bold = True
        p_cat.font.color.rgb = TEAL

        # Slide Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.7), Inches(0.7))
        tf = title_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = title_text
        p.font.size = Pt(24)
        p.font.bold = True
        p.font.color.rgb = NAVY

    def add_card(slide, left, top, width, height, title, items, subtitle=None, border_color=CARD_BORDER, bg_color=CARD_BG, title_color=NAVY):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1.5)

        tb = slide.shapes.add_textbox(left + Inches(0.25), top + Inches(0.2), width - Inches(0.5), height - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0

        # Title
        p_t = tf.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(16)
        p_t.font.bold = True
        p_t.font.color.rgb = title_color
        p_t.space_after = Pt(4)

        if subtitle:
            p_sub = tf.add_paragraph()
            p_sub.text = subtitle
            p_sub.font.size = Pt(11)
            p_sub.font.color.rgb = TEXT_MUTED
            p_sub.space_after = Pt(8)

        for item in items:
            p_i = tf.add_paragraph()
            p_i.text = f"•  {item}"
            p_i.font.size = Pt(12)
            p_i.font.color.rgb = TEXT_DARK
            p_i.space_after = Pt(4)

    # -------------------------------------------------------------
    # SLIDE 1: TITLE SLIDE (Dark Navy Premium Theme)
    # -------------------------------------------------------------
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1, NAVY)

    # Accent decorative bar
    bar = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.8), Inches(0.15), Inches(3.6))
    bar.fill.solid()
    bar.fill.fore_color.rgb = TEAL
    bar.line.fill.background()

    # Title box
    tb = s1.shapes.add_textbox(Inches(1.2), Inches(1.8), Inches(11.0), Inches(3.6))
    tf = tb.text_frame
    tf.word_wrap = True

    p_org = tf.paragraphs[0]
    p_org.text = "MINISTRY OF INNOVATION AND TECHNOLOGY (MinT) — ETHIOPIA"
    p_org.font.size = Pt(14)
    p_org.font.bold = True
    p_org.font.color.rgb = TEAL
    p_org.space_after = Pt(12)

    p_main = tf.add_paragraph()
    p_main.text = "MinT Online Training & Internship\nManagement System (v2.0)"
    p_main.font.size = Pt(36)
    p_main.font.bold = True
    p_main.font.color.rgb = RGBColor(255, 255, 255)
    p_main.space_after = Pt(16)

    p_sub = tf.add_paragraph()
    p_sub.text = "A Comprehensive, Role-Based Learning Platform with AI Assistance & Verified Digital Certification"
    p_sub.font.size = Pt(16)
    p_sub.font.color.rgb = RGBColor(203, 213, 225)
    p_sub.space_after = Pt(30)

    p_meta = tf.add_paragraph()
    p_meta.text = "Project Defense & System Demonstration | Full-Stack Architecture (React + Node.js + PostgreSQL)"
    p_meta.font.size = Pt(13)
    p_meta.font.color.rgb = RGBColor(148, 163, 184)

    # -------------------------------------------------------------
    # SLIDE 2: EXECUTIVE SUMMARY & PROBLEM STATEMENT
    # -------------------------------------------------------------
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2, LIGHT_BG)
    add_header(s2, "Executive Summary & Background", "01. Introduction")

    add_card(s2, Inches(0.8), Inches(1.6), Inches(5.6), Inches(5.2),
             "The Challenges Addressed", [
                 "Paper-bound & fragmented training records across ministries and university internships.",
                 "Manual certification workflow causing delays and vulnerability to forgery.",
                 "Lack of progress tracking for trainees across asynchronous materials.",
                 "High administrative overhead for trainers in creating tests and calculating grades.",
                 "Absence of real-time communication between administrators, trainers, and trainees."
             ], "Traditional Government & Institutional Training Pain Points")

    add_card(s2, Inches(6.8), Inches(1.6), Inches(5.7), Inches(5.2),
             "The MinT Solution", [
                 "End-to-end digital lifecycle: from course registration to certificate delivery.",
                 "Structured LMS with Modules, Lessons, Videos, Documents, and Link tracking.",
                 "Automated Assessment Engine with server-side timers and anti-cheating logic.",
                 "Instant, cryptographically verifiable certificates with public QR code checks.",
                 "Integrated AI Assistant for rapid question and module curriculum creation.",
                 "Full internal messaging with instant notifications & email delivery."
             ], "Modern, Scalable Digital Transformation Platform")

    # -------------------------------------------------------------
    # SLIDE 3: SYSTEM ARCHITECTURE & TECH STACK
    # -------------------------------------------------------------
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3, LIGHT_BG)
    add_header(s3, "System Architecture & Technology Stack", "02. Technical Architecture")

    add_card(s3, Inches(0.8), Inches(1.6), Inches(3.6), Inches(5.2),
             "Frontend Layer", [
                 "React 19 Single Page Application (SPA)",
                 "Tailwind CSS for responsive government-grade UI",
                 "Lucide React & Framer Motion for clean UX",
                 "Axios with unified interceptors & token refresh",
                 "Bilingual support (English & Amharic i18n)",
                 "Widescreen & Mobile responsive design"
             ], "Client Side (SPA)")

    add_card(s3, Inches(4.8), Inches(1.6), Inches(3.7), Inches(5.2),
             "Backend API Layer", [
                 "Node.js & Express.js RESTful API engine",
                 "JWT (JSON Web Tokens) stateless auth",
                 "bcrypt password hashing (10 rounds)",
                 "Multer for secure multipart lesson & photo uploads",
                 "Nodemailer with Gmail SMTP integration",
                 "Robust error handling & input validation middleware"
             ], "Server Side (Node.js/Express)")

    add_card(s3, Inches(8.9), Inches(1.6), Inches(3.6), Inches(5.2),
             "Database & Cloud", [
                 "PostgreSQL 16 relational database",
                 "Connection pooling with pg.Pool",
                 "Neon Serverless PostgreSQL (Cloud DB)",
                 "Render Web Service (Backend hosting)",
                 "Vercel Edge Network (Frontend hosting)",
                 "Strict foreign keys & transactional cascades"
             ], "Database & Deployment")

    # -------------------------------------------------------------
    # SLIDE 4: ROLE-BASED ACCESS CONTROL (RBAC)
    # -------------------------------------------------------------
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4, LIGHT_BG)
    add_header(s4, "Role-Based Access Control (RBAC)", "03. User Personas & Permissions")

    add_card(s4, Inches(0.8), Inches(1.6), Inches(3.6), Inches(5.2),
             "Administrator", [
                 "Full system governance & analytics dashboard.",
                 "Approve/manage trainer accounts & trainees.",
                 "Create training programs & assign trainers.",
                 "Manage departments, subjects, and settings.",
                 "Broadcast announcements & direct messaging.",
                 "View certificate audit logs and attendance reports."
             ], "Superuser & Oversight")

    add_card(s4, Inches(4.8), Inches(1.6), Inches(3.7), Inches(5.2),
             "Trainer", [
                 "Build course curriculum with Course Builder.",
                 "Design multiple-choice assessments with time limits.",
                 "AI Assistant to generate quizzes & module outlines.",
                 "Monitor trainee learning progress & attendance.",
                 "Schedule live meetings & upload materials.",
                 "Send direct messages to enrolled participants."
             ], "Curriculum & Instruction")

    add_card(s4, Inches(8.9), Inches(1.6), Inches(3.6), Inches(5.2),
             "Trainee", [
                 "Discover trainings and apply for enrollment.",
                 "Learn through video, PDF, text, and rich links.",
                 "Track personal progress percentage per course.",
                 "Take final assessments once 75% progress is reached.",
                 "Receive verifiable PDF digital certificates.",
                 "Chat with AI assistant for lesson clarification."
             ], "Learning & Certification")

    # -------------------------------------------------------------
    # SLIDE 5: LEARNING MANAGEMENT SYSTEM (LMS)
    # -------------------------------------------------------------
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5, LIGHT_BG)
    add_header(s5, "Course Builder & Interactive Learning", "04. Core LMS Module")

    add_card(s5, Inches(0.8), Inches(1.6), Inches(5.6), Inches(5.2),
             "Trainer Course Builder", [
                 "Hierarchical Modules & Lessons organization.",
                 "Multi-type content support: Text, Video, PDF, Document, Link.",
                 "Drag-and-drop reordering for optimal learning paths.",
                 "Publishing toggle: keep draft lessons hidden while editing.",
                 "Video completion threshold (e.g. 80% view required).",
                 "Integrated AI Assistant for instant lesson drafting."
             ], "Content Authoring Workflow")

    add_card(s5, Inches(6.8), Inches(1.6), Inches(5.7), Inches(5.2),
             "Trainee Learning Experience", [
                 "Clean split-pane viewer with module sidebar & media player.",
                 "Progress tracking engine: auto-marks completed lessons.",
                 "Video playback position memory (resume where left off).",
                 "Embedded document viewer for training guides and slides.",
                 "Gated assessment access (requires >= 75% course completion).",
                 "Context-aware AI Chat Assistant to answer trainee questions."
             ], "Interactive Trainee Portal")

    # -------------------------------------------------------------
    # SLIDE 6: ASSESSMENT ENGINE & ANTI-CHEATING
    # -------------------------------------------------------------
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6, LIGHT_BG)
    add_header(s6, "Online Assessment Engine & Anti-Cheating", "05. Evaluation")

    add_card(s6, Inches(0.8), Inches(1.6), Inches(5.6), Inches(5.2),
             "Anti-Cheating Architecture", [
                 "Server-side countdown timer (client clock manipulation impossible).",
                 "Question shuffling per attempt to prevent screen sharing.",
                 "Option shuffling (A, B, C, D randomized per student).",
                 "Single-session security: active attempts resume with remaining time.",
                 "No answer keys sent to client during exam runtime.",
                 "Auto-submission when exam time expires."
             ], "Secure Exam Integrity Safeguards")

    add_card(s6, Inches(6.8), Inches(1.6), Inches(5.7), Inches(5.2),
             "Grading & Performance", [
                 "Immediate server-side score calculation upon submission.",
                 "Customizable passing threshold (default 70%).",
                 "Detailed attempt history with pass/fail tracking.",
                 "Instant certificate generation trigger upon passing grade.",
                 "Retake allowance managed by trainer guidelines.",
                 "Full analytics reporting on class performance."
             ], "Automated Evaluation & Feedback")

    # -------------------------------------------------------------
    # SLIDE 7: DIGITAL CERTIFICATES & VERIFICATION
    # -------------------------------------------------------------
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7, LIGHT_BG)
    add_header(s7, "Verifiable Digital Certificates & QR Verification", "06. Credentials")

    add_card(s7, Inches(0.8), Inches(1.6), Inches(5.6), Inches(5.2),
             "Automated Certificate Issuance", [
                 "Issued automatically when trainee achieves >=75% progress and passes final exam.",
                 "Unique cryptographic certificate serial number (e.g. MINT-2026-XXXX).",
                 "Official Ministry branding with digital seal and signatures.",
                 "Downloadable PDF format optimized for printing or sharing.",
                 "Permanent credential linked to user profile."
             ], "Tamper-Proof Credential Generation")

    add_card(s7, Inches(6.8), Inches(1.6), Inches(5.7), Inches(5.2),
             "Public QR Code Verification", [
                 "Every certificate embeds a live verification QR code.",
                 "Employers & authorities can scan QR or visit verification URL.",
                 "Displays recipient name, training title, issue date, and validation status.",
                 "Guarantees authenticity without requiring manual HR checks.",
                 "Prevents counterfeit credentials across government programs."
             ], "Instant Public Verification Gateway")

    # -------------------------------------------------------------
    # SLIDE 8: AI ASSISTANT FOR TRAINERS & TRAINEES
    # -------------------------------------------------------------
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8, LIGHT_BG)
    add_header(s8, "Integrated AI Assistants", "07. Intelligent Assistance")

    add_card(s8, Inches(0.8), Inches(1.6), Inches(5.6), Inches(5.2),
             "Trainer AI Assistant", [
                 "Auto-generate complete Module Outlines with 4 structured lessons.",
                 "Auto-generate high-quality multiple-choice assessment questions.",
                 "One-click 'Save Module & Lessons' directly into the database.",
                 "One-click 'Save Questions to Assessment' for instant exam creation.",
                 "Admin kill-switch in settings to enable/disable AI drafting.",
                 "Saves hours of curriculum planning and exam preparation."
             ], "Productivity Tool for Course Creators")

    add_card(s8, Inches(6.8), Inches(1.6), Inches(5.7), Inches(5.2),
             "Trainee Learning Assistant", [
                 "24/7 in-lesson AI tutor available in the trainee portal.",
                 "Grounded exclusively in published course materials to prevent hallucinations.",
                 "Refuses to leak assessment answers or solve exams for trainees.",
                 "Explains complex technical concepts in simple, accessible language.",
                 "Supports self-paced learning and reduces instructor support load."
             ], "Personalized 24/7 Student Guidance")

    # -------------------------------------------------------------
    # SLIDE 9: COMMUNICATION & MESSAGING SYSTEM
    # -------------------------------------------------------------
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9, LIGHT_BG)
    add_header(s9, "Unified Messaging & Communication Hub", "08. Communication")

    add_card(s9, Inches(0.8), Inches(1.6), Inches(5.6), Inches(5.2),
             "Internal Direct Messaging", [
                 "Multi-tab chat system: Contact Inquiries, Received Replies, and Sent Messages.",
                 "Batch recipient composer: Admin can message all trainers, trainees, or selected individuals.",
                 "Threaded conversation view with read/unread receipt tracking.",
                 "Searchable recipient picker categorized by role and department.",
                 "Protected against runtime crashes with full null-safe state handling."
             ], "In-App Collaborative Chat System")

    add_card(s9, Inches(6.8), Inches(1.6), Inches(5.7), Inches(5.2),
             "Email Notification Engine", [
                 "Gmail SMTP integration via Nodemailer.",
                 "Password reset verification codes and secure OTP links.",
                 "Automated notification when new training materials or messages arrive.",
                 "Training enrollment status alerts (Approved, Rejected, Completed).",
                 "Dual-delivery: messages appear in-app and send an email copy."
             ], "Automated Email & Alert Delivery")

    # -------------------------------------------------------------
    # SLIDE 10: SECURITY & DATA INTEGRITY
    # -------------------------------------------------------------
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10, LIGHT_BG)
    add_header(s10, "Security, Privacy & Data Protection", "09. Enterprise Security")

    add_card(s10, Inches(0.8), Inches(1.6), Inches(5.6), Inches(5.2),
             "Authentication & Access Control", [
                 "Bcrypt password hashing (10 salt rounds) with zero plaintext storage.",
                 "Stateless JWT tokens with strict expiry and role verification.",
                 "Route protection middleware (auth, authorize('admin', 'trainer', 'trainee')).",
                 "CORS origin whitelisting across allowed Vercel and Render domains.",
                 "Input sanitization and validation with express-validator."
             ], "Identity & Access Safeguards")

    add_card(s10, Inches(6.8), Inches(1.6), Inches(5.7), Inches(5.2),
             "Data Integrity & Defense", [
                 "Parameterized SQL queries preventing SQL Injection vulnerabilities.",
                 "Upload security: strict MIME-type & extension whitelisting with file limits.",
                 "Anti-tamper certificate serials & verified QR verification routes.",
                 "Encrypted environment variables for database credentials and SMTP keys.",
                 "Comprehensive audit trails for training requests and certificate issuance."
             ], "Database & Infrastructure Protection")

    # -------------------------------------------------------------
    # SLIDE 11: DEMONSTRATION & WORKFLOW SUMMARY
    # -------------------------------------------------------------
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_background(s11, LIGHT_BG)
    add_header(s11, "End-to-End User Journey", "10. Workflow Demonstration")

    add_card(s11, Inches(0.8), Inches(1.6), Inches(3.6), Inches(5.2),
             "Phase 1: Setup", [
                 "1. Admin defines training & assigns trainer.",
                 "2. Trainer uses AI Assistant to draft modules & lessons.",
                 "3. Trainer sets passing criteria & exam time limit.",
                 "4. Training is published to the catalog."
             ], "Creation & Setup")

    add_card(s11, Inches(4.8), Inches(1.6), Inches(3.7), Inches(5.2),
             "Phase 2: Learning", [
                 "1. Trainee registers and enrolls.",
                 "2. Admin or Trainer approves enrollment.",
                 "3. Trainee studies interactive video & reading lessons.",
                 "4. Trainee asks AI assistant for explanations."
             ], "Delivery & Engagement")

    add_card(s11, Inches(8.9), Inches(1.6), Inches(3.6), Inches(5.2),
             "Phase 3: Certification", [
                 "1. Trainee completes >=75% course progress.",
                 "2. Final assessment unlocks.",
                 "3. Trainee takes timed, randomized exam.",
                 "4. Upon passing, Certificate + QR code issued instantly."
             ], "Assessment & Credential")

    # -------------------------------------------------------------
    # SLIDE 12: CONCLUSION & FUTURE SCOPE
    # -------------------------------------------------------------
    s12 = prs.slides.add_slide(blank_layout)
    set_slide_background(s12, NAVY)

    # Accent decorative bar
    bar12 = s12.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.6), Inches(0.15), Inches(4.2))
    bar12.fill.solid()
    bar12.fill.fore_color.rgb = ACCENT_GREEN
    bar12.line.fill.background()

    tb12 = s12.shapes.add_textbox(Inches(1.2), Inches(1.6), Inches(11.0), Inches(4.5))
    tf12 = tb12.text_frame
    tf12.word_wrap = True

    p_c1 = tf12.paragraphs[0]
    p_c1.text = "CONCLUSION & FUTURE ROADMAP"
    p_c1.font.size = Pt(14)
    p_c1.font.bold = True
    p_c1.font.color.rgb = ACCENT_GREEN
    p_c1.space_after = Pt(12)

    p_c2 = tf12.add_paragraph()
    p_c2.text = "The MinT Training System transforms Ethiopian public sector & internship training into a modern, transparent, and data-driven ecosystem."
    p_c2.font.size = Pt(22)
    p_c2.font.bold = True
    p_c2.font.color.rgb = RGBColor(255, 255, 255)
    p_c2.space_after = Pt(20)

    p_c3 = tf12.add_paragraph()
    p_c3.text = "Key Achievements:"
    p_c3.font.size = Pt(16)
    p_c3.font.bold = True
    p_c3.font.color.rgb = RGBColor(147, 197, 253)

    achievements = [
        "100% digital transition from paper certificates to QR-verified credentials.",
        "Significant reduction in trainer workload via AI curriculum & quiz generation.",
        "Robust enterprise security with zero client answer leakage and strict RBAC.",
        "Production-ready deployment across Vercel (Frontend), Render (API), and Neon (DB)."
    ]
    for ach in achievements:
        p_a = tf12.add_paragraph()
        p_a.text = f"✔  {ach}"
        p_a.font.size = Pt(13)
        p_a.font.color.rgb = RGBColor(226, 232, 240)
        p_a.space_after = Pt(4)

    p_qa = tf12.add_paragraph()
    p_qa.text = "\nThank You! Questions & Answers Welcome."
    p_qa.font.size = Pt(20)
    p_qa.font.bold = True
    p_qa.font.color.rgb = RGBColor(255, 255, 255)

    out_path = os.path.abspath("MinT_Training_System_Presentation.pptx")
    prs.save(out_path)
    print(f"Presentation saved to: {out_path}")

if __name__ == "__main__":
    create_deck()
