import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { STATUSES, STATUS_COLOR, STATUS_LABEL } from '../utils';
import TicketCard from './TicketCard';
import { Icon } from './icons';

const fromBoard = (board) => ({
  TODO: board?.todo ?? [],
  IN_PROGRESS: board?.inProgress ?? [],
  DONE: board?.done ?? [],
});

function findContainer(cols, id) {
  if (id in cols) return id;
  return STATUSES.find((s) => cols[s].some((t) => t.id === id));
}

/** Gap-based ordering: a card dropped between two others gets the midpoint of their positions. */
function positionFor(list, index) {
  const prev = list[index - 1]?.position;
  const next = list[index + 1]?.position;
  if (prev != null && next != null) return (prev + next) / 2;
  if (prev != null) return prev + 1000;
  if (next != null) return next / 2;
  return 1000;
}

function SortableTicket({ ticket, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticket.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
      className="cursor-grab touch-manipulation rounded-card active:cursor-grabbing"
      role="button"
      tabIndex={0}
      aria-label={`${ticket.key}: ${ticket.title}. Press Enter to open, Space to pick up and move.`}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(ticket.id)}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === 'Enter') onOpen(ticket.id);
      }}
    >
      <TicketCard ticket={ticket} />
    </div>
  );
}

function Column({ status, tickets, onOpen, onAdd }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section aria-labelledby={`col-${status}`} className="flex min-w-0 flex-col">
      <header className="mb-2 flex items-center justify-between px-1">
        <h3 id={`col-${status}`} className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[status] }} aria-hidden="true" />
          {STATUS_LABEL[status]}
          <span className="rounded-full bg-lane px-2 py-0.5 text-xs font-medium text-ink-soft">{tickets.length}</span>
        </h3>
        <button
          type="button"
          className="btn btn-ghost !p-1.5"
          onClick={() => onAdd(status)}
          aria-label={`Add a ticket to ${STATUS_LABEL[status]}`}
        >
          <Icon name="plus" size={16} />
        </button>
      </header>
      <div
        ref={setNodeRef}
        className={`flex min-h-[11rem] flex-1 flex-col gap-2 rounded-lg p-2 transition-colors ${
          isOver ? 'bg-spruce-tint' : 'bg-lane'
        }`}
      >
        <SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map((t) => (
            <SortableTicket key={t.id} ticket={t} onOpen={onOpen} />
          ))}
        </SortableContext>
        {tickets.length === 0 && (
          <p className="m-auto px-4 py-6 text-center text-sm text-ink-soft">
            Nothing here. Drop a ticket or add one.
          </p>
        )}
      </div>
    </section>
  );
}

export default function KanbanBoard({ board, onMove, onOpen, onAdd }) {
  const [cols, setCols] = useState(() => fromBoard(board));
  const [activeId, setActiveId] = useState(null);
  const dragging = useRef(false);

  // Take fresh data from the server unless the person is mid-drag.
  useEffect(() => {
    if (!dragging.current) setCols(fromBoard(board));
  }, [board]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  );

  const activeTicket = activeId == null ? null : STATUSES.flatMap((s) => cols[s]).find((t) => t.id === activeId);

  function handleDragStart({ active }) {
    dragging.current = true;
    setActiveId(active.id);
  }

  // While dragging over another column, move the card into it so the list reorders live.
  function handleDragOver({ active, over }) {
    if (!over) return;
    const from = findContainer(cols, active.id);
    const to = findContainer(cols, over.id);
    if (!from || !to || from === to) return;

    setCols((prev) => {
      const fromList = prev[from];
      const toList = prev[to];
      const moving = fromList.find((t) => t.id === active.id);
      if (!moving) return prev;
      const overIndex = toList.findIndex((t) => t.id === over.id);
      let newIndex;
      if (over.id in prev) {
        newIndex = toList.length;
      } else {
        const below =
          active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height / 2;
        newIndex = overIndex >= 0 ? overIndex + (below ? 1 : 0) : toList.length;
      }
      return {
        ...prev,
        [from]: fromList.filter((t) => t.id !== active.id),
        [to]: [...toList.slice(0, newIndex), { ...moving, status: to }, ...toList.slice(newIndex)],
      };
    });
  }

  function handleDragEnd({ active, over }) {
    dragging.current = false;
    setActiveId(null);
    if (!over) {
      setCols(fromBoard(board));
      return;
    }
    const container = findContainer(cols, active.id);
    const overContainer = findContainer(cols, over.id);
    if (!container || container !== overContainer) {
      setCols(fromBoard(board));
      return;
    }

    let list = cols[container];
    const activeIndex = list.findIndex((t) => t.id === active.id);
    const overIndex = over.id in cols ? list.length - 1 : list.findIndex((t) => t.id === over.id);
    if (overIndex >= 0 && activeIndex !== overIndex) {
      list = arrayMove(list, activeIndex, overIndex);
      setCols((prev) => ({ ...prev, [container]: list }));
    }

    const finalIndex = list.findIndex((t) => t.id === active.id);
    const original = fromBoard(board);
    const originalIndex = original[container].findIndex((t) => t.id === active.id);
    if (originalIndex === finalIndex) return; // dropped back where it started

    onMove(list[finalIndex], container, positionFor(list, finalIndex));
  }

  function handleDragCancel() {
    dragging.current = false;
    setActiveId(null);
    setCols(fromBoard(board));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {STATUSES.map((s) => (
          <Column key={s} status={s} tickets={cols[s]} onOpen={onOpen} onAdd={onAdd} />
        ))}
      </div>
      <DragOverlay>{activeTicket ? <TicketCard ticket={activeTicket} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}
