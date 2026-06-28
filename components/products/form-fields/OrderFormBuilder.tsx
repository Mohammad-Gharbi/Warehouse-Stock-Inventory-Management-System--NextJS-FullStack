"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import type { OrderFormFieldType } from "@/types";

const FIELD_TYPE_OPTIONS: Array<{ value: OrderFormFieldType; label: string }> = [
  { value: "text", label: "Texte court" },
  { value: "textarea", label: "Texte long" },
  { value: "number", label: "Nombre" },
  { value: "select", label: "Liste de choix" },
];

/**
 * Mini form-builder for a product's custom order-form fields.
 * Bound to the RHF field array `orderFormFields`. Each entry is an OrderFormFieldDef.
 * Buyers fill these fields (per product) when placing an order.
 */
export default function OrderFormBuilder() {
  const { control, register, watch, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "orderFormFields",
  });

  const handleAdd = () => {
    append({
      key:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `field-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      label: "",
      type: "text",
      required: false,
      options: [],
    });
  };

  return (
    <div className="mt-5 flex flex-col gap-3 sm:col-span-2">
      <div className="flex items-center justify-between">
        <Label className="text-white/80">Formulaire de commande (champs personnalisés)</Label>
        <Button
          type="button"
          onClick={handleAdd}
          variant="secondary"
          className="h-9 rounded-lg border border-rose-400/30 dark:border-rose-400/30 bg-card text-gray-700 dark:text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-rose-300/60 dark:hover:border-rose-300/60"
        >
          <Plus className="h-4 w-4 mr-1" />
          Ajouter un champ
        </Button>
      </div>

      {fields.length === 0 && (
        <p className="text-xs text-white/50">
          Aucun champ personnalisé. Le client saisira uniquement la quantité, les
          commentaires et le mode de paiement.
        </p>
      )}

      {fields.map((field, index) => {
        const type = watch(`orderFormFields.${index}.type`) as OrderFormFieldType;
        const optionsValue: string[] =
          watch(`orderFormFields.${index}.options`) || [];

        return (
          <div
            key={field.id}
            className="p-3 border border-rose-400/20 rounded-lg bg-white/5 space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Label */}
                <div className="flex flex-col gap-1">
                  <Label className="text-white/70 text-xs">Libellé du champ</Label>
                  <Input
                    {...register(`orderFormFields.${index}.label`)}
                    type="text"
                    placeholder="Ex : Référence client"
                    className="h-10 bg-white/10 dark:bg-white/5 border border-rose-400/30 dark:border-white/20 text-white placeholder:text-white/40 focus-visible:border-rose-400 focus-visible:ring-rose-500/50 shadow-sm"
                  />
                </div>

                {/* Type */}
                <div className="flex flex-col gap-1">
                  <Label className="text-white/70 text-xs">Type</Label>
                  <Select
                    value={type || "text"}
                    onValueChange={(value) => {
                      setValue(
                        `orderFormFields.${index}.type`,
                        value as OrderFormFieldType,
                      );
                      if (value !== "select") {
                        setValue(`orderFormFields.${index}.options`, []);
                      }
                    }}
                  >
                    <SelectTrigger className="h-10 w-full border-rose-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 text-white shadow-sm">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent
                      className="border-rose-400/20 dark:border-white/10 bg-white/80 dark:bg-popover/50 backdrop-blur-sm z-[100]"
                      position="popper"
                    >
                      {FIELD_TYPE_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          className="cursor-pointer text-gray-900 dark:text-white focus:bg-rose-100 dark:focus:bg-white/10"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Options (only for select) */}
                {type === "select" && (
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <Label className="text-white/70 text-xs">
                      Options (séparées par des virgules)
                    </Label>
                    <Input
                      type="text"
                      value={optionsValue.join(", ")}
                      onChange={(e) =>
                        setValue(
                          `orderFormFields.${index}.options`,
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter((s) => s.length > 0),
                        )
                      }
                      placeholder="Ex : Petit, Moyen, Grand"
                      className="h-10 bg-white/10 dark:bg-white/5 border border-rose-400/30 dark:border-white/20 text-white placeholder:text-white/40 focus-visible:border-rose-400 focus-visible:ring-rose-500/50 shadow-sm"
                    />
                  </div>
                )}

                {/* Required */}
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    {...register(`orderFormFields.${index}.required`)}
                    type="checkbox"
                    id={`field-required-${index}`}
                    className="h-4 w-4 rounded border-rose-400/30 bg-white/10 text-rose-500 focus:ring-rose-500/50"
                  />
                  <Label
                    htmlFor={`field-required-${index}`}
                    className="text-white/70 text-xs cursor-pointer"
                  >
                    Champ obligatoire
                  </Label>
                </div>
              </div>

              {/* Remove */}
              <Button
                type="button"
                onClick={() => remove(index)}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
