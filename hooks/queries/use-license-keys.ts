/**
 * Product license-key query hooks
 * Read the available/total key pool for a digital product and add new keys.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { ProductLicenseKeySummary } from "@/types";

/** Query key for a product's license-key summary */
export const licenseKeysQueryKey = (productId: string) =>
  ["products", productId, "license-keys"] as const;

/**
 * Fetch the license-key pool summary (available / total) for a digital product.
 *
 * @param productId - Product ID
 * @param enabled - Only fetch when true (e.g. product is digital and dialog is open)
 */
export function useProductLicenseKeys(productId: string, enabled = true) {
  return useQuery({
    queryKey: licenseKeysQueryKey(productId),
    queryFn: async (): Promise<ProductLicenseKeySummary> => {
      const response = await apiClient.products.getLicenseKeys(productId);
      return response.data;
    },
    enabled: !!productId && enabled,
  });
}

/**
 * Add license keys to a digital product's pool (one per line in the UI).
 */
export function useAddLicenseKeys() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      productId,
      keys,
    }: {
      productId: string;
      keys: string[];
    }): Promise<ProductLicenseKeySummary & { added: number }> => {
      const response = await apiClient.products.addLicenseKeys(productId, keys);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(licenseKeysQueryKey(variables.productId), {
        available: data.available,
        total: data.total,
      });
      toast({
        title: "License keys added",
        description: `${data.added} key(s) added. ${data.available} available.`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to add keys",
        description: getErrorMessage(error) || "Could not add license keys.",
        variant: "destructive",
      });
    },
  });
}
