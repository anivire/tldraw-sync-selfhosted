import { memo, useRef, useState } from 'react';
import { createTLStore, Tldraw } from 'tldraw';
import { Sidebar } from '../shared/components/sidebar';

export function Home() {
  const storeRef = useRef(createTLStore());

  const [sidebarHidden, setSidebarHidden] = useState(false);

  const [hasInteracted, setHasInteracted] = useState(false);
  const [showDecision, setShowDecision] = useState(false);
  const [allowEditing, setAllowEditing] = useState(false);

  return (
    <div className="relative flex h-screen bg-stone-50">
      {!sidebarHidden && <Sidebar />}

      <CanvasPreview store={storeRef.current} />

      {!allowEditing && !showDecision && (
        <CanvasInteractionCatcher
          onFirstInteraction={() => {
            if (!hasInteracted) {
              setHasInteracted(true);
              setShowDecision(true);
            }
          }}
        />
      )}

      {showDecision && (
        <DecisionOverlay
          onCreateBoard={() => {
            setShowDecision(false);
            setSidebarHidden(false);
            setHasInteracted(false);
          }}
          onContinue={() => {
            setShowDecision(false);
            setAllowEditing(true);
            setSidebarHidden(true);
          }}
        />
      )}
    </div>
  );
}

const CanvasPreview = memo(function CanvasPreview({
  store,
}: {
  store: ReturnType<typeof createTLStore>;
}) {
  return <Tldraw store={store} />;
});

function DecisionOverlay({
  onContinue,
  onCreateBoard,
}: {
  onContinue: () => void;
  onCreateBoard: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative z-40 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold">Unsaved canvas</h3>

        <p className="mb-5 text-sm text-stone-600">
          You’re about to start drawing on a temporary canvas. Your changes will{' '}
          <strong>not be saved</strong> unless you create a board.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCreateBoard}
            className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white transition hover:bg-blue-600"
          >
            Create board
          </button>

          <button
            onClick={onContinue}
            className="flex-1 rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 transition hover:bg-stone-100"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function CanvasInteractionCatcher({
  onFirstInteraction,
}: {
  onFirstInteraction: () => void;
}) {
  return (
    <div className="absolute inset-0 z-2" onPointerDown={onFirstInteraction} />
  );
}
