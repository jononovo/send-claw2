import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function Unsubscribe() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token");
  const type = params.get("type");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [email, setEmail] = useState<string>("");

  const isOutreach = type === "outreach";

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    const endpoint = isOutreach
      ? `/api/unsubscribe-outreach?token=${encodeURIComponent(token)}`
      : `/api/unsubscribe?token=${encodeURIComponent(token)}`;

    fetch(endpoint)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setEmail(data.email || "");
          setStatus("success");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [token, isOutreach]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Processing your request...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <h2 className="text-xl font-semibold">You've been unsubscribed</h2>
              {isOutreach ? (
                <p className="text-muted-foreground">
                  You will no longer receive daily outreach emails. You can re-enable them from your dashboard settings anytime.
                </p>
              ) : email ? (
                <p className="text-muted-foreground">
                  <span className="font-medium">{email}</span> will no longer receive emails from us.
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                This may take a few minutes to fully take effect.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 mx-auto text-red-500" />
              <h2 className="text-xl font-semibold">Something went wrong</h2>
              <p className="text-muted-foreground">
                We couldn't process your unsubscribe request. The link may be invalid or expired.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
