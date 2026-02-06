import { useSync } from '@tldraw/sync';
import { ReactNode, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tldraw } from 'tldraw';

import { BookmarkPreview } from '../shared/components/bookmark-preview';
import { AssetStore } from '../shared/components/asset-store';

import { ConnectionIcon } from '../shared/icons/connection-icon';
import { QrIcon } from '../shared/icons/qr-icon';
import { CopyIcon } from '../shared/icons/copy-icon';

export function Room() {
  const { whiteboardId } = useParams<{ whiteboardId: string }>();

  const store = useSync({
    uri: `${window.location.origin}/api/connect/${whiteboardId}`,
    assets: AssetStore,
  });

  const licenseKey = (import.meta as any).env?.VITE_TLDRAW_LICENSE as
    | string
    | undefined;

  if (!licenseKey && process.env.NODE_ENV === 'production') {
    console.warn(
      'Tldraw license key is not set. Set VITE_TLDRAW_LICENSE in your environment to enable licensed features.'
    );
  }

  return (
    <WhiteboardWrapper whiteboardId={whiteboardId}>
      <Tldraw
        // we can pass the connected store into the Tldraw component which will handle
        // loading states & enable multiplayer UX like cursors & a presence menu
        store={store}
        licenseKey={licenseKey}
        deepLinks
        onMount={editor => {
          // when the editor is ready, we need to register our bookmark unfurling service
          editor.registerExternalAssetHandler('url', BookmarkPreview);
        }}
      />
    </WhiteboardWrapper>
  );
}

function WhiteboardWrapper({
  children,
  whiteboardId,
}: {
  children: ReactNode;
  whiteboardId?: string;
}) {
  const [didCopy, setDidCopy] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{
    qrCode: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    if (!didCopy) return;
    const timeout = setTimeout(() => setDidCopy(false), 3000);
    return () => clearTimeout(timeout);
  }, [didCopy]);

  // Check connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        setIsConnected(data.mongodb === 'connected');
      } catch (error) {
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleQrClick = async () => {
    try {
      const response = await fetch(`/api/qrcode/${whiteboardId}`);
      const data = await response.json();
      setQrCodeData(data);
      setShowQRModal(true);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  return (
    <>
      <QRCodeModal
        show={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrCodeData={qrCodeData}
      />

      <header className="absolute right-2 bottom-2 flex w-fit items-center justify-between gap-2">
        <div className="flex h-9 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3">
          <div
            className={`flex flex-row items-center gap-1 ${!isConnected && 'pr-1'}`}
          >
            <ConnectionIcon
              className={`size-5 ${isConnected ? 'text-green-500' : 'text-red-500'}`}
            />

            {!isConnected && <p className="text-sm text-red-500">Offline</p>}
          </div>

          <div className="text-sm font-semibold text-stone-700">
            {whiteboardId ?? 'Unknown board'}
          </div>
        </div>

        <div className="flex h-9 items-center gap-1 rounded-xl border border-stone-200 bg-white px-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setDidCopy(true);
            }}
            className="rounded-md p-1 text-sm text-stone-600 transition hover:bg-stone-100"
          >
            {didCopy ? 'Copied' : <CopyIcon className="size-4" />}
          </button>

          <button
            onClick={handleQrClick}
            className="flex items-center justify-center rounded-md text-stone-600 transition hover:bg-stone-100"
          >
            <QrIcon className="size-4" />
          </button>
        </div>
      </header>

      <div>{children}</div>
    </>
  );
}

function QRCodeModal({
  show,
  onClose,
  qrCodeData,
}: {
  show: boolean;
  onClose: () => void;
  qrCodeData: { qrCode: string; url: string } | null;
}) {
  if (!show || !qrCodeData) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-stone-800">
            Join whiteboard
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-stone-500 transition hover:bg-stone-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <img
            src={qrCodeData.qrCode}
            alt="QR code"
            className="w-48 rounded-lg border border-stone-200"
          />

          <p className="text-center text-sm text-stone-500">
            Scan this QR code with your phone to open the board
          </p>

          <div className="w-full rounded-md bg-stone-100 px-3 py-2 text-center text-xs text-stone-600">
            {qrCodeData.url}
          </div>
        </div>
      </div>
    </div>
  );
}
