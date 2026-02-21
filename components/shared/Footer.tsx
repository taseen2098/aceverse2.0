import Link from 'next/link';
import { Facebook, Twitter, Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-aceverse-navy text-white pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-aceverse-blue">AceVerse</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              The premier platform for IBA entrance exam preparation. We provide realistic mocks, 
              advanced analytics, and comprehensive feedback to help you succeed.
            </p>
            <div className="flex space-x-4 pt-2">
              <Link href="#" className="hover:text-aceverse-blue transition-colors">
                <Facebook className="h-5 w-5" />
              </Link>
              <Link href="#" className="hover:text-aceverse-blue transition-colors">
                <Twitter className="h-5 w-5" />
              </Link>
              <Link href="#" className="hover:text-aceverse-blue transition-colors">
                <Instagram className="h-5 w-5" />
              </Link>
              <Link href="#" className="hover:text-aceverse-blue transition-colors">
                <Linkedin className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <Link href="/" className="hover:text-aceverse-blue transition-colors">Home</Link>
              </li>
              <li>
                <Link href="/exams" className="hover:text-aceverse-blue transition-colors">Exams</Link>
              </li>
              <li>
                <Link href="/results" className="hover:text-aceverse-blue transition-colors">Results</Link>
              </li>
              <li>
                <Link href="/teacher-dashboard" className="hover:text-aceverse-blue transition-colors">Teacher Portal</Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Support</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <Link href="#" className="hover:text-aceverse-blue transition-colors">Help Center</Link>
              </li>
              <li>
                <Link href="#" className="hover:text-aceverse-blue transition-colors">Terms of Service</Link>
              </li>
              <li>
                <Link href="#" className="hover:text-aceverse-blue transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link href="#" className="hover:text-aceverse-blue transition-colors">Contact Us</Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Contact Us</h4>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-aceverse-blue shrink-0" />
                <span>123 Education Street, Knowledge City, Karachi, Pakistan</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-aceverse-blue shrink-0" />
                <span>+92 300 1234567</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-aceverse-blue shrink-0" />
                <span>support@aceverse.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 mt-8 text-center text-sm text-gray-400">
          <p>&copy; {"ola"} AceVerse. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
