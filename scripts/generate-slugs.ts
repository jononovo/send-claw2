import { db } from "../server/db";
import { companies, contacts } from "../shared/schema";
import { eq, isNull } from "drizzle-orm";
import { generateCompanySlug, generateContactSlug } from "../server/utils/slug-generator";

async function generateSlugsForExistingRecords() {
  console.log("Starting slug generation...");
  
  const allCompanies = await db.select().from(companies).where(isNull(companies.slug));
  console.log(`Processing ${allCompanies.length} companies without slugs...`);
  
  for (const company of allCompanies) {
    const slug = generateCompanySlug(company.name);
    await db
      .update(companies)
      .set({ slug })
      .where(eq(companies.id, company.id));
  }
  console.log(`Updated ${allCompanies.length} company slugs.`);
  
  const companyMap = new Map<number, string>();
  const allCompaniesForMap = await db.select({ id: companies.id, name: companies.name }).from(companies);
  for (const c of allCompaniesForMap) {
    companyMap.set(c.id, c.name);
  }
  
  const allContacts = await db.select().from(contacts).where(isNull(contacts.slug));
  console.log(`Processing ${allContacts.length} contacts without slugs...`);
  
  for (const contact of allContacts) {
    const companyName = contact.companyId ? companyMap.get(contact.companyId) : undefined;
    const slug = generateContactSlug(contact.name, companyName, contact.role);
    await db
      .update(contacts)
      .set({ slug })
      .where(eq(contacts.id, contact.id));
  }
  console.log(`Updated ${allContacts.length} contact slugs.`);
  
  console.log("Slug generation complete!");
}

generateSlugsForExistingRecords()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error generating slugs:", err);
    process.exit(1);
  });
