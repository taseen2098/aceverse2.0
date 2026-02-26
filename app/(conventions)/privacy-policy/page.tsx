import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Shield, Lock, Eye, FileText, Share2, Info } from "lucide-react";

export default function PrivacyPolicyPage() {
  const lastUpdated = "February 24, 2026";

  const sections = [
    {
      title: "1. Introduction",
      icon: <Eye className="h-6 w-6 text-aceverse-blue" />,
      content: "Welcome to AceVerse. We value your privacy and are committed to protecting your personal data. This policy explains how we collect, use, and safeguard your information within our exam governance platform.",
    },
    {
      title: "2. Information We Collect",
      icon: <FileText className="h-6 w-6 text-aceverse-blue" />,
      content: (
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Account Information:</strong> Name, email, and password during registration.</li>
          <li><strong>Academic Data:</strong> Exam responses, scores, and performance analytics.</li>
          <li><strong>Usage Data:</strong> IP addresses and interaction logs for security.</li>
        </ul>
      ),
    },
    {
      title: "3. Data Usage",
      icon: <Shield className="h-6 w-6 text-aceverse-blue" />,
      content: "We use your data to provide personalized exam simulations and performance reports. We do not sell your personal information to third parties.",
    },
    {
      title: "4. Third-Party Services",
      icon: <Share2 className="h-6 w-6 text-aceverse-blue" />,
      content: "We utilize Supabase for secure database management and Vercel for hosting. These providers have their own strict privacy standards to ensure your data is handled safely.",
    },
    {
      title: "5. Your Rights",
      icon: <Info className="h-6 w-6 text-aceverse-blue" />,
      content: "You have the right to access, correct, or delete your personal data. To exercise these rights, please contact our support team at support@aceverse.com.",
    },
  ];

  return (
    <div className="min-h-screen bg-aceverse-ice py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card className="border-aceverse-blue/20 shadow-xl">
          <CardHeader className="text-center border-b border-aceverse-blue/10 pb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-aceverse-blue/10 rounded-full">
                <Shield className="h-8 w-8 text-aceverse-blue" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold text-aceverse-navy">Privacy Policy</CardTitle>
            <CardDescription className="text-base mt-2">Last Updated: {lastUpdated}</CardDescription>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none py-8 text-aceverse-navy/80">
            {sections.map((section, idx) => (
              <section key={idx} className="mb-8">
                <h2 className="flex items-center gap-2 text-2xl font-bold text-aceverse-navy mb-4">
                  {section.icon} {section.title}
                </h2>
                <div className="text-lg leading-relaxed">{section.content}</div>
              </section>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}