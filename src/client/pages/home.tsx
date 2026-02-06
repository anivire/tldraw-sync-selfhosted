import { memo, useRef } from 'react';
import { createTLStore, Tldraw } from 'tldraw';
import { Sidebar } from '../shared/components/sidebar';

export function Home() {
  const storeRef = useRef(createTLStore());

  return (
    <div className="flex h-screen bg-stone-50">
      <Sidebar />
      <CanvasPreview store={storeRef.current} />
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
