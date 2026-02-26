import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Gavel, AlertTriangle, UserCheck, Ban, CreditCard } from "lucide-react";

export default function TermsOfUsePage() {
  const terms = [
    {
      title: "1. Acceptance of Terms",
      icon: <Gavel className="h-6 w-6 text-aceverse-blue" />,
      content: "By accessing AceVerse, you agree to be bound by these Terms of Use. If you do not agree, you are prohibited from using the service.",
    },
    {
      title: "2. Academic Integrity",
      icon: <UserCheck className="h-6 w-6 text-aceverse-blue" />,
      content: "Users agree to complete exams honestly. Any use of bots, scripts, or external aids to manipulate exam results will lead to an immediate permanent ban without refund.",
    },
    {
      title: "3. Payments & Refunds",
      icon: <CreditCard className="h-6 w-6 text-aceverse-blue" />,
      content: "Subscription fees are non-refundable except where required by law. AceVerse reserves the right to modify pricing with 30 days' notice.",
    },
    {
      title: "4. Limitation of Liability",
      icon: <AlertTriangle className="h-6 w-6 text-aceverse-blue" />,
      content: "AceVerse is provided 'as is'. We are not liable for technical failures, loss of data, or any direct/indirect damages resulting from your use of the platform.",
    },
    {
      title: "5. Account Termination",
      icon: <Ban className="h-6 w-6 text-aceverse-blue" />,
      content: "We reserve the right to terminate or suspend access to our service immediately, without prior notice, for conduct that we believe violates these terms.",
    },
  ];

  return (
    <div className="min-h-screen bg-aceverse-ice py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card className="border-aceverse-blue/20 shadow-xl">
          <CardHeader className="text-center border-b border-aceverse-blue/10 pb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-aceverse-blue/10 rounded-full">
                <Gavel className="h-8 w-8 text-aceverse-blue" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold text-aceverse-navy">Terms of Use</CardTitle>
            <CardDescription className="text-base mt-2">Effective Date: February 24, 2026</CardDescription>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none py-8 text-aceverse-navy/80">
            {terms.map((term, idx) => (
              <section key={idx} className="mb-8 border-l-4 border-aceverse-blue/20 pl-6">
                <h2 className="flex items-center gap-2 text-2xl font-bold text-aceverse-navy mb-2">
                  {term.icon} {term.title}
                </h2>
                <p className="text-lg">{term.content}</p>
              </section>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}