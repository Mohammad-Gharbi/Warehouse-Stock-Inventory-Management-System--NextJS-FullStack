/**
 * Cheque Ready Card
 * Shown on the order detail page for a cheque order that is not yet paid. Lets the client (buyer)
 * signal that their cheque is ready; once signalled, shows the timestamp. The team is notified
 * and validates the payment from the invoices section. Mirrors ConfirmReceptionCard.
 */

"use client";

import React, { useCallback, useState } from "react";
import { ScrollText, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, invalidateAfterOrderGraphChange } from "@/lib/react-query";
import { useToast } from "@/hooks/use-toast";
import { ClientDateTime } from "@/components/shared";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";

interface ChequeReadyCardProps {
  order: Order;
  /** Whether the current viewer is the buyer (or admin) and may signal the cheque */
  canSignal: boolean;
}

export default function ChequeReadyCard({
  order,
  canSignal,
}: ChequeReadyCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSignalling, setIsSignalling] = useState(false);

  const signalled = !!order.chequeReadySignalledAt;

  const handleSignal = useCallback(async () => {
    setIsSignalling(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/cheque-ready`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Failed to signal cheque");
      }

      toast({
        title: "Cheque signalled",
        description: "The team will validate your payment shortly.",
      });

      invalidateAfterOrderGraphChange(queryClient);
      queryClient.refetchQueries({
        queryKey: queryKeys.orders.detail(order.id),
      });
    } catch (error) {
      toast({
        title: "Signal failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSignalling(false);
    }
  }, [order.id, queryClient, toast]);

  // Only for cheque orders that are not yet paid.
  if (order.paymentMethod !== "cheque" || order.paymentStatus === "paid")
    return null;
  // Nothing to show to non-buyers until it has been signalled.
  if (!signalled && !canSignal) return null;

  return (
    <article
      className={cn(
        "group rounded-[20px] border p-4 sm:p-5 backdrop-blur-sm transition-all duration-300",
        "bg-white/60 dark:bg-white/5",
        signalled
          ? "border-emerald-400/20 hover:border-emerald-300/40"
          : "border-amber-400/20 hover:border-amber-300/40",
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            "p-2.5 rounded-xl border",
            signalled
              ? "border-emerald-300/30 bg-emerald-100/50 dark:border-emerald-400/30 dark:bg-emerald-500/20"
              : "border-amber-300/30 bg-amber-100/50 dark:border-amber-400/30 dark:bg-amber-500/20",
          )}
        >
          <ScrollText
            className={cn(
              "h-5 w-5",
              signalled
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400",
            )}
          />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Cheque payment
        </h3>
      </div>

      {signalled ? (
        <div className="flex items-center gap-2 text-sm p-3 rounded-xl bg-card border border-emerald-200/30 dark:border-emerald-400/10">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
          <span className="text-gray-600 dark:text-gray-400">
            Cheque signalled as ready
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            <ClientDateTime date={order.chequeReadySignalledAt!} />
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Is your cheque ready? Let the team know so they can collect it and
            validate your payment.
          </p>
          <Button
            size="sm"
            disabled={isSignalling}
            onClick={handleSignal}
          >
            {isSignalling ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ScrollText className="h-4 w-4 mr-2" />
            )}
            My cheque is ready
          </Button>
        </div>
      )}
    </article>
  );
}
