import { Request, Response } from "express";
import { storage } from "../../storage";
import { searchApolloDirect } from "../../search/providers/apollo";
import { CreditService } from "../billing";
import { CREDIT_COSTS } from "../billing/credits/types";

const PHONE_REVEAL_COST = CREDIT_COSTS['phone_reveal'];

export async function findMobilePhone(req: Request, res: Response) {
  try {
    const contactId = parseInt(req.params.contactId);
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const contact = await storage.getContact(contactId, userId);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    if (contact.mobilePhoneStatus === 'pending') {
      return res.status(400).json({ error: 'Phone lookup already in progress' });
    }
    if (contact.mobilePhoneStatus === 'found' && contact.phoneNumber) {
      return res.json({ contact, message: 'Phone already found' });
    }

    const userCredits = await CreditService.getUserCredits(userId);
    if (userCredits.currentBalance < PHONE_REVEAL_COST) {
      return res.status(402).json({ 
        error: 'Insufficient credits', 
        required: PHONE_REVEAL_COST,
        balance: userCredits.currentBalance 
      });
    }

    if (!contact.companyId) {
      return res.status(400).json({ error: 'Contact has no associated company' });
    }

    const company = await storage.getCompany(contact.companyId, userId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    await storage.updateContact(contactId, {
      mobilePhoneStatus: 'pending',
      mobilePhoneRequestedAt: new Date(),
    });

    const apolloApiKey = process.env.APOLLO_API_KEY;
    if (!apolloApiKey) {
      await storage.updateContact(contactId, { mobilePhoneStatus: null });
      return res.status(500).json({ error: 'Apollo API key not configured' });
    }

    try {
      const result = await searchApolloDirect(contact, company, apolloApiKey, { revealPhone: true });

      if (!result.success || !result.contact?.apolloPersonId) {
        console.log('[FindMobilePhone] Apollo did not return a person match, marking as not_found');
        await storage.updateContact(contactId, {
          mobilePhoneStatus: 'not_found',
        });
        const updatedContact = await storage.getContact(contactId, userId);
        return res.json({
          contact: updatedContact,
          message: 'No matching person found in Apollo database.',
        });
      }

      await storage.updateContact(contactId, {
        apolloPersonId: result.contact.apolloPersonId,
      });

      await CreditService.deductCredits(userId, 'phone_reveal', true);

      const updatedContact = await storage.getContact(contactId, userId);
      return res.json({
        contact: updatedContact,
        message: 'Phone lookup initiated. Results will arrive in 5-15 minutes.',
      });

    } catch (apolloError) {
      console.error('[FindMobilePhone] Apollo API error:', apolloError);
      await storage.updateContact(contactId, { mobilePhoneStatus: null });
      return res.status(500).json({ error: 'Failed to initiate phone lookup' });
    }

  } catch (error) {
    console.error('[FindMobilePhone] Error:', error);
    return res.status(500).json({ error: 'Failed to initiate phone lookup' });
  }
}
