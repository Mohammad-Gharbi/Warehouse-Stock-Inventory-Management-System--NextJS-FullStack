import { Suspense } from "react";
import InvoiceDetailPage from "@/components/Pages/InvoiceDetailPage";

/**
 * Admin Invoice detail — combined list back link to /admin/invoices.
 * Wrapped in Suspense because InvoiceDetailPage uses useSearchParams.
 */
export default function AdminInvoiceDetailPage() {
  return (
    <Suspense fallback={null}>
      <InvoiceDetailPage backHref="/admin/invoices" embedInAdmin />
    </Suspense>
  );
}
