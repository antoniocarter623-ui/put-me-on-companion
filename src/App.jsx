import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously, 
  onAuthStateChanged,
  signOut,
  updateProfile
} from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  onValue, 
  push, 
  set, 
  remove, 
  serverTimestamp, 
  runTransaction,
  onDisconnect 
} from 'firebase/database';
import { 
  Music, 
  ListMusic, 
  Trophy, 
  Heart, 
  User, 
  Radio, 
  CheckCircle2, 
  Headphones, 
  Send, 
  LogOut, 
  Copy, 
  Search, 
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAqFyBcFyeLQwQjTfWpgo8Na9VqEvvEOgw",
  authDomain: "putmeon-app.firebaseapp.com",
  databaseURL: "https://putmeon-app-default-rtdb.firebaseio.com",
  projectId: "putmeon-app",
  storageBucket: "putmeon-app.firebasestorage.app",
  messagingSenderId: "511138193782",
  appId: "1:511138193782:web:9552a25fea51031dce1a57"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// --- UTILITIES ---

const calculateRank = (votes) => {
  if (votes > 50) return "Exec Producer";
  if (votes > 20) return "A&R Scout";
  if (votes > 5) return "Junior Critic";
  return "Rookie Listener";
};

const copyToClipboard = (text, showToast) => {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`Copied: ${text}`);
  }).catch(() => {
    // Fallback for some mobile browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast(`Copied: ${text}`);
    } catch (err) {
      showToast("Failed to copy");
    }
    document.body.removeChild(textArea);
  });
};

const openSpotify = (query) => {
  window.open(`https://open.spotify.com/search/${encodeURIComponent(query)}`, '_blank');
};

// --- COMPONENTS ---

const Toast = ({ message, show }) => (
  <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl border border-slate-700 transition-all duration-300 z-50 flex items-center gap-2 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
    <CheckCircle2 size={16} className="text-green-500" />
    <span className="text-sm font-bold">{message}</span>
  </div>
);

