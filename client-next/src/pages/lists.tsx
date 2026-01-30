import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SearchList } from "@shared/schema";
import { generateListDisplayName } from "@/lib/list-utils";

export default function Lists() {
  const { data: lists = [] } = useQuery<SearchList[]>({
    queryKey: ["/api/lists"],
  });
  const [, navigate] = useLocation();

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5" />
            Company Lists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70%]">List Name</TableHead>
                <TableHead>Results</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lists.map((list: SearchList) => (
                <TableRow 
                  key={list.id}
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => navigate(`/lists/${list.listId}`)}
                >
                  <TableCell className="font-mono text-sm">
                    {generateListDisplayName(list)}
                  </TableCell>
                  <TableCell>{list.resultCount}</TableCell>
                </TableRow>
              ))}
              {lists.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No saved lists yet. Save a search to create a new list.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}