"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { KeyRound, Loader2 } from "lucide-react";
import { useProductLicenseKeys, useAddLicenseKeys } from "@/hooks/queries";

interface LicenseKeysFieldProps {
  /** Existing product ID — keys can only be managed after the product exists */
  productId: string;
  /** Only fetch/show when the product is digital */
  enabled: boolean;
}

/**
 * License-key pool manager for a digital product (edit mode only).
 * Shows available/total counts and lets the admin paste keys (one per line) to add
 * to the pool. New keys are POSTed to /api/products/:id/license-keys.
 */
export default function LicenseKeysField({
  productId,
  enabled,
}: LicenseKeysFieldProps) {
  const [text, setText] = useState("");
  const { data: summary, isLoading } = useProductLicenseKeys(productId, enabled);
  const addKeys = useAddLicenseKeys();

  if (!enabled) return null;

  const handleAdd = () => {
    const keys = text
      .split(/\r?\n/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    if (keys.length === 0) return;
    addKeys.mutate(
      { productId, keys },
      {
        onSuccess: () => setText(""),
      },
    );
  };

  return (
    <div className="mt-5 flex flex-col gap-2 sm:col-span-2 rounded-xl border border-violet-400/30 bg-violet-500/5 p-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-white/80">
          <KeyRound className="h-4 w-4 text-violet-300" />
          License keys
        </Label>
        <span className="text-xs text-white/70">
          {isLoading
            ? "Loading…"
            : summary
              ? `${summary.available} available / ${summary.total} total`
              : "0 available"}
        </span>
      </div>
      <p className="text-xs text-white/50">
        Paste one activation key per line. Keys are assigned to clients in order of
        addition when the order is delivered.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full rounded-md border border-violet-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm px-3 py-2 text-sm font-mono text-white placeholder:text-white/40 focus:border-violet-400 focus:ring-violet-500/50 focus:outline-none shadow-sm"
        placeholder={"XXXX-XXXX-XXXX-XXXX\nYYYY-YYYY-YYYY-YYYY"}
      />
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleAdd}
          disabled={addKeys.isPending || text.trim().length === 0}
          className="h-10 gap-2 rounded-xl border border-violet-400/30 bg-card text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-violet-300/50 disabled:opacity-50"
        >
          {addKeys.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Adding…
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" />
              Add keys
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
