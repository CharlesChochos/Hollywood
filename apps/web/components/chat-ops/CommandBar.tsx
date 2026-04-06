'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Lightbulb,
  RefreshCw,
  LayoutGrid,
  SlidersHorizontal,
  X,
  Mic,
  MicOff,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface Command {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  keywords: string[];
}

interface CommandBarProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  projectId?: string;
  onNaturalCommandResult?: (result: { action: string; message: string; jobId: string | null }) => void;
}

export function CommandBar({ open, onClose, commands, projectId, onNaturalCommandResult }: CommandBarProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const naturalCmd = trpc.agent.naturalCommand.useMutation();

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].text)
        .join('');
      setQuery(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopVoiceInput = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.keywords.some((k) => k.includes(q)),
    );
  }, [query, commands]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          onClose();
        } else if (query.trim() && projectId && !isProcessing) {
          // No matching command — send as natural language
          setIsProcessing(true);
          naturalCmd.mutate(
            { projectId, command: query.trim() },
            {
              onSuccess: (result) => {
                setIsProcessing(false);
                onNaturalCommandResult?.(result);
                onClose();
              },
              onError: () => {
                setIsProcessing(false);
              },
            },
          );
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, filtered, selectedIndex, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
          />
          {typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition) && (
            <button
              onClick={isListening ? stopVoiceInput : startVoiceInput}
              className={`transition-colors ${isListening ? 'text-red-400 animate-pulse' : 'text-zinc-600 hover:text-zinc-400'}`}
              title={isListening ? 'Stop listening' : 'Voice input'}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center">
              {isProcessing ? (
                <div className="flex items-center justify-center gap-2 text-sm text-amber-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Interpreting command...
                </div>
              ) : query.trim() && projectId ? (
                <div className="space-y-2">
                  <p className="text-sm text-zinc-500">No matching command</p>
                  <p className="text-xs text-zinc-600">
                    Press <kbd className="px-1 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono">Enter</kbd> to send as AI command
                  </p>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400">
                    <Sparkles className="h-3 w-3" />
                    &ldquo;{query.slice(0, 50)}{query.length > 50 ? '...' : ''}&rdquo;
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-600">No commands found</p>
              )}
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selectedIndex
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:bg-zinc-800/50'
                }`}
              >
                <cmd.icon className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{cmd.label}</p>
                  <p className="text-xs text-zinc-600 truncate">{cmd.description}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-zinc-800 text-[10px] text-zinc-600">
          <span><kbd className="px-1 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="px-1 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono">↵</kbd> run</span>
          <span><kbd className="px-1 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

/** Default command definitions used in the Director's Map. */
export function useDirectorsMapCommands({
  onAddIdea,
  onAutoLayout,
  onFitView,
}: {
  onAddIdea: () => void;
  onAutoLayout: () => void;
  onFitView: () => void;
}): Command[] {
  return useMemo(
    () => [
      {
        id: 'add-idea',
        label: 'New Idea',
        description: 'Add a new film idea to the canvas',
        icon: Lightbulb,
        action: onAddIdea,
        keywords: ['idea', 'create', 'add', 'new', 'concept'],
      },
      {
        id: 'auto-layout',
        label: 'Auto Layout',
        description: 'Arrange all nodes using dagre layout',
        icon: LayoutGrid,
        action: onAutoLayout,
        keywords: ['layout', 'arrange', 'organize', 'dagre', 'tidy'],
      },
      {
        id: 'fit-view',
        label: 'Fit to View',
        description: 'Zoom to fit all nodes on screen',
        icon: SlidersHorizontal,
        action: onFitView,
        keywords: ['fit', 'zoom', 'view', 'center', 'reset'],
      },
    ],
    [onAddIdea, onAutoLayout, onFitView],
  );
}
