import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import OrdersPage from "@/components/Pages/OrdersPage";
import {
  getOrdersForUser,
  getOrdersForClientId,
} from "@/lib/server/orders-data";

/**
 * Orders route — server component.
 * If user is not logged in, redirect to login. Otherwise fetch orders on the server
 * and pass to OrdersPage so the client can hydrate React Query in one round-trip.
 * Client: orders where they are the customer. Admin: orders they created.
 */
export default async function OrdersRoute() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }
  let initialOrders;
  if (user.role === "client") {
    initialOrders = await getOrdersForClientId(user.id);
  } else {
    initialOrders = await getOrdersForUser(user.id);
  }
  return (
    <OrdersPage initialOrders={initialOrders} userRole={user.role ?? undefined} />
  );
}
