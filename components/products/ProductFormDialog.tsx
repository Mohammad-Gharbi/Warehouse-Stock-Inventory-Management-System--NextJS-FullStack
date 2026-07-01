"use client";

import { useState, useEffect, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useProductStore } from "@/stores";
import {
  useCreateProduct,
  useUpdateProduct,
  useCategories,
} from "@/hooks/queries";
import { logger } from "@/lib/logger";
import ProductName from "./form-fields/NameField";
// SKU component removed from UI – generation is now automatic
// import SKU from "./form-fields/SKUField";
import Quantity from "./form-fields/QuantityField";
import Price from "./form-fields/PriceField";
import ImageField from "./form-fields/ImageField";
import ExpirationDateField from "./form-fields/ExpirationDateField";
import PaymentTermsField from "./form-fields/PaymentTermsField";
import ProductTypeField from "./form-fields/ProductTypeField";
import LicenseKeysField from "./form-fields/LicenseKeysField";
import OrderFormBuilder from "./form-fields/OrderFormBuilder";
import { Product, OrderFormFieldDef } from "@/types";
import {
  productSchema,
  productFormSubmitSchema,
  calculateProductStatus,
  type ProductFormData,
} from "@/lib/validations";
import { DeferredSelectGate } from "@/components/shared";
import { useToast } from "@/hooks/use-toast";

interface AddProductDialogProps {
  allProducts: Product[];
  userId: string;
  children?: React.ReactNode;
}

