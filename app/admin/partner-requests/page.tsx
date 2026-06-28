import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/prisma/client";
import { getPartnerRequests } from "@/prisma/partner-request";
import { PageContentWrapper } from "@/components/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
 * Admin partner requests list — review partner account applications.
 * Layout (Navbar + AdminSidebar) from app/admin/layout.tsx.
 */
export default async function AdminPartnerRequestsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/admin");

  const { requests } = await getPartnerRequests({ limit: 100 });

  const userIds = [...new Set(requests.map((r) => r.userId))];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return (
    <PageContentWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Partner Requests
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and approve partner account applications.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <CardDescription>
              {requests.length} request{requests.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No partner requests yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => {
                    const applicant = userMap.get(r.userId);
                    return (
                      <TableRow key={r.id} className="cursor-pointer">
                        <TableCell className="font-medium">
                          <Link
                            href={`/admin/partner-requests/${r.id}`}
                            className="text-sky-600 hover:text-sky-500 dark:text-sky-400"
                          >
                            {r.companyName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span className="block">
                            {applicant?.name?.trim() || "—"}
                          </span>
                          {applicant?.email && (
                            <span className="block text-xs text-muted-foreground">
                              {applicant.email}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(r.status)}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(r.createdAt), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContentWrapper>
  );
}
