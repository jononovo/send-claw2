import fetch from 'node-fetch';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const LANDING_URL = 'https://5ducks.ai/unsubscribe';

async function configureSubscriptionTracking() {
  if (!SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY is not set');
    process.exit(1);
  }

  console.log('Updating SendGrid Subscription Tracking settings...');
  console.log(`Setting landing URL to: ${LANDING_URL}`);

  const response = await fetch('https://api.sendgrid.com/v3/tracking_settings/subscription', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      enabled: true,
      landing: LANDING_URL,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to update SendGrid settings: ${response.status} ${error}`);
    process.exit(1);
  }

  const result = await response.json();
  console.log('SendGrid Subscription Tracking updated successfully:');
  console.log(JSON.stringify(result, null, 2));

  console.log('\nVerifying settings...');
  const verifyResponse = await fetch('https://api.sendgrid.com/v3/tracking_settings/subscription', {
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  const verified = await verifyResponse.json() as { landing: string; enabled: boolean };
  if (verified.landing === LANDING_URL && verified.enabled) {
    console.log('Verified: Landing URL is correctly set and subscription tracking is enabled.');
  } else {
    console.error('Verification failed:', JSON.stringify(verified, null, 2));
    process.exit(1);
  }
}

configureSubscriptionTracking().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
