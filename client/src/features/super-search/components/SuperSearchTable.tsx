import { ExternalLink, Linkedin } from 'lucide-react';
import type { SuperSearchResult, ContactResult, CompanyResult, SearchPlan } from '../types';

interface SuperSearchTableProps {
  columns: string[];
  results: SuperSearchResult[];
  plan?: SearchPlan | null;
}

export function SuperSearchTable({ columns, results, plan }: SuperSearchTableProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No results yet...
      </div>
    );
  }

  // Build a map of custom field labels to keys for lookup
  const customFieldMap = new Map<string, string>();
  if (plan?.customFields) {
    for (const cf of plan.customFields) {
      customFieldMap.set(cf.label.toLowerCase(), cf.key);
    }
  }

  const getCellValue = (result: SuperSearchResult, column: string): React.ReactNode => {
    const colLower = column.toLowerCase();
    
    // Standard fields mapping
    if (colLower === 'name') {
      return result.name;
    }
    if (colLower === 'company') {
      if (result.type === 'contact') {
        return (result as ContactResult).company;
      }
      return result.name;
    }
    if (colLower === 'role' || colLower === 'title' || colLower === 'position') {
      if (result.type === 'contact') {
        return (result as ContactResult).role || '—';
      }
      return '—';
    }
    if (colLower === 'location') {
      const city = result.city;
      const country = result.country;
      if (city && country) return `${city}, ${country}`;
      return city || country || '—';
    }
    if (colLower === 'city') {
      return result.city || '—';
    }
    if (colLower === 'state') {
      return result.state || '—';
    }
    if (colLower === 'country') {
      return result.country || '—';
    }
    if (colLower === 'department') {
      if (result.type === 'contact') {
        return (result as ContactResult).department || '—';
      }
      return '—';
    }
    if (colLower === 'website') {
      const website = result.type === 'company' 
        ? (result as CompanyResult).website 
        : (result as ContactResult).companyWebsite;
      if (!website) return '—';
      return (
        <a 
          href={website.startsWith('http') ? website : `https://${website}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-accent hover:underline inline-flex items-center gap-1"
        >
          {website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          <ExternalLink className="h-3 w-3" />
        </a>
      );
    }
    if (colLower === 'linkedin') {
      if (result.type === 'contact' && (result as ContactResult).linkedinUrl) {
        return (
          <a 
            href={(result as ContactResult).linkedinUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-accent hover:underline inline-flex items-center gap-1"
          >
            <Linkedin className="h-4 w-4" />
          </a>
        );
      }
      return '—';
    }
    if (colLower === 'description') {
      if (result.type === 'company') {
        return (result as CompanyResult).description || '—';
      }
      return '—';
    }
    if (colLower === 'size') {
      if (result.type === 'company') {
        const size = (result as CompanyResult).size;
        return size ? String(size) : '—';
      }
      return '—';
    }
    if (colLower === 'services') {
      if (result.type === 'company') {
        const services = (result as CompanyResult).services;
        return services && services.length > 0 ? services.join(', ') : '—';
      }
      return '—';
    }

    // Check if this column is a custom field
    const customFieldKey = customFieldMap.get(colLower);
    if (customFieldKey && result.superSearchMeta && customFieldKey in result.superSearchMeta) {
      const value = result.superSearchMeta[customFieldKey];
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
      }
      return JSON.stringify(value);
    }

    // Fallback: try direct lookup in superSearchMeta by column name
    if (result.superSearchMeta) {
      // Try exact column name
      if (column in result.superSearchMeta) {
        const value = result.superSearchMeta[column];
        if (typeof value === 'string' || typeof value === 'number') {
          return String(value);
        }
        return JSON.stringify(value);
      }
      // Try case-insensitive match
      const metaKeys = Object.keys(result.superSearchMeta);
      const matchingKey = metaKeys.find(k => k.toLowerCase() === colLower);
      if (matchingKey) {
        const value = result.superSearchMeta[matchingKey];
        if (typeof value === 'string' || typeof value === 'number') {
          return String(value);
        }
        return JSON.stringify(value);
      }
    }

    return '—';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col, idx) => (
              <th 
                key={idx} 
                className="text-left py-3 px-4 text-sm font-semibold text-foreground bg-muted"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((result, rowIdx) => (
            <tr 
              key={rowIdx} 
              className="border-b border-border hover:bg-muted/50 transition-colors"
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="py-3 px-4 text-sm">
                  {getCellValue(result, col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
