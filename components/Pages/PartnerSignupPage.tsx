"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts";
import axiosInstance from "@/utils/axiosInstance";

/**
 * Partner Signup Page
 * Public form to apply for a partner account. Company fields (French) are always
 * shown; account fields are shown only for logged-out visitors (a new account is
 * created on submit). The request is reviewed manually by an admin.
 */
export default function PartnerSignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isLoggedIn, isCheckingAuth } = useAuth();

  const [companyName, setCompanyName] = useState("");
  const [rc, setRc] = useState("");
  const [nif, setNif] = useState("");
  const [nis, setNis] = useState("");
  const [contact, setContact] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload: Record<string, string> = {
        companyName,
        rc,
        nif,
        nis,
        contact,
      };
      if (!isLoggedIn) {
        payload.name = name;
        payload.email = email;
        payload.password = password;
      }

      const response = await axiosInstance.post("/partner-requests", payload);

      if (response.status === 201) {
        toast({
          title: "Demande envoyée ✅",
          description:
            "Votre demande de partenariat a été reçue. Un administrateur l'examinera prochainement.",
        });
        if (!isLoggedIn) {
          setTimeout(() => router.push("/login"), 1500);
        } else {
          setTimeout(() => router.push("/"), 1500);
        }
      } else {
        throw new Error("Submission failed");
      }
    } catch (error: unknown) {
      const axiosErr = error as {
        response?: { data?: { error?: string } };
      };
      toast({
        title: "Échec de l'envoi",
        description:
          axiosErr?.response?.data?.error ||
          "Une erreur inattendue est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Devenir partenaire
          </h1>
          <p className="text-sm text-muted-foreground">
            Remplissez les informations de votre entreprise. Votre demande sera
            examinée par un administrateur.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoggedIn && !isCheckingAuth && (
            <div className="space-y-4 rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">Votre compte</p>
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Nom
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Mot de passe
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Au moins 6 caractères"
                  minLength={6}
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="companyName" className="text-sm font-medium">
              Nom de l&apos;entreprise
            </label>
            <Input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="rc" className="text-sm font-medium">
                RC
              </label>
              <Input
                id="rc"
                type="text"
                value={rc}
                onChange={(e) => setRc(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="nif" className="text-sm font-medium">
                NIF
              </label>
              <Input
                id="nif"
                type="text"
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="nis" className="text-sm font-medium">
                NIS
              </label>
              <Input
                id="nis"
                type="text"
                value={nis}
                onChange={(e) => setNis(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="contact" className="text-sm font-medium">
              Contact dans l&apos;entreprise
            </label>
            <Textarea
              id="contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Nom du contact, e-mail et/ou téléphone"
              required
              className="min-h-[80px] resize-none"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Envoi en cours…" : "Envoyer la demande"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
