/**
 * SevaSetuHub – Lightweight i18n Engine with Embedded Fallback
 * assets/js/i18n.js
 *
 * Supports both web server (http/https) and local filesystem (file:///)
 * by embedding default locales (EN, MR) directly, while allowing external JSON loading.
 */

'use strict';

const SevaI18n = (() => {

    const SUPPORTED_LANGUAGES = {
        en: {
            name:       'English',
            nativeName: 'English',
            label:      'EN',
            flag:       '🇬🇧',
            dir:        'ltr',
            fontClass:  '',
        },
        mr: {
            name:       'Marathi',
            nativeName: 'मराठी',
            label:      'मराठी',
            flag:       '🇮🇳',
            dir:        'ltr',
            fontClass:  'lang-devanagari',
        },
    };

    const STORAGE_KEY  = 'setu_lang';
    const DEFAULT_LANG = 'en';

    /* ══════════════════════════════════════════════════════
       EMBEDDED LOCALES (Ensures instant 0ms switching & works on file:///)
       ══════════════════════════════════════════════════════ */
    const EMBEDDED_LOCALES = {
        en: {
            "meta.title": "SevaSetuHub – Trusted Services Near You",
            "meta.description": "Book trusted AC, cleaning, plumbing, electrical, pest control and maintenance services with SevaSetuHub. Verified professionals. Transparent pricing. Digital service reports.",
            "nav.home": "Home",
            "nav.services": "Services",
            "nav.how_it_works": "How It Works",
            "nav.offers": "Offers",
            "nav.for_businesses": "For Businesses",
            "nav.about": "About",
            "nav.contact": "Contact",
            "nav.login": "Login",
            "nav.register": "Register",
            "nav.book_service": "Book a Service",
            "nav.aria_toggle": "Toggle navigation menu",
            "nav.aria_home": "SevaSetuHub – Home",
            "nav.aria_login": "Login to your account",
            "nav.aria_register": "Create a new account",
            "nav.aria_book": "Book a service now",
            "hero.eyebrow": "Trusted by 1,000+ customers",
            "hero.headline1": "Trusted Services.",
            "hero.headline2": "Connected Simply.",
            "hero.subtext": "Book reliable AC, cleaning, plumbing, electrical, pest control and maintenance services through one simple platform.",
            "hero.cta_primary": "Book a Service",
            "hero.cta_secondary": "Explore Services",
            "hero.trust_verified": "Verified Professionals",
            "hero.trust_pricing": "Transparent Pricing",
            "hero.trust_tracking": "Service Tracking",
            "hero.workflow_title": "How Your Service Works",
            "hero.wf_step1_label": "You Request a Service",
            "hero.wf_step1_sub": "Choose service, location and time",
            "hero.wf_step2_label": "Estimate Provided",
            "hero.wf_step2_sub": "Transparent pricing before work begins",
            "hero.wf_step3_label": "Professional Arrives",
            "hero.wf_step3_sub": "Verified technician at your doorstep",
            "hero.wf_step4_label": "Service Completed",
            "hero.wf_step4_sub": "Digital report & invoice delivered",
            "hero.stat_professionals": "Professionals",
            "hero.stat_jobs": "Jobs Managed",
            "hero.stat_rating": "Avg. Rating",
            "hero.badge_rating": "4.9 Rating",
            "hero.badge_complete": "Service Complete",
            "search.heading": "What service do you need?",
            "search.subtext": "Find trusted professionals near you in seconds.",
            "search.label_service": "Service",
            "search.label_location": "Location",
            "search.placeholder_service": "Select a service…",
            "search.placeholder_location": "Select location…",
            "search.btn_find": "Find Services",
            "search.opt_ac_service": "AC Service",
            "search.opt_ac_repair": "AC Repair",
            "search.opt_home_cleaning": "Home Cleaning",
            "search.opt_office_cleaning": "Office Cleaning",
            "search.opt_plumbing": "Plumbing",
            "search.opt_electrical": "Electrical",
            "search.opt_pest_control": "Pest Control",
            "search.opt_fabrication": "Fabrication",
            "search.opt_maintenance": "Maintenance",
            "trust.verified": "Verified Professionals",
            "trust.pricing": "Transparent Pricing",
            "trust.tracking": "Real-Time Service Tracking",
            "trust.reports": "Digital Service Reports",
            "trust.photos": "Before & After Photos",
            "trust.payments": "Easy Payments",
            "trust.support": "Dedicated Support",
            "services.label": "What We Offer",
            "services.heading": "Services for Every Need",
            "services.subheading": "From everyday repairs to regular maintenance, find trusted professionals for your home or business.",
            "services.explore": "Explore",
            "categories.ac.name": "AC Services",
            "categories.ac.desc": "Repair, cleaning, installation and maintenance.",
            "categories.cleaning.name": "Cleaning",
            "categories.cleaning.desc": "Home, office and deep cleaning services.",
            "categories.plumbing.name": "Plumbing",
            "categories.plumbing.desc": "Repairs, installations and maintenance.",
            "categories.electrical.name": "Electrical",
            "categories.electrical.desc": "Electrical repairs, wiring and installations.",
            "categories.pest.name": "Pest Control",
            "categories.pest.desc": "Reliable pest prevention and treatment.",
            "categories.fabrication.name": "Fabrication",
            "categories.fabrication.desc": "Custom fabrication, welding and repair.",
            "categories.maintenance.name": "Maintenance",
            "categories.maintenance.desc": "Preventive and routine maintenance services.",
            "categories.more.name": "More Services",
            "categories.more.desc": "Explore additional services.",
            "popular.label": "Most Booked",
            "popular.heading": "Popular Services",
            "popular.subheading": "The services most loved by our customers, delivered by verified professionals.",
            "popular.starting_from": "Starting from",
            "popular.book_now": "Book Now",
            "popular.services.ac_general": "AC General Service",
            "popular.services.ac_repair": "AC Repair",
            "popular.services.deep_cleaning": "Deep Home Cleaning",
            "popular.services.office_cleaning": "Office Cleaning",
            "popular.services.plumbing_repair": "Plumbing Repair",
            "popular.services.electrical_repair": "Electrical Repair",
            "popular.services.pest_control": "Pest Control",
            "popular.services.tank_cleaning": "Water Tank Cleaning",
            "offers.label": "Limited Time",
            "offers.heading": "Special Offers",
            "offers.subheading": "Exclusive deals on our most popular services. Book now and save.",
            "offers.copy": "Copy",
            "offers.book_now": "Book Now",
            "offers.valid_till": "Valid till",
            "offers.items.summer.badge": "Limited Offer",
            "offers.items.summer.title": "Summer AC Service",
            "offers.items.summer.discount": "20% OFF",
            "offers.items.summer.description": "Beat the heat with a professional AC service this summer. Keep your AC running at peak efficiency.",
            "offers.items.summer.service": "AC Services",
            "offers.items.clean.badge": "Popular",
            "offers.items.clean.title": "Home Cleaning Special",
            "offers.items.clean.discount": "₹500 OFF",
            "offers.items.clean.description": "Get your home professionally deep-cleaned at a special price. Minimum booking ₹1,499.",
            "offers.items.clean.service": "Deep Cleaning",
            "offers.items.welcome.badge": "New Customers",
            "offers.items.welcome.title": "New Customer Offer",
            "offers.items.welcome.discount": "10% OFF",
            "offers.items.welcome.description": "First time booking with SevaSetuHub? Get 10% off on your first service. No minimum order.",
            "offers.items.welcome.service": "All Services",
            "how.label": "Simple Process",
            "how.heading": "How SevaSetuHub Works",
            "how.subheading": "From booking to completion in six simple steps. Everything managed from one platform.",
            "how.step1_title": "Choose a Service",
            "how.step1_desc": "Browse categories and select the service you need.",
            "how.step2_title": "Tell Us What You Need",
            "how.step2_desc": "Provide requirements, location and preferred time.",
            "how.step3_title": "Get an Estimate",
            "how.step3_desc": "Receive transparent pricing before the work begins.",
            "how.step4_title": "Meet Your Professional",
            "how.step4_desc": "A verified technician arrives at the scheduled time.",
            "how.step5_title": "Track the Service",
            "how.step5_desc": "Follow progress and view real-time service updates.",
            "how.step6_title": "Complete & Review",
            "how.step6_desc": "Receive your service report, invoice and share feedback.",
            "ba.label": "Photo Documentation",
            "ba.heading": "Service You Can See",
            "ba.subheading": "From inspection to completion, keep a clear record of every service. No surprises.",
            "ba.report_title": "Service Report",
            "ba.photos_title": "Service Photos",
            "ba.before": "Before",
            "ba.after": "After",
            "ba.tech_note_label": "Technician Note:",
            "ba.tech_note": "AC coil cleaned. Gas pressure checked at 68 PSI. Filters replaced. Unit running normally.",
            "ba.completed": "Completed",
            "ba.verified": "Verified",
            "ba.transparent": "Transparent service from start to finish.",
            "ba.f1_title": "Before-Service Photos",
            "ba.f1_desc": "Technicians capture the condition of your equipment before starting work.",
            "ba.f2_title": "Work-in-Progress Documentation",
            "ba.f2_desc": "Track what was done, step by step, with photos and notes.",
            "ba.f3_title": "After-Service Photos",
            "ba.f3_desc": "Visual proof that the job is done properly and completely.",
            "ba.f4_title": "Digital Service Report",
            "ba.f4_desc": "A complete, sharable report delivered after every service.",
            "why.label": "Why Choose Us",
            "why.heading": "Why SevaSetuHub?",
            "why.subheading": "Everything you need for a smooth, trustworthy service experience — in one platform.",
            "why.f1_title": "Trusted Professionals",
            "why.f1_desc": "Connect with verified, background-checked service professionals.",
            "why.f2_title": "Transparent Estimates",
            "why.f2_desc": "Know the expected cost before approving any work.",
            "why.f3_title": "Service Tracking",
            "why.f3_desc": "Follow your service from request to completion, in real time.",
            "why.f4_title": "Photo-Based Proof",
            "why.f4_desc": "View before, during and after photos for every service.",
            "why.f5_title": "Digital Reports",
            "why.f5_desc": "Get a complete digital service report after every visit.",
            "why.f6_title": "Service History",
            "why.f6_desc": "Keep organized records of all previous services and repairs.",
            "why.f7_title": "Easy Payments",
            "why.f7_desc": "Manage invoices and payments digitally, hassle-free.",
            "why.f8_title": "AMC Support",
            "why.f8_desc": "Never miss a scheduled maintenance visit with our AMC plans.",
            "biz.label": "For Service Businesses",
            "biz.heading": "Run Your Service Business Smarter",
            "biz.subheading": "Manage customers, technicians, service requests, estimates, work orders, inventory, invoices, payments and AMC contracts from one platform.",
            "biz.tag_customers": "Customer Management",
            "biz.tag_technicians": "Technician Management",
            "biz.tag_scheduling": "Service Scheduling",
            "biz.tag_workorders": "Work Orders",
            "biz.tag_estimates": "Estimates",
            "biz.tag_invoices": "Invoices",
            "biz.tag_payments": "Payments",
            "biz.tag_amc": "AMC Contracts",
            "biz.tag_reports": "Reports & Analytics",
            "biz.tag_offers": "Offers & Coupons",
            "biz.cta_explore": "Explore Business Solutions",
            "biz.cta_start": "Get Started",
            "biz.dashboard_title": "Dashboard Overview",
            "biz.dash_workorders": "Open Work Orders",
            "biz.dash_completed": "Completed Today",
            "biz.dash_technicians": "Active Technicians",
            "biz.dash_revenue": "Revenue This Month",
            "tech.label": "Field Team",
            "tech.heading": "Empower Your Field Team",
            "tech.subheading": "Give technicians everything they need to manage jobs from the field — from check-in to job completion, entirely on their phone.",
            "tech.phone_header": "Today's Jobs – 25 Aug 2026",
            "tech.t1": "Today's Jobs (3)",
            "tech.t2": "Start Trip",
            "tech.t3": "Check In at Customer",
            "tech.t4": "Upload Before Photos",
            "tech.t5": "Service Checklist",
            "tech.t6": "Add Materials Used",
            "tech.t7": "Work Notes",
            "tech.t8": "Upload After Photos",
            "tech.t9": "Customer Signature",
            "tech.t10": "Complete Job",
            "tech.f1_title": "Job Management",
            "tech.f1_desc": "View and manage assigned jobs from anywhere.",
            "tech.f2_title": "Photo Capture",
            "tech.f2_desc": "Before and after photos captured on mobile.",
            "tech.f3_title": "Digital Checklists",
            "tech.f3_desc": "Guided service checklists ensure quality.",
            "tech.f4_title": "Digital Signature",
            "tech.f4_desc": "Customer sign-off captured on completion.",
            "tech.cta": "For Service Professionals",
            "amc.label": "Preventive Maintenance",
            "amc.heading": "Never Miss a Maintenance Visit",
            "amc.subheading": "Keep your equipment and property maintained with AMC — Annual Maintenance Contracts with scheduled preventive service visits.",
            "amc.f1_title": "Scheduled Visits",
            "amc.f1_desc": "Regular service at fixed intervals",
            "amc.f2_title": "Automatic Reminders",
            "amc.f2_desc": "Never forget a maintenance date",
            "amc.f3_title": "Equipment Longevity",
            "amc.f3_desc": "Extend the life of your equipment",
            "amc.f4_title": "Full Reports",
            "amc.f4_desc": "Report after every AMC visit",
            "amc.cta": "Explore AMC Plans",
            "amc.card_title": "AC Maintenance AMC",
            "amc.card_subtitle": "LG Split AC – 1.5 Ton · Annual Plan",
            "amc.v1": "April – General Service",
            "amc.v2": "July – Filter Clean + Gas Check",
            "amc.v3": "October – Pre-Winter Service",
            "amc.v4": "January – Annual Inspection",
            "amc.done": "Done",
            "amc.upcoming": "Upcoming",
            "amc.scheduled": "Scheduled",
            "amc.progress": "2 of 4 visits completed",
            "history.label": "Service Records",
            "history.heading": "Your Service History, Organized",
            "history.subheading": "Every service visit, repair, and maintenance record stays organized in one place. Access history for any appliance or location.",
            "history.device_name": "LG Split AC – 1.5 Ton",
            "history.device_model": "Indoor Unit · Bedroom · Since Jan 2025",
            "history.t1_date": "25 Aug 2026",
            "history.t1_title": "General Service",
            "history.t2_date": "12 May 2026",
            "history.t2_title": "Gas Pressure Check",
            "history.t3_date": "10 Jan 2026",
            "history.t3_title": "Capacitor Replacement",
            "history.t4_date": "Oct 2026",
            "history.t4_title": "Pre-Winter Service (AMC)",
            "history.completed": "Completed",
            "history.scheduled": "Scheduled",
            "history.f1_title": "Complete Service Timeline",
            "history.f1_desc": "View every service, repair and maintenance visit chronologically.",
            "history.f2_title": "Photos Per Visit",
            "history.f2_desc": "Before and after photos stored with each service record.",
            "history.f3_title": "Downloadable Reports",
            "history.f3_desc": "Download PDF service reports for warranty or reference.",
            "history.f4_title": "Multi-Equipment Tracking",
            "history.f4_desc": "Track history for every AC, appliance and property in one account.",
            "stats.aria": "SevaSetuHub in numbers",
            "stats.categories_value": "10+",
            "stats.categories_label": "Service Categories",
            "stats.professionals_label": "Service Professionals",
            "stats.jobs_label": "Jobs Managed",
            "stats.tracking_value": "24/7",
            "stats.tracking_label": "Service Tracking",
            "testimonials.label": "Customer Stories",
            "testimonials.heading": "What Our Customers Say",
            "testimonials.subheading": "Thousands of customers trust SevaSetuHub for their service needs.",
            "testimonials.r1_text": "The technician arrived on time and I could see the service updates in real time. The before and after photos gave me complete confidence. Very convenient.",
            "testimonials.r1_name": "Rahul M.",
            "testimonials.r1_location": "Kolhapur",
            "testimonials.r2_text": "I liked getting the estimate before approving the work. No surprises on the bill. The technician explained what was needed and the service report was detailed.",
            "testimonials.r2_name": "Priya S.",
            "testimonials.r2_location": "Sangli",
            "testimonials.r3_text": "The service report with photos made everything transparent. I could see exactly what the technician did. Highly recommend for AC maintenance and repairs.",
            "testimonials.r3_name": "Amol K.",
            "testimonials.r3_location": "Ichalkaranji",
            "faq.label": "Got Questions?",
            "faq.heading": "Frequently Asked Questions",
            "faq.subheading": "Everything you need to know about SevaSetuHub.",
            "faq.q1": "What services does SevaSetuHub provide?",
            "faq.a1": "SevaSetuHub provides AC service and repair, home and office cleaning, plumbing, electrical, pest control, fabrication, equipment maintenance, installations, and AMC (Annual Maintenance Contracts). We are continuously adding more service categories.",
            "faq.q2": "Can I book an AC service online?",
            "faq.a2": "Yes. Simply choose \"AC Service\" from the service list, provide your location and preferred time, and a verified AC technician will be assigned to your request. You will receive an estimate before any work begins.",
            "faq.q3": "Can I see the estimate before approving the work?",
            "faq.a3": "Absolutely. SevaSetuHub provides a transparent estimate after the technician inspects the job. You approve the estimate before any work begins. There are no surprise charges.",
            "faq.q4": "Can I track my technician?",
            "faq.a4": "Yes. You can follow the real-time status of your service request — from technician assignment to trip start, check-in, service progress and completion — through the SevaSetuHub platform.",
            "faq.q5": "Can I see before and after photos of my service?",
            "faq.a5": "Yes. Technicians capture before-service and after-service photos as part of every job. These photos are included in your digital service report, so you can see exactly what was done.",
            "faq.q6": "Do you provide AMC services?",
            "faq.a6": "Yes. SevaSetuHub supports AMC (Annual Maintenance Contracts) for equipment like air conditioners and other appliances. AMC plans include scheduled preventive maintenance visits, automatic reminders and full service reports.",
            "faq.q7": "Can businesses manage their technicians through SevaSetuHub?",
            "faq.a7": "Yes. SevaSetuHub includes a full business management platform for service companies. It covers customer management, technician management, work orders, estimates, invoices, payments, AMC contracts and reporting — all from one dashboard.",
            "faq.q8": "How can I become a service professional on SevaSetuHub?",
            "faq.a8": "Service professionals can register on SevaSetuHub to receive job assignments, manage their daily schedule, capture service photos, complete checklists and receive payments digitally. Contact us to get started.",
            "cta.heading": "Need a Service? Let's Get It Done.",
            "cta.subtext": "Book trusted professionals and manage your service from request to completion.",
            "cta.btn_book": "Book a Service",
            "cta.btn_explore": "Explore Services",
            "footer.tagline": "Connecting customers with trusted services. Your service. Managed simply.",
            "footer.col_services": "Services",
            "footer.col_customers": "Customers",
            "footer.col_businesses": "Businesses",
            "footer.col_company": "Company",
            "footer.svc_ac": "AC Service",
            "footer.svc_cleaning": "Cleaning",
            "footer.svc_plumbing": "Plumbing",
            "footer.svc_electrical": "Electrical",
            "footer.svc_pest": "Pest Control",
            "footer.svc_fabrication": "Fabrication",
            "footer.svc_maintenance": "Maintenance",
            "footer.cust_book": "Book a Service",
            "footer.cust_requests": "My Requests",
            "footer.cust_offers": "Offers",
            "footer.cust_history": "Service History",
            "footer.cust_amc": "AMC Plans",
            "biz.service_mgmt": "Service Management",
            "biz.tech_mgmt": "Technician Management",
            "biz.workorders": "Work Orders",
            "biz.invoices": "Invoices",
            "biz.reports": "Reports",
            "footer.biz_service_mgmt": "Service Management",
            "footer.biz_tech_mgmt": "Technician Management",
            "footer.biz_workorders": "Work Orders",
            "footer.biz_invoices": "Invoices",
            "footer.biz_reports": "Reports",
            "footer.co_about": "About SevaSetuHub",
            "footer.co_contact": "Contact Us",
            "footer.co_privacy": "Privacy Policy",
            "footer.co_terms": "Terms & Conditions",
            "footer.co_professionals": "For Professionals",
            "footer.copyright": "© 2026 SevaSetuHub. All rights reserved. Connecting You to Trusted Services.",
            "footer.link_privacy": "Privacy",
            "footer.link_terms": "Terms",
            "footer.link_sitemap": "Sitemap",
            "fab.label": "Book Service",
            "lang.switched": "Language changed to English",
            "lang.select_aria": "Select language",
            "toast.copied": "Coupon code copied!",
            "toast.copy_failed": "Could not copy automatically. Please copy manually.",
            "toast.select_service": "Please select a service first.",
            "toast.select_location": "Please select your location.",
            "toast.coming_soon_suffix": "will be available soon. Stay tuned!"
        },
        mr: {
            "meta.title": "सेवासेतूहब – तुमच्या जवळ विश्वासार्ह सेवा",
            "meta.description": "सेवासेतूहबसह विश्वासार्ह एसी, स्वच्छता, प्लंबिंग, विद्युत, कीटक नियंत्रण आणि देखभाल सेवा बुक करा. सत्यापित व्यावसायिक. पारदर्शक मूल्य.",
            "nav.home": "मुख्यपृष्ठ",
            "nav.services": "सेवा",
            "nav.how_it_works": "हे कसे कार्य करते",
            "nav.offers": "ऑफर्स",
            "nav.for_businesses": "व्यवसायांसाठी",
            "nav.about": "आमच्याबद्दल",
            "nav.contact": "संपर्क",
            "nav.login": "लॉगिन",
            "nav.register": "नोंदणी करा",
            "nav.book_service": "सेवा बुक करा",
            "nav.aria_toggle": "नेव्हिगेशन मेनू उघडा/बंद करा",
            "nav.aria_home": "सेवासेतूहब – मुख्यपृष्ठ",
            "nav.aria_login": "तुमच्या खात्यात लॉगिन करा",
            "nav.aria_register": "नवीन खाते तयार करा",
            "nav.aria_book": "आत्ता सेवा बुक करा",
            "hero.eyebrow": "१,०००+ ग्राहकांचा विश्वास",
            "hero.headline1": "विश्वासार्ह सेवा.",
            "hero.headline2": "साध्या जोडणीसह.",
            "hero.subtext": "एकाच साध्या प्लॅटफॉर्मद्वारे विश्वासू एसी, स्वच्छता, प्लंबिंग, विद्युत, कीटक नियंत्रण आणि देखभाल सेवा बुक करा.",
            "hero.cta_primary": "सेवा बुक करा",
            "hero.cta_secondary": "सेवा पाहा",
            "hero.trust_verified": "सत्यापित व्यावसायिक",
            "hero.trust_pricing": "पारदर्शक मूल्य",
            "hero.trust_tracking": "सेवा ट्रॅकिंग",
            "hero.workflow_title": "तुमची सेवा कशी कार्य करते",
            "hero.wf_step1_label": "तुम्ही सेवा मागणी करता",
            "hero.wf_step1_sub": "सेवा, स्थान आणि वेळ निवडा",
            "hero.wf_step2_label": "अंदाज दिला जातो",
            "hero.wf_step2_sub": "काम सुरू होण्यापूर्वी पारदर्शक मूल्य",
            "hero.wf_step3_label": "व्यावसायिक येतो",
            "hero.wf_step3_sub": "सत्यापित तंत्रज्ञ तुमच्या दारी",
            "hero.wf_step4_label": "सेवा पूर्ण",
            "hero.wf_step4_sub": "डिजिटल अहवाल व बीजक दिले जाते",
            "hero.stat_professionals": "व्यावसायिक",
            "hero.stat_jobs": "व्यवस्थापित कामे",
            "hero.stat_rating": "सरासरी रेटिंग",
            "hero.badge_rating": "४.९ रेटिंग",
            "hero.badge_complete": "सेवा पूर्ण",
            "search.heading": "तुम्हाला कोणती सेवा हवी आहे?",
            "search.subtext": "काही सेकंदात तुमच्या जवळचे विश्वासू व्यावसायिक शोधा.",
            "search.label_service": "सेवा",
            "search.label_location": "स्थान",
            "search.placeholder_service": "सेवा निवडा…",
            "search.placeholder_location": "स्थान निवडा…",
            "search.btn_find": "सेवा शोधा",
            "search.opt_ac_service": "एसी सेवा",
            "search.opt_ac_repair": "एसी दुरुस्ती",
            "search.opt_home_cleaning": "घर स्वच्छता",
            "search.opt_office_cleaning": "कार्यालय स्वच्छता",
            "search.opt_plumbing": "प्लंबिंग",
            "search.opt_electrical": "विद्युत",
            "search.opt_pest_control": "कीटक नियंत्रण",
            "search.opt_fabrication": "फॅब्रिकेशन",
            "search.opt_maintenance": "देखभाल",
            "trust.verified": "सत्यापित व्यावसायिक",
            "trust.pricing": "पारदर्शक मूल्य",
            "trust.tracking": "रिअल-टाइम सेवा ट्रॅकिंग",
            "trust.reports": "डिजिटल सेवा अहवाल",
            "trust.photos": "आधी व नंतरचे फोटो",
            "trust.payments": "सुलभ पेमेंट",
            "trust.support": "समर्पित सहाय्य",
            "services.label": "आमच्या सेवा",
            "services.heading": "प्रत्येक गरजेसाठी सेवा",
            "services.subheading": "रोजच्या दुरुस्त्यांपासून नियमित देखभालीपर्यंत, तुमच्या घरासाठी किंवा व्यवसायासाठी विश्वासू व्यावसायिक शोधा.",
            "services.explore": "पाहा",
            "categories.ac.name": "एसी सेवा",
            "categories.ac.desc": "दुरुस्ती, स्वच्छता, स्थापना आणि देखभाल.",
            "categories.cleaning.name": "स्वच्छता",
            "categories.cleaning.desc": "घर, कार्यालय आणि खोल स्वच्छता सेवा.",
            "categories.plumbing.name": "प्लंबिंग",
            "categories.plumbing.desc": "दुरुस्त्या, स्थापना आणि देखभाल.",
            "categories.electrical.name": "विद्युत",
            "categories.electrical.desc": "विद्युत दुरुस्ती, वायरिंग आणि स्थापना.",
            "categories.pest.name": "कीटक नियंत्रण",
            "categories.pest.desc": "विश्वासार्ह कीटक प्रतिबंध आणि उपचार.",
            "categories.fabrication.name": "फॅब्रिकेशन",
            "categories.fabrication.desc": "सानुकूल फॅब्रिकेशन, वेल्डिंग आणि दुरुस्ती.",
            "categories.maintenance.name": "देखभाल",
            "categories.maintenance.desc": "प्रतिबंधात्मक आणि नियमित देखभाल सेवा.",
            "categories.more.name": "इतर सेवा",
            "categories.more.desc": "अधिक सेवा पाहा.",
            "popular.label": "सर्वाधिक बुक केलेल्या",
            "popular.heading": "लोकप्रिय सेवा",
            "popular.subheading": "आमच्या ग्राहकांच्या सर्वात आवडत्या सेवा, सत्यापित व्यावसायिकांद्वारे.",
            "popular.starting_from": "पासून सुरू",
            "popular.book_now": "आत्ता बुक करा",
            "popular.services.ac_general": "एसी सामान्य सेवा",
            "popular.services.ac_repair": "एसी दुरुस्ती",
            "popular.services.deep_cleaning": "खोल घर स्वच्छता",
            "popular.services.office_cleaning": "कार्यालय स्वच्छता",
            "popular.services.plumbing_repair": "प्लंबिंग दुरुस्ती",
            "popular.services.electrical_repair": "विद्युत दुरुस्ती",
            "popular.services.pest_control": "कीटक नियंत्रण",
            "popular.services.tank_cleaning": "पाण्याची टाकी स्वच्छता",
            "offers.label": "मर्यादित वेळ",
            "offers.heading": "विशेष ऑफर्स",
            "offers.subheading": "आमच्या सर्वात लोकप्रिय सेवांवर विशेष सवलती. आत्ता बुक करा आणि बचत करा.",
            "offers.copy": "कॉपी करा",
            "offers.book_now": "आत्ता बुक करा",
            "offers.valid_till": "वैध",
            "offers.items.summer.badge": "मर्यादित ऑफर",
            "offers.items.summer.title": "उन्हाळी एसी सेवा",
            "offers.items.summer.discount": "२०% सूट",
            "offers.items.summer.description": "या उन्हाळ्यात व्यावसायिक एसी सेवेसह उष्णतेला मात द्या. तुमचा एसी कार्यक्षमतेने चालू ठेवा.",
            "offers.items.summer.service": "एसी सेवा",
            "offers.items.clean.badge": "लोकप्रिय",
            "offers.items.clean.title": "घर स्वच्छता विशेष",
            "offers.items.clean.discount": "₹५०० सूट",
            "offers.items.clean.description": "विशेष किंमतीत तुमचे घर व्यावसायिकरित्या खोल स्वच्छ करा. किमान बुकिंग ₹१,४९९.",
            "offers.items.clean.service": "खोल स्वच्छता",
            "offers.items.welcome.badge": "नवीन ग्राहक",
            "offers.items.welcome.title": "नवीन ग्राहक ऑफर",
            "offers.items.welcome.discount": "१०% सूट",
            "offers.items.welcome.description": "सेवासेतूहबवर पहिल्यांदाच बुकिंग करत आहात? पहिल्या सेवेवर १०% सूट मिळवा. किमान ऑर्डर नाही.",
            "offers.items.welcome.service": "सर्व सेवा",
            "how.label": "सोपी प्रक्रिया",
            "how.heading": "सेवासेतूहब कसे कार्य करते",
            "how.subheading": "सहा सोप्या चरणांमध्ये बुकिंगपासून पूर्णतेपर्यंत. सर्व एका प्लॅटफॉर्मवरून व्यवस्थापित.",
            "how.step1_title": "सेवा निवडा",
            "how.step1_desc": "श्रेण्या ब्राउझ करा आणि तुम्हाला हवी असलेली सेवा निवडा.",
            "how.step2_title": "तुमची गरज सांगा",
            "how.step2_desc": "आवश्यकता, स्थान आणि पसंतीचा वेळ द्या.",
            "how.step3_title": "अंदाज मिळवा",
            "how.step3_desc": "काम सुरू होण्यापूर्वी पारदर्शक मूल्य जाणून घ्या.",
            "how.step4_title": "व्यावसायिकाला भेटा",
            "how.step4_desc": "एक सत्यापित तंत्रज्ञ नियोजित वेळी येतो.",
            "how.step5_title": "सेवा ट्रॅक करा",
            "how.step5_desc": "प्रगती पाहा आणि रिअल-टाइम सेवा अपडेट्स पाहा.",
            "how.step6_title": "पूर्ण करा आणि पुनरावलोकन करा",
            "how.step6_desc": "सेवा अहवाल, बीजक मिळवा आणि अभिप्राय द्या.",
            "ba.label": "फोटो दस्तऐवजीकरण",
            "ba.heading": "दिसणारी सेवा",
            "ba.subheading": "तपासणीपासून पूर्णतेपर्यंत, प्रत्येक सेवेचा स्पष्ट रेकॉर्ड ठेवा. कोणताही धक्का नाही.",
            "ba.report_title": "सेवा अहवाल",
            "ba.photos_title": "सेवा फोटो",
            "ba.before": "आधी",
            "ba.after": "नंतर",
            "ba.tech_note_label": "तंत्रज्ञाची नोंद:",
            "ba.tech_note": "एसी कॉइल स्वच्छ केला. गॅस दाब ६८ PSI वर तपासला. फिल्टर बदलले. युनिट सामान्यपणे चालत आहे.",
            "ba.completed": "पूर्ण",
            "ba.verified": "सत्यापित",
            "ba.transparent": "सुरुवातीपासून शेवटपर्यंत पारदर्शक सेवा.",
            "ba.f1_title": "सेवापूर्व फोटो",
            "ba.f1_desc": "तंत्रज्ञ काम सुरू करण्यापूर्वी उपकरणाची स्थिती टिपतात.",
            "ba.f2_title": "काम प्रगतीपथावर असताना दस्तऐवजीकरण",
            "ba.f2_desc": "फोटो आणि नोंदींसह प्रत्येक चरण ट्रॅक करा.",
            "ba.f3_title": "सेवानंतरचे फोटो",
            "ba.f3_desc": "काम योग्य आणि पूर्णपणे झाले याचा दृश्य पुरावा.",
            "ba.f4_title": "डिजिटल सेवा अहवाल",
            "ba.f4_desc": "प्रत्येक सेवेनंतर पूर्ण, शेअर करण्यायोग्य अहवाल.",
            "why.label": "आम्हाला का निवडा",
            "why.heading": "सेवासेतूहब का?",
            "why.subheading": "एकाच प्लॅटफॉर्मवर सुगम, विश्वासार्ह सेवा अनुभवासाठी तुम्हाला जे हवे ते सर्व.",
            "why.f1_title": "विश्वासार्ह व्यावसायिक",
            "why.f1_desc": "सत्यापित, पार्श्वभूमी-तपासलेल्या सेवा व्यावसायिकांशी जोडा.",
            "why.f2_title": "पारदर्शक अंदाज",
            "why.f2_desc": "कोणतेही काम मंजूर करण्यापूर्वी अपेक्षित खर्च जाणून घ्या.",
            "why.f3_title": "सेवा ट्रॅकिंग",
            "why.f3_desc": "मागणीपासून पूर्णतेपर्यंत तुमची सेवा रिअल टाइममध्ये पाहा.",
            "why.f4_title": "फोटो-आधारित पुरावा",
            "why.f4_desc": "प्रत्येक सेवेसाठी आधी, दरम्यान आणि नंतरचे फोटो पाहा.",
            "why.f5_title": "डिजिटल अहवाल",
            "why.f5_desc": "प्रत्येक भेटीनंतर संपूर्ण डिजिटल सेवा अहवाल मिळवा.",
            "why.f6_title": "सेवा इतिहास",
            "why.f6_desc": "सर्व मागील सेवा आणि दुरुस्त्यांचे व्यवस्थित रेकॉर्ड ठेवा.",
            "why.f7_title": "सुलभ पेमेंट",
            "why.f7_desc": "बीजक आणि पेमेंट डिजिटलपणे, त्रासमुक्त व्यवस्थापित करा.",
            "why.f8_title": "AMC सहाय्य",
            "why.f8_desc": "आमच्या AMC योजनांसह कोणतीही नियमित देखभाल भेट चुकवू नका.",
            "biz.label": "सेवा व्यवसायांसाठी",
            "biz.heading": "तुमचा सेवा व्यवसाय अधिक स्मार्टपणे चालवा",
            "biz.subheading": "एकाच प्लॅटफॉर्मवरून ग्राहक, तंत्रज्ञ, सेवा मागण्या, अंदाज, कार्य आदेश, यादी, बीजक, पेमेंट आणि AMC करार व्यवस्थापित करा.",
            "biz.tag_customers": "ग्राहक व्यवस्थापन",
            "biz.tag_technicians": "तंत्रज्ञ व्यवस्थापन",
            "biz.tag_scheduling": "सेवा वेळापत्रक",
            "biz.tag_workorders": "कार्य आदेश",
            "biz.tag_estimates": "अंदाज",
            "biz.tag_invoices": "बीजक",
            "biz.tag_payments": "पेमेंट",
            "biz.tag_amc": "AMC करार",
            "biz.tag_reports": "अहवाल आणि विश्लेषण",
            "biz.tag_offers": "ऑफर्स आणि कूपन",
            "biz.cta_explore": "व्यवसाय समाधाने पाहा",
            "biz.cta_start": "सुरुवात करा",
            "biz.dashboard_title": "डॅशबोर्ड आढावा",
            "biz.dash_workorders": "उघडे कार्य आदेश",
            "biz.dash_completed": "आज पूर्ण",
            "biz.dash_technicians": "सक्रिय तंत्रज्ञ",
            "biz.dash_revenue": "या महिन्याचे उत्पन्न",
            "tech.label": "फील्ड टीम",
            "tech.heading": "तुमच्या फील्ड टीमला सक्षम करा",
            "tech.subheading": "तंत्रज्ञांना फील्डवरून कामे व्यवस्थापित करण्यासाठी आवश्यक ते सर्व द्या — चेक-इनपासून काम पूर्ण होईपर्यंत, फोनवरच.",
            "tech.phone_header": "आजची कामे – २५ ऑगस्ट २०२६",
            "tech.t1": "आजची कामे (३)",
            "tech.t2": "प्रवास सुरू करा",
            "tech.t3": "ग्राहकाकडे चेक इन",
            "tech.t4": "आधीचे फोटो अपलोड करा",
            "tech.t5": "सेवा चेकलिस्ट",
            "tech.t6": "वापरलेले साहित्य जोडा",
            "tech.t7": "कामाच्या नोंदी",
            "tech.t8": "नंतरचे फोटो अपलोड करा",
            "tech.t9": "ग्राहकाची स्वाक्षरी",
            "tech.t10": "काम पूर्ण करा",
            "tech.f1_title": "कार्य व्यवस्थापन",
            "tech.f1_desc": "कुठूनही नियुक्त कामे पाहा आणि व्यवस्थापित करा.",
            "tech.f2_title": "फोटो कॅप्चर",
            "tech.f2_desc": "मोबाइलवर आधी आणि नंतरचे फोटो घ्या.",
            "tech.f3_title": "डिजिटल चेकलिस्ट",
            "tech.f3_desc": "मार्गदर्शित सेवा चेकलिस्ट गुणवत्ता सुनिश्चित करतात.",
            "tech.f4_title": "डिजिटल स्वाक्षरी",
            "tech.f4_desc": "पूर्णतेवर ग्राहकाची मंजुरी घेतली जाते.",
            "tech.cta": "सेवा व्यावसायिकांसाठी",
            "amc.label": "प्रतिबंधात्मक देखभाल",
            "amc.heading": "कोणतीही देखभाल भेट चुकवू नका",
            "amc.subheading": "AMC — वार्षिक देखभाल करारांसह नियोजित प्रतिबंधात्मक सेवा भेटींद्वारे तुमची उपकरणे आणि मालमत्ता सुस्थितीत ठेवा.",
            "amc.f1_title": "नियोजित भेटी",
            "amc.f1_desc": "निश्चित अंतराने नियमित सेवा",
            "amc.f2_title": "आपोआप स्मरणपत्र",
            "amc.f2_desc": "देखभालीची तारीख कधी विसरू नका",
            "amc.f3_title": "उपकरणांची टिकाऊता",
            "amc.f3_desc": "तुमच्या उपकरणांचे आयुष्य वाढवा",
            "amc.f4_title": "संपूर्ण अहवाल",
            "amc.f4_desc": "प्रत्येक AMC भेटीनंतर अहवाल",
            "amc.cta": "AMC योजना पाहा",
            "amc.card_title": "एसी देखभाल AMC",
            "amc.card_subtitle": "LG स्प्लिट एसी – १.५ टन · वार्षिक योजना",
            "amc.v1": "एप्रिल – सामान्य सेवा",
            "amc.v2": "जुलै – फिल्टर स्वच्छता + गॅस तपासणी",
            "amc.v3": "ऑक्टोबर – हिवाळ्यापूर्वी सेवा",
            "amc.v4": "जानेवारी – वार्षिक तपासणी",
            "amc.done": "पूर्ण",
            "amc.upcoming": "येणारी",
            "amc.scheduled": "नियोजित",
            "amc.progress": "४ पैकी २ भेटी पूर्ण",
            "history.label": "सेवा नोंदी",
            "history.heading": "तुमचा सेवा इतिहास, सुव्यवस्थित",
            "history.subheading": "प्रत्येक सेवा भेट, दुरुस्ती आणि देखभाल नोंद एकाच ठिकाणी सुव्यवस्थित राहते.",
            "history.device_name": "LG स्प्लिट एसी – १.५ टन",
            "history.device_model": "इनडोअर युनिट · शयनकक्ष · जानेवारी २०२५ पासून",
            "history.t1_date": "२५ ऑगस्ट २०२६",
            "history.t1_title": "सामान्य सेवा",
            "history.t2_date": "१२ मे २०२६",
            "history.t2_title": "गॅस दाब तपासणी",
            "history.t3_date": "१० जानेवारी २०२६",
            "history.t3_title": "कॅपेसिटर बदलणे",
            "history.t4_date": "ऑक्टोबर २०२६",
            "history.t4_title": "हिवाळ्यापूर्वी सेवा (AMC)",
            "history.completed": "पूर्ण",
            "history.scheduled": "नियोजित",
            "history.f1_title": "संपूर्ण सेवा कालरेखा",
            "history.f1_desc": "प्रत्येक सेवा, दुरुस्ती आणि देखभाल भेट कालक्रमानुसार पाहा.",
            "history.f2_title": "प्रत्येक भेटीचे फोटो",
            "history.f2_desc": "प्रत्येक सेवा नोंदीसह आधी आणि नंतरचे फोटो साठवले जातात.",
            "history.f3_title": "डाउनलोड करण्यायोग्य अहवाल",
            "history.f3_desc": "वॉरंटी किंवा संदर्भासाठी PDF सेवा अहवाल डाउनलोड करा.",
            "history.f4_title": "अनेक उपकरणांचे ट्रॅकिंग",
            "history.f4_desc": "एका खात्यात प्रत्येक एसी, उपकरण आणि मालमतत्तेचा इतिहास ट्रॅक करा.",
            "stats.aria": "सेवासेतूहब आकडेवारी",
            "stats.categories_value": "१०+",
            "stats.categories_label": "सेवा श्रेण्या",
            "stats.professionals_label": "सेवा व्यावसायिक",
            "stats.jobs_label": "व्यवस्थापित कामे",
            "stats.tracking_value": "२४/७",
            "stats.tracking_label": "सेवा ट्रॅकिंग",
            "testimonials.label": "ग्राहकांच्या कथा",
            "testimonials.heading": "आमचे ग्राहक काय म्हणतात",
            "testimonials.subheading": "हजारो ग्राहक त्यांच्या सेवा गरजांसाठी सेवासेतूहबवर विश्वास ठेवतात.",
            "testimonials.r1_text": "तंत्रज्ञ वेळेवर आला आणि मी रिअल टाइममध्ये सेवा अपडेट्स पाहू शकलो. आधी आणि नंतरच्या फोटोंनी मला संपूर्ण विश्वास दिला. खूप सोयीस्कर.",
            "testimonials.r1_name": "राहुल म.",
            "testimonials.r1_location": "कोल्हापूर",
            "testimonials.r2_text": "काम मंजूर करण्यापूर्वी अंदाज मिळणे मला आवडले. बिलावर कोणताही धक्का नाही. तंत्रज्ञाने काय आवश्यक आहे ते स्पष्ट केले आणि सेवा अहवाल तपशीलवार होता.",
            "testimonials.r2_name": "प्रिया स.",
            "testimonials.r2_location": "सांगली",
            "testimonials.r3_text": "फोटोंसह सेवा अहवालाने सर्व काही पारदर्शक केले. तंत्रज्ञाने काय केले ते मला नक्की दिसू शकले. एसी देखभाल आणि दुरुस्त्यांसाठी अत्यंत शिफारस करतो.",
            "testimonials.r3_name": "अमोल क.",
            "testimonials.r3_location": "इचलकरंजी",
            "faq.label": "प्रश्न आहेत?",
            "faq.heading": "वारंवार विचारले जाणारे प्रश्न",
            "faq.subheading": "सेवासेतूहबद्दल तुम्हाला जे जाणून घ्यायचे आहे ते सर्व.",
            "faq.q1": "सेवासेतूहब कोणत्या सेवा देतो?",
            "faq.a1": "सेवासेतूहब एसी सेवा आणि दुरुस्ती, घर आणि कार्यालय स्वच्छता, प्लंबिंग, विद्युत, कीटक नियंत्रण, फॅब्रिकेशन, उपकरण देखभाल, स्थापना आणि AMC (वार्षिक देखभाल करार) देतो. आम्ही सतत अधिक सेवा श्रेण्या जोडत आहोत.",
            "faq.q2": "मी एसी सेवा ऑनलाइन बुक करू शकतो का?",
            "faq.a2": "हो. सेवा यादीतून \"एसी सेवा\" निवडा, तुमचे स्थान आणि पसंतीचा वेळ द्या आणि एक सत्यापित एसी तंत्रज्ञ तुमच्या मागणीसाठी नियुक्त केला जाईल.",
            "faq.q3": "काम मंजूर करण्यापूर्वी मी अंदाज पाहू शकतो का?",
            "faq.a3": "निश्चितच. तंत्रज्ञ काम तपासल्यानंतर सेवासेतूहब पारदर्शक अंदाज देतो. काम सुरू होण्यापूर्वी तुम्ही अंदाज मंजूर करता. कोणतेही अनपेक्षित शुल्क नाही.",
            "faq.q4": "मी माझ्या तंत्रज्ञाला ट्रॅक करू शकतो का?",
            "faq.a4": "हो. तुम्ही तुमच्या सेवा मागणीची रिअल-टाइम स्थिती — तंत्रज्ञ नियुक्तीपासून प्रवास सुरू, चेक-इन, सेवा प्रगती आणि पूर्णतेपर्यंत — सेवासेतूहब प्लॅटफॉर्मद्वारे पाहू शकता.",
            "faq.q5": "मी माझ्या सेवेचे आधी आणि नंतरचे फोटो पाहू शकतो का?",
            "faq.a5": "हो. तंत्रज्ञ प्रत्येक कामाचा भाग म्हणून सेवापूर्व आणि सेवानंतरचे फोटो घेतात. हे फोटो तुमच्या डिजिटल सेवा अहवालात समाविष्ट केले जातात.",
            "faq.q6": "तुम्ही AMC सेवा देता का?",
            "faq.a6": "हो. सेवासेतूहब एअर कंडिशनर आणि इतर उपकरणांसाठी AMC (वार्षिक देखभाल करार) सहाय्य करतो. AMC योजनांमध्ये नियोजित प्रतिबंधात्मक देखभाल भेटी, आपोआप स्मरणपत्रे आणि संपूर्ण सेवा अहवाल समाविष्ट आहेत.",
            "faq.q7": "व्यवसाय सेवासेतूहबद्वारे त्यांच्या तंत्रज्ञांचे व्यवस्थापन करू शकतात का?",
            "faq.a7": "हो. सेवासेतूहबमध्ये सेवा कंपन्यांसाठी पूर्ण व्यवसाय व्यवस्थापन प्लॅटफॉर्म समाविष्ट आहे. यात ग्राहक व्यवस्थापन, तंत्रज्ञ व्यवस्थापन, कार्य आदेश, अंदाज, बीजक, पेमेंट, AMC करार आणि अहवाल — सर्व एका डॅशबोर्डवरून.",
            "faq.q8": "मी सेवासेतूहबवर सेवा व्यावसायिक कसा होऊ शकतो?",
            "faq.a8": "सेवा व्यावसायिक काम नियुक्त मिळवण्यासाठी, दैनंदिन वेळापत्रक व्यवस्थापित करण्यासाठी, सेवा फोटो घेण्यासाठी, चेकलिस्ट पूर्ण करण्यासाठी आणि पेमेंट डिजिटलपणे मिळवण्यासाठी सेवासेतूहबवर नोंदणी करू शकतात.",
            "cta.heading": "सेवा हवी आहे? चला करूया.",
            "cta.subtext": "विश्वासू व्यावसायिक बुक करा आणि मागणीपासून पूर्णतेपर्यंत तुमची सेवा व्यवस्थापित करा.",
            "cta.btn_book": "सेवा बुक करा",
            "cta.btn_explore": "सेवा पाहा",
            "footer.tagline": "ग्राहकांना विश्वासार्ह सेवांशी जोडणे. तुमची सेवा. साध्या पद्धतीने व्यवस्थापित.",
            "footer.col_services": "सेवा",
            "footer.col_customers": "ग्राहक",
            "footer.col_businesses": "व्यवसाय",
            "footer.col_company": "कंपनी",
            "footer.svc_ac": "एसी सेवा",
            "footer.svc_cleaning": "स्वच्छता",
            "footer.svc_plumbing": "प्लंबिंग",
            "footer.svc_electrical": "विद्युत",
            "footer.svc_pest": "कीटक नियंत्रण",
            "footer.svc_fabrication": "फॅब्रिकेशन",
            "footer.svc_maintenance": "देखभाल",
            "footer.cust_book": "सेवा बुक करा",
            "footer.cust_requests": "माझ्या मागण्या",
            "footer.cust_offers": "ऑफर्स",
            "footer.cust_history": "सेवा इतिहास",
            "footer.cust_amc": "AMC योजना",
            "biz.service_mgmt": "सेवा व्यवस्थापन",
            "biz.tech_mgmt": "तंत्रज्ञ व्यवस्थापन",
            "biz.workorders": "कार्य आदेश",
            "biz.invoices": "बीजक",
            "biz.reports": "अहवाल",
            "footer.biz_service_mgmt": "सेवा व्यवस्थापन",
            "footer.biz_tech_mgmt": "तंत्रज्ञ व्यवस्थापन",
            "footer.biz_workorders": "कार्य आदेश",
            "footer.biz_invoices": "बीजक",
            "footer.biz_reports": "अहवाल",
            "footer.co_about": "सेवासेतूहबद्दल",
            "footer.co_contact": "आमच्याशी संपर्क साधा",
            "footer.co_privacy": "गोपनीयता धोरण",
            "footer.co_terms": "नियम आणि अटी",
            "footer.co_professionals": "व्यावसायिकांसाठी",
            "footer.copyright": "© २०२६ सेवासेतूहब. सर्व हक्क राखीव. विश्वासार्ह सेवांशी तुम्हाला जोडणे.",
            "footer.link_privacy": "गोपनीयता",
            "footer.link_terms": "नियम",
            "footer.link_sitemap": "साइटमॅप",
            "fab.label": "सेवा बुक करा",
            "lang.switched": "भाषा मराठीमध्ये बदलली",
            "lang.select_aria": "भाषा निवडा",
            "toast.copied": "कूपन कोड कॉपी केला!",
            "toast.copy_failed": "आपोआप कॉपी होऊ शकला नाही. कृपया हाताने कॉपी करा.",
            "toast.select_service": "कृपया आधी सेवा निवडा.",
            "toast.select_location": "कृपया तुमचे स्थान निवडा.",
            "toast.coming_soon_suffix": "लवकरच उपलब्ध होईल!"
        }
    };

    function getI18nBasePath() {
        const script = document.querySelector('script[src*="i18n.js"]');
        if (script) {
            const src = script.getAttribute('src');
            const idx = src.lastIndexOf('/js/i18n.js');
            if (idx !== -1) {
                return src.substring(0, idx) + '/i18n/';
            }
            if (src.includes('i18n.js')) {
                const dir = src.substring(0, src.lastIndexOf('/'));
                return dir.replace(/\/js$/, '/i18n/') + '/';
            }
        }
        return 'assets/i18n/';
    }

    const cache = {};
    let _strings  = {};
    let _lang     = DEFAULT_LANG;
    let _ready    = false;
    const _readyCallbacks = [];

    function flatten(obj, prefix = '', result = {}) {
        for (const key of Object.keys(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                flatten(obj[key], fullKey, result);
            } else {
                result[fullKey] = String(obj[key]);
            }
        }
        return result;
    }

    async function loadLocale(lang) {
        if (cache[lang]) return cache[lang];

        // 1. Check embedded locales first (guarantees file:/// and offline support)
        if (EMBEDDED_LOCALES[lang]) {
            cache[lang] = EMBEDDED_LOCALES[lang];
            return cache[lang];
        }

        // 2. Fallback to fetch for any dynamically added external languages
        const basePath = getI18nBasePath();
        const candidatePaths = [
            `${basePath}${lang}.json`,
            `assets/i18n/${lang}.json`,
            `./assets/i18n/${lang}.json`,
            `../assets/i18n/${lang}.json`
        ];

        const pathsToTry = [...new Set(candidatePaths)];

        for (const path of pathsToTry) {
            try {
                const res = await fetch(path, { cache: 'default' });
                if (res.ok) {
                    const json = await res.json();
                    cache[lang] = flatten(json);
                    return cache[lang];
                }
            } catch (e) {
                // Try next candidate
            }
        }

        console.warn(`[SevaI18n] Could not load locale "${lang}" from paths:`, pathsToTry);
        return null;
    }

    /* ══════════════════════════════════════════════════════
       INTERNAL – Apply translations to the DOM
       ══════════════════════════════════════════════════════ */
    function applyTranslations() {
        // data-i18n → textContent
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const val = _strings[key];
            if (val !== undefined) el.textContent = val;
        });

        // data-i18n-html → innerHTML (only our own trusted strings)
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            const val = _strings[key];
            if (val !== undefined) el.innerHTML = val;
        });

        // data-i18n-placeholder → placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const val = _strings[key];
            if (val !== undefined) el.setAttribute('placeholder', val);
        });

        // data-i18n-aria → aria-label attribute
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            const val = _strings[key];
            if (val !== undefined) el.setAttribute('aria-label', val);
        });

        // data-i18n-title → title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const val = _strings[key];
            if (val !== undefined) el.setAttribute('title', val);
        });

        // <select> option elements – update text of translated <option>s
        document.querySelectorAll('option[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const val = _strings[key];
            if (val !== undefined) el.textContent = val;
        });
    }

    /* ══════════════════════════════════════════════════════
       INTERNAL – Update <html> lang and dir + body font class
       ══════════════════════════════════════════════════════ */
    function applyLangAttrs(lang) {
        const config = SUPPORTED_LANGUAGES[lang] || SUPPORTED_LANGUAGES[DEFAULT_LANG];
        const html   = document.documentElement;

        html.setAttribute('lang', lang);
        html.setAttribute('dir',  config.dir);

        // Font class: remove all lang-* classes, apply new one
        document.body.classList.remove(
            ...Object.values(SUPPORTED_LANGUAGES)
                .map(l => l.fontClass)
                .filter(Boolean)
        );
        if (config.fontClass) {
            document.body.classList.add(config.fontClass);
        }

        // Update page <title> if translation exists
        const titleStr = _strings['meta.title'];
        if (titleStr) document.title = titleStr;

        // Update meta description
        const descEl = document.querySelector('meta[name="description"]');
        const descStr = _strings['meta.description'];
        if (descEl && descStr) descEl.setAttribute('content', descStr);
    }

    /* ══════════════════════════════════════════════════════
       INTERNAL – Update language switcher button states
       ══════════════════════════════════════════════════════ */
    function updateSwitcherUI(lang) {
        document.querySelectorAll('[data-lang-btn]').forEach(btn => {
            const btnLang = btn.getAttribute('data-lang-btn');
            btn.classList.toggle('lang-btn-active', btnLang === lang);
            btn.setAttribute('aria-pressed', String(btnLang === lang));
        });
    }

    /* ══════════════════════════════════════════════════════
       INTERNAL – Detect preferred language
       Priority: localStorage → browser → default
       ══════════════════════════════════════════════════════ */
    function detectLanguage() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && SUPPORTED_LANGUAGES[stored]) return stored;

        // Try browser language (e.g. "mr-IN" → "mr")
        const browserLangs = navigator.languages || [navigator.language || DEFAULT_LANG];
        for (const bl of browserLangs) {
            const code = bl.split('-')[0].toLowerCase();
            if (SUPPORTED_LANGUAGES[code]) return code;
        }

        return DEFAULT_LANG;
    }

    /* ══════════════════════════════════════════════════════
       PUBLIC API
       ══════════════════════════════════════════════════════ */

    /**
     * Translate a key. Returns the English fallback if key missing in current locale.
     * @param {string} key  Dot-notation key e.g. "nav.home"
     * @param {string} [fallback] Optional fallback text
     * @returns {string}
     */
    function t(key, fallback = '') {
        return _strings[key] !== undefined ? _strings[key] : (cache[DEFAULT_LANG]?.[key] || fallback || key);
    }

    /**
     * Get the currently active language code.
     * @returns {string}
     */
    function currentLang() {
        return _lang;
    }

    /**
     * Get the supported language config map.
     * @returns {Object}
     */
    function getSupportedLanguages() {
        return SUPPORTED_LANGUAGES;
    }

    /**
     * Switch the page to a new language.
     * @param {string} lang  Language code (e.g. "mr")
     * @param {boolean} [notify=true]  Show a toast notification
     */
    async function setLanguage(lang, notify = true) {
        if (!SUPPORTED_LANGUAGES[lang]) {
            console.warn(`[SevaI18n] Unsupported language: "${lang}"`);
            return;
        }

        // Always pre-load English as fallback
        if (!cache[DEFAULT_LANG]) {
            await loadLocale(DEFAULT_LANG);
        }

        const strings = await loadLocale(lang);
        if (!strings) {
            console.warn(`[SevaI18n] Falling back to "${DEFAULT_LANG}"`);
            _strings = cache[DEFAULT_LANG] || {};
            _lang    = DEFAULT_LANG;
        } else {
            // Merge: fallback keys from English fill any gaps in target locale
            _strings = Object.assign({}, cache[DEFAULT_LANG] || {}, strings);
            _lang    = lang;
        }

        localStorage.setItem(STORAGE_KEY, _lang);
        applyLangAttrs(_lang);
        applyTranslations();
        updateSwitcherUI(_lang);

        // Notify landing.js to re-render dynamic cards
        document.dispatchEvent(new CustomEvent('setu:langchange', { detail: { lang: _lang } }));

        if (notify && typeof SevaToast !== 'undefined') {
            const msg = t('lang.switched');
            SevaToast.show(msg, 'info', 2500);
        }
    }

    /**
     * Initialise i18n: detect language, load strings, apply to DOM.
     * Call once on DOMContentLoaded.
     */
    async function init() {
        const lang = detectLanguage();

        // Pre-load English baseline (always needed as fallback)
        await loadLocale(DEFAULT_LANG);

        // Load target locale (may be same as English)
        await setLanguage(lang, false);

        _ready = true;
        _readyCallbacks.forEach(cb => cb(_lang));
        _readyCallbacks.length = 0;
    }

    /**
     * Register a callback to run once i18n is ready.
     * If already ready, fires immediately.
     * @param {Function} cb
     */
    function onReady(cb) {
        if (_ready) {
            cb(_lang);
        } else {
            _readyCallbacks.push(cb);
        }
    }

    /* ══════════════════════════════════════════════════════
       LANGUAGE SWITCHER – Build the UI widget
       ══════════════════════════════════════════════════════ */
    function buildSwitcher(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        container.setAttribute('role', 'group');
        container.setAttribute('aria-label', t('lang.select_aria') || 'Select language');

        Object.entries(SUPPORTED_LANGUAGES).forEach(([code, config]) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'lang-btn';
            btn.setAttribute('data-lang-btn', code);
            btn.setAttribute('aria-pressed', String(code === _lang));
            btn.setAttribute('title', config.nativeName);
            btn.setAttribute('aria-label', `Switch to ${config.name}`);
            btn.innerHTML = `<span class="lang-btn-label">${config.label}</span>`;

            btn.addEventListener('click', () => setLanguage(code, true));
            container.appendChild(btn);
        });

        updateSwitcherUI(_lang);
    }

    // ── Auto-init on DOM ready ────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { t, currentLang, getSupportedLanguages, setLanguage, onReady, buildSwitcher };

})();

// Export globally
window.SevaI18n = SevaI18n;
