import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function RulesScreen() {
  const rules = [
    {
      title: "Tournament Points",
      text: "There are 18 total points available. A team needs 9.5+ points to win outright."
    },
    {
      title: "Retain Rule",
      text: "If the tournament ends 9–9, the defending champion retains the cup."
    },
    {
      title: "Round 1: 2v2 Best Ball",
      text: "Three matches. Each match is worth 2 points. Ties are worth 1 point per team."
    },
    {
      title: "Round 2: 1v1 Match Play",
      text: "Six singles matches. Each match is worth 1 point. Ties are worth 0.5 per team."
    },
    {
      title: "Round 3: Individual Net Score",
      text: "All 12 players submit scores. The lowest 6 net scores earn 1 point each for their team."
    },
    {
      title: "Handicap Calculation",
      text: "Course Handicap = Handicap Index × (Slope / 113) + (Course Rating − Par). The app rounds this result and uses it to calculate net scores."
    }
  ];

  return (
    <div className="space-y-4">
      <SectionHeader title="Rules" subtitle="How the McKannay Invitational is scored." />

      {rules.map((rule) => (
        <Card key={rule.title} className="p-4">
          <h2 className="font-black">{rule.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{rule.text}</p>
        </Card>
      ))}
    </div>
  );
}
