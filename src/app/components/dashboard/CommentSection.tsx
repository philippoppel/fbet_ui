// src/app/components/dashboard/CommentSection.tsx
'use client';

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { Textarea } from '@/app/components/ui/textarea';
import { Button } from '@/app/components/ui/button';
import {
  Loader2,
  MessageCircleMore,
  X,
  AlertTriangle,
  Send,
  ImageIcon,
  Clapperboard,
  Heart,
  Trash2,
} from 'lucide-react';
import { GiphyFetch, GifsResult } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import { EventComment, EventCommentCreate, UserOut } from '@/app/lib/types';
import {
  getEventComments,
  postEventComment,
  uploadImage,
  likeComment,
  unlikeComment,
  deleteUserComment,
  ApiError,
} from '@/app/lib/api';
import { useAuth } from '@/app/context/AuthContext';
import { toast } from 'sonner';

interface CommentSectionProps {
  eventId: number;
  currentUser: UserOut;
}

const useGiphyFetch = () => {
  return useMemo(() => {
    const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
    if (apiKey && apiKey.length > 10) {
      try {
        return new GiphyFetch(apiKey);
      } catch (e) {
        console.error('GiphyFetch initialization error:', e);
        return null;
      }
    }
    if (
      process.env.NODE_ENV === 'development' &&
      (!apiKey || apiKey.length <= 10)
    ) {
      console.warn(
        'GIPHY API Key (NEXT_PUBLIC_GIPHY_API_KEY) missing or too short. GIF features disabled.'
      );
    }
    return null;
  }, []);
};

