import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { JobDetail } from "@/data/dummyJobDetails";

interface QuoteOverviewTabProps {
  job: JobDetail;
  scope: string;
  onScopeChange: (val: string) => void;
}

export function QuoteOverviewTab({ job, scope, onScopeChange }: QuoteOverviewTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Job Description</Label>
            <p className="text-sm font-medium mt-1">{job.jobName}</p>
          </div>
          {job.address && (
            <div>
              <Label className="text-xs text-muted-foreground">Address</Label>
              <p className="text-sm mt-1">{job.address}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <Label htmlFor="scope">Scope of Work</Label>
          <Textarea
            id="scope"
            value={scope}
            onChange={(e) => onScopeChange(e.target.value)}
            placeholder="Describe the scope of work for this quote…"
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

    </div>
  );
}