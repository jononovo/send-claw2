import { Request, Response } from "express";
import { storage } from "../storage";

export async function handleApolloPhoneWebhook(req: Request, res: Response) {
  try {
    const token = req.query.token;
    if (token !== process.env.APOLLO_PHONE_WEBHOOK_TOKEN) {
      console.error('[Apollo Webhook] Invalid token');
      return res.status(401).json({ error: 'Invalid token' });
    }

    const payload = req.body;
    console.log('[Apollo Webhook] Received payload:', JSON.stringify(payload, null, 2));

    const person = payload.people?.[0];
    if (!person) {
      console.error('[Apollo Webhook] No person in payload');
      return res.status(400).json({ error: 'No person data' });
    }

    const apolloPersonId = person.id;
    const phones = person.phone_numbers || person.phones || [];
    
    const mobilePhone = phones.find((p: any) => 
      p.type_cd === 'mobile' || p.type_cd === 'cell' || p.type === 'mobile'
    ) || phones[0];

    const contact = await storage.findContactByApolloPersonId(apolloPersonId);
    
    if (!contact) {
      console.error('[Apollo Webhook] No contact found for Apollo ID:', apolloPersonId);
      return res.status(200).json({ message: 'Contact not found, acknowledged' });
    }

    if (mobilePhone && (mobilePhone.number || mobilePhone.sanitized_number)) {
      await storage.updateContact(contact.id, {
        phoneNumber: mobilePhone.sanitized_number || mobilePhone.number,
        mobilePhoneStatus: 'found',
      });
      console.log(`[Apollo Webhook] Updated contact ${contact.id} with phone: ${mobilePhone.sanitized_number || mobilePhone.number}`);
    } else {
      await storage.updateContact(contact.id, {
        mobilePhoneStatus: 'not_found',
      });
      console.log(`[Apollo Webhook] No phone found for contact ${contact.id}`);
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[Apollo Webhook] Error:', error);
    return res.status(200).json({ error: 'Internal error, acknowledged' });
  }
}
