import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, RefreshCw, Sparkles } from 'lucide-react';
import { useUpdateStore } from '../stores/updateStore';

export function UpdateChecker() {
  const {
    checking,
    downloading,
    downloadProgress,
    update,
    error,
    dismissed,
    checkForUpdates,
    downloadAndInstall,
    dismiss,
  } = useUpdateStore();

  // Check for updates on mount
  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  // Don't render if dismissed or no update
  if (dismissed || (!update && !error)) return null;

  return (
    <AnimatePresence>
      {(update || error) && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <div className="bg-bg-elevated border border-accent-cyan/30 rounded-lg shadow-lg overflow-hidden min-w-[320px] max-w-[400px]">
            {error ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-accent-rose text-sm font-medium">Update Check Failed</span>
                  <button
                    onClick={dismiss}
                    className="text-text-muted hover:text-text-primary transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="text-text-secondary text-xs">{error}</p>
                <button
                  onClick={checkForUpdates}
                  disabled={checking}
                  className="mt-3 w-full px-3 py-2 bg-bg-primary text-text-primary border border-border-primary rounded hover:bg-bg-secondary transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
                  Retry
                </button>
              </div>
            ) : update ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-accent-cyan" />
                    <span className="text-accent-cyan text-sm font-medium">
                      Update Available
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-text-muted px-2 py-0.5 bg-bg-primary rounded">
                      v{update.version}
                    </span>
                    <button
                      onClick={dismiss}
                      className="text-text-muted hover:text-text-primary transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {update.body && (
                  <p className="text-text-secondary text-sm mb-4 line-clamp-3">
                    {update.body}
                  </p>
                )}

                {downloading ? (
                  <div className="space-y-2">
                    <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-accent-cyan to-accent-purple"
                        initial={{ width: 0 }}
                        animate={{ width: `${downloadProgress}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <span>Downloading update...</span>
                      <span className="font-mono">{downloadProgress}%</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={downloadAndInstall}
                    className="w-full px-4 py-2.5 bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 rounded-lg hover:bg-accent-cyan/30 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Download size={16} />
                    Download & Install
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
