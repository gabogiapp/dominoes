import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, CheckCircle2, Users, Clock, AlertCircle } from 'lucide-react';
import { useTournament } from '../context/TournamentContext';

// Helper to resolve Google Form embed URLs properly
function getEmbedUrl(url) {
  if (!url) return '';
  if (url.includes('forms.gle/2iurkc1sxYMzaka66')) {
    return 'https://docs.google.com/forms/d/e/1FAIpQLSehI_t1SzQTVH9nIW4rKaWsFa0r0VeXX47tJp4KJoYBDjttbA/viewform?embedded=true';
  }
  if (url.includes('docs.google.com/forms')) {
    if (url.includes('embedded=true')) return url;
    return url.includes('?') ? `${url}&embedded=true` : `${url}?embedded=true`;
  }
  return url;
}

export default function SignUpPage() {
  const { state, syncWithGoogleSheet } = useTournament();
  const formUrl = state.config?.googleFormUrl || 'https://forms.gle/2iurkc1sxYMzaka66';
  const embedUrl = getEmbedUrl(formUrl);

  const [loading, setLoading] = useState(true);
  const [sheetData, setSheetData] = useState({
    teams: [],
    rawCount: 0,
    paidCount: 0,
    missingPaidColumn: false,
    error: null,
  });
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadRoster = useCallback(async () => {
    setLoading(true);
    const res = await syncWithGoogleSheet(true);
    setSheetData({
      teams: res.teams || [],
      rawCount: res.rawCount || 0,
      paidCount: res.count || (res.teams ? res.teams.length : 0),
      missingPaidColumn: res.missingPaidColumn || false,
      error: res.error || null,
    });
    setLastUpdated(new Date());
    setLoading(false);
  }, [syncWithGoogleSheet]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const confirmedTeams = !loading && sheetData.teams !== undefined
    ? sheetData.teams
    : ((state.teams && !state.isDemo) ? state.teams.filter(t => !t.withdrawn) : []);

  return (
    <div className="min-h-[calc(100vh-56px)] max-w-3xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-timber/40 mb-2">
          Team Registration
        </p>
        <h1 className="font-display text-3xl md:text-5xl font-bold uppercase tracking-wider text-timber mb-3">
          Sign Up
        </h1>
        <div className="h-0.5 bg-terra w-16 mx-auto mb-4" />
        <p className="font-sans text-sm text-timber/60 max-w-md mx-auto mb-6">
          Register your 2-player team for the tournament. Once your entry fee is verified, your team will appear on the confirmed roster below.
        </p>

        {/* Highlighted Tournament Details Card */}
        <div className="bg-bone border-2 border-timber/15 rounded-xl p-5 mb-6 text-left shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
            <div className="border-b sm:border-b-0 sm:border-r border-timber/10 pb-3 sm:pb-0 sm:pr-4">
              <span className="font-mono text-[10px] tracking-wider uppercase text-timber/40 block mb-1">
                Format
              </span>
              <p className="font-display text-base font-bold uppercase text-timber">
                2v2 Partner Dominoes
              </p>
            </div>
            <div className="border-b sm:border-b-0 sm:border-r border-timber/10 pb-3 sm:pb-0 sm:pr-4">
              <span className="font-mono text-[10px] tracking-wider uppercase text-timber/40 block mb-1">
                Entry Fee
              </span>
              <p className="font-display text-base font-bold uppercase text-felt">
                $10 / Player ($20 Team)
              </p>
              <span className="font-mono text-[10px] text-timber/50">100% to Cash Prize Pool</span>
            </div>
            <div>
              <span className="font-mono text-[10px] tracking-wider uppercase text-timber/40 block mb-1">
                Payment (Zelle)
              </span>
              <p className="font-display text-sm font-bold text-timber">
                Gabriele Lisci
              </p>
              <p className="font-mono text-xs text-terra font-bold">
                908-873-7696
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <a
          href={formUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 border-2 border-timber bg-terra text-bone text-sm md:text-base font-bold uppercase tracking-wider rounded-xl shadow-md hover:bg-terra-light hover:shadow-lg active:scale-98 transition-all"
        >
          <span>Open Registration Form (Google Forms)</span>
          <ExternalLink size={18} />
        </a>
        <p className="font-mono text-[11px] text-timber/40 mt-2">
          Takes 1 minute · Opens directly in Google Forms
        </p>
      </div>

      {/* Google Form embed */}
      <div className="border-2 border-timber rounded-lg overflow-hidden mb-6 shadow-md bg-white">
        <div className="bg-timber text-bone px-4 py-2.5 flex items-center justify-between">
          <span className="font-mono text-xs tracking-widest uppercase font-bold">Embedded Form</span>
          <a
            href={formUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] text-bone/80 hover:text-bone uppercase flex items-center gap-1 underline underline-offset-2"
          >
            <span>Open in new tab</span>
            <ExternalLink size={10} />
          </a>
        </div>
        <div className="bg-bone-dark/30 px-4 py-2 border-b border-timber/10 text-center">
          <p className="font-mono text-[11px] text-timber/60">
            Having trouble viewing the form below?{' '}
            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-terra font-bold underline hover:text-terra-light"
            >
              Tap here to open the form directly
            </a>
          </p>
        </div>
        <div className="bg-white p-1">
          <iframe
            src={embedUrl}
            width="100%"
            height="650"
            frameBorder="0"
            marginHeight="0"
            marginWidth="0"
            title="Tournament Registration"
            className="w-full"
          >
            Loading registration form…
          </iframe>
        </div>
      </div>

      {/* Notice */}
      <div className="border border-brass/30 rounded-lg p-4 bg-brass/5 text-center mb-8">
        <p className="font-mono text-xs text-timber/70 leading-relaxed">
          Submit your team above and Zelle your $10/person fee to Gabriele Lisci (908-873-7696). Once verified, your team will appear on the live confirmed roster below!
        </p>
      </div>

      {/* Confirmed Roster Section */}
      <div className="mt-8 pt-6 border-t border-timber/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-terra font-bold">
                Live Roster
              </span>
              <span className="font-mono text-[10px] bg-felt/10 text-felt px-2 py-0.5 rounded-full font-bold">
                {confirmedTeams.length} Confirmed {confirmedTeams.length === 1 ? 'Team' : 'Teams'}
              </span>
            </div>
            <h2 className="font-display text-xl md:text-2xl font-bold uppercase tracking-wider text-timber">
              Confirmed Teams
            </h2>
          </div>

          {lastUpdated && (
            <span className="font-mono text-[10px] text-timber/40">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="border-2 border-timber/10 bg-bone rounded-lg p-3 animate-pulse">
                <div className="h-3 w-8 bg-timber/10 rounded mb-2" />
                <div className="h-5 w-3/4 bg-timber/15 rounded mb-2" />
                <div className="h-3 w-1/2 bg-timber/10 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && sheetData.error && (
          <div className="p-4 border-2 border-terra/30 bg-terra/5 rounded-lg text-center">
            <AlertCircle size={20} className="text-terra mx-auto mb-2" />
            <p className="font-mono text-xs text-terra font-bold mb-1">
              Unable to load live roster from Google Sheets
            </p>
            <p className="font-sans text-xs text-timber/60 mb-3">
              {sheetData.error}
            </p>
            <button
              onClick={loadRoster}
              className="px-3 py-1.5 bg-terra text-bone font-mono text-xs uppercase tracking-wider rounded font-bold hover:bg-terra-light"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !sheetData.error && confirmedTeams.length === 0 && (
          <div className="p-6 border-2 border-dashed border-timber/20 rounded-xl bg-bone text-center">
            <div className="w-10 h-10 bg-felt/10 rounded-full flex items-center justify-center mx-auto mb-2 text-felt">
              <Users size={20} />
            </div>
            <h3 className="font-display text-sm uppercase tracking-wider text-timber font-bold mb-1">
              No Confirmed Teams Yet
            </h3>
            <p className="font-sans text-xs text-timber/60 max-w-md mx-auto">
              {sheetData.rawCount > 0
                ? `${sheetData.rawCount} team registration(s) received! Once the organizer verifies your payment, your team will appear here.`
                : 'Be the very first 2-player team to register using the form above!'}
            </p>
            {sheetData.missingPaidColumn && (
              <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-mono text-brass bg-brass/10 px-3 py-1 rounded">
                <Clock size={12} />
                <span>Organizer notice: Add a 'Paid' column (TRUE/YES) to your Google Sheet to confirm teams.</span>
              </div>
            )}
          </div>
        )}

        {/* Confirmed teams list */}
        {!loading && !sheetData.error && confirmedTeams.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {confirmedTeams.map((team, idx) => (
              <div
                key={team.id}
                className="border-2 border-timber/15 bg-bone rounded-lg p-3 hover:border-timber/30 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[9px] text-timber/40 font-bold">#{idx + 1}</span>
                    <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-felt/10 text-felt font-bold flex items-center gap-1">
                      <CheckCircle2 size={10} /> Confirmed
                    </span>
                  </div>
                  <p className="font-display text-sm uppercase font-bold tracking-wide text-timber truncate">
                    {team.name}
                  </p>
                </div>
                <p className="font-mono text-[10px] text-timber/60 mt-2 truncate">
                  {team.player1} & {team.player2}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
