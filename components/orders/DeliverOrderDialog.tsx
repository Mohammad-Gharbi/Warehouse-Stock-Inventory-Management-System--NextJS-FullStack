"use client";

/**
 * Deliver Order Dialog
 * Admin / product-owner action to validate (Bon de commande uploaded) and deliver an order.
 * Digital items are fulfilled from the product key pool (server-side); physical items
 * require a tracking number. Mixed orders are handled per item.
 */

import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Truck,
  Package,
  KeyRound,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useDeliverOrder, useProductLicenseKeys } from "@/hooks/queries";
import type { Order } from "@/types";

interface DeliverOrderDialogProps {
  order: Order;
  disabled?: boolean;
  trigger?: React.ReactNode;
}

const CARRIERS = ["usps", "ups", "fedex", "dhl", "other"] as const;

/** Aggregated digital line: total keys required for one product across the order */
interface DigitalLine {
  productId: string;
  productName: string;
  required: number;
}

/**
 * One row per digital product showing required vs available keys.
 * Reports availability up so the parent can block delivery when the pool is short.
 */
function DigitalKeyRow({
  line,
  open,
  onAvailability,
}: {
  line: DigitalLine;
  open: boolean;
  onAvailability: (productId: string, available: number) => void;
}) {
  const { data, isLoading } = useProductLicenseKeys(line.productId, open);

  React.useEffect(() => {
    if (data) onAvailability(line.productId, data.available);
  }, [data, line.productId, onAvailability]);

  const available = data?.available ?? 0;
  const short = !isLoading && available < line.required;

  return (
    <div className="flex items-center justify-between rounded-lg border border-violet-300/30 bg-violet-500/5 px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium text-white">{line.productName}</p>
        <p className="text-xs text-white/60">Needs {line.required} key(s)</p>
      </div>
      <div className="text-right">
        {isLoading ? (
          <span className="text-xs text-white/50">Loading…</span>
        ) : short ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            {available} available
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
            <CheckCircle className="h-3.5 w-3.5" />
            {available} available
          </span>
        )}
      </div>
    </div>
  );
}

export default function DeliverOrderDialog({
  order,
  disabled,
  trigger,
}: DeliverOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState<(typeof CARRIERS)[number]>("usps");
  const [availability, setAvailability] = useState<Record<string, number>>({});

  const deliverMutation = useDeliverOrder();

  const { digitalLines, hasPhysical } = useMemo(() => {
    const map = new Map<string, DigitalLine>();
    let physical = false;
    for (const item of order.items) {
      if (item.productType === "digital") {
        const existing = map.get(item.productId);
        if (existing) {
          existing.required += item.quantity;
        } else {
          map.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            required: item.quantity,
          });
        }
      } else {
        physical = true;
      }
    }
    return { digitalLines: [...map.values()], hasPhysical: physical };
  }, [order.items]);

  const handleAvailability = React.useCallback(
    (productId: string, available: number) => {
      setAvailability((prev) =>
        prev[productId] === available ? prev : { ...prev, [productId]: available },
      );
    },
    [],
  );

  const anyShort = digitalLines.some(
    (line) => (availability[line.productId] ?? 0) < line.required,
  );
  const trackingMissing = hasPhysical && trackingNumber.trim().length === 0;
  const canSubmit = !anyShort && !trackingMissing && !deliverMutation.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    deliverMutation.mutate(
      {
        id: order.id,
        data: hasPhysical
          ? {
              trackingNumber: trackingNumber.trim(),
              trackingCarrier: carrier,
            }
          : {},
      },
      {
        onSuccess: () => setOpen(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" disabled={disabled} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Validate &amp; Deliver
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="p-4 sm:p-7 sm:px-8 poppins max-h-[90vh] overflow-y-auto border-emerald-400/30 shadow-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Package className="h-5 w-5" />
            Validate &amp; Deliver
          </DialogTitle>
          <DialogDescription className="text-white/80">
            Deliver order{" "}
            <span className="font-mono font-medium text-white">
              {order.orderNumber}
            </span>
            . Digital products are fulfilled from their key pool; physical products
            need a tracking number.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 pt-2">
          {/* Digital items */}
          {digitalLines.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-2 text-white/90">
                <KeyRound className="h-4 w-4 text-violet-300" />
                Digital products
              </Label>
              <div className="flex flex-col gap-2">
                {digitalLines.map((line) => (
                  <DigitalKeyRow
                    key={line.productId}
                    line={line}
                    open={open}
                    onAvailability={handleAvailability}
                  />
                ))}
              </div>
              {anyShort && (
                <div className="rounded-lg border border-amber-300/40 bg-amber-500/10 p-3">
                  <p className="text-xs text-amber-200">
                    Not enough license keys for one or more products. Add keys on the
                    product (Edit product → License keys) before delivering.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Physical items */}
          {hasPhysical && (
            <div className="flex flex-col gap-3">
              <Label className="flex items-center gap-2 text-white/90">
                <Truck className="h-4 w-4 text-sky-300" />
                Physical products — tracking
              </Label>
              <div className="flex flex-col gap-2">
                <Label htmlFor="deliver-carrier" className="text-white/80 text-xs">
                  Carrier
                </Label>
                <select
                  id="deliver-carrier"
                  value={carrier}
                  onChange={(e) =>
                    setCarrier(e.target.value as (typeof CARRIERS)[number])
                  }
                  className="h-11 w-full rounded-md border border-emerald-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm px-3 text-sm text-white focus:border-emerald-400 focus:ring-emerald-500/50 focus:outline-none shadow-sm"
                >
                  {CARRIERS.map((c) => (
                    <option key={c} value={c} className="text-gray-900">
                      {c.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="deliver-tracking"
                  className="text-white/80 text-xs"
                >
                  Tracking number
                </Label>
                <Input
                  id="deliver-tracking"
                  placeholder="Enter tracking number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="h-11 w-full border-emerald-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-white placeholder:text-white/40 focus-visible:border-emerald-400 focus-visible:ring-emerald-500/50 shadow-sm"
                />
              </div>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-11 w-full gap-2 rounded-xl border border-emerald-400/30 bg-card text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-emerald-300/50 disabled:opacity-50"
          >
            {deliverMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Delivering…
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Validate &amp; Deliver
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
