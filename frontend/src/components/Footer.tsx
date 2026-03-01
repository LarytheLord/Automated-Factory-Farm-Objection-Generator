"use client";

import { Shield } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-slate-200 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="font-bold">Open Permit</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              Civic intelligence for everyone.
            </p>
          </div>
          <div>
            <h4 className="text-[11px] uppercase tracking-wider text-gray-600 mb-3 font-medium">
              Platform
            </h4>
            <div className="space-y-2 text-sm">
              <Link href="/how-it-works" className="block text-gray-500 hover:text-slate-900 transition-colors">How It Works</Link>
              <a href="/#permits" className="block text-gray-500 hover:text-slate-900 transition-colors">Permits</a>
              <Link href="/impact" className="block text-gray-500 hover:text-slate-900 transition-colors">Impact</Link>
              <Link href="/submit-permit" className="block text-gray-500 hover:text-slate-900 transition-colors">Submit Permit</Link>
            </div>
          </div>
          <div>
            <h4 className="text-[11px] uppercase tracking-wider text-gray-600 mb-3 font-medium">
              Company
            </h4>
            <div className="space-y-2 text-sm">
              <Link href="/about" className="block text-gray-500 hover:text-slate-900 transition-colors">About</Link>
              <Link href="/contact" className="block text-gray-500 hover:text-slate-900 transition-colors">Contact</Link>
              <Link href="/survey" className="block text-gray-500 hover:text-slate-900 transition-colors">Feedback</Link>
            </div>
          </div>
          <div>
            <h4 className="text-[11px] uppercase tracking-wider text-gray-600 mb-3 font-medium">
              Resources
            </h4>
            <div className="space-y-2 text-sm text-gray-500">
              <span className="block">37+ Laws Integrated</span>
              <span className="block">8 Countries</span>
              <span className="block">6 Jurisdictions</span>
            </div>
          </div>
          <div>
            <h4 className="text-[11px] uppercase tracking-wider text-gray-600 mb-3 font-medium">
              Connect
            </h4>
            <div className="space-y-2 text-sm">
              <Link href="/contact" className="block text-gray-500 hover:text-slate-900 transition-colors">Email</Link>
              <Link href="/dashboard" className="block text-gray-500 hover:text-slate-900 transition-colors">Analytics</Link>
            </div>
          </div>
        </div>
        <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xs text-gray-700">
            Built with love at{" "}
            <a href="https://www.codeforcompassion.com/" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-500 transition-colors">
              Code 4 Compassion
            </a>{" "}
            | Supported by{" "}
            <a href="https://www.openpaws.ai/" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-500 transition-colors">
              Open Paws
            </a>{" "}
            &amp; AARC
          </span>
          <span className="text-xs text-gray-700">&copy; 2026 Open Permit. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
