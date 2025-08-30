import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { InteractiveRetrospectiveCard } from './InteractiveRetrospectiveCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface InteractiveDroppableColumnProps {
  column: {
    id: string;
    title: string;
    subtitle?: string;
  };
  cards: any[];
  getCardColor: (index: number) => string;
  getUserDisplayName: (userId: string) => string;
  onVote: (cardId: string) => void;
  onDelete: (cardId: string) => void;
  onCreateAction: (card: any) => void;
  onEditCard?: (cardId: string, text: string) => void;
  onAddCard: (columnId: string) => void;
  userId?: string;
}

export function InteractiveDroppableColumn({
  column,
  cards,
  getCardColor,
  getUserDisplayName,
  onVote,
  onDelete,
  onCreateAction,
  onEditCard,
  onAddCard,
  userId
}: InteractiveDroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full min-h-[400px] rounded-lg border transition-all duration-200 ${
        isOver 
          ? 'bg-primary/5 border-primary border-2 border-dashed shadow-md' 
          : 'bg-gradient-to-br from-background to-muted/20 border-border'
      }`}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">{column.title}</h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAddCard(column.id)}
            className="h-6 w-6 p-0 hover:bg-primary/10"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {column.subtitle && (
          <p className="text-xs text-muted-foreground">{column.subtitle}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{cards.length} cards</span>
          {cards.length > 0 && (
            <span className="text-xs text-muted-foreground">
              • {cards.reduce((sum, card) => sum + (card.votes || 0), 0)} votes
            </span>
          )}
        </div>
      </div>

      {/* Cards Container */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">No cards yet</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddCard(column.id)}
                className="text-xs"
              >
                Add first card
              </Button>
            </div>
          ) : (
            cards.map((card, index) => (
              <InteractiveRetrospectiveCard
                key={card.id}
                card={card}
                cardColor={getCardColor(index)}
                userDisplayName={getUserDisplayName(card.created_by)}
                onVote={() => onVote(card.id)}
                onDelete={() => onDelete(card.id)}
                onCreateAction={() => onCreateAction(card)}
                onEdit={onEditCard}
                isOwner={card.created_by === userId}
                voters={card.voters || []}
              />
            ))
          )}
        </SortableContext>
      </div>

      {/* Drop Zone Indicator */}
      {isOver && (
        <div className="p-4 border-t border-primary border-dashed bg-primary/5">
          <div className="text-center text-sm text-primary font-medium">
            Drop card here
          </div>
        </div>
      )}
    </div>
  );
}