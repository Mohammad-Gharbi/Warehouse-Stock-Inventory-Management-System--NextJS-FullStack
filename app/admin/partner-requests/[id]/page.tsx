import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/prisma/client";
import { getPartnerRequestById } from "@/prisma/partner-request";
import { PageContentWrapper } from "@/components/shared";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PartnerRequestReviewActions from "@/components/admin/PartnerRequestReviewActions";

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "approved":
      return "secondary";
    case "rejected":
      return "destructive";
    default:
      return "outline";
  }
}

/**
 * Admin partner request detail — view all company info and approve / reject.
 * Layout (Navbar + AdminSidebar) from app/admin/layout.tsx.
 */
export default async function AdminPartnerRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/admin");

  const { id } = await params;
  const request = await getPartnerRequestById(id);

  if (!request) {
    return (
      <PageContentWrapper>
        <div className="space-y-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/partner-requests" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Partner Requests
            </Link>
          </Button>
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Partner request not found</p>
            </CardContent>
          </Card>
        </div>
      </PageContentWrapper>
    );
  }

  const applicant = await prisma.user.findUnique({
    where: { id: request.userId },
    select: { name: true, email: true },
  });

  const fields: { label: string; value: string }[] = [
    { label: "Nom de l'entreprise", value: request.companyName },
    { label: "RC (Registre de Commerce)", value: request.rc },
    { label: "NIF (N° d'Identification Fiscale)", value: request.nif },
    { label: "NIS (N° d'Identification Statistique)", value: request.nis },
    { label: "Contact dans l'entreprise", value: request.contact },
  ];

  return (
    <PageContentWrapper>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/partner-requests" className="h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Partner Request
            </h1>
            <p className="text-sm text-muted-foreground">
              {request.companyName}
            </p>
          </div>
          <Badge variant={statusVariant(request.status)} className="ml-auto">
            {request.status}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.label}>
                  <dt className="text-sm text-muted-foreground">{f.label}</dt>
                  <dd className="font-medium break-words">{f.value}</dd>
                </div>
              ))}
              <div>
                <dt className="text-sm text-muted-foreground">Applicant</dt>
                <dd className="font-medium">
                  {applicant?.name?.trim() || "—"}
                  {applicant?.email && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {applicant.email}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Submitted</dt>
                <dd className="font-medium">
                  {format(
                    new Date(request.createdAt),
                    "MMMM d, yyyy 'at' h:mm a",
                  )}
                </dd>
              </div>
              {request.reviewNotes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">Review note</dt>
                  <dd className="font-medium whitespace-pre-wrap">
                    {request.reviewNotes}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {request.status === "pending" ? (
          <Card>
            <CardHeader>
              <CardTitle>Review</CardTitle>
            </CardHeader>
            <CardContent>
              <PartnerRequestReviewActions id={request.id} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              This request was already{" "}
              <span className="font-medium">{request.status}</span>
              {request.reviewedAt
                ? ` on ${format(new Date(request.reviewedAt), "MMM d, yyyy")}`
                : ""}
              .
            </CardContent>
          </Card>
        )}
      </div>
    </PageContentWrapper>
  );
}
