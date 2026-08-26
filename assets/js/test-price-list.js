/**
 * screenings4u
 * Central Test Price & service Catalog
 * Location: assets/js/test-price-list.js
 *
 * IMPORTANT:
 * - Prices are stored in cents for Stripe-compatible calculations.
 * - stripePriceId values are intentionally blank until the matching
 *   Stripe Price objects are created.
 * - This file is the frontend service catalog used by the checkout page.
 */

const TEST_SERVICES = {
  /* =========================================================
     DOT URINE DRUG TESTS
     ========================================================= */

  dot_personal_test: {
    id: "dot_personal_test",
  orderType: "checkout",
  orderUrl: "checkout.html?service=dot_personal_test",
    name: "DOT Personal Test",
    shortName: "DOT Personal Test",
    category: "DOT Urine Drug Testing",
    specimen: "Urine",
    price: 5995,
    currency: "usd",
    stripePriceId: "",
    results: "2 to 3 days",
    description: "Ideal for individual compliance and peace of mind.",
    features: [
      "DOT 5 Panel Urine Test",
      "Digital Donor Passes",
      "Results in 2 to 3 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Marijuana (THC)",
      "Cocaine (COC)",
      "Amphetamines (AMP)",
      "Opioids (OPI)",
      "Phencyclidine (PCP)"
    ]
  },

  dot_pre_employment: {
    id: "dot_pre_employment",
  orderType: "checkout",
  orderUrl: "checkout.html?service=dot_pre_employment",
    name: "DOT Pre Employment",
    shortName: "DOT Pre Employment",
    category: "DOT Urine Drug Testing",
    specimen: "Urine",
    price: 5995,
    currency: "usd",
    stripePriceId: "",
    results: "2 to 3 days",
    description: "Quick results to get your drivers on the road faster.",
    features: [
      "DOT 5 Panel Urine Test",
      "Digital Donor Passes",
      "Results in 2 to 3 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Marijuana (THC)",
      "Cocaine (COC)",
      "Amphetamines (AMP)",
      "Opioids (OPI)",
      "Phencyclidine (PCP)"
    ]
  },

  dot_random_test: {
    id: "dot_random_test",
  orderType: "checkout",
  orderUrl: "checkout.html?service=dot_random_test",
    name: "DOT Random Test",
    shortName: "DOT Random Test",
    category: "DOT Urine Drug Testing",
    specimen: "Urine",
    price: 5995,
    currency: "usd",
    stripePriceId: "",
    results: "2 to 3 days",
    description: "Full FMCSA compliance for required random selections.",
    features: [
      "DOT 5 Panel Urine Test",
      "Digital Donor Passes",
      "Results in 2 to 3 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Marijuana (THC)",
      "Cocaine (COC)",
      "Amphetamines (AMP)",
      "Opioids (OPI)",
      "Phencyclidine (PCP)"
    ]
  },

  dot_reasonable_suspicion: {
    id: "dot_reasonable_suspicion",
  orderType: "checkout",
  orderUrl: "checkout.html?service=dot_reasonable_suspicion",
    name: "DOT Reasonable Suspicion",
    shortName: "DOT Reasonable Suspicion",
    category: "DOT Urine Drug Testing",
    specimen: "Urine",
    price: 5995,
    currency: "usd",
    stripePriceId: "",
    results: "2 to 3 days",
    description: "Sensitive handling for workplace safety needs.",
    features: [
      "DOT 5 Panel Urine Test",
      "Digital Donor Passes",
      "Results in 2 to 3 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Marijuana (THC)",
      "Cocaine (COC)",
      "Amphetamines (AMP)",
      "Opioids (OPI)",
      "Phencyclidine (PCP)"
    ]
  },

  dot_post_accident: {
    id: "dot_post_accident",
  orderType: "checkout",
  orderUrl: "checkout.html?service=dot_post_accident",
    name: "DOT Post Accident",
    shortName: "DOT Post Accident",
    category: "DOT Urine Drug Testing",
    specimen: "Urine",
    price: 5995,
    currency: "usd",
    stripePriceId: "",
    results: "2 to 3 days",
    description: "Immediate priority processing when time is critical.",
    features: [
      "DOT 5 Panel Urine Test",
      "Digital Donor Passes",
      "Results in 2 to 3 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Marijuana (THC)",
      "Cocaine (COC)",
      "Amphetamines (AMP)",
      "Opioids (OPI)",
      "Phencyclidine (PCP)"
    ]
  },

  dot_return_to_duty: {
    id: "dot_return_to_duty",
  orderType: "checkout",
  orderUrl: "checkout.html?service=dot_return_to_duty",
    name: "DOT Return to Duty",
    shortName: "DOT Return to Duty",
    category: "DOT Urine Drug Testing",
    specimen: "Urine",
    price: 7495,
    currency: "usd",
    stripePriceId: "",
    results: "2 to 3 days",
    description: "Mandatory testing for SAP program compliance.",
    features: [
      "DOT 5 Panel Urine Test",
      "Digital Donor Passes",
      "Results in 2 to 3 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Marijuana (THC)",
      "Cocaine (COC)",
      "Amphetamines (AMP)",
      "Opioids (OPI)",
      "Phencyclidine (PCP)"
    ]
  },

  dot_follow_up: {
    id: "dot_follow_up",
  orderType: "checkout",
  orderUrl: "checkout.html?service=dot_follow_up",
    name: "DOT Follow Up",
    shortName: "DOT Follow Up",
    category: "DOT Urine Drug Testing",
    specimen: "Urine",
    price: 7495,
    currency: "usd",
    stripePriceId: "",
    results: "2 to 3 days",
    description: "Continuous monitored screening for compliance.",
    features: [
      "DOT 5 Panel Urine Test",
      "Digital Donor Passes",
      "Results in 2 to 3 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Marijuana (THC)",
      "Cocaine (COC)",
      "Amphetamines (AMP)",
      "Opioids (OPI)",
      "Phencyclidine (PCP)"
    ]
  },

  /* =========================================================
     DOT BREATH ALCOHOL TESTING
     ========================================================= */

  dot_breathalyzer_pre_employment: {
    id: "dot_breathalyzer_pre_employment",
    orderType: "checkout",
    orderUrl: "checkout.html?service=dot_breathalyzer_pre_employment",
    name: "DOT Breathalyzer - Pre-Employment",
    shortName: "DOT Breathalyzer - Pre-Employment",
    category: "DOT Breath Alcohol Testing",
    specimen: "Breath",
    price: 6995,
    currency: "usd",
    stripePriceId: "",
    results: "Instant Results",
    description: "DOT breath alcohol testing support for applicable transportation employment requirements.",
    features: [
      "DOT Breathalyzer Test",
      "Instant Results",
      "Certified Collection Site"
    ]
  },

  dot_breathalyzer_random: {
    id: "dot_breathalyzer_random",
    orderType: "checkout",
    orderUrl: "checkout.html?service=dot_breathalyzer_random",
    name: "DOT Breathalyzer - Random Testing",
    shortName: "DOT Breathalyzer - Random Testing",
    category: "DOT Breath Alcohol Testing",
    specimen: "Breath",
    price: 6995,
    currency: "usd",
    stripePriceId: "",
    results: "Instant Results",
    description: "DOT alcohol testing support for applicable random testing selections and compliance requirements.",
    features: [
      "DOT Breathalyzer Test",
      "Instant Results",
      "Certified Collection Site"
    ]
  },

  dot_breathalyzer_post_accident: {
    id: "dot_breathalyzer_post_accident",
    orderType: "checkout",
    orderUrl: "checkout.html?service=dot_breathalyzer_post_accident",
    name: "DOT Breathalyzer - Post-Accident",
    shortName: "DOT Breathalyzer - Post-Accident",
    category: "DOT Breath Alcohol Testing",
    specimen: "Breath",
    price: 6995,
    currency: "usd",
    stripePriceId: "",
    results: "Instant Results",
    description: "DOT alcohol testing support when a qualifying transportation incident requires testing.",
    features: [
      "DOT Breathalyzer Test",
      "Instant Results",
      "Certified Collection Site"
    ]
  },

  dot_breathalyzer_reasonable_suspicion: {
    id: "dot_breathalyzer_reasonable_suspicion",
    orderType: "checkout",
    orderUrl: "checkout.html?service=dot_breathalyzer_reasonable_suspicion",
    name: "DOT Breathalyzer - Reasonable Suspicion",
    shortName: "DOT Breathalyzer - Reasonable Suspicion",
    category: "DOT Breath Alcohol Testing",
    specimen: "Breath",
    price: 6995,
    currency: "usd",
    stripePriceId: "",
    results: "Instant Results",
    description: "DOT alcohol testing support for applicable reasonable-suspicion testing situations.",
    features: [
      "DOT Breathalyzer Test",
      "Instant Results",
      "Certified Collection Site"
    ]
  },

  dot_breathalyzer_compliance_plus: {
    id: "dot_breathalyzer_compliance_plus",
    orderType: "checkout",
    orderUrl: "checkout.html?service=dot_breathalyzer_compliance_plus",
    name: "DOT Breathalyzer - Compliance Plus",
    shortName: "DOT Breathalyzer - Compliance Plus",
    category: "DOT Breath Alcohol Testing",
    specimen: "Breath",
    price: 14995,
    currency: "usd",
    stripePriceId: "",
    results: "Instant Results",
    description: "Expanded DOT alcohol testing support with additional compliance and program-management services. Valid for one year.",
    features: [
      "DOT Breathalyzer Test",
      "Instant Results",
      "Certified Collection Site",
      "Random Consortium Entry",
      "Result Management Portal",
      "Compliance Audit Support",
      "Consortium Entry Agreement",
      "Compliance Certificate"
    ]
  },

  dot_breathalyzer_enterprise: {
    id: "dot_breathalyzer_enterprise",
    orderType: "custom_form",
    orderUrl: "enterprise-testing-form.html",
    name: "DOT Breathalyzer - Enterprise",
    shortName: "DOT Breathalyzer - Enterprise",
    category: "DOT Breath Alcohol Testing",
    specimen: "Breath",
    price: 0,
    currency: "usd",
    stripePriceId: "",
    results: "Custom",
    description: "High-volume DOT alcohol testing solutions for large nationwide fleets with customized reporting solutions.",
    features: [
      "DOT Breathalyzer Tests",
      "Instant Results",
      "Certified Collection Sites",
      "Random Consortium Entry",
      "Result Management Portal",
      "Compliance Audit Support",
      "Consortium Entry Agreement",
      "Compliance Certificate",
      "High Volume Testing",
      "Customized Reporting Solutions for Large Nationwide Fleets"
    ]
  },



  /* =========================================================
     DOT SPECIMEN COLLECTOR TRAINING
     ========================================================= */

  dot_specimen_collector_training: {
    id: "dot_specimen_collector_training",
    orderType: "checkout",
    orderUrl: "checkout.html?service=dot_specimen_collector_training",
    name: "DOT Specimen Collector Training",
    shortName: "DOT Specimen Collector Training",
    category: "DOT Specimen Collector Training",
    specimen: "N/A",
    price: 32000,
    currency: "usd",
    stripePriceId: "",
    results: "60-day access",
    description: "Self-paced DOT specimen collector training covering 49 CFR Part 40, collection procedures, chain of custody, site security and mock collections.",
    features: [
      "3 Hours of DOT Specimen Collector Training",
      "60-Day Access",
      "Self-Paced Learning Modules",
      "5 DOT Online Video Mock Collections",
      "Collection-Site Security Training",
      "Collector Requirements",
      "Specimen Collection Process",
      "Custody & Control Form Training",
      "Completion Certificate"
    ]
  },

  dot_specimen_collector_training_hair: {
    id: "dot_specimen_collector_training_hair",
    orderType: "checkout",
    orderUrl: "checkout.html?service=dot_specimen_collector_training_hair",
    name: "DOT Specimen Collector Training + Hair",
    shortName: "DOT Collector Training + Hair",
    category: "DOT Specimen Collector Training",
    specimen: "N/A",
    price: 36000,
    currency: "usd",
    stripePriceId: "",
    results: "60-day access",
    description: "DOT Specimen Collector Training plus Hair Drug Test Training and a Hair Drug Test Certificate.",
    features: [
      "DOT Specimen Collector Training",
      "60-Day Access",
      "Self-Paced Learning Modules",
      "5 DOT Online Video Mock Collections",
      "Hair Drug Test Training",
      "Hair Drug Test Certificate"
    ]
  },

  dot_specimen_collector_train_the_trainer: {
    id: "dot_specimen_collector_train_the_trainer",
    orderType: "checkout",
    orderUrl: "checkout.html?service=dot_specimen_collector_train_the_trainer",
    name: "DOT Specimen Collector Train the Trainer",
    shortName: "DOT Collector Train the Trainer",
    category: "DOT Specimen Collector Training",
    specimen: "N/A",
    price: 55000,
    currency: "usd",
    stripePriceId: "",
    results: "60-day access",
    description: "DOT Specimen Collector Training with instructor materials, training capability for others and an Instructor Certificate.",
    features: [
      "DOT Specimen Collector Training",
      "60-Day Access",
      "Self-Paced Learning Modules",
      "5 DOT Online Video Mock Collections",
      "Instructor Materials",
      "Ability to Train Others",
      "Instructor Certificate"
    ]
  },

  dot_collector_train_the_trainer_hair: {
    id: "dot_collector_train_the_trainer_hair",
    orderType: "checkout",
    orderUrl: "checkout.html?service=dot_collector_train_the_trainer_hair",
    name: "DOT Collector Train the Trainer + Hair",
    shortName: "DOT Train the Trainer + Hair",
    category: "DOT Specimen Collector Training",
    specimen: "N/A",
    price: 60000,
    currency: "usd",
    stripePriceId: "",
    results: "60-day access",
    description: "DOT Collector Train the Trainer package plus Hair Drug Test Training and a Hair Drug Test Certificate.",
    features: [
      "DOT Specimen Collector Train the Trainer",
      "60-Day Access",
      "Self-Paced Learning Modules",
      "5 DOT Online Video Mock Collections",
      "Instructor Materials",
      "Ability to Train Others",
      "Instructor Certificate",
      "Hair Drug Test Training",
      "Hair Drug Test Certificate"
    ]
  },

  /* =========================================================
     DOT PHYSICAL EXAM SERVICES
     ========================================================= */

  dot_physical_essential: {
    id: "dot_physical_essential",
    orderType: "checkout",
    orderUrl: "checkout.html?service=dot_physical_essential",
    name: "DOT Physical - Essential",
    shortName: "DOT Physical - Essential",
    category: "DOT Physicals",
    specimen: "N/A",
    price: 17595,
    currency: "usd",
    stripePriceId: "",
    results: "Same Day",
    description: "A complete DOT physical examination covering the core medical and certification requirements for commercial drivers.",
    features: [
      "Full Physical Examination",
      "Vision Check",
      "Hearing Check",
      "Blood Pressure Check",
      "Urinalysis for Medical Conditions",
      "Medical History Review",
      "Certification Card"
    ]
  },

  dot_physical_complete: {
    id: "dot_physical_complete",
    orderType: "checkout",
    orderUrl: "checkout.html?service=dot_physical_complete",
    name: "DOT Physical - Complete",
    shortName: "DOT Physical - Complete",
    category: "DOT Physicals",
    specimen: "N/A",
    price: 27595,
    currency: "usd",
    stripePriceId: "",
    results: "Same Day",
    description: "A comprehensive DOT physical package that combines the complete medical examination with DOT urine drug and breath alcohol testing.",
    features: [
      "Full Physical Examination",
      "Vision Check",
      "Hearing Check",
      "Blood Pressure Check",
      "Urinalysis for Medical Conditions",
      "Medical History Review",
      "Certification Card",
      "DOT Urine Drug Test",
      "DOT Breathalyzer Test"
    ]
  },

  dot_physical_driver_plus: {
    id: "dot_physical_driver_plus",
    orderType: "checkout",
    orderUrl: "checkout.html?service=dot_physical_driver_plus",
    name: "DOT Physical - Driver Plus",
    shortName: "DOT Physical - Driver Plus",
    category: "DOT Physicals",
    specimen: "N/A",
    price: 22595,
    currency: "usd",
    stripePriceId: "",
    results: "Same Day",
    description: "A complete DOT physical with added driver-focused documentation support for a straightforward certification process.",
    features: [
      "Full Physical Examination",
      "Vision Check",
      "Hearing Check",
      "Blood Pressure Check",
      "Urinalysis for Medical Conditions",
      "Medical History Review",
      "Certification Card",
      "Driver Documentation Review"
    ]
  },

  dot_physical_compliance: {
    id: "dot_physical_compliance",
    orderType: "checkout",
    orderUrl: "checkout.html?service=dot_physical_compliance",
    name: "DOT Physical - Compliance",
    shortName: "DOT Physical - Compliance",
    category: "DOT Physicals",
    specimen: "N/A",
    price: 24995,
    currency: "usd",
    stripePriceId: "",
    results: "Same Day",
    description: "A comprehensive DOT physical package designed for drivers who want the examination and additional compliance-focused documentation support in one service.",
    features: [
      "Full Physical Examination",
      "Vision Check",
      "Hearing Check",
      "Blood Pressure Check",
      "Urinalysis for Medical Conditions",
      "Medical History Review",
      "Certification Card",
      "Driver Documentation Review",
      "DOT Compliance Support"
    ]
  },

  employer_driver_physicals: {
    id: "employer_driver_physicals",
    orderType: "custom_form",
    orderUrl: "employer-driver-physical-form.html",
    name: "Employer Driver Physicals",
    shortName: "Employer Driver Physicals",
    category: "DOT Physicals",
    specimen: "N/A",
    price: 0,
    currency: "usd",
    stripePriceId: "",
    results: "Custom",
    description: "Employer-focused DOT physical scheduling and program support for companies managing physical examinations for their commercial drivers.",
    features: [
      "Employer Driver Physical Scheduling",
      "Driver Roster Coordination",
      "DOT Physical Exam Support",
      "Scheduling Assistance",
      "Employer Program Support"
    ]
  },

  dot_medical_exam_support: {
    id: "dot_medical_exam_support",
    orderType: "contact",
    orderUrl: "contact.html",
    name: "DOT Medical Exam Support",
    shortName: "DOT Medical Exam Support",
    category: "DOT Physicals",
    specimen: "N/A",
    price: 0,
    currency: "usd",
    stripePriceId: "",
    results: "Custom",
    description: "Personalized assistance for drivers and employers who need help understanding or coordinating DOT medical examination requirements.",
    features: [
      "DOT Medical Exam Guidance",
      "Medical Documentation Support",
      "Exam Coordination Assistance",
      "Driver Support",
      "Employer Support"
    ]
  },

  /* =========================================================
     URINE DRUG TESTS
     ========================================================= */

  urine_4_panel: {
    id: "urine_4_panel",
  orderType: "checkout",
  orderUrl: "checkout.html?service=urine_4_panel",
    name: "4 Panel Drug Test",
    shortName: "4 Panel Drug Test",
    category: "Urine Drug Testing",
    specimen: "Urine",
    price: 4995,
    currency: "usd",
    stripePriceId: "",
    results: "2 to 3 days",
    description: "Comprehensive screening for 4 common illegal substances.",
    features: [
      "4 Panel Drug Test",
      "Digital Donor Passes",
      "Results in 2 to 3 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Cocaine (COC)",
      "Marijuana (THC)",
      "Opiates (OPI)",
      "Phencyclidine (PCP)"
    ]
  },

  urine_5_panel: {
    id: "urine_5_panel",
  orderType: "checkout",
  orderUrl: "checkout.html?service=urine_5_panel",
    name: "5 Panel Drug Test",
    shortName: "5 Panel Drug Test",
    category: "Urine Drug Testing",
    specimen: "Urine",
    price: 5995,
    currency: "usd",
    stripePriceId: "",
    results: "2 to 3 days",
    description: "Standard workplace screening for 5 major drug classes.",
    features: [
      "5 Panel Drug Test",
      "Digital Donor Passes",
      "Results in 2 to 3 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Marijuana (THC)",
      "Cocaine (COC)",
      "Opiates (Codeine, Morphine, Heroin)",
      "Amphetamines (AMP)",
      "Phencyclidine (PCP)"
    ]
  },

  urine_5_panel_expanded_opiates: {
    id: "urine_5_panel_expanded_opiates",
  orderType: "checkout",
  orderUrl: "checkout.html?service=urine_5_panel_expanded_opiates",
    name: "5 Panel Drug Test Expanded Opiates",
    shortName: "5 Panel Expanded Opiates",
    category: "Urine Drug Testing",
    specimen: "Urine",
    price: 6995,
    currency: "usd",
    stripePriceId: "",
    results: "2 to 3 days",
    description: "Advanced 5-panel test including expanded opiate analysis.",
    features: [
      "5 Panel Drug Test Expanded Opiates",
      "Digital Donor Passes",
      "Results in 2 to 3 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Marijuana (THC)",
      "Cocaine (COC)",
      "Amphetamines (AMP)",
      "Phencyclidine (PCP)",
      "Opiates (Codeine, Morphine, Heroin, Hydrocodone, Hydromorphone, Oxycodone & Oxymorphone)"
    ]
  },

  urine_10_panel_lab: {
    id: "urine_10_panel_lab",
  orderType: "checkout",
  orderUrl: "checkout.html?service=urine_10_panel_lab",
    name: "10 Panel Drug Test (Lab)",
    shortName: "10 Panel Drug Test (Lab)",
    category: "Urine Drug Testing",
    specimen: "Urine",
    price: 7995,
    currency: "usd",
    stripePriceId: "",
    results: "2 to 3 days",
    description: "Detailed laboratory analysis for index drug panels.",
    features: [
      "10 Panel Drug Test (Lab)",
      "Digital Donor Passes",
      "Results in 2 to 3 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Cocaine (COC)",
      "Marijuana (THC)",
      "Phencyclidine (PCP)",
      "Amphetamines (AMP)",
      "Opiates (heroin, morphine, oxycodone, etc.)",
      "Benzodiazepine (BZO)",
      "Barbiturates (BAR)",
      "Methadone (MTD)",
      "Propoxyphene (PPX)",
      "Methamphetamine (MET)"
    ]
  },

  urine_10_panel_rapid: {
    id: "urine_10_panel_rapid",
  orderType: "checkout",
  orderUrl: "checkout.html?service=urine_10_panel_rapid",
    name: "10 Panel Drug Test (Rapid)",
    shortName: "10 Panel Drug Test (Rapid)",
    category: "Urine Drug Testing",
    specimen: "Urine",
    price: 8995,
    currency: "usd",
    stripePriceId: "",
    results: "Instant Results",
    description: "Fast, on-site results for a broad 10-substance spectrum.",
    features: [
      "10 Panel Drug Test (Rapid)",
      "Digital Donor Passes",
      "Instant Results",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Cocaine (COC)",
      "Marijuana (THC)",
      "Phencyclidine (PCP)",
      "Amphetamines (AMP)",
      "Opiates (heroin, morphine, codeine, etc.)",
      "Benzodiazepine (BZO)",
      "Barbiturates (BAR)",
      "Methadone (MTD)",
      "Propoxyphene (PPX)",
      "Methamphetamine (MET)"
    ]
  },

  urine_12_panel: {
    id: "urine_12_panel",
  orderType: "checkout",
  orderUrl: "checkout.html?service=urine_12_panel",
    name: "12 Panel Drug Test",
    shortName: "12 Panel Drug Test",
    category: "Urine Drug Testing",
    specimen: "Urine",
    price: 11595,
    currency: "usd",
    stripePriceId: "",
    results: "2 to 3 days",
    description: "Broad spectrum screening for 12 substance groups.",
    features: [
      "12 Panel Drug Test",
      "Digital Donor Passes",
      "Results in 2 to 3 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Marijuana (THC)",
      "Cocaine (COC)",
      "Phencyclidine (PCP)",
      "Amphetamines (AMP)",
      "Opiates (OPI) (Codeine, Morphine, etc.)",
      "Barbiturates (BAR)",
      "Benzodiazepine (BZO)",
      "Propoxyphene (PPX)",
      "Methadone (MTD)",
      "Tramadol (TRA)",
      "Fentanyl (FEN)",
      "Meperidine (Pethidine)"
    ]
  },

  urine_14_panel: {
    id: "urine_14_panel",
  orderType: "checkout",
  orderUrl: "checkout.html?service=urine_14_panel",
    name: "14 Panel Drug Test",
    shortName: "14 Panel Drug Test",
    category: "Urine Drug Testing",
    specimen: "Urine",
    price: 13595,
    currency: "usd",
    stripePriceId: "",
    results: "2 to 3 days",
    description: "Screening for full compliance across 14 substance panels.",
    features: [
      "14 Panel Drug Test",
      "Digital Donor Passes",
      "Results in 2 to 3 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "6AM",
      "AMP/MAMP",
      "Barbiturates",
      "Benzodiazepine (BZO)",
      "Cocaine Metabolite",
      "ETG/ETS",
      "Marijuana Metabolites",
      "MDMA/MDA",
      "Methadone MTB",
      "Opiates",
      "Oxycodone/Oxymorphone",
      "Phencyclidine",
      "Propoxyphene"
    ]
  },

  urine_18_panel: {
    id: "urine_18_panel",
  orderType: "checkout",
  orderUrl: "checkout.html?service=urine_18_panel",
    name: "18 Panel Drug Test",
    shortName: "18 Panel Drug Test",
    category: "Urine Drug Testing",
    specimen: "Urine",
    price: 15995,
    currency: "usd",
    stripePriceId: "",
    results: "2 to 3 days",
    description: "Maximum range screening for full compliance across 18 substance panels.",
    features: [
      "18 Panel Drug Test",
      "Digital Donor Passes",
      "Results in 2 to 3 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Amphetamines (AMP)",
      "Barbiturates (BAR)",
      "Benzodiazepine (BZO)",
      "Buprenorphine (BUP)",
      "Cocaine (COC)",
      "Ecstasy (MDMA)",
      "Fentanyl (FEN)",
      "Marijuana (THC)",
      "Methadone (MTD)",
      "Methamphetamine (MET)",
      "Morphine (OPI)",
      "Oxycodone (OXY)",
      "Phencyclidine (PCP)",
      "Nortriptyline (TCA)",
      "Ketamin (KET)"
    ]
  },

  /* =========================================================
     HAIR FOLLICLE DRUG TESTS
     ========================================================= */

  hair_5_panel: {
    id: "hair_5_panel",
  orderType: "checkout",
  orderUrl: "checkout.html?service=hair_5_panel",
    name: "5 Panel Hair Follicle Test",
    shortName: "5 Panel Hair Follicle Test",
    category: "Hair Follicle Drug Testing",
    specimen: "Hair",
    price: 11595,
    currency: "usd",
    stripePriceId: "",
    results: "3 to 7 days",
    description: "Standardized 90-day drug screening for five core panels with high accuracy and precision results.",
    features: [
      "5 Panel Hair Follicle Test",
      "Digital Donor Passes",
      "Results in 3 to 7 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Cocaine (COC)",
      "Marijuana (THC)",
      "Opiates (OPI) (Codeine, Morphine, Heroin)",
      "Amphetamines (AMP) (Methamphetamine & Ecstasy)",
      "Phencyclidine (PCP)"
    ]
  },

  hair_5_panel_expanded_opiates: {
    id: "hair_5_panel_expanded_opiates",
  orderType: "checkout",
  orderUrl: "checkout.html?service=hair_5_panel_expanded_opiates",
    name: "5 Panel Hair Follicle (Exp Opi)",
    shortName: "5 Panel Hair Follicle Expanded Opiates",
    category: "Hair Follicle Drug Testing",
    specimen: "Hair",
    price: 13595,
    currency: "usd",
    stripePriceId: "",
    results: "3 to 7 days",
    description: "Expanded opiate screening, including prescription pain medication, for full safety compliance.",
    features: [
      "5 Panel Hair Follicle (Exp Opi)",
      "Digital Donor Passes",
      "Results in 3 to 7 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Cocaine (COC)",
      "Marijuana (THC)",
      "Opiates (OPI) (Codeine, Morphine, Heroin, Oxycodone, Hydrocodone, Hydromorphone)",
      "Amphetamines (AMP) (Methamphetamine & Ecstasy)",
      "Phencyclidine (PCP)"
    ]
  },

  hair_7_panel: {
    id: "hair_7_panel",
  orderType: "checkout",
  orderUrl: "checkout.html?service=hair_7_panel",
    name: "7 Panel Hair Follicle Test",
    shortName: "7 Panel Hair Follicle Test",
    category: "Hair Follicle Drug Testing",
    specimen: "Hair",
    price: 15595,
    currency: "usd",
    stripePriceId: "",
    results: "3 to 7 days",
    description: "Advanced screening for seven specific panels, ensuring thorough long-term workplace and legal safety and compliance.",
    features: [
      "7 Panel Hair Follicle Test",
      "Digital Donor Passes",
      "Results in 3 to 7 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Barbiturates (BAR)",
      "Benzodiazepines (BZO)",
      "Cocaine (COC)",
      "Marijuana (THC)",
      "Amphetamines (AMP) (methamphetamine & ecstasy)",
      "Phencyclidine (PCP)",
      "Opiates (OPI) (Codeine, Morphine, Heroine, Hydrocodone, Hydromorphone, Oxycodone, Oxymorphone)"
    ]
  },

  hair_9_panel: {
    id: "hair_9_panel",
  orderType: "checkout",
  orderUrl: "checkout.html?service=hair_9_panel",
    name: "9 Panel Hair Follicle Test",
    shortName: "9 Panel Hair Follicle Test",
    category: "Hair Follicle Drug Testing",
    specimen: "Hair",
    price: 22595,
    currency: "usd",
    stripePriceId: "",
    results: "3 to 7 days",
    description: "Comprehensive detection of nine substances, ideal for advanced compliance monitoring programs.",
    features: [
      "9 Panel Hair Follicle Test",
      "Digital Donor Passes",
      "Results in 3 to 7 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Barbiturates (BAR)",
      "Benzodiazepines (BZO)",
      "Cocaine (COC)",
      "Marijuana (THC)",
      "Amphetamines (AMP) (methamphetamine & ecstasy)",
      "Phencyclidine (PCP)",
      "Opiates (OPI) (Codeine, Morphine, Heroine, Hydrocodone, Hydromorphone, Oxycodone, Oxymorphone)",
      "Methadone (MTD)",
      "Propoxyphene (PPX)"
    ]
  },

  hair_12_panel: {
    id: "hair_12_panel",
  orderType: "checkout",
  orderUrl: "checkout.html?service=hair_12_panel",
    name: "12 Panel Hair Follicle Test",
    shortName: "12 Panel Hair Follicle Test",
    category: "Hair Follicle Drug Testing",
    specimen: "Hair",
    price: 47595,
    currency: "usd",
    stripePriceId: "",
    results: "3 to 7 days",
    description: "The Gold standard in detailed detection, covering a wide range of illicit and prescription drugs.",
    features: [
      "12 Panel Hair Follicle Test",
      "Digital Donor Passes",
      "Results in 3 to 7 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Cocaine (COC)",
      "Marijuana (THC)",
      "Amphetamines (Methamphetamine & Ecstasy)",
      "Phencyclidine (PCP)",
      "Opiates (OPI) (Codeine, Morphine, Heroin, Oxycodone, Hydrocodone, Hydromorphone)",
      "Barbiturates (BAR)",
      "Benzodiazepines (BZO)",
      "Propoxyphene (PPX)",
      "Methadone (MTD)",
      "Meperidine",
      "Tramadol (TRA)"
    ]
  },

  hair_14_panel: {
    id: "hair_14_panel",
  orderType: "checkout",
  orderUrl: "checkout.html?service=hair_14_panel",
    name: "14 Panel Hair Follicle Test",
    shortName: "14 Panel Hair Follicle Test",
    category: "Hair Follicle Drug Testing",
    specimen: "Hair",
    price: 59595,
    currency: "usd",
    stripePriceId: "",
    results: "3 to 7 days",
    description: "14-panel hair follicle screening with nationwide collection access.",
    features: [
      "14 Panel Hair Follicle Test",
      "Digital Donor Passes",
      "Results in 3 to 7 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Propoxyphene (PPX)",
      "Cocaine (COC)",
      "Marijuana (THC)",
      "Amphetamines (AMP) (methamphetamine & ecstasy)",
      "Phencyclidine (PCP)",
      "Opiates (OPI) (Codeine, Morphine, Heroin, Oxycodone, Hydrocodone, Hydromorphone)",
      "Barbiturates (BAR)",
      "Benzodiazepines (BZO)",
      "Methadone (MTD)",
      "Tramadol (TRA)",
      "Sufentanil",
      "Fentanyl (FEN)",
      "Meperidine"
    ]
  },

  hair_17_panel: {
    id: "hair_17_panel",
  orderType: "checkout",
  orderUrl: "checkout.html?service=hair_17_panel",
    name: "17 Panel Hair Follicle Test",
    shortName: "17 Panel Hair Follicle Test",
    category: "Hair Follicle Drug Testing",
    specimen: "Hair",
    price: 69595,
    currency: "usd",
    stripePriceId: "",
    results: "3 to 7 days",
    description: "The 17-panel test covers all substances, including prescription drugs, ensuring safety and legal compliance.",
    features: [
      "17 Panel Hair Follicle Test",
      "Digital Donor Passes",
      "Results in 3 to 7 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Amphetamines (AMP)",
      "Methamphetamines (Meth)",
      "Cocaine (COC)",
      "Marijuana (THC)",
      "Opiates (OPI) Synthetic Expanded Opiates (Hydrocodone, Oxycodone)",
      "Fentanyl (FEN)",
      "Tramadol (TRA)",
      "Buprenorphine (BUP)",
      "Phencyclidine (PCP)",
      "Benzodiazepines (BZO)",
      "Barbiturates (BAR)",
      "Methadone (MTD)",
      "Propoxyphene (PPX)",
      "Meperidine",
      "Ketamine",
      "Zolpidem (Ambien)"
    ]
  },

  /* =========================================================
     ETG / ALCOHOL TESTS
     ========================================================= */

  etg_plus_5_panel: {
    id: "etg_plus_5_panel",
    orderType: "checkout",
    orderUrl: "checkout.html?service=etg_plus_5_panel",
    name: "EtG + 5 Panel Drug Test",
    shortName: "EtG + 5 Panel Drug Test",
    category: "EtG Alcohol & Drug Testing",
    specimen: "Urine",
    price: 12995,
    currency: "usd",
    stripePriceId: "",
    results: "2 to 3 days",
    description: "Comprehensive combined screening for EtG alcohol and 5 major drug classes.",
    features: [
      "EtG + 5 Panel Drug Test",
      "Digital Donor Passes",
      "Results in 2 to 3 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Ethyl Glucuronide (EtG)",
      "Amphetamines (AMP) (MAMP-Methamphetamine, MDMA-Ecstasy)",
      "Cocaine (COC)",
      "Opiates (OPI) (Codeine, Morphine)",
      "Phencyclidine (PCP)",
      "Marijuana (THC)"
    ]
  },

  etg_plus_10_panel: {
    id: "etg_plus_10_panel",
    orderType: "checkout",
    orderUrl: "checkout.html?service=etg_plus_10_panel",
    name: "EtG + 10 Panel Drug Test",
    shortName: "EtG + 10 Panel Drug Test",
    category: "EtG Alcohol & Drug Testing",
    specimen: "Urine",
    price: 14495,
    currency: "usd",
    stripePriceId: "",
    results: "2 to 3 days",
    description: "Expanded panel testing for EtG alcohol and 10 common illicit and prescription substances.",
    features: [
      "EtG + 10 Panel Drug Test",
      "Digital Donor Passes",
      "Results in 2 to 3 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Ethyl Glucuronide (EtG)",
      "Amphetamines (AMP) (MAMP-Methamphetamine, MDMA-Ecstasy)",
      "Cocaine (COC)",
      "Opiates (OPI) (Heroin, Codeine, Morphine, Hydrocodone, Hydromorphone, Oxycodone, and Oxymorphone)",
      "Phencyclidine (PCP)",
      "Marijuana (THC)",
      "Benzodiazepines (BZO)",
      "Barbiturates (BAR)",
      "Methadone (MTD)",
      "Propoxyphene (PPX)",
      "Methaqualone (Meth)"
    ]
  },

  etg_urine_alcohol: {
    id: "etg_urine_alcohol",
    orderType: "checkout",
    orderUrl: "checkout.html?service=etg_urine_alcohol",
    name: "EtG Urine Alcohol Test",
    shortName: "EtG Urine Alcohol Test",
    category: "EtG Alcohol Testing",
    specimen: "Urine",
    price: 11595,
    currency: "usd",
    stripePriceId: "",
    results: "2 to 3 days",
    description: "Highly accurate urine-based screening for ethyl glucuronide to monitor recent alcohol consumption.",
    features: [
      "EtG Urine Alcohol Test",
      "Digital Donor Passes",
      "Results in 2 to 3 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Ethyl Glucuronide (EtG)",
      "ETG (Alcohol Metabolite)"
    ]
  },

  etg_alcohol_hair: {
    id: "etg_alcohol_hair",
    orderType: "checkout",
    orderUrl: "checkout.html?service=etg_alcohol_hair",
    name: "EtG Alcohol Hair Test",
    shortName: "EtG Alcohol Hair Test",
    category: "EtG Alcohol Testing",
    specimen: "Hair",
    price: 39595,
    currency: "usd",
    stripePriceId: "",
    results: "3 to 7 days",
    description: "Long-term monitoring solution detecting alcohol metabolites in hair for a 90-day window.",
    features: [
      "EtG Alcohol Hair Test",
      "Digital Donor Passes",
      "Results in 3 to 7 days",
      "Nationwide Collection Sites",
      "Secure Online Results"
    ],
    drugs: [
      "Ethyl Glucuronide (EtG)",
      "ETG (Alcohol Metabolite)"
    ]
  },

  /* =========================================================
     ORAL FLUID DRUG TESTS
     ========================================================= */

  oral_5_panel: {
    id: "oral_5_panel",
  orderType: "checkout",
  orderUrl: "checkout.html?service=oral_5_panel",
    name: "5 Panel Oral Fluid Test",
    shortName: "5 Panel Oral Fluid Test",
    category: "Oral Fluid Drug Testing",
    specimen: "Oral Fluid",
    price: 5995,
    currency: "usd",
    stripePriceId: "",
    results: "2 to 3 days",
    description: "Observed oral fluid collection with laboratory analysis and secure reporting.",
    features: [
      "Observed Collection",
      "Lab Analysis",
      "Secure Reporting"
    ],
    drugs: [
      "Cocaine (COC)",
      "Marijuana (THC)",
      "Opiates (OPI) (Codeine, Morphine, Heroin)",
      "Amphetamines (AMP) (Methamphetamine & Ecstasy)",
      "Phencyclidine (PCP)"
    ]
  },

  oral_10_panel: {
    id: "oral_10_panel",
  orderType: "checkout",
  orderUrl: "checkout.html?service=oral_10_panel",
    name: "10 Panel Oral Fluid Test",
    shortName: "10 Panel Oral Fluid Test",
    category: "Oral Fluid Drug Testing",
    specimen: "Oral Fluid",
    price: 6995,
    currency: "usd",
    stripePriceId: "",
    results: "2 to 3 days",
    description: "Observed oral fluid collection with expanded laboratory analysis and secure reporting.",
    features: [
      "Observed Collection",
      "Lab Analysis",
      "Secure Reporting"
    ],
    drugs: [
      "Cocaine (COC)",
      "Marijuana (THC)",
      "Phencyclidine (PCP)",
      "Amphetamines (AMP)",
      "Opiates (heroin, codeine, hydrocodone, hydromorphone, oxycodone, and morphine)",
      "Benzodiazepines (BZO)",
      "Barbiturates (BAR)",
      "Methadone (MTD)",
      "Propoxyphene (PPX)",
      "Methamphetamine (MET)"
    ]
  },

  oral_post_accident: {
    id: "oral_post_accident",
  orderType: "checkout",
  orderUrl: "checkout.html?service=oral_post_accident",
    name: "Post-Accident Oral Test",
    shortName: "Post-Accident Oral Test",
    category: "Oral Fluid Drug Testing",
    specimen: "Oral Fluid",
    price: 8995,
    currency: "usd",
    stripePriceId: "",
    results: "Rapid Results",
    description: "Rapid post-accident oral fluid testing with chain of custody and compliance support.",
    features: [
      "Rapid Results",
      "Full Chain of Custody",
      "Compliance Support",
      "Secure Reporting"
    ],
    drugs: [
      "Cocaine (COC)",
      "Marijuana (THC)",
      "Phencyclidine (PCP)",
      "Amphetamines (AMP)",
      "Opiates",
      "Benzodiazepines (BZO)",
      "Barbiturates (BAR)",
      "Methadone (MTD)",
      "Propoxyphene (PPX)",
      "Methamphetamine (MET)"
    ]
  }
};


