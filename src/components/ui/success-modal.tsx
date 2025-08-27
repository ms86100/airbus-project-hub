import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Check, Home, Eye } from 'lucide-react';

interface SuccessModalProps {
  show: boolean;
  title: string;
  body: string;
  onProjectOverview: () => void;
  onHomepage: () => void;
  onClose: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  show,
  title,
  body,
  onProjectOverview,
  onHomepage,
  onClose
}) => {
  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="max-w-[560px] min-w-[420px] z-[3000] fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-lg">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center">
              <Check className="h-8 w-8 text-brand-on-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-bold text-text-primary">
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-lg">
          <p className="text-center text-text-muted">{body}</p>
          
          <div className="flex flex-col gap-sm">
            <Button 
              onClick={onProjectOverview}
              className="w-full min-w-[160px] h-10 font-semibold"
            >
              <Eye className="h-4 w-4 mr-2" />
              Go to Project Overview
            </Button>
            <Button 
              variant="outline"
              onClick={onHomepage}
              className="w-full min-w-[160px] h-10 font-semibold"
            >
              <Home className="h-4 w-4 mr-2" />
              Back to Homepage
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};