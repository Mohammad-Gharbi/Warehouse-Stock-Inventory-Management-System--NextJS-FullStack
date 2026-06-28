"use client";

import { Label } from "@/components/ui/label";
import { Controller, useFormContext } from "react-hook-form";

/**
 * Product fulfillment type selector.
 * Bound to RHF field `productType` — "physical" (shipped with tracking) or
 * "digital" (delivered via a pre-loaded activation key).
 */
export default function ProductTypeField() {
  const { control } = useFormContext();

  return (
    <div className="mt-5 flex flex-col gap-2">
      <Label htmlFor="product-type" className="text-white/80">
        Product Type
      </Label>
      <Controller
        name="productType"
        control={control}
        defaultValue="physical"
        render={({ field }) => (
          <select
            id="product-type"
            value={field.value ?? "physical"}
            onChange={field.onChange}
            onBlur={field.onBlur}
            className="h-11 w-full rounded-md border border-rose-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm px-3 text-sm text-white focus:border-rose-400 focus:ring-rose-500/50 focus:outline-none shadow-sm"
          >
            <option value="physical" className="text-gray-900">
              Physical (shipped — tracking number)
            </option>
            <option value="digital" className="text-gray-900">
              Digital (activation key)
            </option>
          </select>
        )}
      />
      <p className="text-xs text-white/50">
        Digital products are delivered from a pre-loaded activation-key pool.
      </p>
    </div>
  );
}
