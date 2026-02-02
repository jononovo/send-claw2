import { db } from '../server/db';
import { bots, handles, messages } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

const BASE_URL = 'http://localhost:5000/api';

function generateApiKey(): string {
  return `sc_${randomBytes(24).toString('hex')}`;
}

function generateClaimToken(): string {
  const adjectives = ['test', 'dev', 'demo'];
  const nouns = ['alpha', 'beta', 'gamma'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const code = randomBytes(2).toString('hex').toUpperCase();
  return `${adj}-${noun}-${code}`;
}

async function cleanupTestAgents() {
  console.log('🧹 Cleaning up previous test agents...');
  
  const testHandles = ['testagent1', 'testagent2', 'testagent3'];
  for (const handle of testHandles) {
    await db.delete(handles).where(eq(handles.address, handle));
  }
  
  const testBots = await db.select().from(bots).where(eq(bots.name, 'TestAgent1'));
  for (const bot of testBots) {
    await db.delete(messages).where(eq(messages.botId, bot.id));
    await db.delete(bots).where(eq(bots.id, bot.id));
  }
  
  const testBots2 = await db.select().from(bots).where(eq(bots.name, 'TestAgent2'));
  for (const bot of testBots2) {
    await db.delete(messages).where(eq(messages.botId, bot.id));
    await db.delete(bots).where(eq(bots.id, bot.id));
  }
  
  const testBots3 = await db.select().from(bots).where(eq(bots.name, 'TestAgent3'));
  for (const bot of testBots3) {
    await db.delete(messages).where(eq(messages.botId, bot.id));
    await db.delete(bots).where(eq(bots.id, bot.id));
  }
}

async function createTestAgent(name: string, handleAddress: string) {
  console.log(`\n🤖 Creating agent: ${name} with handle ${handleAddress}@sendclaw.com`);
  
  const apiKey = generateApiKey();
  const claimToken = generateClaimToken();
  
  const [bot] = await db.insert(bots).values({
    name,
    address: handleAddress,
    apiKey,
    claimToken,
    verified: true
  }).returning();
  
  await db.insert(handles).values({
    address: handleAddress,
    botId: bot.id
  });
  
  console.log(`   ✅ Created bot ID: ${bot.id}`);
  console.log(`   📧 Email: ${handleAddress}@sendclaw.com`);
  console.log(`   🔑 API Key: ${apiKey.substring(0, 20)}...`);
  
  return { bot, apiKey, handle: handleAddress };
}

async function sendEmail(fromApiKey: string, to: string, subject: string, body: string) {
  console.log(`\n📤 Sending email to ${to}...`);
  console.log(`   Subject: ${subject}`);
  
  const response = await fetch(`${BASE_URL}/mail/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': fromApiKey
    },
    body: JSON.stringify({ to, subject, body })
  });
  
  const result = await response.json();
  
  if (response.ok) {
    console.log(`   ✅ Email sent! Message ID: ${result.messageId}`);
    return result;
  } else {
    console.log(`   ❌ Failed: ${result.error}`);
    return null;
  }
}

async function checkInbox(apiKey: string, agentName: string) {
  console.log(`\n📥 Checking inbox for ${agentName}...`);
  
  const response = await fetch(`${BASE_URL}/mail/inbox`, {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey
    }
  });
  
  const result = await response.json();
  
  if (response.ok) {
    console.log(`   📬 Found ${result.messages.length} message(s)`);
    for (const msg of result.messages) {
      console.log(`   - From: ${msg.fromAddress}`);
      console.log(`     Subject: ${msg.subject}`);
      console.log(`     Direction: ${msg.direction}`);
    }
    return result.messages;
  } else {
    console.log(`   ❌ Failed: ${result.error}`);
    return [];
  }
}

async function runTest() {
  console.log('🦞 SendClaw Agent Email Test');
  console.log('============================\n');
  
  try {
    await cleanupTestAgents();
    
    const agent1 = await createTestAgent('TestAgent1', 'testagent1');
    const agent2 = await createTestAgent('TestAgent2', 'testagent2');
    const agent3 = await createTestAgent('TestAgent3', 'testagent3');
    
    console.log('\n--- Starting Email Tests ---');
    
    await sendEmail(
      agent1.apiKey,
      'testagent2@sendclaw.com',
      'Hello from TestAgent1!',
      'Hi Agent2, this is a test message from Agent1. How are you doing?'
    );
    
    await sendEmail(
      agent2.apiKey,
      'testagent1@sendclaw.com',
      'RE: Hello from TestAgent1!',
      'Hey Agent1! Got your message. Everything is running smoothly here.'
    );
    
    await sendEmail(
      agent3.apiKey,
      'testagent1@sendclaw.com',
      'Group collaboration request',
      'Hi Agent1, Agent3 here. Would you like to collaborate on a project?'
    );
    
    await sendEmail(
      agent1.apiKey,
      'testagent3@sendclaw.com',
      'RE: Group collaboration request',
      'Sounds great Agent3! Let\'s loop in Agent2 as well.'
    );
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n--- Checking Inboxes ---');
    
    const inbox1 = await checkInbox(agent1.apiKey, 'TestAgent1');
    const inbox2 = await checkInbox(agent2.apiKey, 'TestAgent2');
    const inbox3 = await checkInbox(agent3.apiKey, 'TestAgent3');
    
    console.log('\n--- Test Summary ---');
    console.log(`Agent1 messages: ${inbox1.length}`);
    console.log(`Agent2 messages: ${inbox2.length}`);
    console.log(`Agent3 messages: ${inbox3.length}`);
    
    const totalSent = 4;
    const totalReceived = inbox1.length + inbox2.length + inbox3.length;
    
    console.log(`\n📊 Results: Sent ${totalSent} emails`);
    console.log(`   Inbox shows ${totalReceived} messages (includes sent + received)`);
    
    if (totalReceived > 0) {
      console.log('\n✅ SUCCESS: Email system is working!');
    } else {
      console.log('\n⚠️ No messages found in inboxes - check if email delivery is working');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  }
  
  process.exit(0);
}

runTest();
