import { 
  TrendingUp, 
  Mail, 
  Search, 
  Sparkles, 
  Zap, 
  Target, 
  Users, 
  Globe, 
  Building2, 
  Star, 
  Package, 
  Headphones,
  ChevronRight 
} from "lucide-react";
import type { Form, FormSection, FormSlide } from "../types";
import { FORM_DEFAULTS } from "../defaults";

export interface OnboardingQuestionnaireData {
  [key: string]: string;
  purpose: string;
  goal: string;
  hasWebsite: string;
  website: string;
  companyName: string;
  companyCity: string;
  companyState: string;
  companyRole: string;
  offeringType: string;
  productDescription: string;
  customerLove: string;
  hasFixedPricing: string;
  packageName: string;
  packageCost: string;
  packageIncludes: string;
  serviceDescription: string;
  serviceCost: string;
  serviceOther: string;
}

const sectionA: FormSection<OnboardingQuestionnaireData> = {
  id: "section-a",
  name: "Get to Know You",
  emoji: "🐥",
  completionCredits: 50,
  trigger: { type: "auto" },
  slides: [
    {
      id: "welcome",
      slideType: "welcome",
      title: "Welcome aboard!",
      subtitle: "Let's find your \"IDEAL\" customers.",
      emoji: "🐥",
      skipLink: { text: "Skip Onboarding", action: "skip" },
    },
    {
      id: "purpose",
      slideType: "multi-select",
      title: "What brings you here?",
      subtitle: "Select all that apply",
      options: [
        { id: "sales", label: "Grow my sales pipeline", icon: <TrendingUp className="w-5 h-5" /> },
        { id: "outreach", label: "Automate my outreach", icon: <Mail className="w-5 h-5" /> },
        { id: "leads", label: "Find new leads", icon: <Search className="w-5 h-5" /> },
        { id: "curious", label: "Just exploring", icon: <Sparkles className="w-5 h-5" /> },
      ],
    },
    {
      id: "section-a-complete",
      slideType: "section-complete",
      title: "Nice work!",
      subtitle: "You've unlocked your first reward",
      emoji: "🎉",
    },
  ],
};

const sectionB: FormSection<OnboardingQuestionnaireData> = {
  id: "section-b",
  name: "Your Company",
  emoji: "🏢",
  completionCredits: 75,
  trigger: { type: "afterSection", afterSectionId: "section-a" },
  slides: [
    {
      id: "section-b-intro",
      slideType: "section-intro",
      title: "Now let's learn about your company",
      emoji: "🏢",
    },
    {
      id: "website",
      slideType: "text-input",
      title: "What's your website?",
      subtitle: "Fluffy will learn all about your company from here",
      placeholder: "yourcompany.com",
      inputType: "url",
      alternativeLink: {
        text: "We don't have a website",
        action: "goto",
        targetSlideId: "companyDetails",
        setData: { key: "hasWebsite", value: "no" },
      },
    },
    {
      id: "companyDetails",
      slideType: "multi-field",
      title: "Tell us about your company",
      subtitle: "Just the basics so Fluffy knows who you are",
      component: "company-details",
      conditionalOn: "hasWebsite",
      conditionalValue: "no",
      validate: (data) => 
        data.companyName.trim() !== "" &&
        data.companyCity.trim() !== "" &&
        data.companyState.trim() !== "",
    },
    {
      id: "companyRole",
      slideType: "single-select",
      title: "What's your role at the company?",
      subtitle: "This helps us personalize your experience",
      options: [
        { id: "owner", label: "Owner / Founder", icon: <Zap className="w-5 h-5" /> },
        { id: "executive", label: "Executive / C-Suite", icon: <Star className="w-5 h-5" /> },
        { id: "manager", label: "Manager / Team Lead", icon: <Users className="w-5 h-5" /> },
        { id: "individual", label: "Individual Contributor", icon: <Target className="w-5 h-5" /> },
      ],
    },
    {
      id: "section-b-complete",
      slideType: "section-complete",
      title: "Awesome!",
      emoji: "✨",
    },
  ],
};

const sectionC: FormSection<OnboardingQuestionnaireData> = {
  id: "section-c",
  name: "Your Product",
  emoji: "🐥",
  completionCredits: 100,
  trigger: { type: "afterSection", afterSectionId: "section-b" },
  slides: [
    {
      id: "section-c-intro",
      slideType: "section-intro",
      title: "Help Fluffy understand what you sell",
      subtitle: "3 simple steps to supercharge your sales assistant",
      emoji: "🐥",
    },
    {
      id: "offeringType",
      slideType: "single-select",
      title: "What do you offer?",
      subtitle: "Pick the one that fits best",
      options: [
        { id: "product", label: "A Product", icon: <Package className="w-5 h-5" /> },
        { id: "service", label: "A Service", icon: <Headphones className="w-5 h-5" /> },
        { id: "both", label: "Both", icon: <Sparkles className="w-5 h-5" /> },
      ],
    },
    {
      id: "productDescription",
      slideType: "text-input",
      title: "Describe what you sell",
      subtitle: "A quick one-liner works great",
      placeholder: "e.g., We help small businesses automate their accounting",
      inputType: "textarea",
    },
    {
      id: "customerLove",
      slideType: "text-input",
      title: "What do customers love about it?",
      subtitle: "This helps Fluffy craft the perfect pitch",
      placeholder: "e.g., Easy to use, saves 10 hours per week, great support",
      inputType: "textarea",
    },
    {
      id: "section-c-complete",
      slideType: "section-complete",
      title: "You're a star!",
      subtitle: "Fluffy knows your product now",
      emoji: "⭐",
    },
  ],
};

