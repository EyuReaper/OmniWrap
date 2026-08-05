'use client';

import { signOut, useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useToast } from './ui/Toast';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface Preferences {
  emailNotifications?: boolean;
  publicWrap?: boolean;
}

export default function AccountMenu() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({});
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch('/api/account')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.preferences) setPreferences(data.preferences);
      })
      .catch(() => {
        // Best-effort — preferences default to unset if this fails.
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const togglePreference = async (key: keyof Preferences) => {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    setSavingPrefs(true);
    try {
      const res = await fetch('/api/account/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: next[key] }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPreferences((prev) => ({ ...prev, [key]: !next[key] }));
      showToast(
        typeof navigator !== 'undefined' && !navigator.onLine
          ? "You're offline — that preference couldn't be saved."
          : 'Could not save that preference. Please try again.',
        'error',
      );
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/account', { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await signOut({ callbackUrl: '/' });
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
      showToast(
        typeof navigator !== 'undefined' && !navigator.onLine
          ? "You're offline — your account couldn't be deleted."
          : 'Could not delete your account. Please try again.',
        'error',
      );
    }
  };

  if (!session?.user) return null;

  const initials = (session.user.name || session.user.email || '?').charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center justify-center w-11 h-11 rounded-full border border-white/20 bg-black/40 backdrop-blur-md text-white font-bold overflow-hidden hover:border-white/40 transition-colors"
      >
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt="" aria-hidden="true" className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl overflow-hidden z-40"
          >
            <div className="px-4 py-4 border-b border-white/10">
              <p className="font-bold text-white truncate">{session.user.name || 'Your account'}</p>
              <p className="text-sm text-gray-400 truncate">{session.user.email}</p>
            </div>

            <div className="p-2">
              <button
                role="menuitem"
                onClick={() => setShowPreferences((v) => !v)}
                className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors"
              >
                <span>Preferences</span>
                <span className="text-gray-500">{showPreferences ? '−' : '+'}</span>
              </button>

              {showPreferences && (
                <div className="px-3 pb-2 space-y-1">
                  {(
                    [
                      ['emailNotifications', 'Email notifications'],
                      ['publicWrap', 'Public wrap link'],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center justify-between gap-3 min-h-[44px] py-2 text-sm text-gray-300"
                    >
                      <span>{label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(preferences[key])}
                        disabled={savingPrefs}
                        onChange={() => togglePreference(key)}
                        className="w-5 h-5 accent-[var(--spotify-green,#1DB954)]"
                      />
                    </label>
                  ))}
                </div>
              )}

              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setConfirmDelete(true);
                }}
                className="w-full min-h-[44px] flex items-center px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition-colors"
              >
                Delete account
              </button>

              <button
                role="menuitem"
                onClick={() => signOut()}
                className="w-full min-h-[44px] flex items-center px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors"
              >
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete your account?"
        description="This permanently deletes your account, connections, and wraps. This can't be undone."
        confirmLabel="Delete account"
        variant="danger"
        isBusy={deleting}
        onConfirm={handleDeleteAccount}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
