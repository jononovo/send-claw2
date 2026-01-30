'use client';

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PanelLeft, Plus, Users, Send, Zap, Pencil, Sparkles } from "lucide-react";
import type { SearchList } from "@shared/schema";
import { generateListPromptOnly } from "@/lib/list-utils";
import { generateSearchUrl } from "@/lib/url-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LeftMenuDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadSearch: (list: SearchList) => void;
  onNewSearch: () => void;
  onOpenCompose?: () => void;
}

export function LeftMenuDrawer({ open, onOpenChange, onLoadSearch, onNewSearch, onOpenCompose }: LeftMenuDrawerProps) {
  const { data: lists = [] } = useQuery<SearchList[]>({
    queryKey: ["/api/lists"],
    enabled: open,
  });
  
  const [clickedId, setClickedId] = useState<number | null>(null);
  const router = useRouter();

  return (
    <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <SheetPrimitive.Portal>
        {/* Custom lighter overlay */}
        <SheetPrimitive.Overlay 
          className="fixed inset-0 z-50 bg-black/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        {/* Custom sheet content */}
        <SheetPrimitive.Content
          className="fixed z-50 gap-4 bg-panel-background shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm w-[80%] max-w-[384px] !pt-3 !px-0 !pb-6 sm:max-w-[384px] !top-[52px] !h-[calc(100vh-52px)] !rounded-tr-2xl"
          onMouseLeave={() => {
            // Auto-close drawer when mouse leaves (desktop only)
            if (window.innerWidth >= 640) {
              onOpenChange(false);
            }
          }}
        >
        <div className="h-full overflow-auto">
          {/* New Search Button */}
          <div className="px-3 pb-1">
            <button
              onClick={() => {
                onNewSearch();
                onOpenChange(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:shadow-md hover:-translate-y-0.5 hover:bg-secondary-hover transition-all duration-200 group"
              data-testid="drawer-new-search"
            >
              <Plus className="h-6 w-6 text-blue-500" strokeWidth={3} />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">New Search</span>
            </button>
          </div>
          
          {/* Compose Button */}
          {onOpenCompose && (
            <div className="px-3 pb-1">
              <button
                data-testid="button-compose"
                onClick={() => {
                  onOpenCompose();
                  onOpenChange(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:shadow-md hover:-translate-y-0.5 hover:bg-secondary-hover transition-all duration-200 group"
              >
                <Pencil className="h-5 w-5 text-purple-500 group-hover:text-purple-600" />
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">Compose</span>
              </button>
            </div>
          )}
          
          {/* Streak Link */}
          <div className="px-3 pb-1">
            <Link href="/streak">
              <button
                onClick={() => onOpenChange(false)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:shadow-md hover:bg-secondary-hover hover:-translate-y-0.5 transition-all duration-200 group"
                data-testid="drawer-nav-streak"
              >
                <Zap className="h-5 w-5 text-muted-foreground group-hover:text-yellow-600" />
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">Streak</span>
              </button>
            </Link>
          </div>
          
          {/* Campaigns Link */}
          <div className="px-3 pb-1">
            <Link href="/campaigns">
              <button
                onClick={() => onOpenChange(false)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:shadow-md hover:bg-secondary-hover hover:-translate-y-0.5 transition-all duration-200 group"
                data-testid="drawer-nav-campaigns"
              >
                <Send className="h-5 w-5 text-muted-foreground group-hover:text-green-600" />
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">Campaigns</span>
              </button>
            </Link>
          </div>
          
          {/* Contact Lists Link */}
          <div className="px-3 pb-2">
            <Link href="/contacts">
              <button
                onClick={() => onOpenChange(false)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:shadow-md hover:bg-secondary-hover hover:-translate-y-0.5 transition-all duration-200 group"
                data-testid="drawer-nav-contacts"
              >
                <Users className="h-5 w-5 text-muted-foreground group-hover:text-blue-600" />
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">Contact Lists</span>
              </button>
            </Link>
          </div>
          
          <div className="bg-muted mt-2 rounded-lg mx-2">
          <Table>
            <TableHeader>
              <TableRow className="border-t-0">
                <TableHead className="pr-2">Search Name</TableHead>
                <TableHead className="text-right w-14">Results</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lists.map((list: SearchList) => (
                <TableRow 
                  key={list.id}
                  className={`cursor-pointer hover:bg-muted-hover border-0 ${clickedId === list.id ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                  onClick={() => {
                    setClickedId(list.id);
                    // Load the search data immediately for instant hydration
                    onLoadSearch(list);
                    onOpenChange(false);
                    // Navigate to SEO-friendly URL (effect will skip loading since data is already loaded)
                    const searchUrl = generateSearchUrl(generateListPromptOnly(list), list.listId);
                    router.push(searchUrl);
                  }}
                >
                  <TableCell className="text-sm font-medium text-muted-foreground py-3 pr-2">
                    <TooltipProvider delayDuration={1500}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-pointer flex items-center gap-1.5">
                            {(list as any).searchType === 'super' && (
                              <Sparkles className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                            )}
                            {generateListPromptOnly(list)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{(list as any).searchType === 'super' ? 'Super Search' : 'Search'} ID: {list.listId}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-foreground py-3 pr-3">{list.resultCount}</TableCell>
                </TableRow>
              ))}
              {lists.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                    No saved searches yet. Complete a search to create your first saved search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </div>
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}