import React from 'react';
import DominoTile from '../components/DominoTile';

export default function RulesPage() {
  return (
    <div className="min-h-[calc(100vh-56px)] max-w-2xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex justify-center gap-2 mb-4 opacity-20">
          <DominoTile top={6} bottom={6} size="sm" />
          <DominoTile top={4} bottom={5} size="sm" />
        </div>
        <p className="font-mono text-xs tracking-[0.3em] uppercase text-timber/40 mb-2">
          Official Tournament Rules
        </p>
        <h1 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-wider text-timber mb-3">
          House Rules
        </h1>
        <div className="h-0.5 bg-terra w-16 mx-auto" />
      </div>

      {/* Rules */}
      <div className="space-y-8">
        {/* Section 1: Format */}
        <section className="border-2 border-timber rounded-lg overflow-hidden">
          <div className="bg-timber text-bone px-4 py-2">
            <h2 className="font-display text-sm tracking-widest uppercase">
              I. Tournament Format
            </h2>
          </div>
          <div className="p-4 space-y-3">
            <Rule number="1" text="This is a 2v2 dominoes tournament. Each team consists of two players." />
            <Rule number="2" text="The tournament begins with a Group Stage (Round-Robin). Every team plays every other team in their pool." />
            <Rule number="3" text="The top 2 teams from each pool advance to the Knockout Stage (Single Elimination)." />
            <Rule number="4" text="The Knockout Stage is single elimination. Lose and you're out." />
            <Rule number="5" text="The final match determines the Birthday Tournament Champion." />
          </div>
        </section>

        {/* Section 2: Group Stage */}
        <section className="border-2 border-timber rounded-lg overflow-hidden">
          <div className="bg-felt text-bone px-4 py-2">
            <h2 className="font-display text-sm tracking-widest uppercase">
              II. Group Stage
            </h2>
          </div>
          <div className="p-4 space-y-3">
            <Rule number="1" text="Each group match is played to completion per standard dominoes rules." />
            <Rule number="2" text="The winner of each match earns 1 win. The loser earns 1 loss." />
            <Rule number="3" text="No point differential or score is tracked — only wins and losses." />
            <Rule number="4" text="Standings are determined by: most wins first, then head-to-head result between tied teams." />
            <Rule number="5" text="If a tie cannot be resolved automatically, the organizer will decide the tiebreaker." />
          </div>
        </section>

        {/* Section 3: Knockout */}
        <section className="border-2 border-timber rounded-lg overflow-hidden">
          <div className="bg-terra text-bone px-4 py-2">
            <h2 className="font-display text-sm tracking-widest uppercase">
              III. Knockout Stage
            </h2>
          </div>
          <div className="p-4 space-y-3">
            <Rule number="1" text="Bracket seedings are determined by pool standings (1st place vs 2nd place cross-pool)." />
            <Rule number="2" text="Each knockout match is a single game. The winner advances." />
            <Rule number="3" text="There is no 3rd place match." />
            <Rule number="4" text="The final match determines the champion." />
          </div>
        </section>

        {/* Section 4: General */}
        <section className="border-2 border-timber rounded-lg overflow-hidden">
          <div className="bg-brass text-timber px-4 py-2">
            <h2 className="font-display text-sm tracking-widest uppercase">
              IV. General
            </h2>
          </div>
          <div className="p-4 space-y-3">
            <Rule number="1" text="Both team members must be present at the table when their match is called." />
            <Rule number="2" text="If a team does not show up within a reasonable time, the organizer may declare a forfeit." />
            <Rule number="3" text="The organizer's decisions are final." />
            <Rule number="4" text="Have fun. It's a birthday party." />
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="text-center mt-10">
        <p className="font-display text-sm text-terra tracking-widest uppercase">
          ◆ Respect the table ◆
        </p>
      </div>
    </div>
  );
}

function Rule({ number, text }) {
  return (
    <div className="flex gap-3">
      <span className="font-mono text-xs text-timber/30 mt-0.5 shrink-0 w-4 text-right">
        {number}.
      </span>
      <p className="font-sans text-sm text-timber/70 leading-relaxed">
        {text}
      </p>
    </div>
  );
}
