/**
 * Invoice Document Card
 * Shown on the order detail page once an order is delivered. Lets the admin / product owner
 * upload the invoice document; the client can download it. Mirrors BonDeCommandeUpload.
 */

"use client";

import React, { useCallback, useRef, useState } from "react";
import { Receipt, Upload, CheckCircle2, Loader2 } from "lucide-react";
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

interface InvoiceDocumentUploadProps {
  order: Order;
  /** Whether the current viewer may upload (admin or product owner) */
  canUpload: boolean;
}

export default function InvoiceDocumentUpload({
  order,
  canUpload,
}: InvoiceDocumentUploadProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploaded = !!order.invoiceDocumentUrl;

  const handleSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Reset input so selecting the same file again re-triggers change
      if (inputRef.current) inputRef.current.value = "";
      if (!file) return;

      if (file.size > MAX_SIZE) {
        toast({
          title: "File too large",
          description: "The invoice must be 10MB or smaller.",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
          `/api/orders/${order.id}/invoice-document`,
          { method: "POST", body: formData },
        );

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error || "Upload failed");
        }

        toast({
          title: "Invoice uploaded",
          description: "The invoice has been sent to the client.",
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

  // Invoice handling only applies to delivered orders.
  if (order.status !== "delivered") return null;

  return (
    <article
      className={cn(
        "group rounded-[20px] border p-4 sm:p-5 backdrop-blur-sm transition-all duration-300",
        "bg-white/60 dark:bg-white/5",
        uploaded
          ? "border-emerald-400/20 hover:border-emerald-300/40"
          : "border-violet-400/20 hover:border-violet-300/40",
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            "p-2.5 rounded-xl border",
            uploaded
              ? "border-emerald-300/30 bg-emerald-100/50 dark:border-emerald-400/30 dark:bg-emerald-500/20"
              : "border-violet-300/30 bg-violet-100/50 dark:border-violet-400/30 dark:bg-violet-500/20",
          )}
        >
          <Receipt
            className={cn(
              "h-5 w-5",
              uploaded
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-violet-600 dark:text-violet-400",
            )}
          />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Invoice
        </h3>
      </div>

      {uploaded ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm p-3 rounded-xl bg-card border border-emerald-200/30 dark:border-emerald-400/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
            <a
              href={order.invoiceDocumentUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 truncate"
            >
              {order.invoiceDocumentFileName || "Download invoice"}
            </a>
          </div>
          {order.invoiceDocumentUploadedAt && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Uploaded <ClientDateTime date={order.invoiceDocumentUploadedAt} />
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
          {canUpload ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload the invoice for this order. The client will be notified
                and can download it from this page.
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
                Upload invoice
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Accepted: PDF, images (JPG/PNG/WebP), Word, Excel — max 10MB.
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              The invoice will appear here once it has been issued.
            </p>
          )}
        </div>
      )}
    </article>
  );
}