const AuthScreen = ({ onLogin, error, setError }) => {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return setError("Please fill in all fields");
    if (mode === 'register' && !handle) return setError("Handle is required");
    
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Create user profile in DB
        await set(ref(db, 'users/' + cred.user.uid), {
          handle: handle,
          email: email,
          joined: serverTimestamp(),
          stats: { totalVotes: 0, totalScoreSum: 0 }
        });
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      const cred = await signInAnonymously(auth);
      const guestName = `Guest_${Math.floor(Math.random() * 1000)}`;
      await set(ref(db, 'users/' + cred.user.uid), {
        handle: guestName,
        isGuest: true,
        stats: { totalVotes: 0 }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-white overflow-y-auto">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce">🎵</div>
          <h1 className="text-4xl font-black mb-2 uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
            Put Me On
          </h1>
          <p className="text-slate-400 font-medium">Class is in session.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl mb-6">
          <h2 className="text-xl font-bold text-white mb-6">
            {mode === 'login' ? 'Sign In' : 'Create Profile'}
          </h2>

          {mode === 'register' && (
            <div className="mb-4">
              <label className="text-xs font-bold text-yellow-500 uppercase mb-1 block ml-1">Public Identity</label>
              <input 
                value={handle} onChange={e => setHandle(e.target.value)}
                placeholder="@TikTokName" 
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-yellow-500 transition-all"
              />
            </div>
          )}

          <div className="space-y-3 mb-6">
            <input 
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email" 
              className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-yellow-500 transition-all"
            />
            <input 
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password" 
              className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-yellow-500 transition-all"
            />
          </div>

          {error && (
            <div className="mb-4 bg-red-900/20 border border-red-900/50 p-3 rounded-xl flex items-center gap-2 text-red-400 text-xs font-bold">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-black text-lg py-3 rounded-xl shadow-lg shadow-yellow-500/20 transition-all active:scale-95 flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? 'ENTER CLASS' : 'CREATE ACCOUNT')}
          </button>
          
          <div className="mt-4 text-center text-sm text-slate-400">
            {mode === 'login' ? "New here?" : "Already have an account?"}
            <button 
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="ml-2 text-white font-bold hover:text-yellow-400 underline transition-colors"
            >
              {mode === 'login' ? "Create Account" : "Sign In"}
            </button>
          </div>
        </div>

        <button onClick={handleGuest} className="w-full text-slate-500 font-bold text-sm hover:text-white transition-colors">
          Just Watching? (Guest Mode)
        </button>
      </div>
    </div>
  );
};

const ProfileModal = ({ user, userData, onClose }) => {
  if (!userData) return null;
  
  const votes = userData.stats?.totalVotes || 0;
  const scoreSum = userData.stats?.totalScoreSum || 0;
  const avg = votes > 0 ? (scoreSum / votes).toFixed(1) : "0.0";
  const rank = calculateRank(votes);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full max-w-xs rounded-3xl border border-slate-800 p-6 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 rounded-full p-1">
          <X size={20} />
        </button>
        
        <div className="text-center mb-8 mt-2">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-black text-black border-4 border-slate-800 shadow-xl">
            {userData.handle?.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-2xl font-black text-white mb-1">{userData.handle}</h2>
          <div className="inline-block bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
            <div className="text-xs font-bold uppercase text-yellow-500 tracking-widest">{rank}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-950 p-4 rounded-2xl text-center border border-slate-800">
            <div className="text-2xl font-black text-white mb-1">{votes}</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Graded</div>
          </div>
          <div className="bg-slate-950 p-4 rounded-2xl text-center border border-slate-800">
            <div className="text-2xl font-black text-blue-400 mb-1">{avg}</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Avg Score</div>
          </div>
        </div>

        <button 
          onClick={() => signOut(auth)} 
          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 border border-red-500/20"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
};

const Header = ({ userData, connected, onOpenProfile }) => (
  <header className="px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-white/5 flex justify-between items-center z-10 sticky top-0">
    <div className="font-black text-yellow-500 tracking-widest flex items-center gap-2">
      PMO 
      <span className="text-white text-[10px] font-bold bg-slate-700 px-1.5 py-0.5 rounded">LIVE</span>
    </div>
    <div className="flex items-center gap-3">
      <button 
        onClick={onOpenProfile}
        className="flex items-center gap-2 bg-slate-800 pl-2 pr-3 py-1 rounded-full border border-slate-700 hover:bg-slate-700 transition-all active:scale-95"
      >
        <div className="w-5 h-5 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center text-[10px] font-black text-black">
          {userData?.handle?.charAt(0).toUpperCase() || <User size={12}/>}
        </div>
        <div className="text-xs font-bold text-slate-300 max-w-[80px] truncate">{userData?.handle || 'Guest'}</div>
      </button>
      
      {/* Status Dot */}
      <div className="relative flex h-3 w-3">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connected ? 'bg-green-400' : 'bg-red-400'}`}></span>
        <span className={`relative inline-flex rounded-full h-3 w-3 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
      </div>
    </div>
  </header>
);

const Slider = ({ label, value, onChange, color = "text-slate-400" }) => (
  <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5">
    <div className="flex justify-between text-xs font-bold mb-2">
      <span className={color}>{label}</span> 
      <span className="text-white">{value}</span>
    </div>
    <input 
      type="range" min="0" max="10" step="0.5" value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
    />
  </div>
);

const LiveTab = ({ currentTrack, votingOpen, onSubmitVote, hasVoted, favorites, onToggleFav }) => {
  const [scores, setScores] = useState({ flow: 0, beat: 0, bars: 0, vibe: 0, aes: 0 });
  const isFav = currentTrack && favorites[`${currentTrack.artist}_${currentTrack.song}`.replace(/[.#$/[\]]/g, "_")];

  useEffect(() => {
    setScores({ flow: 0, beat: 0, bars: 0, vibe: 0, aes: 0 });
  }, [currentTrack?.id]);

  const updateScore = (key, val) => setScores(prev => ({ ...prev, [key]: val }));
  const totalScore = Math.round((scores.flow + scores.beat + scores.bars + scores.vibe + scores.aes) * 2);

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* NOW PLAYING CARD */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 border border-slate-700 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-lg z-10 flex items-center gap-1 animate-pulse">
          ON AIR
        </div>
        
        <div className="flex justify-between items-start mb-2 relative z-10">
          <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-1">
            <Music size={10} /> Current Track
          </h3>
          <button 
            onClick={() => currentTrack && onToggleFav(currentTrack.artist, currentTrack.song)}
            className={`transition-all active:scale-90 ${isFav ? 'text-red-500 fill-red-500' : 'text-slate-600 hover:text-slate-400'}`}
          >
            <Heart size={24} fill={isFav ? "currentColor" : "none"} />
          </button>
        </div>
        
        <div className="relative z-10 mt-2">
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-1 truncate">
            {currentTrack ? currentTrack.artist : "STANDBY..."}
          </h1>
          <h2 className="text-lg text-purple-400 font-bold truncate">
            {currentTrack ? (currentTrack.song || "Untitled") : "Waiting for host..."}
          </h2>
          <div className={`flex items-center gap-2 mt-4 text-xs text-slate-500 transition-opacity duration-500 ${currentTrack ? 'opacity-100' : 'opacity-0'}`}>
            <User size={12} />
            <span>Submitted by: {currentTrack?.user || "---"}</span>
          </div>
        </div>

        {/* Decorative Glow */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* GRADING AREA */}
      <div className="bg-slate-900/50 rounded-2xl p-1 border border-slate-800">
        {!currentTrack ? (
           <div className="text-center py-12 px-6">
             <Headphones className="mx-auto text-slate-700 mb-4 h-12 w-12" />
             <h3 className="text-slate-400 font-bold">Listen Mode</h3>
             <p className="text-xs text-slate-600 mt-2">Grading opens when the host starts the track.</p>
           </div>
        ) : !votingOpen ? (
          <div className="text-center py-12 px-6">
            <div className="animate-pulse"><Headphones className="mx-auto text-yellow-600/50 mb-4 h-12 w-12" /></div>
            <h3 className="text-slate-300 font-bold">Listen Closely...</h3>
            <p className="text-xs text-slate-500 mt-2">Grading will unlock shortly.</p>
          </div>
        ) : hasVoted ? (
          <div className="text-center py-12 px-6">
            <CheckCircle2 className="mx-auto text-green-500 mb-4 h-12 w-12" />
            <h3 className="text-white font-bold text-xl">Grade Recorded</h3>
            <p className="text-xs text-slate-500 mt-2">Sit tight for the score reveal!</p>
          </div>
        ) : (
          <div className="p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <p className="text-green-400 font-bold uppercase text-xs">Grading Open</p>
              </div>
              <div className="text-3xl font-black text-white tabular-nums tracking-tighter">{totalScore}</div>
            </div>

            <div className="space-y-3 mb-6">
              <Slider label="Flow" value={scores.flow} onChange={(v) => updateScore('flow', v)} />
              <Slider label="Beat" value={scores.beat} onChange={(v) => updateScore('beat', v)} />
              <Slider label="Bars" value={scores.bars} onChange={(v) => updateScore('bars', v)} />
              <Slider label="Vibe" value={scores.vibe} onChange={(v) => updateScore('vibe', v)} />
              <Slider label="Aesthetic" value={scores.aes} onChange={(v) => updateScore('aes', v)} color="text-yellow-500" />
            </div>

            <button 
              onClick={() => onSubmitVote(scores, totalScore)} 
              className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              SUBMIT GRADE <Send size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const QueueTab = ({ queue, onSubmitSong, isSubmitting }) => {
  const [artist, setArtist] = useState('');
  const [song, setSong] = useState('');

  const submit = () => {
    if (!artist.trim()) return;
    onSubmitSong(artist, song);
    setArtist('');
    setSong('');
  };

  return (
    <div className="p-4 h-full overflow-y-auto pb-24">
      <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
        <Send className="text-yellow-500" /> SUBMIT SONG
      </h2>
      
      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 mb-8 shadow-lg">
        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block ml-1">Artist Name</label>
        <input 
          value={artist} onChange={(e) => setArtist(e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 focus:border-yellow-500 p-3 rounded-xl mb-3 text-white outline-none" 
          placeholder="e.g. Drake"
        />
        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block ml-1">Song Title</label>
        <input 
          value={song} onChange={(e) => setSong(e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 focus:border-yellow-500 p-3 rounded-xl mb-4 text-white outline-none" 
          placeholder="e.g. God's Plan"
        />
        <button 
          onClick={submit} disabled={!artist.trim() || isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
        >
          {isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : 'ADD TO QUEUE'}
        </button>
      </div>

      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Up Next</h3>
      <div className="flex flex-col gap-2">
        {queue.length === 0 ? (
          <div className="text-center text-slate-600 py-8 italic">Queue is empty.</div>
        ) : (
          queue.map((item, idx) => (
            <div key={item.key} className="bg-slate-800/50 p-3 rounded-xl flex justify-between items-center border border-white/5">
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="text-slate-600 font-bold text-sm w-4">{idx + 1}</span>
                <div className="min-w-0">
                  <div className="font-bold text-white text-sm truncate">{item.artist}</div>
                  <div className="text-xs text-slate-400 truncate">{item.song || 'Untitled'}</div>
                </div>
              </div>
              <div className="text-[10px] font-bold text-slate-500 bg-slate-900 px-2 py-1 rounded-md whitespace-nowrap">
                {item.user}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const BoardTab = ({ history, favorites, onToggleFav, showToast }) => {
  return (
    <div className="p-4 h-full overflow-y-auto pb-24">
      <h2 className="text-2xl font-black text-yellow-500 mb-2 flex items-center gap-2">
        <Trophy className="text-yellow-500" /> HONOR ROLL
      </h2>
      <p className="text-xs text-slate-500 mb-6">Tap hearts to save to your crate.</p>
      
      <div className="flex flex-col gap-3">
        {history.length === 0 ? (
          <div className="text-center text-slate-600 py-10 italic">Scores will appear here after grading.</div>
        ) : (
          history.map((item, i) => {
            const isFav = favorites[`${item.artist}_${item.song}`.replace(/[.#$/[\]]/g, "_")];
            const fullTitle = `${item.artist} - ${item.song}`;

            return (
              <div key={item.key} className="bg-slate-800 p-4 rounded-xl flex justify-between items-center border border-slate-700 shadow-sm">
                <div className="flex items-center gap-4 min-w-0 flex-1 mr-2">
                  <div className={`
                    flex items-center justify-center w-8 h-8 shrink-0 rounded-full font-black text-sm
                    ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-slate-400 text-black' : i === 2 ? 'bg-orange-700 text-white' : 'bg-slate-700 text-slate-400'}
                  `}>#{i + 1}</div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm truncate">{item.artist}</div>
                    <div className="text-xs text-slate-400 truncate">{item.song}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onToggleFav(item.artist, item.song)}
                    className={`p-2 rounded-full ${isFav ? 'text-red-500 bg-red-500/10' : 'text-slate-600 bg-slate-700 hover:text-white'}`}
                  >
                    <Heart size={14} fill={isFav ? "currentColor" : "none"} />
                  </button>
                  <button 
                    onClick={() => copyToClipboard(fullTitle, showToast)}
                    className="p-2 rounded-full text-slate-400 bg-slate-700 hover:text-white"
                  >
                    <Copy size={14} />
                  </button>
                  <div className="font-black text-xl text-white bg-slate-900/50 px-3 py-1 rounded-lg tabular-nums min-w-[3.5rem] text-center">
                    {item.score}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const CrateTab = ({ favoritesList, onToggleFav, showToast }) => {
  return (
    <div className="p-4 h-full overflow-y-auto pb-24">
      <h2 className="text-2xl font-black text-red-500 mb-2 flex items-center gap-2">
        <Heart className="text-red-500 fill-red-500" /> MY CRATE
      </h2>
      <p className="text-xs text-slate-500 mb-6">Your private collection of favorites.</p>

      <div className="flex flex-col gap-3">
        {favoritesList.length === 0 ? (
          <div className="text-center text-slate-600 py-12 italic">You haven't saved any songs yet.</div>
        ) : (
          favoritesList.map((item) => {
             const fullTitle = `${item.artist} - ${item.song}`;
             return (
              <div key={item.key} className="bg-slate-800 p-4 rounded-xl flex justify-between items-center border border-slate-700">
                <div className="min-w-0 flex-1 mr-4">
                  <div className="font-bold text-white text-sm truncate">{item.artist}</div>
                  <div className="text-xs text-slate-400 truncate">{item.song}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onToggleFav(item.artist, item.song)}
                    className="w-8 h-8 rounded-full bg-red-900/20 hover:bg-red-900/50 text-red-500 flex items-center justify-center border border-red-900/30"
                  >
                    <Heart size={14} fill="currentColor"/>
                  </button>
                  <button 
                    onClick={() => copyToClipboard(fullTitle, showToast)}
                    className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300"
                  >
                    <Copy size={14} />
                  </button>
                  <button 
                    onClick={() => openSpotify(fullTitle)}
                    className="w-8 h-8 rounded-full bg-green-900/20 hover:bg-green-600 flex items-center justify-center text-green-500 hover:text-white border border-green-900/30 transition-colors"
                  >
                    <Search size={14} />
                  </button>
                </div>
              </div>
             );
          })
        )}
      </div>
    </div>
  );
};

const BottomNav = ({ activeTab, onChange }) => {
  const tabs = [
    { id: 'live', icon: Radio, label: 'Class' },
    { id: 'queue', icon: ListMusic, label: 'Queue' },
    { id: 'board', icon: Trophy, label: 'Grades' },
    { id: 'crate', icon: Heart, label: 'Crate' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-lg border-t border-white/10 flex justify-around py-2 pb-safe-area z-40 h-[80px]">
      {tabs.map(tab => (
        <button 
          key={tab.id}
          onClick={() => onChange(tab.id)} 
          className={`flex flex-col items-center justify-center gap-1 w-1/4 transition-colors ${activeTab === tab.id ? 'text-yellow-500' : 'text-slate-600 hover:text-slate-400'}`}
        >
          <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-wide">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

// --- MAIN APP ---

export default function App() {
  const [currentUser, setCurrentUser] = useState(null); // Auth object
  const [userData, setUserData] = useState(null); // DB Profile data
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('live');
  const [showProfile, setShowProfile] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  
  // Data States
  const [currentTrack, setCurrentTrack] = useState(null);
  const [votingOpen, setVotingOpen] = useState(false);
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [votedSongs, setVotedSongs] = useState([]);
  const [favorites, setFavorites] = useState({}); // Object map for fast lookup
  const [favoritesList, setFavoritesList] = useState([]); // Array for list view
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- AUTH & USER DATA ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Fetch User Data
        const userRef = ref(db, 'users/' + user.uid);
        onValue(userRef, (snap) => {
           const data = snap.val();
           if(data) setUserData({ ...data, uid: user.uid });
        });
        
        // Fetch Favorites
        const favRef = ref(db, `users/${user.uid}/favorites`);
        onValue(favRef, (snap) => {
          const data = snap.val() || {};
          setFavorites(data);
          // FIX: Correctly map keys so the "key" prop is defined in CrateTab
          const list = Object.entries(data).map(([key, value]) => ({
            ...value,
            key: key
          })).reverse();
          setFavoritesList(list);
        });

        // Presence System
        const connectedRef = ref(db, ".info/connected");
        const userStatusRef = ref(db, `attendance/${user.uid}`);
        
        onValue(connectedRef, (snap) => {
          if (snap.val() === true) {
            setConnected(true);
            const onDisconnectRef = onDisconnect(userStatusRef);
            onDisconnectRef.set({
              state: 'offline',
              last_changed: serverTimestamp(),
              handle: userData?.handle || 'User'
            }).then(() => {
              set(userStatusRef, {
                state: 'online',
                last_changed: serverTimestamp(),
                handle: userData?.handle || 'User'
              });
            });
          } else {
            setConnected(false);
          }
        });

      } else {
        setCurrentUser(null);
        setUserData(null);
        setFavorites({});
        setFavoritesList([]);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [userData?.handle]); // Re-run presence if handle loads late

  // --- GENERAL DATA LISTENERS ---
  useEffect(() => {
    if (!currentUser) return;

    // Now Playing
    const unsubNow = onValue(ref(db, 'streamState/nowPlaying'), (snap) => {
      const data = snap.val();
      setCurrentTrack(data && data.artist ? data : null);
    });

    // Voting State
    const unsubVote = onValue(ref(db, 'streamState/votingOpen'), (snap) => {
      setVotingOpen(snap.val() === true);
    });

    // Queue
    const unsubQueue = onValue(ref(db, 'queue'), (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.keys(data).map(key => ({ ...data[key], key }))
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setQueue(arr);
      } else {
        setQueue([]);
      }
    });

    // History/Leaderboard
    const unsubHistory = onValue(ref(db, 'history'), (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.keys(data).map(key => ({ ...data[key], key }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 15);
        setHistory(arr);
      } else {
        setHistory([]);
      }
    });

    // Local Voted Cache
    const savedVotes = JSON.parse(localStorage.getItem('votedSongs') || '[]');
    setVotedSongs(savedVotes);

    return () => {
      unsubNow();
      unsubVote();
      unsubQueue();
      unsubHistory();
    };
  }, [currentUser]);

  // --- ACTIONS ---

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleVote = async (scores, total) => {
    if (!currentTrack || !currentTrack.id || !currentUser) return;
    
    try {
      // 1. Record Vote
      await push(ref(db, 'votes/' + currentTrack.id), {
        user: userData.handle,
        uid: currentUser.uid,
        scores: scores,
        total: total,
        timestamp: serverTimestamp()
      });

      // 2. Update User Stats (Atomic Transaction)
      const statsRef = ref(db, `users/${currentUser.uid}/stats`);
      await runTransaction(statsRef, (currentStats) => {
        if (!currentStats) {
          return { totalVotes: 1, totalScoreSum: total };
        }
        return {
          totalVotes: (currentStats.totalVotes || 0) + 1,
          totalScoreSum: (currentStats.totalScoreSum || 0) + total
        };
      });

      // 3. Local State
      const newVoted = [...votedSongs, currentTrack.id];
      setVotedSongs(newVoted);
      localStorage.setItem('votedSongs', JSON.stringify(newVoted));
      
      showToast("Grade Submitted!");
    } catch (e) {
      console.error("Vote failed", e);
      showToast("Error submitting grade");
    }
  };

  const handleSubmitSong = async (artist, song) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    try {
      await push(ref(db, 'queue'), {
        artist: artist,
        song: song || 'Untitled',
        user: userData.handle,
        uid: currentUser.uid,
        tier: 'regular',
        timestamp: serverTimestamp()
      });
      setActiveTab('queue');
      showToast("Sent to Queue!");
    } catch (e) {
      console.error("Submit failed", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFavorite = async (artist, song) => {
    if (!currentUser) return;
    const songKey = `${artist}_${song}`.replace(/[.#$/[\]]/g, "_");
    const favRef = ref(db, `users/${currentUser.uid}/favorites/${songKey}`);
    
    if (favorites[songKey]) {
      await remove(favRef);
      showToast("Removed from Crate");
    } else {
      await set(favRef, {
        artist,
        song,
        addedAt: serverTimestamp()
      });
      showToast("Saved to Crate❤️");
    }
  };

  if (authLoading) return <div className="h-screen bg-slate-950 flex items-center justify-center text-white"><Loader2 className="animate-spin" size={48} /></div>;

  if (!currentUser) return <AuthScreen onLogin={() => {}} error={authError} setError={setAuthError} />;

  return (
    <div className="bg-slate-950 h-screen text-white font-sans flex flex-col overflow-hidden max-w-md mx-auto shadow-2xl border-x border-slate-900">
      <Header userData={userData} connected={connected} onOpenProfile={() => setShowProfile(true)} />
      
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'live' && (
          <LiveTab 
            currentTrack={currentTrack} 
            votingOpen={votingOpen}
            onSubmitVote={handleVote}
            hasVoted={currentTrack ? votedSongs.includes(currentTrack.id) : false}
            favorites={favorites}
            onToggleFav={toggleFavorite}
          />
        )}
        {activeTab === 'queue' && (
          <QueueTab 
            queue={queue}
            onSubmitSong={handleSubmitSong}
            isSubmitting={isSubmitting}
          />
        )}
        {activeTab === 'board' && (
          <BoardTab 
            history={history} 
            favorites={favorites}
            onToggleFav={toggleFavorite}
            showToast={showToast}
          />
        )}
        {activeTab === 'crate' && (
          <CrateTab 
            favoritesList={favoritesList}
            onToggleFav={toggleFavorite}
            showToast={showToast}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
      
      {showProfile && (
        <ProfileModal 
          user={currentUser} 
          userData={userData} 
          onClose={() => setShowProfile(false)} 
        />
      )}
      
      <Toast message={toastMsg} show={!!toastMsg} />
    </div>
  );
}
