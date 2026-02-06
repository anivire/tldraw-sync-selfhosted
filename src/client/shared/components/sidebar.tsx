import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  BOARD_ID_REGEX,
  generateLegacyWhiteboardId,
  slugify,
} from '../../util/generate-board-id';

import { TldrawIcon } from '../icons/tldraw-icon';
import { AddIcon } from '../icons/add-icon';
import { ArrowTopRigthIcon } from '../icons/arrow-top-right-icon';

export function Sidebar() {
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const boardId = slugify(displayName);

  const [exists, setExists] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!BOARD_ID_REGEX.test(boardId)) {
      setExists(false);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    setExists(false);

    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    checkTimeoutRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/whiteboard/${boardId}/exists`);
        const data = await res.json();
        setExists(Boolean(data.exists));
      } catch {
        setExists(false);
      } finally {
        setIsChecking(false);
      }
    }, 400);

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [boardId]);

  const goToBoard = () => {
    if (!BOARD_ID_REGEX.test(boardId)) return;
    navigate(`/${boardId}`);
  };

  return (
    <section className="flex h-full w-full max-w-sm flex-col items-center justify-center gap-5 border-r border-stone-100 bg-white p-6">
      <div className="flex items-center gap-2 pb-8">
        <TldrawIcon className="text-3xl" />
        <h1 className="text-2xl font-black">tldraw</h1>
      </div>

      <button
        onClick={() => navigate(`/${generateLegacyWhiteboardId()}`)}
        className="w-full cursor-pointer rounded-lg bg-blue-500 py-2 text-white transition hover:bg-blue-600"
      >
        Start drawing
      </button>

      <p className="text-center text-sm text-stone-400">
        or create / join by name
      </p>

      <div className="flex w-full flex-row gap-2">
        <input
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="my-awesome-board"
          className="w-full rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 outline-none focus:border-blue-500 focus:bg-white"
          autoFocus
        />

        <button
          onClick={goToBoard}
          disabled={!BOARD_ID_REGEX.test(boardId)}
          className={`flex aspect-square w-10 items-center justify-center rounded-lg p-1 transition ${
            BOARD_ID_REGEX.test(boardId)
              ? exists
                ? 'cursor-pointer bg-green-500 text-white hover:bg-green-600'
                : 'cursor-pointer bg-blue-500 text-white hover:bg-blue-600'
              : 'cursor-not-allowed bg-stone-200 text-stone-500'
          }`}
        >
          {exists ? <ArrowTopRigthIcon /> : <AddIcon />}
        </button>
      </div>

      <div className="min-h-5 text-sm">
        {isChecking && (
          <span className="text-stone-400">Checking board...</span>
        )}

        {!isChecking && boardId && exists && (
          <span className="text-green-600">Board found!</span>
        )}

        {!isChecking && boardId && !exists && BOARD_ID_REGEX.test(boardId) && (
          <span className="text-blue-600">New board will be created.</span>
        )}

        {displayName && !BOARD_ID_REGEX.test(boardId) && (
          <span className="text-red-500">
            Name must be 3–50 characters long!
          </span>
        )}
      </div>
    </section>
  );
}
