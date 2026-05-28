import { FileText, Mail } from 'lucide-react';
import { publicConfig } from '../config';

interface LegalPageProps {
  type: 'terms' | 'privacy';
}

export default function LegalPage({ type }: LegalPageProps) {
  const isTerms = type === 'terms';

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full px-3 py-1.5 mb-4">
          <FileText size={15} className="text-cyan-400" />
          <span className="text-sm text-slate-300">Legal placeholder</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">{isTerms ? 'Terms of Use' : 'Privacy Policy'}</h1>
        <p className="text-slate-400">
          This placeholder keeps the production app navigable while final legal copy is prepared.
        </p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-5">
        {isTerms ? (
          <>
            <section>
              <h2 className="text-lg font-semibold text-white mb-2">Use of PuzzleFlow AI</h2>
              <p className="text-slate-300 leading-relaxed">
                PuzzleFlow AI provides AI-assisted escape-room design content for planning, prototyping, and creative development. Users remain responsible for reviewing generated material for safety, accessibility, originality, and suitability before operating a live experience.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-white mb-2">Accounts and Purchases</h2>
              <p className="text-slate-300 leading-relaxed">
                Account access, Pro entitlement, and purchase status are managed through PocketBase and Stripe. This placeholder should be replaced with final refund, access, licensing, and acceptable-use terms before public launch.
              </p>
            </section>
          </>
        ) : (
          <>
            <section>
              <h2 className="text-lg font-semibold text-white mb-2">Information Collected</h2>
              <p className="text-slate-300 leading-relaxed">
                PuzzleFlow AI uses PocketBase for account authentication and saved-room records, Stripe for payment processing, and server-side AI functions for room generation. This placeholder should be replaced with final privacy language that accurately reflects production data collection and retention.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-white mb-2">Support and Data Requests</h2>
              <p className="text-slate-300 leading-relaxed">
                Users should be able to contact the site owner for account, billing, privacy, or data questions. Final launch copy should include the business entity, jurisdiction, retention period, and third-party processor disclosures.
              </p>
            </section>
          </>
        )}

        <div className="flex items-start gap-3 bg-slate-900/70 border border-slate-700 rounded-xl p-4">
          <Mail size={18} className="text-cyan-400 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-300">
            For questions, contact{' '}
            <a href={`mailto:${publicConfig.supportEmail}`} className="text-cyan-400 hover:text-cyan-300">
              {publicConfig.supportEmail}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
