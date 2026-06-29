/**
 * Virement Document Card
 * Shown on the order detail page for a virement (bank-transfer) order that is not yet paid.
 * Lets the client (buyer) upload their "ordre de virement" as proof of payment; the team is
 * notified and validates the payment from the invoices section. Mirrors InvoiceDocumentUpload.
 */

"use client";

import React, { useCallback, useRef, useState } from "react";
import { Banknote, Upload, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, invalidateAfterOrderGraphChange } from "@/lib/react-query";
import { useToast } from "@/hooks/use-toast";
import { ClientDateTime } from "@/components/shared";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";

/** Accepted upload types: PDF + images + Office docs */
const ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,application/pdf,image/jpeg,image/png,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

interface VirementDocumentUploadProps {
  order: Order;
  /** Whether the current viewer may upload (buyer or admin) */
  canUpload: boolean;
}

export default function VirementDocumentUpload({
  order,
  canUpload,
}: VirementDocumentUploadProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploaded = !!order.virementDocumentUrl;

  const handleSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Reset input so selecting the same file again re-triggers change
      if (inputRef.current) inputRef.current.value = "";
      if (!file) return;

      if (file.size > MAX_SIZE) {
        toast({
          title: "File too large",
          description: "The document must be 10MB or smaller.",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
          `/api/orders/${order.id}/virement-document`,
          { method: "POST", body: formData },
        );

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error || "Upload failed");
        }

        toast({
          title: "Ordre de virement uploaded",
          description: "The team will validate your payment shortly.",
        });

        invalidateAfterOrderGraphChange(queryClient);
        queryClient.refetchQueries({
          queryKey: queryKeys.orders.detail(order.id),
        });
      } catch (error) {
        toast({
          title: "Upload failed",
          description:
            error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [order.id, queryClient, toast],
  );

  // Only for virement orders that are not yet paid.
  if (order.paymentMethod !== "virement" || order.paymentStatus === "paid")
    return null;
  // Nothing to show to non-buyers until a document has been uploaded.
  if (!uploaded && !canUpload) return null;

  return (
    <article
      className={cn(
        "group rounded-[20px] border p-4 sm:p-5 backdrop-blur-sm transition-all duration-300",
        "bg-white/60 dark:bg-white/5",
        uploaded
          ? "border-emerald-400/20 hover:border-emerald-300/40"
          : "border-blue-400/20 hover:border-blue-300/40",
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            "p-2.5 rounded-xl border",
            uploaded
              ? "border-emerald-300/30 bg-emerald-100/50 dark:border-emerald-400/30 dark:bg-emerald-500/20"
              : "border-blue-300/30 bg-blue-100/50 dark:border-blue-400/30 dark:bg-blue-500/20",
          )}
        >
          <Banknote
            className={cn(
              "h-5 w-5",
              uploaded
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-blue-600 dark:text-blue-400",
            )}
          />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Bank transfer payment
        </h3>
      </div>

      {uploaded ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm p-3 rounded-xl bg-card border border-emerald-200/30 dark:border-emerald-400/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
            <a
              href={order.virementDocumentUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 truncate"
            >
              {order.virementDocumentFileName || "Download ordre de virement"}
            </a>
          </div>
          {order.virementDocumentUploadedAt && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Uploaded{" "}
              <ClientDateTime date={order.virementDocumentUploadedAt} /> — the
              team will validate your payment.
            </p>
          )}
          {canUpload && (
            <div>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                onChange={handleSelect}
                className="hidden"
                disabled={isUploading}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={() => inputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Replace document
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Upload your ordre de virement (bank-transfer order). The team will
            be notified and will validate your payment.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleSelect}
            className="hidden"
            disabled={isUploading}
          />
          <Button
            size="sm"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload ordre de virement
          </Button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Accepted: PDF, images (JPG/PNG/WebP), Word, Excel — max 10MB.
          </p>
        </div>
      )}
    </article>
  );
}
