/**
 * Confirm Reception Card
 * Shown on the order detail page once an order is delivered. Lets the client (buyer) confirm
 * they received the order; once confirmed, shows the confirmation timestamp.
 */

"use client";

import React, { useCallback, useState } from "react";
import { PackageCheck, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, invalidateAfterOrderGraphChange } from "@/lib/react-query";
import { useToast } from "@/hooks/use-toast";
import { ClientDateTime } from "@/components/shared";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";

interface ConfirmReceptionCardProps {
  order: Order;
  /** Whether the current viewer is the buyer and may confirm reception */
  canConfirm: boolean;
}

export default function ConfirmReceptionCard({
  order,
  canConfirm,
}: ConfirmReceptionCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(false);

  const confirmed = !!order.receptionConfirmedAt;

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true);
    try {
      const response = await fetch(
        `/api/orders/${order.id}/confirm-reception`,
        { method: "POST" },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Failed to confirm reception");
      }

      toast({
        title: "Reception confirmed",
        description: "Thank you for confirming you received your order.",
      });

      invalidateAfterOrderGraphChange(queryClient);
      queryClient.refetchQueries({
        queryKey: queryKeys.orders.detail(order.id),
      });
    } catch (error) {
      toast({
        title: "Confirmation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  }, [order.id, queryClient, toast]);

  // Reception is only confirmable once the order is delivered.
  if (order.status !== "delivered") return null;
  // Nothing to show to non-buyers until it has been confirmed.
  if (!confirmed && !canConfirm) return null;

  return (
    <article
      className={cn(
        "group rounded-[20px] border p-4 sm:p-5 backdrop-blur-sm transition-all duration-300",
        "bg-white/60 dark:bg-white/5",
        confirmed
          ? "border-emerald-400/20 hover:border-emerald-300/40"
          : "border-sky-400/20 hover:border-sky-300/40",
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            "p-2.5 rounded-xl border",
            confirmed
              ? "border-emerald-300/30 bg-emerald-100/50 dark:border-emerald-400/30 dark:bg-emerald-500/20"
              : "border-sky-300/30 bg-sky-100/50 dark:border-sky-400/30 dark:bg-sky-500/20",
          )}
        >
          <PackageCheck
            className={cn(
              "h-5 w-5",
              confirmed
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-sky-600 dark:text-sky-400",
            )}
          />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Order reception
        </h3>
      </div>

      {confirmed ? (
        <div className="flex items-center gap-2 text-sm p-3 rounded-xl bg-card border border-emerald-200/30 dark:border-emerald-400/10">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
          <span className="text-gray-600 dark:text-gray-400">
            Reception confirmed
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            <ClientDateTime date={order.receptionConfirmedAt!} />
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Have you received this order? Confirm reception so we know it was
            delivered successfully.
          </p>
          <Button
            size="sm"
            disabled={isConfirming}
            onClick={handleConfirm}
          >
            {isConfirming ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <PackageCheck className="h-4 w-4 mr-2" />
            )}
            Confirm reception
          </Button>
        </div>
      )}
    </article>
  );
}
