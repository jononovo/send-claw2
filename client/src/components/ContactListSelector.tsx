import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ContactList } from "@shared/schema";

interface ContactListSelectorProps {
  onSelect: (contactListId: number, contactListName: string) => void;
  enabled?: boolean;
  className?: string;
  disabled?: boolean;
}

export function ContactListSelector({ 
  onSelect, 
  enabled = true,
  className = "",
  disabled = false 
}: ContactListSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch contact lists
  const { data: contactLists = [], isLoading } = useQuery<ContactList[]>({
    queryKey: ['/api/contact-lists'],
    enabled: enabled,
  });

  const handleScroll = (direction: 'up' | 'down') => {
    if (scrollRef.current) {
      const scrollAmount = 100;
      scrollRef.current.scrollBy({
        top: direction === 'down' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Scrollable list with border */}
      <div className="border-2 border-dashed border-blue-400 rounded-lg p-2">
        {/* Scroll buttons */}
        <Button
          size="icon"
          variant="ghost"
          className="absolute -top-1 right-9 h-6 w-6 z-10"
          onClick={() => handleScroll('up')}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="absolute -top-1 right-2 h-6 w-6 z-10"
          onClick={() => handleScroll('down')}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>

        <ScrollArea className="h-[280px]" ref={scrollRef}>
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading contact lists...
            </div>
          ) : contactLists.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No contact lists available
            </div>
          ) : (
            <div className="space-y-0.5">
              {contactLists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => onSelect(list.id, list.name)}
                  disabled={disabled}
                  className="w-full text-left px-3 py-1.5 hover:bg-accent-hover hover:text-accent-foreground rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{list.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {list.contactCount || 0} contacts
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}