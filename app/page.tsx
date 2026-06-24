import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import HomePage from "@/components/Pages/HomePage";
import {
  getProductsForUser,
  getCategoriesForUser,
  getSuppliersForUser,
} from "@/lib/server/home-data";

/**
 * Home route — server component.
 * Reads the session cookie (dynamic). The client HomePage uses useSearchParams,
 * so it is wrapped in a Suspense boundary. SSR fetch here; client HomePage
 * handles OAuth + RQ hydrate.
 */
export default async function HomeRoute({
  searchParams,
}: {
  searchParams: Promise<{ oauth_success?: string }>;
}) {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }
  if (user.role === "client") {
    redirect("/client");
  }
  if (user.role === "supplier") {
    redirect("/supplier");
  }

  const params = await searchParams;
  const initialOAuthSuccess = params.oauth_success === "true";

  const [products, categories, suppliers] = await Promise.all([
    getProductsForUser(user.id),
    getCategoriesForUser(user.id),
    getSuppliersForUser(user.id),
  ]);

  return (
    <Suspense fallback={null}>
      <HomePage
        initialProducts={products}
        initialCategories={categories}
        initialSuppliers={suppliers}
        initialOAuthSuccess={initialOAuthSuccess}
      />
    </Suspense>
  );
}
