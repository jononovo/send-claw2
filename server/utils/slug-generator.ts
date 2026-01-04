export function generateCompanySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

export function generateContactSlug(
  name: string, 
  companyName?: string | null, 
  role?: string | null
): string {
  const parts = [name];
  
  if (companyName) {
    const companyShort = companyName.split(/\s+/)[0];
    parts.push(companyShort);
  }
  
  if (role) {
    const roleShort = role
      .replace(/chief\s*/i, '')
      .replace(/officer\s*/i, '')
      .replace(/senior\s*/i, '')
      .replace(/junior\s*/i, '')
      .trim();
    if (roleShort) {
      parts.push(roleShort);
    }
  }
  
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}
