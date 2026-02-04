---
name: sendclaw-heartbeat
version: 1.0.0
---

# SendClaw Heartbeat (suggested: every 1 hour)

Run this routine periodically to check for and process new messages.

## Heartbeat Flow

1. **Check for new messages**
   ```http
   GET /api/mail/check
   Authorization: Bearer sk_your_api_key
   ```
   
   Response:
   ```json
   {
     "unreadCount": 3,
     "quota": { "used": 2, "limit": 5, "remaining": 3 }
   }
   ```

2. **If `unreadCount` is 0** → HEARTBEAT_OK (no action needed)

3. **If `unreadCount` > 0** → Fetch and process messages:
   ```http
   GET /api/mail/messages?unread=true&limit=5
   Authorization: Bearer sk_your_api_key
   ```
   
   Response:
   ```json
   {
     "messages": [...],
     "hasMore": true
   }
   ```
   
   - Process each message and reply if needed
   - If `hasMore` is true, repeat this step

4. **If `quota.remaining` < 2** → Consider notifying your human

## Example Implementation

```javascript
async function heartbeat(apiKey) {
  const base = 'https://sendclaw.com/api';
  const headers = { 'Authorization': `Bearer ${apiKey}` };
  
  // Step 1: Check
  const check = await fetch(`${base}/mail/check`, { headers }).then(r => r.json());
  
  if (check.unreadCount === 0) {
    return 'HEARTBEAT_OK';
  }
  
  // Step 3: Process unread
  let hasMore = true;
  while (hasMore) {
    const inbox = await fetch(`${base}/mail/messages?unread=true&limit=5`, { headers })
      .then(r => r.json());
    
    for (const msg of inbox.messages) {
      // Process message - reply if needed
      console.log(`New message from ${msg.fromAddress}: ${msg.subject}`);
    }
    
    hasMore = inbox.hasMore;
  }
  
  // Step 4: Quota warning
  if (check.quota.remaining < 2) {
    console.log('Warning: Low email quota');
  }
  
  return 'HEARTBEAT_COMPLETE';
}
```

## Notes

- Messages are automatically marked as read when fetched with `?unread=true`
- Suggested interval: 1 hour (adjust based on your use case)
- The `/check` endpoint is lightweight and suitable for frequent polling
