"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeferredSelectGate } from "@/components/shared";
import { useCreateWarehouse, useUpdateWarehouse } from "@/hooks/queries";
import { Warehouse } from "@/types";

interface WarehouseDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editingWarehouse?: Warehouse | null;
  onEditWarehouse?: (warehouse: Warehouse) => void;
}

export default function WarehouseDialog({
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  editingWarehouse: externalEditingWarehouse,
  onEditWarehouse,
}: WarehouseDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (value: boolean) => {
      if (isControlled && controlledOnOpenChange) {
        controlledOnOpenChange(value);
      } else {
        setInternalOpen(value);
      }
    },
    [isControlled, controlledOnOpenChange],
  );

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState(true);

  const [internalEditing, setInternalEditing] = useState<Warehouse | null>(
    null,
  );
  const editingWarehouse =
    externalEditingWarehouse !== undefined
      ? externalEditingWarehouse
      : internalEditing;
  const setEditingWarehouse =
    externalEditingWarehouse !== undefined && onEditWarehouse
      ? onEditWarehouse
      : setInternalEditing;

  useEffect(() => {
    if (externalEditingWarehouse) {
      queueMicrotask(() => {
        setName(externalEditingWarehouse.name);
        setAddress(externalEditingWarehouse.address || "");
        setType(externalEditingWarehouse.type || "");
        setStatus(externalEditingWarehouse.status ?? true);
      });
    } else if (externalEditingWarehouse === null) {
      queueMicrotask(() => {
        setName("");
        setAddress("");
        setType("");
        setStatus(true);
      });
    }
  }, [externalEditingWarehouse]);

  useEffect(() => {
    if (!open && !editingWarehouse) {
      queueMicrotask(() => {
        setName("");
        setAddress("");
        setType("");
        setStatus(true);
      });
    }
  }, [open, editingWarehouse]);

  const createMutation = useCreateWarehouse();
  const updateMutation = useUpdateWarehouse();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingWarehouse) {
      await updateMutation.mutateAsync({
        id: editingWarehouse.id,
        name: name.trim(),
        address: address.trim() || null,
        type: type.trim() || null,
        status,
      });
      setOpen(false);
      setEditingWarehouse(null as unknown as Warehouse);
    } else {
      await createMutation.mutateAsync({
        name: name.trim(),
        address: address.trim() || null,
        type: type.trim() || null,
        status,
      });
      setOpen(false);
    }
  };

  // Predefined warehouse types
  const warehouseTypes = [
    { value: "main", label: "Main Warehouse" },
    { value: "secondary", label: "Secondary" },
    { value: "storage", label: "Storage" },
    { value: "distribution", label: "Distribution Center" },
    { value: "retail", label: "Retail Store" },
    { value: "other", label: "Other" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent
        className="p-4 sm:p-7 sm:px-8 poppins max-h-[90vh] overflow-y-auto border-teal-400/30 dark:border-teal-400/30 shadow-sm "
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-[22px] text-white">
            {editingWarehouse ? "Edit Warehouse" : "Add Warehouse"}
          </DialogTitle>
          <DialogDescription className="text-white/70">
            {editingWarehouse
              ? "Update warehouse details below."
              : "Enter the details for the new warehouse location."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label
              htmlFor="warehouse-name"
              className="text-sm font-medium text-white/80"
            >
              Warehouse Name *
            </Label>
            <Input
              id="warehouse-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Warehouse, NYC Distribution Center"
              required
              className="h-11 border-teal-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-white placeholder:text-white/40 focus:border-teal-400 focus:ring-teal-500/50 shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="warehouse-address"
              className="text-sm font-medium text-white/80"
            >
              Address
            </Label>
            <Textarea
              id="warehouse-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full street address, city, state, ZIP code"
              rows={3}
              className="border-teal-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-white placeholder:text-white/40 focus:border-teal-400 focus:ring-teal-500/50 shadow-sm resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="warehouse-type"
              className="text-sm font-medium text-white/80"
            >
              Warehouse Type
            </Label>
            <DeferredSelectGate
              enabled={open}
              placeholder={
                <div
                  className="flex h-11 w-full items-center rounded-md border border-teal-400/30 bg-white/10 px-3 text-sm text-white/60"
                  aria-hidden
                >
                  {warehouseTypes.find((wt) => wt.value === type)?.label ??
                    "Select type"}
                </div>
              }
            >
              {({ selectRemountKey }) => (
                <Select
                  key={selectRemountKey}
                  value={type}
                  onValueChange={setType}
                >
                  <SelectTrigger className="h-11 w-full border-teal-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-white placeholder:text-white/40 focus:border-teal-400 focus:ring-teal-500/50 shadow-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent
                    className="border-teal-400/20 dark:border-white/10 bg-white/80 dark:bg-popover/50 backdrop-blur-sm z-[100]"
                    position="popper"
                    sideOffset={5}
                    align="start"
                  >
                    {warehouseTypes.map((wt) => (
                      <SelectItem
                        key={wt.value}
                        value={wt.value}
                        className="cursor-pointer text-gray-900 dark:text-white focus:bg-teal-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
                      >
                        {wt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </DeferredSelectGate>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-teal-400/20">
            <Switch
              id="warehouse-status"
              checked={status}
              onCheckedChange={setStatus}
              className="data-[state=checked]:bg-teal-500"
            />
            <div className="flex flex-col">
              <Label
                htmlFor="warehouse-status"
                className="text-sm font-medium text-white/80 cursor-pointer"
              >
                Active Status
              </Label>
              <span className="text-xs text-white/50">
                {status
                  ? "Warehouse is currently active"
                  : "Warehouse is inactive"}
              </span>
            </div>
          </div>
          <DialogFooter className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <DialogClose asChild>
              <Button
                type="button"
                variant="secondary"
                className="h-11 w-full sm:w-auto px-8 inline-flex items-center justify-center rounded-xl border border-white/10 bg-card dark:bg-background/50 backdrop-blur-sm shadow-sm transition duration-200 hover:bg-accent dark:hover:bg-accent/50 hover:border-white/20 dark:hover:border-white/20 "
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full sm:w-auto px-8 inline-flex items-center justify-center rounded-xl border border-teal-400/30 dark:border-teal-400/30 bg-card text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-teal-300/40 dark:hover:border-teal-300/40 "
            >
              {isSubmitting
                ? "Saving..."
                : editingWarehouse
                  ? "Update Warehouse"
                  : "Create Warehouse"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
