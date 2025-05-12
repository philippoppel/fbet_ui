// src/app/components/dashboard/CommentSection.tsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Textarea } from '@/app/components/ui/textarea';
import { Button } from '@/app/components/ui/button';
import {
  Loader2,
  ImagePlus,
  MessageCircleMore,
  X,
  AlertTriangle,
  Send,
  ImageIcon,
  Clapperboard,
} from 'lucide-react';
import { GiphyFetch, GifsResult } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
// Korrekte Importpfade aus dem vorherigen Snippet
import { EventComment, EventCommentCreate, UserOut } from '@/app/lib/types';
import {
  ApiError,
  getEventComments,
  postEventComment,
  uploadImage,
} from '@/app/lib/api';

// --- ANNAHME: Token Helper (am Ende der Datei definiert oder importiert) ---
// Wenn du einen Context verwendest, importiere und nutze diesen stattdessen.
// import { useAuth } from '@/app/context/AuthContext';

interface CommentSectionProps {
  eventId: number;
  currentUser: UserOut;
}

// --- Giphy Hook ---
const useGiphyFetch = () => {
  return useMemo(() => {
    const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
    if (apiKey && apiKey.length > 10) {
      try {
        return new GiphyFetch(apiKey);
      } catch (e) {
        console.error('Fehler bei der Initialisierung von GiphyFetch:', e);
        return null;
      }
    }
    // Warnung nur im Development-Modus ausgeben
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'GIPHY API Key (NEXT_PUBLIC_GIPHY_API_KEY) fehlt oder ist zu kurz. GIF-Funktionen sind deaktiviert.'
      );
    }
    return null;
  }, []);
};

