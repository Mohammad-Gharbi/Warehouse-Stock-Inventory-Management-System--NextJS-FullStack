/**
 * Bon de commande Upload Card
 * Shown on the order detail page. Lets the buyer upload the purchase-order
 * document within 48h of placing the order, and shows the uploaded document /
 * deadline / overdue state.
 */

"use client";

import React, { useCallback, useRef, useState } from "react";
import { FileText, Upload, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
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

interface BonDeCommandeUploadProps {
  order: Order;
  /** Whether the current viewer may upload (buyer or admin) */
  canUpload: boolean;
}

export default function BonDeCommandeUpload({
  order,
  canUpload,
}: BonDeCommandeUploadProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploaded = !!order.bonDeCommandeUrl;
  const isOverdue =
    !uploaded &&
    !!order.bonDeCommandeDeadline &&
    new Date(order.bonDeCommandeDeadline).getTime() < Date.now();

  const handleSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Reset input so selecting the same file again re-triggers change
      if (inputRef.current) inputRef.current.value = "";
      if (!file) return;

      if (file.size > MAX_SIZE) {
        toast({
          title: "File too large",
          description: "The Bon de commande must be 10MB or smaller.",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
          `/api/orders/${order.id}/bon-de-commande`,
          { method: "POST", body: formData },
        );

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error || "Upload failed");
        }

        toast({
          title: "Bon de commande uploaded",
          description: "Your document has been received.",
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

  return (
    <article
      className={cn(
        "group rounded-[20px] border p-4 sm:p-5 backdrop-blur-sm transition-all duration-300",
        "bg-white/60 dark:bg-white/5",
        uploaded
          ? "border-emerald-400/20 hover:border-emerald-300/40"
          : isOverdue
            ? "border-red-400/30 hover:border-red-300/50"
            : "border-amber-400/20 hover:border-amber-300/40",
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            "p-2.5 rounded-xl border",
            uploaded
              ? "border-emerald-300/30 bg-emerald-100/50 dark:border-emerald-400/30 dark:bg-emerald-500/20"
              : isOverdue
                ? "border-red-300/30 bg-red-100/50 dark:border-red-400/30 dark:bg-red-500/20"
                : "border-amber-300/30 bg-amber-100/50 dark:border-amber-400/30 dark:bg-amber-500/20",
          )}
        >
          <FileText
            className={cn(
              "h-5 w-5",
              uploaded
                ? "text-emerald-600 dark:text-emerald-400"
                : isOverdue
                  ? "text-red-600 dark:text-red-400"
                  : "text-amber-600 dark:text-amber-400",
            )}
          />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Bon de commande
        </h3>
      </div>

      {uploaded ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm p-3 rounded-xl bg-card border border-emerald-200/30 dark:border-emerald-400/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
            <a
              href={order.bonDeCommandeUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 truncate"
            >
              {order.bonDeCommandeFileName || "View document"}
            </a>
          </div>
          {order.bonDeCommandeUploadedAt && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Uploaded{" "}
              <ClientDateTime date={order.bonDeCommandeUploadedAt} />
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
            Please upload your Bon de commande (purchase order document) within
            48 hours of placing this order.
          </p>

          {order.bonDeCommandeDeadline && (
            <div
              className={cn(
                "flex items-center gap-2 text-sm p-3 rounded-xl bg-card border",
                isOverdue
                  ? "border-red-200/40 dark:border-red-400/20"
                  : "border-amber-200/30 dark:border-amber-400/10",
              )}
            >
              <AlertTriangle
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isOverdue
                    ? "text-red-500 dark:text-red-400"
                    : "text-amber-500 dark:text-amber-400",
                )}
              />
              <span className="text-gray-600 dark:text-gray-400">
                {isOverdue ? "Deadline passed:" : "Deadline:"}
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                <ClientDateTime date={order.bonDeCommandeDeadline} />
              </span>
            </div>
          )}

          {canUpload ? (
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
                size="sm"
                disabled={isUploading}
                onClick={() => inputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Bon de commande
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Accepted: PDF, images (JPG/PNG/WebP), Word, Excel — max 10MB.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No document uploaded yet.
            </p>
          )}
        </div>
      )}
    </article>
  );
}
