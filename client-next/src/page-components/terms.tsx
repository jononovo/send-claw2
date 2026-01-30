import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout";

export default function Terms() {
  return (
    <Layout>
      <div className="container mx-auto py-8 flex-1">
        <Card>
          <CardHeader>
            <CardTitle>Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p className="lead">Last updated: {new Date().toLocaleDateString()}</p>

            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using 5 Ducks ("we," "our," or "us"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.
            </p>

            <h2>2. Service Description</h2>
            <p>
              5 Ducks provides an AI-powered business intelligence platform that offers:
            </p>
            <ul>
              <li>Company and contact intelligence gathering</li>
              <li>Email discovery and verification</li>
              <li>Campaign management tools</li>
              <li>Integration with Gmail and other third-party services</li>
              <li>AI-powered data enrichment</li>
            </ul>

            <h2>3. User Obligations</h2>
            <ul>
              <li>Maintain accurate account information</li>
              <li>Protect account credentials</li>
              <li>Use the service in compliance with applicable laws</li>
              <li>Respect rate limits and usage guidelines</li>
              <li>Not engage in unauthorized data collection or scraping</li>
            </ul>

            <h2>4. Data Usage and Privacy</h2>
            <p>
              Your use of our services is also governed by our Privacy Policy. By using 5 Ducks, you consent to our data practices as described in the Privacy Policy.
            </p>

            <h2>5. API and Integration Usage</h2>
            <p>
              When using our Gmail API integration and other third-party services:
            </p>
            <ul>
              <li>Comply with all third-party terms of service</li>
              <li>Use API access tokens and credentials responsibly</li>
              <li>Report any security vulnerabilities or misuse</li>
            </ul>

            <h2>6. Intellectual Property</h2>
            <p>
              All content, features, and functionality of 5 Ducks are owned by us and are protected by international copyright, trademark, and other intellectual property laws.
            </p>

            <h2>7. Subscription and Billing</h2>
            <ul>
              <li>Subscription fees are billed according to the selected plan</li>
              <li>All payments are non-refundable unless required by law</li>
              <li>We reserve the right to modify pricing with notice</li>
            </ul>

            <h2>8. Termination</h2>
            <p>
              We reserve the right to suspend or terminate access to our services for:
            </p>
            <ul>
              <li>Violation of these terms</li>
              <li>Fraudulent or illegal activities</li>
              <li>Non-payment of fees</li>
              <li>Excessive or abusive usage</li>
            </ul>

            <h2>9. Limitation of Liability</h2>
            <p>
              5 Ducks is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages.
            </p>

            <h2>10. Contact Information</h2>
            <p>
              For questions about these Terms and Conditions, please contact us at:
            </p>
            <p>
              Email: legal@5ducks.com<br />
              Address: [Company Address]
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}