/* =========================================================
   service CATALOG HELPERS
   ========================================================= */

/**
 * Get a service by its ID.
 */
function getTestService(serviceId) {
  if (!serviceId || !TEST_SERVICES[serviceId]) {
    return null;
  }

  return TEST_SERVICES[serviceId];
}

/**
 * Return every service in the catalog.
 */
function getAllTestServices() {
  return Object.values(TEST_SERVICES);
}

/**
 * Return services belonging to a category.
 */
function getTestServicesByCategory(category) {
  return getAllTestServices().filter(
    (service) => service.category === category
  );
}

/**
 * Convert cents into a display price.
 *
 * Example:
 * 5995 -> "$59.95"
 */
function formatTestPrice(priceInCents, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(priceInCents / 100);
}

/**
 * Get the Stripe-compatible amount in cents.
 */
function getStripeAmount(serviceId) {
  const service = getTestService(serviceId);

  return service ? service.price : null;
}

/**
 * Basic catalog validation.
 *
 * This does not replace backend validation.
 */

/**
 * Returns the correct customer-facing order destination for a service.
 *
 * Paid services use the universal checkout page with the service ID.
 * Custom-pricing services use their designated inquiry form.
 */
function getTestOrderUrl(serviceId) {
  const service = getTestService(serviceId);

  if (!service) {
    return null;
  }

  if (service.orderUrl) {
    return service.orderUrl;
  }

  if (service.orderType === "contact") {
    return "contact.html";
  }

  if (service.orderType === "custom_form") {
    return "contact.html";
  }

  return "checkout.html?service=" + encodeURIComponent(service.id);
}

function validateTestService(serviceId) {
  const service = getTestService(serviceId);

  if (!service) {
    return {
      valid: false,
      reason: "service not found."
    };
  }

  if (!service.name) {
    return {
      valid: false,
      reason: "service pricing is invalid."
    };
  }

  if (!["custom_form", "contact"].includes(service.orderType) && (!service.price || service.price <= 0)) {
    return {
      valid: false,
      reason: "service pricing is invalid."
    };
  }

  return {
    valid: true,
    service
  };
}


/* =========================================================
   OPTIONAL GLOBAL ACCESS
   ========================================================= */

window.Screenings4UTestCatalog = {
  services: TEST_SERVICES,
  getTestService,
  getAllTestServices,
  getTestServicesByCategory,
  formatTestPrice,
  getStripeAmount,
  validateTestService
};