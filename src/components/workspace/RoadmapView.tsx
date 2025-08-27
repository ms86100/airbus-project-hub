import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Filter, Calendar } from 'lucide-react';
import { GanttChart } from './GanttChart';

interface RoadmapViewProps {
  projectId: string;
}

export function RoadmapView({ projectId }: RoadmapViewProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between p-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Roadmap</h1>
            <p className="text-muted-foreground mt-1">Timeline view of milestones and tasks</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              View Scale
            </Button>
            <Button 
              className="bg-airbus-primary text-white hover:bg-airbus-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <GanttChart projectId={projectId} />
      </div>
    </div>
  );
}