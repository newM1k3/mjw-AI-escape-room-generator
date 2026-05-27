import { AlertCircle, Loader2, Zap } from 'lucide-react';
import RoomOutput from '../components/RoomOutput';
import type { RoomContent } from '../types';

const DEMO_ROOM: RoomContent = {
  title: "The Alchemist's Study",
  narrative: {
    intro: "You are apprentices to the legendary Alchemist Voss, who has vanished without a trace. His study — a labyrinth of cryptic manuscripts, bubbling apparatus, and concealed mechanisms — holds the key to his whereabouts. You have 60 minutes before his rival, the Sorceress Marenne, arrives to claim his secrets.",
    climax: "As you piece together the Grand Seal, the bookcase shudders and splits apart. Behind it, Voss's final journal reveals that his 'disappearance' was a deliberate ruse — he faked his death to protect his most dangerous formula. The formula is hidden in a lead-lined chest. The combination is scattered across everything you've solved.",
    outro: "The chest opens. Inside: a leather journal, a vial of shimmering liquid, and a map leading to a secondary laboratory. Voss is alive, and he's left this trail specifically for you. As you gather the contents, the clock strikes the hour — Marenne's carriage can be heard on the cobblestones outside. You slip through the secret passage just in time.",
  },
  puzzles: [
    {
      name: "The Celestial Orrery",
      props: ["Brass mechanical orrery (3 rotating rings)", "Star chart pinned to north wall", "Cipher wheel (prop)", "4-digit combination lockbox"],
      setup: "A brass orrery sits on the central table, its three rings locked in position. The star chart on the north wall has four constellations circled in red ink. Players must align the orrery's rings to match the circled star positions.",
      solution: "Rotating each ring to align with the circled constellations (Orion, Lyra, Cassiopeia, Draco) causes a small drawer at the base to spring open, revealing a cipher wheel and a slip of parchment reading: 'The wheel speaks only to the initiated.'",
      output: "Cipher wheel + parchment clue ('The wheel speaks only to the initiated') — needed for Puzzle 3.",
    },
    {
      name: "The Poisoner's Cabinet",
      props: ["Locked apothecary cabinet (key padlock)", "Set of 8 potion bottles (colored liquids)", "Mixing chart disguised as a recipe scroll", "UV flashlight hidden in coat pocket prop"],
      setup: "A tall wooden cabinet is sealed with a key padlock. On the workbench, eight bottles of colored liquid are arranged beside a framed 'recipe scroll.' Under UV light, hidden annotations on the scroll reveal which three colors must be combined to produce 'Voss Gold.'",
      solution: "Players find the UV flashlight in a coat hanging on the door. Illuminating the recipe scroll reveals: Blue + Yellow + Clear = Gold. The cabinet's padlock key is hidden in the hollow base of the blue bottle.",
      output: "Cabinet key → cabinet opens to reveal Voss's personal journal (Vol. 7) with the number '4' underlined throughout — partial combination digit.",
    },
    {
      name: "The Cipher Correspondence",
      props: ["Stack of 12 encoded letters (prop)", "Cipher wheel from Puzzle 1", "Magnifying glass", "Inkwell with invisible ink activator (lemon solution spray)"],
      setup: "A desk drawer contains a bundle of letters, all written in substitution cipher. The cipher wheel from Puzzle 1 unlocks the alphabet. One letter references an 'invisible postscript' — spraying it with the lemon activator (labeled 'Reagent C') reveals the hidden message.",
      solution: "Using the cipher wheel at the 'V' alignment (for Voss), players decode the key letter. The invisible postscript reads: 'Second digit: nine. Find the rest in what Voss loved most.' The bookshelf contains only books on astronomy — the spine dates are the remaining digits.",
      output: "Digit '9' (second of four) and the instruction to check the bookshelf.",
    },
    {
      name: "The Annotated Library",
      props: ["Bookshelf with 20 props books", "3 books with specific spine dates (bookmarked with red ribbon)", "Sliding panel mechanism (activated by removing correct books)", "Rolled parchment inside panel"],
      setup: "The bookshelf spans the east wall. Three books are marked with red ribbon bookmarks. Their publication years — 1, 7, and the order they must be removed — spell two combination digits and reveal a sliding panel. The order is determined by a riddle inscribed inside the orrery drawer from Puzzle 1.",
      solution: "The orrery drawer riddle reads: 'Past, present, future.' Books are dated 1847, 1851, 1862. Removing in oldest-to-newest order (past to future) triggers the panel. Inside: a rolled parchment with the final digit ('3') and the phrase 'The seal is beneath the Grand Lens.'",
      output: "Digit '3' (fourth of four). Full combination: 4-9-?-3. The third digit ('2') is found on page 47 of the journal from Puzzle 2.",
    },
    {
      name: "The Grand Lens & The Seal",
      props: ["Large magnifying lens mounted on stand (ceiling)", "Floor mosaic with four directional symbols", "Sealed brass chest (4-digit combination: 4-9-2-3)", "Final journal inside chest"],
      setup: "A large brass lens is mounted above the mosaic floor. At noon (players flip a sundial prop to 'noon'), light refracts through the lens onto the floor mosaic, illuminating one symbol. That symbol corresponds to a direction on a compass rose beside the chest — pointing to the chest's location beneath the floorboard rug.",
      solution: "Players flip the sundial, the lens illuminates the 'North' symbol. Under the north corner of the rug is the sealed chest. Entering the four-digit code 4-9-2-3 (assembled across all prior puzzles) opens the chest.",
      output: "Chest opens. Room complete. Escape achieved.",
    },
  ],
  redHerrings: [
    "A locked iron box on the fireplace mantle with a 3-digit combination. It contains only a handwritten note: 'Some things are locked for good reason. — V.' The combination (7-7-7) is visible on a portrait frame but leads nowhere.",
    "A telescope pointed at a specific star chart coordinate. Players may spend time trying to decode a star position, but the telescope is merely décor — the relevant star chart is the flat printed one on the north wall.",
    "An hourglass on the desk with a cryptic inscription: 'When the sand runs out, the truth is revealed.' It simply runs out — there is no mechanism. It is purely psychological pressure to induce urgency and distract from the actual puzzles.",
  ],
};

interface DemoPageProps {
  onUpgrade: () => void;
  isUpgradeLoading?: boolean;
  checkoutError?: string;
}

export default function DemoPage({ onUpgrade, isUpgradeLoading = false, checkoutError = '' }: DemoPageProps) {
  return (
    <div>
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          Demo Room — Free Preview
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Demo Room</h1>
        <p className="text-slate-400">This is an example of the full output you receive when generating a room. Every field is AI-crafted based on your inputs.</p>
      </div>

      <RoomOutput room={DEMO_ROOM} showActions={false} />

      <div className="sticky bottom-0 mt-8 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-white font-semibold">Want to generate your own custom room?</p>
            <p className="text-slate-400 text-sm">Unlimited generations, save to library, PDF export.</p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={onUpgrade}
              disabled={isUpgradeLoading}
              className="flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
            >
              {isUpgradeLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Opening Stripe...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Upgrade to Pro — $97 One-Time
                </>
              )}
            </button>
            {checkoutError && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 max-w-xs">
                <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-300">{checkoutError}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