// --- Hauptkomponente ---
export function CommentSection({ eventId, currentUser }: CommentSectionProps) {
  const [comments, setComments] = useState<EventComment[]>([]);
  const [text, setText] = useState('');
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchTerm, setGifSearchTerm] = useState('');
  // --- Änderung: Standardmäßig geschlossen ---
  const [isExpanded, setIsExpanded] = useState(false);

  const gf = useGiphyFetch();
  // --- ANNAHME: Token holen ---
  // const { token } = useAuth(); // Alternative: Context
  const token = getAuthToken(); // Verwendung des Helpers am Ende der Datei

  // --- Kommentare laden ---
  useEffect(() => {
    const loadComments = async () => {
      if (!token) {
        // Fehler nur setzen, wenn Komponente sichtbar ist
        if (isExpanded) {
          setApiError('Nicht eingeloggt oder Token fehlt.');
        }
        setIsLoading(false);
        setComments([]);
        return;
      }

      // Nur laden, wenn ausgeklappt
      if (isExpanded) {
        setIsLoading(true);
        setApiError(null);
        try {
          const fetchedComments = await getEventComments(token, eventId);
          // API sortiert 'asc', Kommentare in dieser Reihenfolge setzen
          setComments(fetchedComments);
        } catch (error) {
          console.error(
            `Fehler beim Laden der Kommentare für Event ${eventId}:`,
            error
          );
          setComments([]); // Liste bei Fehler leeren
          if (error instanceof ApiError) {
            if (error.status === 404) {
              setApiError(null); // 404 ist kein Anzeigefehler
              console.log(`Keine Kommentare für Event ${eventId} gefunden.`);
            } else if (error.status === 401) {
              setApiError('Nicht autorisiert. Bitte erneut anmelden.');
            } else {
              setApiError(
                `Fehler ${error.status}: ${error.message}${error.detail ? ` (${JSON.stringify(error.detail)})` : ''}`
              );
            }
          } else if (error instanceof Error) {
            setApiError(
              error.message || 'Kommentare konnten nicht geladen werden.'
            );
          } else {
            setApiError('Ein unbekannter Fehler ist aufgetreten.');
          }
        } finally {
          setIsLoading(false);
        }
      } else {
        // Wenn eingeklappt wird, Ladezustand zurücksetzen (aber nicht die Kommentare löschen)
        setIsLoading(false);
      }
    };

    loadComments();
    // Abhängigkeiten: eventId, isExpanded, token
  }, [eventId, isExpanded, token]);

  // --- Kommentar senden ---
  const submitComment = async () => {
    if (!text.trim() && !gifUrl && !imageUrl) return;
    if (!token) {
      setApiError('Nicht eingeloggt oder Token fehlt.');
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    const commentData: EventCommentCreate = {
      text: text.trim() || undefined,
      gifUrl: gifUrl ?? imageUrl ?? undefined,
    };

    try {
      const newComment = await postEventComment(token, eventId, commentData);
      // Neuen Kommentar am Anfang der Liste einfügen
      setComments((prev) => [newComment, ...prev]);
      // Formular zurücksetzen
      setText('');
      setGifUrl(null);
      setImageUrl(null);
      setShowGifPicker(false);
      setGifSearchTerm('');
    } catch (error) {
      console.error('Fehler beim Senden des Kommentars:', error);
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setApiError('Nicht autorisiert. Bitte erneut anmelden.');
        } else {
          setApiError(
            `Fehler ${error.status}: ${error.message}${error.detail ? ` (${JSON.stringify(error.detail)})` : ''}`
          );
        }
      } else if (error instanceof Error) {
        setApiError(error.message || 'Kommentar konnte nicht gesendet werden.');
      } else {
        setApiError('Ein unbekannter Fehler ist aufgetreten.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Bild hochladen ---
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!token) {
      setApiError('Nicht eingeloggt oder Token fehlt.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setApiError(null);
    setIsSubmitting(true); // Blockiert Senden-Button etc.

    try {
      const response = await uploadImage(token, formData); // API Funktion nutzen
      if (response?.url) {
        setImageUrl(response.url);
        setGifUrl(null); // GIF Auswahl zurücksetzen
        setShowGifPicker(false); // GIF Picker schließen
      } else {
        // Sollte durch handleResponse abgedeckt sein, aber zur Sicherheit
        throw new Error(
          'URL für das hochgeladene Bild nicht in der Antwort gefunden.'
        );
      }
    } catch (error) {
      console.error('Fehler beim Bild-Upload:', error);
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setApiError('Nicht autorisiert für Upload. Bitte erneut anmelden.');
        } else {
          setApiError(
            `Upload-Fehler ${error.status}: ${error.message}${error.detail ? ` (${JSON.stringify(error.detail)})` : ''}`
          );
        }
      } else if (error instanceof Error) {
        setApiError(error.message || 'Bild konnte nicht hochgeladen werden.');
      } else {
        setApiError('Ein unbekannter Upload-Fehler ist aufgetreten.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Rendern ---

  // Eingeklappter Zustand
  if (!isExpanded) {
    return (
      <div className='pt-4 border-t'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setIsExpanded(true)}
          className='flex items-center gap-2 text-sm'
          disabled={isLoading} // Optional: Button deaktivieren, während im Hintergrund geladen wird (falls implementiert)
        >
          {isLoading ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <MessageCircleMore className='h-4 w-4' />
          )}
          Kommentare anzeigen
          {/* Die Anzahl kann hier nur angezeigt werden, wenn sie separat/initial geladen wird */}
        </Button>
      </div>
    );
  }

  // Ausgeklappter Zustand
  return (
    <div className='mt-6 space-y-4 border-t pt-4'>
      {/* Header */}
      <div className='flex justify-between items-center mb-2'>
        <h3 className='text-lg font-semibold'>
          {/* Zeige Anzahl nur wenn nicht geladen wird */}
          Kommentare {isLoading ? '' : `(${comments.length})`}
        </h3>
        <Button
          variant='ghost'
          size='icon'
          onClick={() => setIsExpanded(false)}
          className='h-8 w-8 text-muted-foreground hover:text-foreground'
          aria-label='Kommentarbereich schließen'
        >
          <X className='h-5 w-5' />
        </Button>
      </div>

      {/* Fehleranzeige */}
      {apiError && (
        <div className='p-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2'>
          <AlertTriangle className='h-5 w-5 flex-shrink-0' />
          <span>{apiError}</span>
        </div>
      )}

      {/* Ladezustand */}
      {
        isLoading ? (
          <div className='flex items-center justify-center p-6 text-muted-foreground'>
            <Loader2 className='h-6 w-6 animate-spin mr-2' />
            <span>Lade Kommentare...</span>
          </div>
        ) : // Keine Kommentare Nachricht (nur anzeigen, wenn nicht geladen wird und kein Fehler vorliegt)
        !apiError && comments.length === 0 ? (
          <p className='text-sm text-muted-foreground italic py-4 text-center'>
            Noch keine Kommentare vorhanden. Sei der Erste!
          </p>
        ) : // Kommentarliste (nur anzeigen, wenn nicht geladen wird und Kommentare vorhanden sind)
        !isLoading && comments.length > 0 ? (
          <ul className='space-y-4 max-h-[500px] overflow-y-auto pr-2 -mr-2'>
            {comments.map((comment) => (
              // --- Robuster Zugriff auf comment.user ---
              <li key={comment.id} className='flex items-start space-x-3'>
                {/* Avatar Placeholder */}
                <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground'>
                  {comment.user?.name?.charAt(0).toUpperCase() ?? // Optional Chaining
                    comment.user?.email?.charAt(0).toUpperCase() ?? // Optional Chaining
                    '?'}
                </span>
                <div className='flex-1 space-y-1'>
                  <div className='flex items-center justify-between text-xs'>
                    <span className='font-semibold text-foreground'>
                      {comment.user?.name ?? // Optional Chaining & Nullish Coalescing
                        comment.user?.email ?? // Optional Chaining & Nullish Coalescing
                        'Unbekannter Nutzer'}
                    </span>
                    <span className='text-muted-foreground'>
                      {new Date(comment.createdAt).toLocaleString('de-DE', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                      Uhr
                    </span>
                  </div>
                  {comment.text && (
                    <p className='text-sm text-foreground whitespace-pre-wrap break-words'>
                      {comment.text}
                    </p>
                  )}
                  {comment.gifUrl && (
                    <img
                      src={comment.gifUrl}
                      alt='Kommentar Anhang'
                      className='max-w-full sm:max-w-[300px] mt-2 rounded-md border object-contain bg-muted/10'
                      loading='lazy'
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : null /* Fallback, sollte nicht erreicht werden */
      }

      {/* Eingabebereich */}
      <div className='space-y-3 pt-4 border-t'>
        {/* Textarea */}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            currentUser?.name // Sicherer Zugriff auf currentUser
              ? `${currentUser.name}, was denkst du?`
              : 'Dein Kommentar...'
          }
          rows={3}
          className='text-sm rounded-md'
          disabled={isSubmitting}
        />

        {/* Vorschau für Anhang */}
        {(gifUrl || imageUrl) && (
          <div className='relative w-fit max-w-[200px]'>
            <img
              src={gifUrl || imageUrl || ''}
              alt='Vorschau Anhang'
              className='max-h-28 rounded-md border object-contain bg-muted/30'
            />
            <Button
              variant='destructive'
              size='icon'
              className='absolute top-1 right-1 h-5 w-5 rounded-full'
              onClick={() => {
                setGifUrl(null);
                setImageUrl(null);
              }}
              aria-label='Anhang entfernen'
              disabled={isSubmitting}
            >
              <X className='h-3 w-3' />
            </Button>
          </div>
        )}

        {/* Aktionen (GIF, Bild, Senden) */}
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='flex items-center gap-2'>
            {/* GIF Button */}
            {gf && (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => {
                  setShowGifPicker((prev) => !prev);
                  if (showGifPicker) setGifSearchTerm('');
                }}
                disabled={!!imageUrl || isSubmitting}
                className={`text-muted-foreground hover:text-primary ${showGifPicker ? 'bg-accent text-accent-foreground' : ''}`}
                aria-label={
                  showGifPicker ? 'GIF-Auswahl schließen' : 'GIF auswählen'
                }
              >
                <Clapperboard className='h-5 w-5' />
              </Button>
            )}
            {/* Bild Upload Button */}
            <label
              className={`
                   inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
                   hover:bg-accent hover:text-accent-foreground h-10 w-10
                   ${!!gifUrl || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer text-muted-foreground hover:text-primary'}
                 `}
              aria-disabled={!!gifUrl || isSubmitting}
            >
              <ImageIcon className='h-5 w-5' />
              <input
                type='file'
                accept='image/*'
                className='hidden'
                onChange={(e) =>
                  e.target.files?.[0] && handleFileUpload(e.target.files[0])
                }
                disabled={!!gifUrl || isSubmitting}
              />
            </label>
          </div>
          {/* Senden Button */}
          <Button
            onClick={submitComment}
            disabled={isSubmitting || (!text.trim() && !gifUrl && !imageUrl)}
            size='sm'
            className='min-w-[90px]'
          >
            {isSubmitting ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <>
                Senden <Send className='h-4 w-4 ml-2' />
              </>
            )}
          </Button>
        </div>

        {/* Giphy Picker Bereich */}
        {showGifPicker && gf && (
          <div className='mt-3 border rounded-lg bg-background shadow-sm overflow-hidden'>
            <input
              type='text'
              placeholder='GIFs suchen...'
              value={gifSearchTerm}
              onChange={(e) => setGifSearchTerm(e.target.value)}
              className='w-full px-4 py-2.5 border-b text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring'
              disabled={isSubmitting}
              aria-label='GIFs durchsuchen'
            />
            <div className='max-h-72 overflow-y-auto p-2.5'>
              <Grid
                key={gifSearchTerm.trim() || 'trending_gifs'}
                // Beispielhafte Breite, anpassen falls nötig
                width={
                  typeof window !== 'undefined'
                    ? Math.min(window.innerWidth - 80, 400)
                    : 350
                }
                columns={3}
                gutter={6}
                fetchGifs={(offset: number): Promise<GifsResult> => {
                  const currentSearchTerm = gifSearchTerm.trim();
                  if (!gf) {
                    return Promise.resolve({
                      data: [],
                      pagination: { total_count: 0, count: 0, offset: 0 },
                      meta: { status: 200, msg: 'OK', response_id: '' },
                    });
                  }
                  const promiseToFetch = currentSearchTerm
                    ? gf.search(currentSearchTerm, {
                        offset,
                        limit: 15,
                        type: 'gifs',
                      })
                    : gf.trending({ offset, limit: 15, type: 'gifs' });
                  return promiseToFetch.catch((error) => {
                    console.error(`Giphy API error: ${error}`);
                    return {
                      data: [],
                      pagination: { total_count: 0, count: 0, offset: 0 },
                      meta: { status: 500, msg: 'Error', response_id: '' },
                    };
                  });
                }}
                onGifClick={(gif, e) => {
                  e.preventDefault();
                  setGifUrl(gif.images.original.url);
                  setImageUrl(null);
                  setShowGifPicker(false);
                  setGifSearchTerm('');
                }}
                noLink
                hideAttribution
              />
            </div>
          </div>
        )}
        {/* Meldung wenn Giphy nicht verfügbar */}
        {showGifPicker && !gf && (
          <p className='text-xs text-destructive mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md'>
            GIF-Funktion ist nicht verfügbar (API Key fehlt oder ist ungültig).
          </p>
        )}
      </div>
    </div>
  );
}

// --- ANNAHME: Beispiel Token Helper ---
// Stelle sicher, dass diese Funktion existiert und korrekt implementiert ist!
// Sie sollte den Token zurückgeben, wenn der User eingeloggt ist, sonst null.
function getAuthToken(): string | null {
  // Nur im Browser ausführen, da localStorage nicht serverseitig verfügbar ist
  if (typeof window !== 'undefined') {
    // Den Key anpassen, unter dem der Token gespeichert wird!
    return localStorage.getItem('fbet_token');
  }
  return null;
}
