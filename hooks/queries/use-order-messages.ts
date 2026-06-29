/**
 * Order Message Query Hooks
 * TanStack Query hooks for the per-order conversation thread.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import type { OrderMessage } from "@/types";

async function fetchOrderMessages(orderId: string): Promise<OrderMessage[]> {
  const response = await fetch(`/api/orders/${orderId}/messages`);
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Failed to load messages");
  }
  return response.json();
}

/**
 * Fetch the message thread for an order.
 * @param orderId - Order ID
 * @param enabled - Whether the query should run (e.g. only for participants)
 */
export function useOrderMessages(orderId: string, enabled = true) {
  return useQuery<OrderMessage[], Error>({
    queryKey: queryKeys.orders.messages(orderId),
    queryFn: () => fetchOrderMessages(orderId),
    enabled: !!orderId && enabled,
    // Short freshness + light polling so new replies appear without a manual refresh.
    staleTime: 1000 * 15,
    refetchInterval: 1000 * 30,
  });
}

export interface SendOrderMessageInput {
  body: string;
  file?: File | null;
}

/**
 * Post a message to an order's thread (text and/or a single file attachment).
 */
export function useSendOrderMessage(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation<OrderMessage, Error, SendOrderMessageInput>({
    mutationFn: async ({ body, file }) => {
      let response: Response;
      if (file) {
        const formData = new FormData();
        formData.append("body", body);
        formData.append("file", file);
        response = await fetch(`/api/orders/${orderId}/messages`, {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch(`/api/orders/${orderId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        });
      }

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Failed to send message");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.messages(orderId),
      });
    },
  });
}
