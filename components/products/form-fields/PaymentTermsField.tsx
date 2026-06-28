"use client";

import { Label } from "@/components/ui/label";
import { useFormContext } from "react-hook-form";

/**
 * Free-text "Modalités de paiement" field shown to buyers on the product.
 * Bound to RHF field `paymentTerms`.
 */
export default function PaymentTermsField() {
  const { register } = useFormContext();

  return (
    <div className="mt-5 flex flex-col gap-2 sm:col-span-2">
      <Label htmlFor="payment-terms" className="text-white/80">
        Modalités de paiement
      </Label>
      <textarea
        {...register("paymentTerms")}
        id="payment-terms"
        rows={3}
        className="w-full rounded-md border border-rose-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-rose-400 focus:ring-rose-500/50 focus:outline-none shadow-sm"
        placeholder="Ex : Paiement par virement à la commande, chèque à la livraison, espèces en magasin…"
      />
    </div>
  );
}
