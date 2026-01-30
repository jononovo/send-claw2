export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  category: string;
  tags: string[];
  imageUrl?: string;
}

export const blogPosts: BlogPost[] = [
  {
    id: 5,
    slug: "tos",
    title: "5Ducks Terms of Service",
    excerpt: "Our complete terms of service, last updated May 17, 2025.",
    content: `
# 5Ducks Terms of Service

**Last Updated: May 17, 2025**

## 1. Introduction

Welcome to 5Ducks ("Company," "we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of the 5Ducks platform, including any associated mobile applications, websites, and services (collectively, the "Service").

By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Service. Please read these Terms carefully before using the Service.

## 2. Eligibility

You must be at least 18 years old to use the Service. By using the Service, you represent and warrant that you are at least 18 years old and have the legal capacity to enter into these Terms.

## 3. Account Registration and Security

### 3.1 Account Creation

To access certain features of the Service, you must create an account. You may create an account by registering directly through our Service or by using your Google account credentials for authentication. All account features are provided subject to the limitations described in Section 10.

### 3.2 Google Account Integration

When you choose to create an account using your Google credentials, you authorize us to access certain information from your Google account, such as your name, email address, and profile picture. This integration is subject to Google's Terms of Service and Privacy Policy. Our access to and use of Google services is subject to the limitations described in Section 10.2.

### 3.3 Gmail Authorization

If you choose to use the email functionality of our Service, you will be prompted to authorize 5Ducks to access your Gmail account to send emails on your behalf. You acknowledge that:

- You are granting 5Ducks permission to send emails through your Gmail account.
- You are responsible for all communications sent through your account.
- You will use this feature in compliance with Google's acceptable use policies and applicable laws.
- You can revoke this access at any time through your Google account settings.
- Email functionality is subject to the limitations described in Sections 10 and 12.

### 3.4 Account Security

You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:

- Provide accurate and complete information when creating your account.
- Update your information as necessary to keep it current.
- Notify us immediately of any unauthorized access to or use of your account.
- Take responsibility for all activities that occur under your account.

## 4. Service Description

5Ducks is a lead generation platform that enables users to search for companies, identify leadership positions within those companies, find contact information for potential leads, and send customized emails to those contacts. All features and functionalities of the Service are provided subject to the limitations described in Section 10.

## 5. Permitted Use and Restrictions

### 5.1 Permitted Use

Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, and revocable license to access and use the Service for your internal business purposes.

### 5.2 Restrictions

You agree that you will not:

- Use the Service for any illegal purpose or in violation of any applicable laws.
- Scrape, crawl, or employ any automated means to access or collect data from the Service.
- Attempt to gain unauthorized access to any part of the Service or any other systems or networks connected to the Service.
- Use the Service to send unsolicited communications ("spam").
- Interfere with or disrupt the Service or servers or networks connected to the Service.
- Circumvent, disable, or otherwise interfere with security-related features of the Service.
- Reverse engineer, decompile, disassemble, or attempt to derive the source code of the Service.
- Use the Service in a manner that could damage, disable, overburden, or impair the Service.
- Use contact information obtained through the Service for harassment, illegal solicitation, or spamming.
- Sell, license, rent, or otherwise commercially exploit the Service or any data obtained from it.

## 6. User Content and Data

### 6.1 User Content

You retain all rights to any content you submit, post, or display on or through the Service ("User Content"). By providing User Content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, translate, and distribute such User Content in connection with providing the Service. The use of User Content is subject to the limitations described in Section 10.

### 6.2 Lead Data

Our Service provides access to business contact information ("Lead Data"). You acknowledge and agree that:

- You will use Lead Data in compliance with all applicable laws and regulations, including data protection and privacy laws.
- You will not use Lead Data for harassment, spamming, or any illegal activities.
- You are responsible for ensuring your use of Lead Data complies with applicable marketing, telemarketing, and anti-spam laws.
- 5Ducks makes no representations or warranties about the accuracy, completeness, or legality of Lead Data, as stated in Sections 10.3 and 11.

### 6.3 Email Communications

You are solely responsible for the content of all communications sent through our Service. You agree that all email communications will comply with:

- The CAN-SPAM Act and similar anti-spam laws in other jurisdictions.
- Data protection and privacy laws, including but not limited to GDPR and CCPA.
- Google's policies regarding acceptable use of Gmail.

As specified in Sections 10, 11, and 13.3, 5Ducks is not responsible for delivery, reception, or consequences of any communications sent through the Service.

## 7. Intellectual Property Rights

### 7.1 Our Intellectual Property

The Service, including all of its content, features, and functionality, is owned by 5Ducks, its licensors, or other providers and is protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any of the material on our Service without our express prior written consent.

### 7.2 Feedback

If you provide any feedback, suggestions, improvements, or ideas ("Feedback") regarding the Service, you grant us a perpetual, irrevocable, non-exclusive, transferable, royalty-free license to use, modify, and distribute such Feedback for any purpose without compensation to you.

## 8. Subscription and Payment Terms

### 8.1 Subscription Plans

We offer various subscription plans for the Service. The specific features, limitations, and pricing of each plan are described on our website or within the Service.

### 8.2 Payment

You agree to pay all fees associated with your subscription plan. All payments are non-refundable except as expressly stated in these Terms or as required by applicable law. We may use third-party payment processors to bill you through a payment account linked to your account.

### 8.3 Subscription Term and Renewal

Your subscription will automatically renew at the end of each subscription period unless you cancel it prior to the renewal date. You may cancel your subscription at any time through your account settings or by contacting us.

## 9. Third-Party Services and Links

### 9.1 Third-Party Services

The Service may integrate with or contain links to third-party websites, services, or resources ("Third-Party Services"), including Google services. Subject to Section 10.2:

- We are not responsible for the content, accuracy, or availability of Third-Party Services.
- We do not endorse the content or any opinion expressed on Third-Party Services.
- We are not responsible for any failure, interruption, or issues with Third-Party Services.
- Your use of Third-Party Services is at your own risk and subject to the terms and conditions of those services.

### 9.2 Google API Services

Our Service uses Google API Services. By using our Service, you also agree to:

- Google's Terms of Service (https://policies.google.com/terms)
- Google's Privacy Policy (https://policies.google.com/privacy)
- Google API Services User Data Policy (https://developers.google.com/terms/api-services-user-data-policy)

As with all Third-Party Services, our integration with Google API Services is subject to the limitations in Section 10, and we make no warranties regarding the availability or functionality of these services.

### 9.3 Limitations on Google API Data Use

In accordance with Google's API Services User Data Policy, we:

- Access only the Google API data that you have authorized us to access.
- Use that data only for the purposes you have consented to.
- Will not sell your Google account data.
- Will not use your Google account data for advertising purposes.
- Will not misrepresent our identity or intentions when requesting authorization to access your Google data.

However, as specified in Section 10 and Section 11, we cannot guarantee uninterrupted access to Google API services or the continued functionality of our integration.

## 10. Service Availability and Limitations

### 10.1 General Service Limitations

The Service and all features, functionalities, and content provided through the Service (collectively, "Service Elements") are subject to the following limitations, which apply to all sections of these Terms:

- We provide all Service Elements on an "as is" and "as available" basis.
- We reserve the right to modify, suspend, or discontinue any or all Service Elements at any time, for any reason, without prior notice or liability to you.
- We make no guarantees regarding the availability, reliability, accuracy, or quality of any Service Elements.
- We reserve the right to impose limits on certain Service Elements or restrict access to parts or all of the Service without notice or liability.
- We do not guarantee that the Service will meet your specific requirements or expectations.
- We are not responsible for delays or failures in performance beyond our reasonable control.

## 11. Disclaimer of Warranties

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTY OF ANY KIND. 5DUCKS EXPRESSLY DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

5DUCKS DOES NOT WARRANT THAT THE SERVICE WILL MEET YOUR REQUIREMENTS, THAT THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE, THAT THE INFORMATION PROVIDED THROUGH THE SERVICE IS ACCURATE, RELIABLE, COMPLETE, OR CURRENT, OR THAT ANY ERRORS IN THE SERVICE WILL BE CORRECTED.

ANY CONTENT DOWNLOADED OR OTHERWISE OBTAINED THROUGH THE USE OF THE SERVICE IS ACCESSED AT YOUR OWN RISK, AND YOU WILL BE SOLELY RESPONSIBLE FOR ANY DAMAGE TO YOUR COMPUTER SYSTEM OR LOSS OF DATA THAT RESULTS FROM SUCH DOWNLOAD.

## 12. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL 5DUCKS, ITS AFFILIATES, OR THEIR RESPECTIVE OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, THAT RESULT FROM THE USE OF, OR INABILITY TO USE, THE SERVICE.

UNDER NO CIRCUMSTANCES WILL 5DUCKS BE RESPONSIBLE FOR ANY DAMAGE, LOSS, OR INJURY RESULTING FROM HACKING, TAMPERING, OR OTHER UNAUTHORIZED ACCESS OR USE OF THE SERVICE OR YOUR ACCOUNT OR THE INFORMATION CONTAINED THEREIN.

IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATING TO THESE TERMS OR YOUR USE OF THE SERVICE EXCEED THE AMOUNT PAID BY YOU TO 5DUCKS DURING THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.

THE LIMITATIONS OF LIABILITY IN THIS SECTION APPLY WHETHER THE ALLEGED LIABILITY IS BASED ON CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY, OR ANY OTHER BASIS, EVEN IF 5DUCKS HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## 13. Indemnification

You agree to defend, indemnify, and hold harmless 5Ducks, its affiliates, and their respective officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including without limitation reasonable attorney's fees and costs, arising out of or in any way connected with:

- Your access to or use of the Service;
- Your violation of these Terms;
- Your violation of any third-party right, including without limitation any intellectual property right, publicity, confidentiality, property, or privacy right;
- Any content you submit, post, or transmit through the Service; or
- Any communications sent from your account.

## 14. Termination

We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach these Terms. Upon termination, your right to use the Service will immediately cease. All provisions of these Terms which by their nature should survive termination shall survive, including, without limitation, ownership provisions, warranty disclaimers, indemnification, and limitations of liability.

## 15. Miscellaneous

### 15.1 Governing Law

These Terms shall be governed by the laws of the State of New York, without regard to its conflict of law provisions. The provisions of the United Nations Convention on Contracts for the International Sale of Goods will not apply to these Terms.

### 15.2 Dispute Resolution

Any dispute arising from these Terms shall be resolved exclusively in the state or federal courts located in New York, New York, and you consent to the personal jurisdiction of such courts. You waive any objections based on venue or forum non conveniens. Any claim must be filed within one (1) year after the cause of action has accrued, or such claim or cause of action is forever barred.

### 15.3 Changes to Terms

We reserve the right to modify these Terms at any time, consistent with Section 10.4. If we make material changes to these Terms, we will provide notice through the Service or by other means. Your continued use of the Service after the changes take effect constitutes your acceptance of the revised Terms.

### 15.4 Entire Agreement

These Terms, together with our Privacy Policy, constitute the entire agreement between you and 5Ducks regarding the Service and supersede all prior and contemporaneous agreements, proposals, or representations, written or oral, concerning the Service.

### 15.5 Waiver and Severability

Our failure to enforce any right or provision of these Terms will not be considered a waiver of such right or provision. If any provision of these Terms is held to be invalid or unenforceable, it will be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.

### 15.6 Assignment

You may not assign or transfer these Terms without our prior written consent. We may assign or transfer these Terms, in whole or in part, without restriction.

### 15.7 No Agency

No agency, partnership, joint venture, or employment relationship is created as a result of these Terms, and neither party has any authority to bind the other in any respect.

### 15.8 Force Majeure

We will not be liable for any failure or delay in performance resulting from causes beyond our reasonable control, including but not limited to acts of God, natural disasters, pandemic, war, terrorism, riots, civil unrest, government actions, labor disputes, or Internet service disruptions, in accordance with Section 10.

### 15.9 Electronic Communications

By using the Service, you consent to receiving electronic communications from us, including notices and other information concerning the Service. These communications are part of your relationship with us and may include operational messages about your account or the Service. You agree that any notices or other communications that we send to you electronically will satisfy any legal communication requirements.

### 15.10 No Third-Party Beneficiaries

These Terms do not confer any rights, remedies, or benefits upon any person other than you and 5Ducks. There are no third-party beneficiaries to these Terms.

### 15.11 Interpretation

The section titles in these Terms are for convenience only and have no legal or contractual effect. Any ambiguities in the interpretation of these Terms shall not be construed against the drafting party.

## 16. Contact Information

If you have any questions about these Terms, please contact us at:

**5Ducks**  
Email: [quack@5ducks.ai](mailto:quack@5ducks.ai)  
Address: 55 Water Street, New York City, 10005 NY
    `,
    date: "2025-05-17",
    author: "5Ducks Legal Team",
    category: "Legal",
    tags: ["terms", "legal", "conditions"],
    imageUrl: "https://placehold.co/600x400/f0f9ff-ecfdf5/0369a1?text=Terms+of+Service"
  },
  {
    id: 4,
    slug: "privacy",
    title: "5Ducks Privacy Policy",
    excerpt: "Our complete privacy policy, last updated May 17, 2025.",
    content: `
# 5Ducks Privacy Policy

**Last Updated: May 17, 2025**

## Introduction

Welcome to 5Ducks ("we," "our," or "us"). At 5Ducks, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our lead generation platform and related services (collectively, the "Service").

Please read this Privacy Policy carefully. By accessing or using the Service, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree with our policies and practices, please do not use our Service.

## Information We Collect

### Information You Provide to Us

- **Account Information**: When you register for an account, we collect information associated with your Google account, including your name, email address, profile picture, and Google ID.
- **Communication Preferences**: Information about how you customize your email templates and communication settings.
- **Search Criteria**: Information about the types of companies, leadership positions, and contacts you are searching for.
- **Lists and Saved Data**: Information about the lists you create and the leads you save.

### Information We Collect Automatically

- **Usage Data**: Information about how you use our Service, including your interactions with features, pages visited, and actions taken.
- **Device Information**: Information about the device you use to access our Service, including IP address, browser type, operating system, and device identifiers.
- **Cookies and Similar Technologies**: We use cookies and similar tracking technologies to collect information about your browsing activities and to maintain your session while using our Service.

### Information We Receive From Third Parties

- **Google Authentication**: When you sign in with Google, we receive information from Google in accordance with your Google account settings and the permissions you grant us.
- **Third-Party Data Sources**: We may collect professional contact information from publicly available sources, business directories, and other legitimate data sources as part of our lead generation services.

## How We Use Your Information

We use the information we collect for various purposes, including:

- **Providing and Maintaining the Service**: To deliver the features and functionality of our lead generation platform, including searching for companies and contacts, creating lists, and sending emails.
- **Account Management**: To create and manage your account, authenticate you, and personalize your experience.
- **Communications**: To facilitate your communications with prospects via Gmail, in accordance with your instructions.
- **Service Improvement**: To understand how our Service is used, identify areas for improvement, and develop new features.
- **Legal Compliance**: To comply with applicable laws, regulations, legal processes, or governmental requests.
- **Security and Fraud Prevention**: To detect, prevent, and address fraud, security breaches, and other potentially harmful activities.

## How We Share Your Information

We may share your information in the following circumstances:

- **With Your Consent**: We may share your information when you direct us to do so or grant us permission, such as when you authorize us to send emails on your behalf via Gmail.
- **Service Providers**: We may share your information with third-party vendors, consultants, and other service providers who need access to such information to perform work on our behalf. These service providers include:
  - Anthropic, OpenAI, and Perplexity (AI services)
  - Hunter.io and Apollo.io (lead generation services)
  - AWS (cloud hosting)
  - Replit (development environment)
- **Business Transfers**: If we are involved in a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction.
- **Legal Requirements**: We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or a government agency).
- **Protection of Rights**: We may disclose your information to protect the rights, property, or safety of 5Ducks, our users, or others.

## Your Privacy Rights and Choices

Depending on your location, you may have certain rights regarding your personal information. These may include:

- **Access and Portability**: You have the right to access the personal information we hold about you and in some cases, receive this information in a structured, commonly used format.
- **Correction**: You have the right to request that we correct inaccurate or incomplete personal information we hold about you.
- **Deletion**: You have the right to request that we delete your personal information in certain circumstances.
- **Restriction and Objection**: You have the right to request that we restrict the processing of your personal information or to object to our processing of your personal information.
- **Withdrawal of Consent**: Where we rely on your consent to process your personal information, you have the right to withdraw your consent at any time.

To exercise these rights, please contact us at [privacy@5ducks.com](mailto:privacy@5ducks.com).

### California Privacy Rights

If you are a California resident, the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA) provide you with specific rights regarding your personal information. This section describes your CCPA/CPRA rights and explains how to exercise those rights.

#### Categories of Personal Information We Collect

We have collected the following categories of personal information from consumers within the last twelve (12) months:

| Category | Examples | Collected |
|----------|----------|-----------|
| Identifiers | Name, email address, IP address | Yes |
| Personal information categories listed in the California Customer Records statute | Name, phone number, address | Yes |
| Commercial information | Records of products or services purchased or considered | Yes |
| Internet or other similar network activity | Browsing history, search history, information on a consumer's interaction with a website | Yes |
| Professional or employment-related information | Current or past job history, professional contacts | Yes |

#### Sources of Personal Information

We obtain the categories of personal information listed above from the following sources:
- Directly from you (e.g., from forms you complete or products and services you use)
- Indirectly from you (e.g., from observing your actions on our Service)
- From third-party service providers (e.g., Google authentication)
- From publicly available sources as part of our lead generation services

#### Use of Personal Information

We may use or disclose the personal information we collect for the business purposes described in the "How We Use Your Information" section of this Privacy Policy.

#### Sharing of Personal Information

We may disclose your personal information to a third party for business purposes as described in the "How We Share Your Information" section of this Privacy Policy.

#### Your Rights and Choices

The CCPA/CPRA provides California residents with specific rights regarding their personal information. These rights include:

**Right to Know:** You have the right to request that we disclose certain information to you about our collection and use of your personal information over the past 12 months.

**Right to Delete:** You have the right to request that we delete any of your personal information that we collected from you and retained, subject to certain exceptions.

**Right to Correct:** You have the right to request that we correct inaccurate personal information that we maintain about you.

**Right to Opt-Out of Sale or Sharing:** We do not sell or share personal information as those terms are defined under the CCPA/CPRA.

**Right to Limit Use and Disclosure of Sensitive Personal Information:** We do not use or disclose sensitive personal information for purposes other than those specified under the CCPA/CPRA.

**Right to Non-Discrimination:** We will not discriminate against you for exercising any of your CCPA/CPRA rights.

#### Exercising Your Rights

To exercise your rights described above, please submit a verifiable consumer request to us by:
- Emailing us at [quack@5ducks.ai](mailto:quack@5ducks.ai)

Only you, or a person registered with the California Secretary of State that you authorize to act on your behalf, may make a verifiable consumer request related to your personal information. You may only make a verifiable consumer request for access or data portability twice within a 12-month period.

We will respond to your request within 45 days of its receipt. If we require more time, we will inform you of the reason and extension period in writing.

## Data Security

We implement appropriate technical and organizational measures to protect the security of your personal information. However, please understand that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.

## Children's Privacy

Our Service is not directed to children under the age of 18, and we do not knowingly collect personal information from children under 18. If we learn we have collected or received personal information from a child under 18 without verification of parental consent, we will delete that information.

## International Data Transfers

Your information may be transferred to, and maintained on, computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those in your jurisdiction. If you are located outside the United States and choose to provide information to us, please note that we transfer the information to the United States and process it there.

### GDPR Compliance

If you are a resident of the European Economic Area (EEA), United Kingdom, or Switzerland, you have certain data protection rights under the General Data Protection Regulation (GDPR) or similar applicable laws. These rights include:

**Lawful Basis for Processing:** We process your personal data on the following legal bases:
- Consent: Where you have given us explicit consent to process your personal data.
- Contractual Necessity: Where processing is necessary for the performance of a contract with you.
- Legitimate Interests: Where processing is necessary for our legitimate interests, provided those interests do not override your fundamental rights and freedoms.
- Legal Obligation: Where processing is necessary for compliance with a legal obligation.

**Data Subject Rights:** In addition to the rights outlined in the "Your Privacy Rights and Choices" section, you have the right to:
- Lodge a complaint with a supervisory authority in your country of residence, place of work, or where an alleged infringement of data protection law has occurred.
- Object to processing based on legitimate interests or for direct marketing purposes.
- Not be subject to decisions based solely on automated processing, including profiling, which produces legal or similarly significant effects.

**International Transfers:** When we transfer your personal data outside the EEA, UK, or Switzerland, we ensure appropriate safeguards are in place, such as:
- Standard Contractual Clauses approved by the European Commission.
- Binding Corporate Rules for transfers within our corporate group.
- Adequacy decisions by the European Commission, where applicable.

**Data Retention:** We retain your personal data only for as long as necessary to fulfill the purposes for which we collected it, including for the purposes of satisfying any legal, accounting, or reporting requirements.

**Data Protection Officer:** If you have any questions about our GDPR compliance or wish to exercise your rights, you can contact us at [quack@5ducks.ai](mailto:quack@5ducks.ai).

## Changes to This Privacy Policy

We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top. You are advised to review this Privacy Policy periodically for any changes.

## Contact Us

If you have any questions about this Privacy Policy, please contact us at:

**5Ducks**  
Email: [quack@5ducks.ai](mailto:quack@5ducks.ai)  
Address: 55 Water Street, New York City, 10005 NY
    `,
    date: "2025-05-17",
    author: "5Ducks Legal Team",
    category: "Legal",
    tags: ["privacy", "legal", "terms"],
    imageUrl: "https://placehold.co/600x400/f5f3ff-faf5ff/7c3aed?text=Privacy+Policy"
  },
  {
    id: 1,
    slug: "getting-started-with-5ducks",
    title: "Getting Started with 5Ducks: Your First Week",
    excerpt: "A guide to getting the most out of your first week using 5Ducks for contact discovery and outreach.",
    content: `
# Getting Started with 5Ducks

Welcome to 5Ducks! This guide will help you make the most of your first week using our platform.

## Day 1: Set Up Your Account

After signing up, take a few minutes to:

1. **Complete your profile** - Add your company details and role to help personalize your experience
2. **Connect your email** - Link your business email to enable outreach features
3. **Try your first search** - Run a simple search for companies in your target industry

## Days 2-3: Discover Your Ideal Prospects

Use these days to refine your search approach:

1. **Try different search queries** - Experiment with industry, location, and company size parameters
2. **Save promising lists** - When you find good matches, save them for future outreach
3. **Review contact suggestions** - Look through the AI-suggested contacts for each company

## Days 4-5: Prepare Your Outreach

Now it's time to start engaging:

1. **Select your best prospects** - Choose 5 high-potential contacts for your first outreach
2. **Customize message templates** - Tailor your templates to each prospect's specific needs
3. **Schedule your sends** - Set up your first batch of 5 emails

## Keep the Momentum Going

Remember, 5Ducks is designed around the "5 per day" philosophy. By focusing on just 5 quality outreach emails daily, you'll:

- Maintain consistent outreach without feeling overwhelmed
- Give each prospect the attention they deserve
- Build a sustainable sales habit that grows over time

After your first week, you'll unlock HATCHED-LEVEL status with expanded limits and features!
    `,
    date: "2025-05-01",
    author: "Jon Smith",
    category: "Tutorial",
    tags: ["getting started", "tutorial", "outreach"],
    imageUrl: "https://placehold.co/600x400/eef2ff-d1fae5/4338ca?text=5+Ducks+Guide"
  },
  {
    id: 2,
    slug: "consistency-over-motivation",
    title: "Why Consistency Beats Motivation in Sales",
    excerpt: "Learn why building consistent habits is more important than waiting for motivation when it comes to sales outreach.",
    content: `
# Why Consistency Beats Motivation in Sales

In the world of sales and outreach, there's a simple truth that separates successful salespeople from everyone else: **consistency beats motivation every single time**.

## The Motivation Myth

Many people believe they need to feel motivated to do sales outreach. They wait for that perfect moment when they feel energized and inspired to reach out to prospects.

But here's the problem: motivation is unreliable. It comes and goes. If your sales strategy depends on feeling motivated, you'll have sporadic results at best.

## The Power of Consistency

Consistency, on the other hand, is about developing habits that you maintain regardless of how you feel. When you commit to reaching out to just 5 prospects every day:

- You build momentum that carries you forward
- You create a sustainable practice that doesn't burn you out
- You generate predictable results over time
- You develop sales skills through regular practice

## How 5Ducks Helps You Stay Consistent

We designed 5Ducks around this core principle. By limiting you to 5 emails per day:

1. The task feels manageable, not overwhelming
2. You focus on quality over quantity
3. You build a daily habit that compounds over time
4. You get rewarded for consistency, not burnout-inducing sprints

## Start Small, Stay Consistent

Remember, the salespeople who win aren't necessarily the most talented or the most motivated. They're the ones who show up day after day, consistently taking action.

Build your 5-per-day habit with 5Ducks, and watch how these small, consistent actions transform your sales results over time.
    `,
    date: "2025-05-10",
    author: "Jon Smith",
    category: "Strategy",
    tags: ["consistency", "habits", "sales strategy"],
    imageUrl: "https://placehold.co/600x400/f5f3ff-faf5ff/7c3aed?text=Consistency+Beats+Motivation"
  },
  {
    id: 3,
    slug: "ai-sales-future",
    title: "The Future of AI in Sales Outreach",
    excerpt: "Explore how AI is transforming sales outreach and what it means for modern sales professionals.",
    content: `
# The Future of AI in Sales Outreach

Artificial intelligence is rapidly transforming sales outreach, but not in the way many people expect. Let's explore what the AI-powered future of sales really looks like.

## Beyond Automation: Augmentation

The most powerful AI sales tools aren't about replacing humans or fully automating outreach. They're about augmenting human capabilities:

- **Finding the right prospects** through intelligent data analysis
- **Suggesting personalized approaches** based on prospect characteristics
- **Learning from successful interactions** to improve future recommendations
- **Removing repetitive tasks** so you can focus on relationship-building

## How 5Ducks Uses AI

Our approach to AI is focused on enhancing your natural sales abilities:

1. **Discovery AI** helps you find precisely the right companies and contacts
2. **Learning AI** analyzes which approaches work best for your specific offerings
3. **Personalization AI** helps tailor messages to each prospect's unique situation
4. **Timing AI** suggests the optimal moments for follow-ups

## The Human Element Remains Essential

Despite these advances, the human element remains crucial. AI can't:

- Build authentic relationships
- Show genuine curiosity about a prospect's needs
- Demonstrate true empathy for their challenges
- Apply creative problem-solving to unique situations

## The Ideal Partnership

The future belongs to sales professionals who know how to partner with AI:

- Let AI handle the data-heavy lifting
- Let AI learn from patterns in your successes
- Let AI suggest improvements to your approach
- But maintain your human touch in every interaction

This balanced approach is at the heart of the 5Ducks philosophy—technology that enhances rather than replaces the human elements that make sales meaningful and effective.
    `,
    date: "2025-05-15",
    author: "Jon Smith",
    category: "Technology",
    tags: ["AI", "technology", "future of sales"],
    imageUrl: "https://placehold.co/600x400/eff6ff-dbeafe/3b82f6?text=AI+in+Sales"
  }
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find(post => post.slug === slug);
}

export function getAllBlogPosts(): BlogPost[] {
  return [...blogPosts].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}