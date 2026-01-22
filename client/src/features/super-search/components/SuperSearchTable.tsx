import { ExternalLink, Linkedin } from 'lucide-react';
import type { SuperSearchResult, ContactResult, CompanyResult } from '../types';

interface SuperSearchTableProps {
  columns: string[];
  results: SuperSearchResult[];
}

export function SuperSearchTable({ columns, results }: SuperSearchTableProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No results yet...
      </div>
    );
  }

  const getCellValue = (result: SuperSearchResult, column: string): React.ReactNode => {
    const colLower = column.toLowerCase();
    
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
    if (colLower === 'location' || colLower === 'city') {
      const city = result.city;
      const country = result.country;
      if (city && country) return `${city}, ${country}`;
      return city || country || '—';
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

    if (result.superSearchMeta && column in result.superSearchMeta) {
      const value = result.superSearchMeta[column];
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
      }
      return JSON.stringify(value);
    }

    const metaKeys = Object.keys(result.superSearchMeta || {});
    const matchingKey = metaKeys.find(k => k.toLowerCase() === colLower);
    if (matchingKey && result.superSearchMeta) {
      const value = result.superSearchMeta[matchingKey];
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
      }
      return JSON.stringify(value);
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