export function CommentSection({ eventId, currentUser }: CommentSectionProps) {
  const [comments, setComments] = useState<EventComment[]>([]);
  const [text, setText] = useState('');
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Initial auf false
  const [apiError, setApiError] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchTerm, setGifSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const gf = useGiphyFetch();
  const { token, isLoading: authLoading } = useAuth();

  // Ref, um die eventId zu speichern, für die zuletzt Kommentare geladen/versucht wurden
  const loadedEventIdRef = useRef<number | null>(null);
  // Ref, um zu verhindern, dass der initiale Ladeversuch mehrfach ausgelöst wird
  const initialFetchAttemptedForEventRef = useRef<number | null>(null);

  const loadCommentsInternal = useCallback(async () => {
    const currentEventIdToLoad = eventId; // eventId zum Zeitpunkt des Aufrufs festhalten
    loadedEventIdRef.current = currentEventIdToLoad; // Markiere, dass wir für diese eventId laden/versuchen

    if (!token) {
      setIsLoading(false);
      setInitialLoadDone(true);
      setComments([]);
      setApiError(
        'Authentication token is missing. Please log in to see comments.'
      );
      return;
    }

    setIsLoading(true);
    setInitialLoadDone(false); // Ladevorgang beginnt
    setApiError(null);
    try {
      const fetchedComments = await getEventComments(
        token,
        currentEventIdToLoad
      );
      if (loadedEventIdRef.current === currentEventIdToLoad) {
        // Nur aktualisieren, wenn noch für dieselbe eventId relevant
        setComments(fetchedComments);
      }
    } catch (error) {
      console.error(
        `Error loading comments for event ${currentEventIdToLoad}:`,
        error
      );
      if (loadedEventIdRef.current === currentEventIdToLoad) {
        setComments([]);
        if (error instanceof ApiError) {
          setApiError(`Error ${error.status}: ${error.message}`);
        } else if (error instanceof Error) {
          setApiError(error.message || 'Could not load comments.');
        } else {
          setApiError('An unknown error occurred while loading comments.');
        }
      }
    } finally {
      if (loadedEventIdRef.current === currentEventIdToLoad) {
        setIsLoading(false);
        setInitialLoadDone(true);
      }
    }
  }, [eventId, token]); // Abhängigkeiten für die Neuerstellung dieser Callback-Funktion

  // Effekt für das initiale Laden von Kommentaren und bei eventId-Änderung
  useEffect(() => {
    if (!authLoading && token) {
      // Lade, wenn es eine neue eventId ist, für die noch kein Ladeversuch erfolgte
      if (initialFetchAttemptedForEventRef.current !== eventId) {
        initialFetchAttemptedForEventRef.current = eventId;
        loadCommentsInternal();
      }
    } else if (!authLoading && !token) {
      // Auth fertig, aber kein Token -> Ladeversuch als "erledigt" markieren
      setIsLoading(false);
      setInitialLoadDone(true);
      setComments([]);
      setApiError('Authentication token is missing.');
      loadedEventIdRef.current = eventId;
      initialFetchAttemptedForEventRef.current = eventId;
    } else if (authLoading) {
      // Auth lädt noch, Zustände für sauberen Ladevorgang später zurücksetzen
      setIsLoading(true); // Kann true sein, um auf Button "Lade..." anzuzeigen
      setInitialLoadDone(false);
      initialFetchAttemptedForEventRef.current = null; // Noch kein Versuch, da Auth ausstehend
      loadedEventIdRef.current = null;
    }
  }, [authLoading, token, eventId, loadCommentsInternal]);

  // Effekt für UI-Änderungen beim Expandieren/Kollabieren
  useEffect(() => {
    if (isExpanded) {
      // Wenn expandiert und Daten für aktuelles Event geladen sind, Ladeanzeige aus.
      if (initialLoadDone && loadedEventIdRef.current === eventId) {
        setIsLoading(false);
      }
      // Wenn nicht geladen (z.B. eventId änderte sich während kollabiert),
      // sollte der obere useEffect das Laden bereits angestoßen haben.
    } else {
      // Kollabiert: Ladeanzeige aus. initialLoadDone und Kommentare bleiben für Zähler erhalten.
      setIsLoading(false);
    }
  }, [isExpanded, initialLoadDone, eventId]);

  // Echtzeit-Updates für neue Kommentare
  useEffect(() => {
    if (!isExpanded || !token || !currentUser) {
      return; // Nur abonnieren, wenn Sektion offen ist und User authentifiziert
    }

    const handleNewCommentPush = (newComment: EventComment) => {
      setComments((prevComments) => {
        if (prevComments.some((c) => c.id === newComment.id)) {
          return prevComments; // Duplikate vermeiden
        }
        if (currentUser.id !== newComment.userId) {
          toast.info(
            `Neuer Kommentar von ${newComment.user?.name || 'Unbekannt'}`,
            {
              description:
                newComment.text?.substring(0, 35) +
                  (newComment.text && newComment.text.length > 35
                    ? '...'
                    : '') || (newComment.gifUrl ? 'Neuer GIF-Kommentar' : ''),
            }
          );
        }
        return [newComment, ...prevComments]; // Neuen Kommentar oben hinzufügen
      });
    };

    // --- PLATZHALTER FÜR ECHTZEIT-IMPLEMENTIERUNG ---
    // Ersetze dies mit deiner Anbindung an WebSockets, Pusher, Supabase Realtime, Firebase etc.
    // Dein Backend muss bei einem neuen Kommentar ein Event an diesen Kanal senden.
    //
    // Beispiel:
    // const channel = `event-comments-${eventId}`;
    // const subscription = yourRealtimeService.subscribe(channel, 'new_comment_event', handleNewCommentPush);
    //
    // return () => {
    //   yourRealtimeService.unsubscribe(subscription);
    // };
    // --- ENDE PLATZHALTER ---
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `CommentSection: Echtzeit-Abonnement für Event ${eventId} ist ein Platzhalter. Implementiere dies mit deinem Backend-Dienst.`
      );
    }
  }, [eventId, token, isExpanded, currentUser]);

  const submitComment = async () => {
    if ((!text.trim() && !gifUrl && !imageUrl) || !token) {
      if (!token) setApiError('Nicht eingeloggt oder Token fehlt.');
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
      setComments((prev) => [newComment, ...prev]);
      setText('');
      setGifUrl(null);
      setImageUrl(null);
      setShowGifPicker(false);
      setGifSearchTerm('');
    } catch (error) {
      console.error('Error posting comment:', error);
      if (error instanceof ApiError)
        setApiError(`Error ${error.status}: ${error.message}`);
      else if (error instanceof Error) setApiError(error.message);
      else setApiError('An unknown error occurred while posting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeToggle = async (
    commentId: number,
    currentlyLiked: boolean
  ) => {
    if (!token) return;
    setComments((prevComments) =>
      prevComments.map((c) =>
        c.id === commentId
          ? {
              ...c,
              likedByCurrentUser: !currentlyLiked,
              likesCount: currentlyLiked ? c.likesCount - 1 : c.likesCount + 1,
            }
          : c
      )
    );
    try {
      if (currentlyLiked) {
        await unlikeComment(token, commentId);
      } else {
        await likeComment(token, commentId);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Could not update like.');
      setComments((prevComments) =>
        prevComments.map((c) =>
          c.id === commentId
            ? {
                ...c,
                likedByCurrentUser: currentlyLiked,
                likesCount: currentlyLiked
                  ? c.likesCount + 1
                  : c.likesCount - 1,
              }
            : c
        )
      );
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!token) return;
    const originalComments = [...comments];
    setComments((prevComments) =>
      prevComments.filter((c) => c.id !== commentId)
    );
    toast.info('Deleting comment...');
    try {
      await deleteUserComment(token, commentId);
      toast.success('Comment deleted.');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Could not delete comment.');
      setComments(originalComments);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file || !token) {
      if (!token) setApiError('Not logged in or missing token.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    setApiError(null);
    setIsSubmitting(true);
    try {
      const response = await uploadImage(token, formData);
      if (response?.url) {
        setImageUrl(response.url);
        setGifUrl(null);
        setShowGifPicker(false);
      } else throw new Error('Image URL not found in response.');
    } catch (error) {
      console.error('Error uploading image:', error);
      if (error instanceof ApiError)
        setApiError(`Upload Error ${error.status}: ${error.message}`);
      else if (error instanceof Error) setApiError(error.message);
      else setApiError('An unknown upload error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eingeklappter Button
  if (!isExpanded) {
    return (
      <Button
        variant='outline'
        size='sm'
        onClick={() => setIsExpanded(true)}
        className='flex items-center gap-2 text-sm'
        disabled={authLoading && !initialLoadDone} // Deaktivieren nur während initialer Auth-Ladephase
      >
        {(authLoading && !initialLoadDone) ||
        (isLoading && !initialLoadDone) ? (
          <Loader2 className='h-4 w-4 animate-spin' />
        ) : (
          <MessageCircleMore className='h-4 w-4' />
        )}
        {(authLoading && !initialLoadDone) || (isLoading && !initialLoadDone)
          ? 'Lade...'
          : 'Kommentare'}
        {initialLoadDone && !isLoading && ` (${comments.length})`}
      </Button>
    );
  }

  // Ausgeklappte Sektion
  return (
    <div className='border p-4 rounded-md shadow bg-card'>
      <div className='flex justify-between items-center mb-3'>
        <h3 className='text-lg font-semibold text-card-foreground'>
          Kommentare{' '}
          {initialLoadDone && !isLoading ? `(${comments.length})` : ''}
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
      {apiError && (
        <div className='p-3 mb-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2'>
          <AlertTriangle className='h-5 w-5 shrink-0' />
          <span>{apiError}</span>
        </div>
      )}
      {isLoading ? ( // Wenn aktiv geladen wird
        <div className='flex items-center justify-center p-6 text-muted-foreground'>
          <Loader2 className='h-6 w-6 animate-spin mr-2' />
          <span>Lade Kommentare...</span>
        </div>
      ) : initialLoadDone && comments.length === 0 && !apiError ? ( // Laden fertig, keine Kommentare, kein Fehler
        <p className='text-sm text-muted-foreground italic py-4 text-center'>
          Noch keine Kommentare vorhanden. Sei der Erste!
        </p>
      ) : initialLoadDone && comments.length > 0 && !apiError ? ( // Laden fertig, Kommentare da, kein Fehler
        <ul className='space-y-4 max-h-[500px] overflow-y-auto pr-2 -mr-2 mb-4 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent'>
          {comments.map((comment) => (
            <li key={comment.id} className='flex items-start space-x-3'>
              <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground'>
                {comment.user?.name?.charAt(0).toUpperCase() ??
                  comment.user?.email?.charAt(0).toUpperCase() ??
                  '?'}
              </span>
              <div className='flex-1 space-y-1'>
                <div className='flex items-center justify-between text-xs'>
                  <span className='font-semibold text-foreground'>
                    {comment.user?.name ??
                      comment.user?.email ??
                      'Unbekannter Nutzer'}
                  </span>
                  <span className='text-muted-foreground'>
                    {new Date(comment.createdAt).toLocaleString('de-DE', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}{' '}
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
                    className='max-w-full sm:max-w-[250px] mt-1 rounded-md border object-contain bg-muted/10'
                    loading='lazy'
                  />
                )}
                <div className='flex items-center gap-3 mt-1'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() =>
                      handleLikeToggle(comment.id, comment.likedByCurrentUser)
                    }
                    disabled={!currentUser || !token || isSubmitting}
                    className='text-muted-foreground hover:text-primary p-1 h-auto group'
                    aria-label={
                      comment.likedByCurrentUser
                        ? 'Unlike comment'
                        : 'Like comment'
                    }
                  >
                    <Heart
                      className={`h-4 w-4 transition-colors ${comment.likedByCurrentUser ? 'fill-red-500 text-red-500' : 'text-inherit group-hover:text-red-400'}`}
                    />
                    <span className='ml-1 text-xs tabular-nums'>
                      {comment.likesCount}
                    </span>
                  </Button>
                  {currentUser?.id === comment.userId && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={!token || isSubmitting}
                      className='text-muted-foreground hover:text-destructive p-1 h-auto'
                      aria-label='Delete comment'
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}{' '}
      {/* Fallback für den Fall, dass initialLoadDone false ist, aber nicht isLoading (sollte durch obige Logik abgedeckt sein) */}
      {currentUser && token && (
        <div className='space-y-3 pt-4 border-t border-border'>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              currentUser.name
                ? `${currentUser.name}, was denkst du?`
                : 'Dein Kommentar...'
            }
            rows={2}
            className='text-sm rounded-md bg-background'
            disabled={isSubmitting}
          />

          {(gifUrl || imageUrl) && (
            <div className='relative w-fit max-w-[150px]'>
              <img
                src={gifUrl || imageUrl || ''}
                alt='Vorschau Anhang'
                className='max-h-24 rounded-md border object-contain bg-muted/30'
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

          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div className='flex items-center gap-1'>
              {gf && (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  onClick={() => {
                    setShowGifPicker((p) => !p);
                    if (showGifPicker) setGifSearchTerm('');
                  }}
                  disabled={!!imageUrl || isSubmitting}
                  className={`text-muted-foreground hover:text-primary h-9 w-9 ${showGifPicker ? 'bg-accent text-accent-foreground' : ''}`}
                  aria-label={
                    showGifPicker ? 'GIF-Auswahl schließen' : 'GIF auswählen'
                  }
                >
                  <Clapperboard className='h-5 w-5' />
                </Button>
              )}
              <label
                className={`inline-flex items-center justify-center rounded-md text-sm font-medium h-9 w-9 ${!!gifUrl || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer text-muted-foreground hover:text-primary hover:bg-accent hover:text-accent-foreground'}`}
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
            <Button
              onClick={submitComment}
              disabled={isSubmitting || (!text.trim() && !gifUrl && !imageUrl)}
              size='sm'
              className='min-w-[80px]'
            >
              {isSubmitting ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <>
                  <Send className='h-4 w-4 mr-2' />
                  Posten
                </>
              )}
            </Button>
          </div>

          {showGifPicker && gf && (
            <div className='mt-2 border rounded-lg bg-background shadow-sm overflow-hidden'>
              <input
                type='text'
                placeholder='GIFs suchen...'
                value={gifSearchTerm}
                onChange={(e) => setGifSearchTerm(e.target.value)}
                className='w-full px-3 py-2 border-b text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-transparent'
                disabled={isSubmitting}
                aria-label='GIFs durchsuchen'
              />
              <div className='max-h-60 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent'>
                <Grid
                  key={gifSearchTerm.trim() || 'trending_gifs'}
                  width={
                    typeof window !== 'undefined'
                      ? Math.min(window.innerWidth - 90, 500)
                      : 300
                  }
                  columns={3}
                  gutter={4}
                  fetchGifs={(offset: number): Promise<GifsResult> =>
                    gf[gifSearchTerm.trim() ? 'search' : 'trending'](
                      gifSearchTerm.trim() || 'trending',
                      { offset, limit: 12, type: 'gifs' }
                    ).catch((err) => {
                      console.error('Giphy fetch error:', err);
                      return {
                        data: [],
                        pagination: { total_count: 0, count: 0, offset: 0 },
                        meta: { status: 500, msg: 'Error', response_id: '' },
                      };
                    })
                  }
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
          {showGifPicker && !gf && (
            <p className='text-xs text-destructive mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md'>
              GIF-Funktion ist nicht verfügbar (API Key fehlt oder ist
              ungültig).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
