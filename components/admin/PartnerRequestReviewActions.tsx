"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import axiosInstance from "@/utils/axiosInstance";

/**
 * Approve / reject actions for a pending partner request. Calls
 * PUT /api/partner-requests/:id, then refreshes the server-rendered detail page.
 */
export default function PartnerRequestReviewActions({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState<null | "approved" | "rejected">(null);

  const submit = async (status: "approved" | "rejected") => {
    setPending(status);
    try {
      await axiosInstance.put(`/partner-requests/${id}`, {
        status,
        reviewNotes: notes.trim() || undefined,
      });
      toast({
        title: status === "approved" ? "Request approved" : "Request rejected",
        description:
          status === "approved"
            ? "The applicant is now a partner (client) and has been notified."
            : "The applicant has been notified.",
      });
      router.refresh();
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { error?: string } } };
      toast({
        title: "Action failed",
        description:
          axiosErr?.response?.data?.error ||
          "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPending(null);
    }
  };

  const isBusy = pending !== null;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="reviewNotes"
          className="text-sm font-medium text-foreground"
        >
          Note (optional)
        </label>
        <Textarea
          id="reviewNotes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note for the applicant (included in the email)…"
          disabled={isBusy}
          maxLength={1000}
          className="min-h-[90px] resize-none"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => submit("approved")} disabled={isBusy} className="gap-2">
          {pending === "approved" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Approve
        </Button>
        <Button
          onClick={() => submit("rejected")}
          disabled={isBusy}
          variant="destructive"
          className="gap-2"
        >
          {pending === "rejected" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
          Reject
        </Button>
      </div>
    </div>
  );
}