export default function AddProductDialog({
  allProducts,
  userId,
  children,
}: AddProductDialogProps) {
  const methods = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      productName: "",
      sku: "",
      quantity: "" as unknown as number,
      price: "" as unknown as number,
      imageUrl: "",
      imageFileId: "",
      expirationDate: "",
      paymentTerms: "",
      orderFormFields: [],
      productType: "physical",
    },
  });

  const { reset, watch, setValue } = methods;
  const productType = watch("productType");
  const productName = watch("productName"); // used for auto‑generation

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [categoryError, setCategoryError] = useState<string>("");
  const dialogCloseRef = useRef<HTMLButtonElement | null>(null);
  const { toast } = useToast();

  const {
    setOpenProductDialog,
    openProductDialog,
    setSelectedProduct,
    selectedProduct,
  } = useProductStore();

  const { data: categories = [] } = useCategories();

  const activeCategories = categories.filter(
    (category) => category.status !== false || category.id === selectedCategory,
  );

  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();

  // Reset form when opening dialog or when selectedProduct changes
  useEffect(() => {
    if (selectedProduct) {
      reset({
        productName: selectedProduct.name,
        sku: selectedProduct.sku,
        quantity: selectedProduct.quantity,
        price: selectedProduct.price,
        imageUrl: selectedProduct.imageUrl || "",
        imageFileId: selectedProduct.imageFileId || "",
        expirationDate: selectedProduct.expirationDate
          ? new Date(selectedProduct.expirationDate).toISOString().split("T")[0]
          : "",
        paymentTerms: selectedProduct.paymentTerms || "",
        orderFormFields: selectedProduct.orderFormFields || [],
        productType: selectedProduct.productType || "physical",
      });
      setSelectedCategory(selectedProduct.categoryId || "");
    } else {
      reset({
        productName: "",
        sku: "",
        quantity: "" as unknown as number,
        price: "" as unknown as number,
        imageUrl: "",
        imageFileId: "",
        expirationDate: "",
        paymentTerms: "",
        orderFormFields: [],
        productType: "physical",
      });
      setSelectedCategory("");
    }
    setCategoryError("");
  }, [selectedProduct, openProductDialog, reset]);

  // Auto‑generate SKU when adding a new product (not editing)
  useEffect(() => {
    // Only run when dialog is open and we are NOT editing an existing product
    if (!openProductDialog || selectedProduct) return;

    const generateSKU = () => {
      // Use first 3 letters of product name (or default) + timestamp + random digits
      const namePart = (productName || "PRD")
        .replace(/\s+/g, "")
        .substring(0, 3)
        .toUpperCase();
      const timePart = Date.now().toString(36).slice(-4).toUpperCase();
      const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
      const candidate = `${namePart}-${timePart}-${randomPart}`;

      // Ensure uniqueness against existing products
      const exists = allProducts.some((p) => p.sku === candidate);
      setValue("sku", exists ? candidate + "X" : candidate, {
        shouldValidate: true,
      });
    };

    generateSKU();
    // Regenerate whenever the name or category changes
  }, [
    productName,
    selectedCategory,
    openProductDialog,
    selectedProduct,
    allProducts,
    setValue,
  ]);

  const onSubmit = async (data: ProductFormData) => {
    const submitValidation = productFormSubmitSchema.safeParse({
      ...data,
      categoryId: selectedCategory,
    });
    if (!submitValidation.success) {
      for (const issue of submitValidation.error.errors) {
        const field = issue.path[0];
        if (field === "categoryId") {
          setCategoryError(issue.message);
        }
      }
      return;
    }
    setCategoryError("");

    const quantity =
      typeof data.quantity === "string" && data.quantity === ""
        ? 0
        : Number(data.quantity);
    const price =
      typeof data.price === "string" && data.price === ""
        ? 0
        : Number(data.price);

    const status = calculateProductStatus(quantity);

    const expirationDate =
      data.expirationDate && data.expirationDate !== ""
        ? new Date(data.expirationDate).toISOString()
        : null;

    const cleanedOrderFormFields: OrderFormFieldDef[] = (
      data.orderFormFields || []
    )
      .map((f) => ({
        key: f.key,
        label: f.label.trim(),
        type: f.type,
        required: !!f.required,
        ...(f.type === "select"
          ? {
              options: (f.options || [])
                .map((o) => o.trim())
                .filter((o) => o.length > 0),
            }
          : {}),
      }))
      .filter((f) => f.label.length > 0);

    const invalidSelect = cleanedOrderFormFields.find(
      (f) => f.type === "select" && (!f.options || f.options.length === 0),
    );
    if (invalidSelect) {
      toast({
        title: "Champ invalide",
        description: `Le champ « ${invalidSelect.label} » est une liste de choix et doit avoir au moins une option.`,
        variant: "destructive",
      });
      return;
    }

    const paymentTerms = data.paymentTerms?.trim() || undefined;

    try {
      if (!selectedProduct) {
        await createProductMutation.mutateAsync({
          name: data.productName,
          sku: data.sku, // auto‑generated value is submitted
          price: price,
          quantity: quantity,
          status,
          categoryId: selectedCategory,
          userId: userId,
          imageUrl: data.imageUrl || undefined,
          imageFileId: data.imageFileId || undefined,
          expirationDate: expirationDate || undefined,
          paymentTerms,
          orderFormFields: cleanedOrderFormFields,
          productType: data.productType,
        });

        dialogCloseRef.current?.click();
        setOpenProductDialog(false);
      } else {
        await updateProductMutation.mutateAsync({
          id: selectedProduct.id,
          name: data.productName,
          sku: data.sku, // existing SKU is kept as is
          price: price,
          quantity: quantity,
          status,
          categoryId: selectedCategory,
          imageUrl: data.imageUrl || undefined,
          imageFileId: data.imageFileId || undefined,
          expirationDate: expirationDate,
          paymentTerms: paymentTerms ?? null,
          orderFormFields: cleanedOrderFormFields,
          productType: data.productType,
        });

        setOpenProductDialog(false);
      }
    } catch (error) {
      logger.error("Product operation error:", error);
    }
  };

  const isSubmitting =
    createProductMutation.isPending || updateProductMutation.isPending;

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSelectedProduct(null);
    } else {
      setSelectedProduct(null);
    }
    setOpenProductDialog(open);
  };

  return (
    <Dialog open={openProductDialog} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button className="h-10 font-semibold inline-flex items-center justify-center rounded-xl border border-rose-400/30 dark:border-rose-400/30 bg-card text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-rose-300/50 dark:hover:border-rose-300/50 ">
            +Add Product
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="p-4 sm:p-7 sm:px-8 poppins max-h-[90vh] overflow-y-auto border-rose-400/30 dark:border-rose-400/30 shadow-sm "
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-[22px] text-white">
            {selectedProduct ? "Update Product" : "Add Product"}
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Enter the details of the product below.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          {/* eslint-disable-next-line react-hooks/refs */}
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ProductName />
              {/* SKU field is now hidden – auto‑generated behind the scenes */}
              {/* <SKU allProducts={allProducts} /> */}
              <Quantity />
              <Price />
              <ExpirationDateField />
              <ImageField />
              <div className="mt-5 flex flex-col gap-2">
                <label className="text-sm font-medium text-white/80">
                  Category
                </label>
                <DeferredSelectGate
                  enabled={openProductDialog}
                  placeholder={
                    <div
                      className="flex h-11 w-full items-center rounded-md border border-rose-400/30 bg-white/10 px-3 text-sm text-white/60"
                      aria-hidden
                    >
                      {activeCategories.find((c) => c.id === selectedCategory)
                        ?.name ?? "Select Category"}
                    </div>
                  }
                >
                  {({ selectRemountKey }) => (
                    <Select
                      key={selectRemountKey}
                      value={selectedCategory}
                      onValueChange={(value) => {
                        setSelectedCategory(value);
                        setCategoryError("");
                      }}
                    >
                      <SelectTrigger className="h-11 w-full border-rose-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-white placeholder:text-white/40 focus:border-rose-400 focus:ring-rose-500/50 shadow-sm">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent
                        className="border-rose-400/20 dark:border-white/10 bg-white/80 dark:bg-popover/50 backdrop-blur-sm z-[100]"
                        position="popper"
                        sideOffset={5}
                        align="start"
                      >
                        {activeCategories.map((category) => (
                          <SelectItem
                            key={category.id}
                            value={category.id}
                            className="cursor-pointer text-gray-900 dark:text-white focus:bg-rose-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </DeferredSelectGate>
                {categoryError && (
                  <p className="text-xs text-red-400 mt-1">{categoryError}</p>
                )}
              </div>
              <ProductTypeField />
              <PaymentTermsField />
              {selectedProduct && productType === "digital" && (
                <LicenseKeysField
                  productId={selectedProduct.id}
                  enabled={openProductDialog}
                />
              )}
              <OrderFormBuilder />
            </div>
            <DialogFooter className="mt-9 mb-4 flex flex-col sm:flex-row items-center gap-4">
              <DialogClose asChild>
                <Button
                  ref={dialogCloseRef}
                  variant="secondary"
                  className="h-11 w-full sm:w-auto px-11 inline-flex items-center justify-center rounded-xl border border-white/10 bg-card dark:bg-background/50 backdrop-blur-sm shadow-sm transition duration-200 hover:bg-accent dark:hover:bg-accent/50 hover:border-white/20 dark:hover:border-white/20 "
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className="h-11 w-full sm:w-auto px-11 inline-flex items-center justify-center rounded-xl border border-rose-400/30 dark:border-rose-400/30 bg-card text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-rose-300/40 dark:hover:border-rose-300/40 "
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Loading..."
                  : selectedProduct
                    ? "Update Product"
                    : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