const sectionD: FormSection<OnboardingQuestionnaireData> = {
  id: "section-d",
  name: "Product Pricing",
  emoji: "💰",
  completionCredits: 120,
  trigger: { type: "afterSection", afterSectionId: "section-c" },
  slides: [
    {
      id: "section-d-intro",
      slideType: "section-intro",
      title: "Let's talk pricing",
      subtitle: "This helps Fluffy understand your offer",
      emoji: "💰",
    },
    {
      id: "hasFixedPricing",
      slideType: "single-select",
      title: "Do you have a fixed price or package?",
      subtitle: "Let Fluffy know how you charge",
      options: [
        { id: "yes", label: "Yes, I have set pricing", icon: <Package className="w-5 h-5" /> },
        { id: "no", label: "No, it varies by project", icon: <TrendingUp className="w-5 h-5" /> },
        { id: "skip", label: "Skip for now", icon: <ChevronRight className="w-5 h-5" /> },
      ],
    },
    {
      id: "packageName",
      slideType: "text-input",
      title: "What's your package or product called?",
      subtitle: "Give it a name that sticks",
      placeholder: "e.g., Growth Plan, Pro Package, Starter Kit",
      inputType: "text",
      conditionalOn: "hasFixedPricing",
      conditionalValue: "yes",
    },
    {
      id: "packageCost",
      slideType: "text-input",
      title: "How much does it cost?",
      subtitle: "Ballpark is fine!",
      placeholder: "e.g., $99/month, $2,500 one-time, Starting at $500",
      inputType: "text",
      conditionalOn: "hasFixedPricing",
      conditionalValue: "yes",
    },
    {
      id: "packageIncludes",
      slideType: "text-input",
      title: "What's included?",
      subtitle: "The highlights that make it awesome",
      placeholder: "e.g., 3 revisions, 24/7 support, unlimited users",
      inputType: "textarea",
      conditionalOn: "hasFixedPricing",
      conditionalValue: "yes",
    },
    {
      id: "serviceDescription",
      slideType: "text-input",
      title: "Describe a service you offer right now",
      subtitle: "Just one or two lines is perfect",
      placeholder: "e.g., Custom website design for small businesses",
      inputType: "textarea",
      conditionalOn: "hasFixedPricing",
      conditionalValue: "no",
    },
    {
      id: "serviceCost",
      slideType: "text-input",
      title: "What's typically paid for that?",
      subtitle: "A range works great here",
      placeholder: "e.g., $2,000-$5,000 depending on scope",
      inputType: "text",
      conditionalOn: "hasFixedPricing",
      conditionalValue: "no",
    },
    {
      id: "serviceOther",
      slideType: "text-input",
      title: "Anything else we should know?",
      subtitle: "Optional but helpful for Fluffy",
      placeholder: "e.g., Projects usually take 2-4 weeks",
      inputType: "textarea",
      conditionalOn: "hasFixedPricing",
      conditionalValue: "no",
      optional: true,
    },
    {
      id: "section-d-complete",
      slideType: "section-complete",
      title: "Perfect!",
      subtitle: "Fluffy is ready to help you sell",
      emoji: "🎯",
    },
  ],
};

const sectionFinal: FormSection<OnboardingQuestionnaireData> = {
  id: "section-final",
  name: "Complete",
  emoji: "🚀",
  slides: [
    {
      id: "final-complete",
      slideType: "final-complete",
      title: "You're all set!",
      subtitle: "🐥 Fluffy can't wait to help you close more deals!",
      emoji: "🚀",
    },
  ],
};

export const onboardingQuestionnaire: Form<OnboardingQuestionnaireData> = {
  id: "onboarding-questionnaire",
  name: "Onboarding Questionnaire",
  description: "Welcome new users and learn about their business",
  emoji: "🐥",
  trigger: {
    type: "firstVisit",
    requiresAuth: true,
    once: true,
  },
  sections: [sectionA, sectionB, sectionC, sectionD, sectionFinal],
  initialData: {
    purpose: "",
    goal: "",
    hasWebsite: "",
    website: "",
    companyName: "",
    companyCity: "",
    companyState: "",
    companyRole: "",
    offeringType: "",
    productDescription: "",
    customerLove: "",
    hasFixedPricing: "",
    packageName: "",
    packageCost: "",
    packageIncludes: "",
    serviceDescription: "",
    serviceCost: "",
    serviceOther: "",
  },
};

export const ONBOARDING_QUESTIONNAIRE_INITIAL_DATA = onboardingQuestionnaire.initialData;
