import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";

export default function DatabasePage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Database management features will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
