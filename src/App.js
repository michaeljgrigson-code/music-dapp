import React, { useState, useEffect } from 'react';
import { BrowserProvider, parseUnits } from 'ethers';
import frankenLogo from './frankenlabs_logo.png';

const RECEIVING_WALLET = '0x7FE522ab4F456cFc41FE7a7a0C94F28801CCA8fc';
const DOWNLOAD_PRICE   = '15';
const SERVER_URL       = 'https://music-dapp.onrender.com';

const genres = [
  'Rock', 'Metal', 'Big Band', 'Jazz', 'Hip Hop', 'Rap', 'Drill', 'Trap',
  'Country', 'Pop', 'Blues', 'Electronic', 'R&B', 'Punk', 'Folk', 'Classical',
  'Reggae', 'Afrobeats', 'Gospel', 'Ambient', 'Soundtrack', 'Indie', 'Emo',
  'Grunge', 'Latin', 'Dancehall', 'Soul', 'Throat Singing', 'Monastery Chanting',
  'Drum and Bass', 'Dubstep',
];

const languages = [
  'English', 'Spanish', 'French', 'German', 'Italian',
  'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Arabic',
  'Hindi', 'Russian', 'Dutch', 'Swedish', 'Polish',
];

const instrumentOptions = [
  'Piano', 'Guitar', 'Bass Guitar', 'Drums', 'Synthesizer', 'Violin', 'Cello',
  'Trumpet', 'Saxophone', 'Flute', 'Organ', 'Harp', 'Banjo', 'Ukulele',
  'Percussion', '808s', 'Sub Bass', 'Lead Synth', 'Pad Synth', 'Arpeggiator',
  'Hi-hats', 'Snare', 'Kick Drum', 'Claps', 'Strings', 'Brass Section',
  'Choir', 'Turntables', 'TR-808', 'Roland 303',
];

const sectionOptions = [
  'Intro', 'Verse 1', 'Verse 2', 'Chorus', 'Pre-Chorus', 'Bridge',
  'Break', 'Drop', 'Build-up', 'Outro', 'Solo', 'Interlude',
];

const styleOptions = [
  'Electronic', 'Dubstep', 'Drum and Bass', 'Trap', 'Techno', 'House',
  'Ambient', 'Classical', 'Jazz', 'Rock', 'Metal', 'Hip Hop', 'Lo-fi',
  'Cinematic', 'Orchestral', 'Minimal', 'Psychedelic', 'Funk', 'Soul',
  'Reggae', 'Afrobeats', 'Latin', 'Blues', 'Country', 'Folk',
];

const lengthOptions = ['1:00', '1:30', '2:00', '2:30', '3:00', '3:30'];

const modesRow1 = [
  { id: 'topic', label: '💡 Song topic' },
  { id: 'own',   label: '✏️ My own lyrics' },
];
const modesRow2 = [
  { id: 'poem',         label: '📜 Poem' },
  { id: 'haiku',        label: '🌸 Haiku' },
  { id: 'instrumental', label: '🎹 Instrumental' },
];

const isMobile = () => window.innerWidth < 768;

export default function App() {
  const [prompt, setPrompt]                 = useState('');
  const [genresSelected, setGenresSelected] = useState(['Rock']);
  const [artist, setArtist]                 = useState('');
  const [language, setLanguage]             = useState('English');
  const [mode, setMode]                     = useState('topic');
  const [step, setStep]                     = useState('idle');
  const [lyrics, setLyrics]                 = useState('');
  const [music, setMusic]                   = useState(null);
  const [status, setStatus]                 = useState('');
  const [copied, setCopied]                 = useState(false);
  const [payError, setPayError]             = useState('');
  const [walletAddress, setWalletAddress]   = useState(null);
  const [view, setView]                     = useState('home');
  const [sharedSong, setSharedSong]         = useState(null);
  const [loadingShared, setLoadingShared]   = useState(false);
  const [mobile, setMobile]                 = useState(isMobile());
  const [songLength, setSongLength]         = useState('2:00');
  const [instrInstruments, setInstrInstruments] = useState([]);
  const [instrSections, setInstrSections]   = useState([
    { label: 'Intro', style: 'Ambient' },
    { label: 'Verse 1', style: 'Electronic' },
  ]);

  useEffect(() => {
    const handleResize = () => setMobile(isMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/health`).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const songId = params.get('song');
    if (songId) {
      setLoadingShared(true);
      fetch(`${SERVER_URL}/api/song/${songId}`)
        .then(r => r.json())
        .then(data => { setSharedSong(data.song); setLoadingShared(false); setView('shared'); })
        .catch(() => setLoadingShared(false));
    }
  }, []);

  useEffect(() => {
    if (window.ethereum?.selectedAddress) setWalletAddress(window.ethereum.selectedAddress);
    window.ethereum?.on('accountsChanged', (accounts) => setWalletAddress(accounts[0] || null));
  }, []);

  useEffect(() => { setMusic(null); setPayError(''); }, [lyrics]);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) throw new Error('MetaMask not found');
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletAddress(accounts[0]);
    } catch (err) { console.error('Wallet connect error:', err.message); }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
  };

  const toggleGenre = (g) => {
    setGenresSelected(prev => {
      if (prev.includes(g)) { if (prev.length === 1) return prev; return prev.filter(x => x !== g); }
      if (prev.length >= 3) return prev;
      return [...prev, g];
    });
  };

  const toggleInstrument = (inst) => {
    setInstrInstruments(prev =>
      prev.includes(inst) ? prev.filter(x => x !== inst) : [...prev, inst]
    );
  };

  const addSection = () => setInstrSections(prev => [...prev, { label: 'Verse 1', style: 'Electronic' }]);
  const removeSection = (i) => setInstrSections(prev => prev.filter((_, idx) => idx !== i));
  const updateSection = (i, field, value) => setInstrSections(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const isPoemOrHaiku  = mode === 'poem' || mode === 'haiku';
  const isInstrumental = mode === 'instrumental';

  const handleGenerate = async () => {
    if (!prompt) return;
    setStep('generatingLyrics');
    setStatus('Connecting to LightChain network...');
    setLyrics(''); setMusic(null); setPayError('');
    try {
      const promptPayload = mode === 'own' ? `__own__${prompt}` : prompt;
      const res = await fetch(`${SERVER_URL}/api/lyrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptPayload, genre: genresSelected.join(', '), artist, language, mode, length: songLength }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLyrics(data.lyrics || '');
      setStep('lyrics');
      setStatus('');
    } catch (err) { setStatus('Error: ' + err.message); setStep('idle'); }
  };

  const handlePay = async (isInstr = false) => {
    setPayError('');
    setStep('paying');
    try {
      if (!window.ethereum) throw new Error('No wallet detected.');
      const provider = new BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const amount   = parseUnits(DOWNLOAD_PRICE, 18);
      setStatus('Confirm the transaction in your wallet...');
      const tx = await signer.sendTransaction({ to: RECEIVING_WALLET, value: amount });
      setStatus('Transaction submitted, waiting for confirmation...');
      const receipt = await tx.wait(1);
      if (isInstr) {
        await handleGenerateInstrumental(receipt.hash);
      } else {
        await handleGenerateMusic(lyrics, receipt.hash);
      }
    } catch (err) {
      setPayError(
        err.message?.includes('user rejected') ? 'Transaction cancelled.'
        : err.message?.includes('insufficient') ? `Insufficient LCAI. You need ${DOWNLOAD_PRICE} LCAI.`
        : err.message || 'Payment failed.'
      );
      setStep(isInstr ? 'instrReady' : 'lyrics');
    }
  };

  const handleGenerateMusic = async (lyricsText, txHash) => {
    setStep('generatingMusic');
    setStatus('🎵 Generating your song — this takes 1-3 minutes...');
    try {
      const res = await fetch(`${SERVER_URL}/api/music`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics: lyricsText, genre: genresSelected.join(', '), artist, language, txHash, length: songLength }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMusic(data.music);
      setStep('done');
      setStatus('');
    } catch (err) { setStatus('Music generation error: ' + err.message); setStep('lyrics'); }
  };

  const handleGenerateInstrumental = async (txHash) => {
    setStep('generatingMusic');
    setStatus('🎹 Generating your instrumental — this takes 1-3 minutes...');
    try {
      const res = await fetch(`${SERVER_URL}/api/instrumental`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruments: instrInstruments, sections: instrSections, length: songLength, txHash }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMusic(data.music);
      setStep('done');
      setStatus('');
    } catch (err) { setStatus('Instrumental generation error: ' + err.message); setStep('instrReady'); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(lyrics).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const handleDownload = async (audioUrl) => {
    const url = audioUrl || music?.audio_url;
    if (!url) return;
    try {
      const res  = await fetch(url);
      const blob = await res.blob();
      const burl = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = burl; a.download = 'LyricsAI-song.mp3'; a.click();
      URL.revokeObjectURL(burl);
    } catch { window.open(url, '_blank'); }
  };

  const S = {
    app: {
      minHeight: '100vh',
      background: `radial-gradient(ellipse at 20% 50%, #3a0a0a 0%, transparent 60%), radial-gradient(ellipse at 80% 30%, #0a0a3a 0%, transparent 60%), radial-gradient(ellipse at 50% 80%, #1a0a2a 0%, transparent 50%), #0a0a0a`,
      color: 'white', padding: mobile ? '0 0 2rem 0' : '2rem 2rem 2rem 200px', fontFamily: 'inherit',
    },
    sidebar: {
      position: 'fixed', left: 0, top: 0, height: '100vh', width: '180px',
      background: 'rgba(0,0,0,0.7)', borderRight: '1px solid rgba(51,255,102,0.2)',
      display: mobile ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '1rem', padding: '1.5rem 1rem', zIndex: 100,
    },
    mobileHeader: {
      display: mobile ? 'flex' : 'none', alignItems: 'center', gap: '0.75rem',
      padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.7)',
      borderBottom: '1px solid rgba(51,255,102,0.2)', position: 'sticky', top: 0, zIndex: 100,
    },
    mainContent: { padding: mobile ? '1.25rem 1rem' : '0' },
    title: {
      textAlign: 'center', fontSize: mobile ? '2rem' : '3rem', fontWeight: 900,
      letterSpacing: mobile ? '2px' : '4px', textTransform: 'uppercase',
      background: 'linear-gradient(135deg,#ff4400,#ff0088,#aa00ff,#ff4400)',
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      marginBottom: '0.5rem', marginTop: mobile ? '1rem' : '0',
    },
    sub: { textAlign: 'center', color: '#666', letterSpacing: '6px', textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: '2rem' },
    card: {
      maxWidth: '600px', margin: '0 auto 1.5rem',
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,68,0,0.2)',
      borderRadius: '12px', padding: mobile ? '1rem' : '1.25rem',
    },
    instrCard: {
      maxWidth: '600px', margin: '0 auto 1.5rem',
      background: 'rgba(100,0,255,0.05)', border: '1px solid rgba(100,0,255,0.25)',
      borderRadius: '12px', padding: mobile ? '1rem' : '1.25rem',
    },
    label:    { display: 'block', color: '#aaa', marginBottom: '0.5rem', fontSize: '0.85rem', letterSpacing: '2px', textTransform: 'uppercase' },
    sublabel: { color: '#555', fontSize: '0.75rem', marginBottom: '0.75rem', display: 'block' },
    textarea: {
      width: '100%', background: 'rgba(0,0,0,0.4)', borderRadius: '8px',
      padding: '1rem', color: 'white', border: '1px solid rgba(255,68,0,0.3)',
      resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '1rem', outline: 'none',
    },
    input: {
      width: '100%', background: 'rgba(0,0,0,0.4)', borderRadius: '8px',
      padding: '0.9rem 1rem', color: 'white', border: '1px solid rgba(255,68,0,0.3)',
      boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '1rem', outline: 'none',
    },
    select: {
      background: 'rgba(0,0,0,0.4)', borderRadius: '6px', padding: '0.5rem 0.75rem',
      color: 'white', border: '1px solid rgba(100,0,255,0.3)', fontFamily: 'inherit',
      fontSize: '0.85rem', outline: 'none', cursor: 'pointer',
    },
    btnWrap:  { display: 'flex', flexWrap: 'wrap', gap: '0.6rem' },
    modeBtn:  (active) => ({
      padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
      background: active ? 'linear-gradient(135deg,#ff4400,#aa00ff)' : 'rgba(0,0,0,0.4)',
      border: active ? '1px solid transparent' : '1px solid rgba(255,68,0,0.3)',
      color: active ? 'white' : '#888', fontSize: mobile ? '0.82rem' : '0.9rem',
    }),
    genreBtn: (active, maxed) => ({
      padding: '0.4rem 0.85rem', borderRadius: '999px',
      cursor: maxed && !active ? 'not-allowed' : 'pointer',
      background: active ? 'linear-gradient(135deg,#ff4400,#aa00ff)' : 'transparent',
      border: active ? '1px solid transparent' : '1px solid rgba(255,68,0,0.3)',
      color: active ? 'white' : maxed ? '#444' : '#888',
      fontWeight: active ? 'bold' : 'normal', fontSize: '0.82rem', opacity: maxed && !active ? 0.4 : 1,
    }),
    instrBtn: (active) => ({
      padding: '0.4rem 0.85rem', borderRadius: '999px', cursor: 'pointer',
      background: active ? 'linear-gradient(135deg,#6400ff,#aa00ff)' : 'transparent',
      border: active ? '1px solid transparent' : '1px solid rgba(100,0,255,0.3)',
      color: active ? 'white' : '#888', fontWeight: active ? 'bold' : 'normal', fontSize: '0.82rem',
    }),
    lengthBtn: (active) => ({
      padding: '0.4rem 0.85rem', borderRadius: '8px', cursor: 'pointer',
      background: active ? 'linear-gradient(135deg,#6400ff,#aa00ff)' : 'transparent',
      border: active ? '1px solid transparent' : '1px solid rgba(100,0,255,0.3)',
      color: active ? 'white' : '#888', fontWeight: active ? 'bold' : 'normal', fontSize: '0.85rem',
    }),
    langBtn: (active) => ({
      padding: '0.4rem 0.85rem', borderRadius: '999px', cursor: 'pointer',
      background: active ? 'linear-gradient(135deg,#0066ff,#aa00ff)' : 'transparent',
      border: active ? '1px solid transparent' : '1px solid rgba(0,100,255,0.3)',
      color: active ? 'white' : '#888', fontWeight: active ? 'bold' : 'normal', fontSize: '0.82rem',
    }),
    primaryBtn: (disabled) => ({
      width: '100%',
      background: disabled ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#ff4400,#ff0088,#aa00ff)',
      color: disabled ? '#444' : 'white', border: 'none', borderRadius: '8px', padding: '1rem',
      fontSize: '1.1rem', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase',
      cursor: disabled ? 'default' : 'pointer',
    }),
    purpleBtn: (disabled) => ({
      width: '100%',
      background: disabled ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#6400ff,#aa00ff)',
      color: disabled ? '#444' : 'white', border: 'none', borderRadius: '8px', padding: '1rem',
      fontSize: '1.1rem', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase',
      cursor: disabled ? 'default' : 'pointer',
    }),
    greenBtn: {
      width: '100%', background: 'linear-gradient(135deg,#00cc66,#00aa44)',
      color: 'white', border: 'none', borderRadius: '8px', padding: '0.9rem',
      fontSize: '1rem', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer',
    },
    purpleLinkBtn: {
      display: 'block', width: '100%', background: 'linear-gradient(135deg,#0066ff,#aa00ff)',
      color: 'white', border: 'none', borderRadius: '8px', padding: '0.9rem',
      fontSize: '1rem', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase',
      cursor: 'pointer', textAlign: 'center', textDecoration: 'none', marginTop: '0.75rem', boxSizing: 'border-box',
    },
    outlineBtn: {
      background: 'transparent', border: '1px solid rgba(255,68,0,0.4)', color: '#aaa',
      borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold',
    },
    sectionRow: { display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' },
    smallBtn:   { background: 'transparent', border: '1px solid rgba(255,68,0,0.3)', color: '#888', borderRadius: '6px', padding: '0.3rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' },
    removeBtn:  { background: 'transparent', border: '1px solid rgba(255,0,0,0.3)', color: '#ff4444', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer' },
  };

  const isGenerating = step === 'generatingLyrics' || step === 'generatingMusic';
  const showLyrics   = ['lyrics', 'paying', 'generatingMusic', 'done'].includes(step);
  const showPaywall  = step === 'lyrics' && !isPoemOrHaiku;
  const showPaying   = step === 'paying' || step === 'generatingMusic';
  const showMusic    = step === 'done' && music?.audio_url;
  const maxGenres    = genresSelected.length >= 3;

  const generateLabel = () => {
    if (step === 'generatingLyrics') return '✍️ Writing...';
    if (mode === 'poem')  return '📜 Generate Poem (Free)';
    if (mode === 'haiku') return '🌸 Generate Haiku (Free)';
    return '🎸 Generate Lyrics (Free)';
  };

  const outputLabel = () => {
    if (mode === 'poem')  return 'Your Poem';
    if (mode === 'haiku') return 'Your Haiku';
    return 'Your Lyrics';
  };

  const Sidebar = () => (
    <div style={S.sidebar}>
      <img src={frankenLogo} alt="FrankenLabs" style={{ width: '140px', borderRadius: '12px', border: '2px solid rgba(51,255,102,0.4)' }} />
      <div style={{ fontFamily: 'Georgia, serif', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '2px', color: '#33ff66', textAlign: 'center', textTransform: 'uppercase' }}>FRANKENLABS</div>
      <div style={{ color: '#555', fontSize: '0.65rem', letterSpacing: '3px', textTransform: 'uppercase', textAlign: 'center' }}>PRESENTS</div>
    </div>
  );

  const MobileHeader = () => (
    <div style={S.mobileHeader}>
      <img src={frankenLogo} alt="FrankenLabs" style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(51,255,102,0.4)' }} />
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 900, letterSpacing: '2px', color: '#33ff66', textTransform: 'uppercase', lineHeight: 1 }}>FRANKENLABS</div>
        <div style={{ fontSize: '0.55rem', color: '#555', letterSpacing: '2px', textTransform: 'uppercase' }}>PRESENTS</div>
      </div>
    </div>
  );

  const WalletBar = () => (
    <div style={{ maxWidth: '600px', margin: '0 auto 1.5rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
      {walletAddress ? (
        <>
          <span style={{ color: '#00cc66', fontSize: '0.85rem', fontWeight: 'bold' }}>
            ✅ {walletAddress.slice(0,6)}...{walletAddress.slice(-4)}
          </span>
          <button onClick={disconnectWallet} style={{
            background: 'transparent', border: '1px solid #333', color: '#555',
            borderRadius: '8px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem',
          }}>
            Disconnect
          </button>
        </>
      ) : (
        <button onClick={connectWallet} style={{
          background: 'linear-gradient(135deg,#ff4400,#aa00ff)',
          border: 'none', color: 'white', borderRadius: '8px',
          padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold',
        }}>
          🔌 Connect Wallet
        </button>
      )}
    </div>
  );

  if (view === 'shared') {
    return (
      <div style={S.app}>
        <Sidebar /><MobileHeader />
        <div style={S.mainContent}>
          <h1 style={S.title}>🎵 LyricsAI</h1>
          <p style={S.sub}>Powered by LightChain</p>
          {loadingShared && <div style={{ textAlign: 'center', color: '#aa00ff', marginTop: '3rem' }}>⚡ Loading song...</div>}
          {sharedSong && (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ ...S.card, marginBottom: '1.5rem' }}>
                <div style={{ color: '#aaa', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  {sharedSong.genre} · {sharedSong.language}{sharedSong.artist && ` · ${sharedSong.artist} style`}
                </div>
                <pre style={{ whiteSpace: 'pre-wrap', color: '#e5e7eb', lineHeight: '1.8', margin: 0 }}>{sharedSong.lyrics}</pre>
              </div>
              {sharedSong.audio_url && (
                <div style={{ background: 'rgba(255,68,0,0.05)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,68,0,0.3)' }}>
                  <audio controls style={{ width: '100%', marginBottom: '1.25rem' }}><source src={sharedSong.audio_url} type="audio/mpeg" /></audio>
                  <button onClick={() => handleDownload(sharedSong.audio_url)} style={S.greenBtn}>⬇️ Download Song (MP3)</button>
                  <a href="https://lighttunes.win" target="_blank" rel="noopener noreferrer" style={S.purpleLinkBtn}>🌍 Publish on LightTunes</a>
                </div>
              )}
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button onClick={() => { setView('home'); window.history.pushState({}, '', '/'); }} style={S.outlineBtn}>🎵 Create your own song</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={S.app}>
      <Sidebar /><MobileHeader />

      {!mobile && ['♪','♫','♩','♬','♭'].map((n, i) => (
        <div key={i} style={{ position: 'fixed', fontSize: '1.5rem', opacity: 0.08, top: `${15 + i * 15}%`, left: `${5 + i * 18}%`, color: '#ff4400', pointerEvents: 'none', userSelect: 'none' }}>{n}</div>
      ))}

      <div style={S.mainContent}>
        <h1 style={S.title}>🎵 LyricsAI</h1>
        <p style={S.sub}>Powered by LightChain</p>

        <WalletBar />

        {/* Mode selector */}
        <div style={{ maxWidth: '600px', margin: '0 auto 1.5rem' }}>
          <label style={S.label}>What do you want to create?</label>
          <div style={{ ...S.btnWrap, marginBottom: '0.6rem' }}>
            {modesRow1.map(m => (
              <button key={m.id} onClick={() => { setMode(m.id); setPrompt(''); setStep('idle'); setMusic(null); }} style={S.modeBtn(mode === m.id)}>{m.label}</button>
            ))}
          </div>
          <div style={S.btnWrap}>
            {modesRow2.map(m => (
              <button key={m.id} onClick={() => { setMode(m.id); setPrompt(''); setStep('idle'); setMusic(null); }} style={S.modeBtn(mode === m.id)}>{m.label}</button>
            ))}
          </div>
        </div>

        {/* ─── INSTRUMENTAL MODE ─────────────────────────────────────────── */}
        {isInstrumental ? (
          <>
            <div style={S.instrCard}>
              <label style={S.label}>Track Length</label>
              <div style={S.btnWrap}>
                {lengthOptions.map(l => (
                  <button key={l} onClick={() => setSongLength(l)} style={S.lengthBtn(songLength === l)}>{l}</button>
                ))}
              </div>
            </div>

            <div style={S.instrCard}>
              <label style={S.label}>Instruments <span style={{ color: '#555', fontSize: '0.75rem' }}>— pick as many as you like</span></label>
              {instrInstruments.length === 0 && <span style={S.sublabel}>No instruments selected yet</span>}
              <div style={S.btnWrap}>
                {instrumentOptions.map(inst => (
                  <button key={inst} onClick={() => toggleInstrument(inst)} style={S.instrBtn(instrInstruments.includes(inst))}>{inst}</button>
                ))}
              </div>
            </div>

            <div style={S.instrCard}>
              <label style={S.label}>Sections <span style={{ color: '#555', fontSize: '0.75rem' }}>— assign a style to each</span></label>
              {instrSections.map((section, i) => (
                <div key={i} style={S.sectionRow}>
                  <select value={section.label} onChange={e => updateSection(i, 'label', e.target.value)} style={S.select}>
                    {sectionOptions.map(o => <option key={o}>{o}</option>)}
                  </select>
                  <span style={{ color: '#555', fontSize: '0.8rem' }}>→</span>
                  <select value={section.style} onChange={e => updateSection(i, 'style', e.target.value)} style={S.select}>
                    {styleOptions.map(o => <option key={o}>{o}</option>)}
                  </select>
                  {instrSections.length > 1 && (
                    <button onClick={() => removeSection(i)} style={S.removeBtn}>✕</button>
                  )}
                </div>
              ))}
              <button onClick={addSection} style={{ ...S.smallBtn, marginTop: '0.5rem' }}>+ Add Section</button>
            </div>

            {status && <div style={{ maxWidth: '600px', margin: '-1rem auto 1rem', color: '#aa00ff', fontSize: '0.85rem', textAlign: 'center' }}>⚡ {status}</div>}

            {step !== 'done' && (
              <div style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
                {!walletAddress && <div style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>👆 Connect your wallet first</div>}
                <button onClick={() => handlePay(true)} disabled={isGenerating || !walletAddress || instrInstruments.length === 0} style={S.purpleBtn(isGenerating || !walletAddress || instrInstruments.length === 0)}>
                  {isGenerating ? '🎹 Generating...' : `🎹 Pay ${DOWNLOAD_PRICE} LCAI & Generate Instrumental`}
                </button>
                {instrInstruments.length === 0 && <div style={{ color: '#555', fontSize: '0.8rem', textAlign: 'center', marginTop: '0.5rem' }}>Select at least one instrument</div>}
                {payError && <div style={{ color: '#ff4444', fontSize: '0.85rem', marginTop: '0.75rem', textAlign: 'center' }}>❌ {payError}</div>}
              </div>
            )}

            {showPaying && (
              <div style={{ maxWidth: '600px', margin: '0 auto 2rem', textAlign: 'center', color: '#aa00ff', fontSize: '0.95rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎹</div>
                {status || 'Processing...'}
              </div>
            )}

            {showMusic && (
              <div style={{ maxWidth: '600px', margin: '0 auto', background: 'rgba(100,0,255,0.05)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(100,0,255,0.3)' }}>
                <div style={{ color: '#aa00ff', fontWeight: 'bold', marginBottom: '1rem', letterSpacing: '2px', textTransform: 'uppercase' }}>🎹 Your Instrumental</div>
                <audio controls style={{ width: '100%', marginBottom: '1.25rem' }}><source src={music.audio_url} type="audio/mpeg" /></audio>
                <button onClick={() => handleDownload()} style={S.greenBtn}>⬇️ Download (MP3)</button>
                <a href="https://lighttunes.win" target="_blank" rel="noopener noreferrer" style={S.purpleLinkBtn}>🌍 Publish on LightTunes</a>
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <button onClick={() => { setStep('idle'); setMusic(null); }} style={S.outlineBtn}>🎹 Create Another</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* ─── STANDARD MODES ──────────────────────────────────────── */}
            <div style={S.card}>
              <label style={S.label}>
                {mode === 'topic' && "What's your song about?"}
                {mode === 'own'   && 'Paste your lyrics'}
                {mode === 'poem'  && "What's your poem about?"}
                {mode === 'haiku' && "What's your haiku about?"}
              </label>
              {mode === 'haiku' && <span style={S.sublabel}>A haiku is 3 lines: 5 syllables, 7 syllables, 5 syllables</span>}
              <textarea
                style={{ ...S.textarea, height: mode === 'own' ? '200px' : mode === 'haiku' ? '80px' : '120px' }}
                placeholder={
                  mode === 'topic' ? 'e.g. a trucker who misses home, driving through Nevada at 3am...' :
                  mode === 'own'   ? "Paste your lyrics here and we'll style them for you..." :
                  mode === 'poem'  ? 'e.g. the ocean at night, the feeling of being lost...' :
                  'e.g. cherry blossoms falling, a quiet morning...'
                }
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />
              {mode === 'topic' && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,68,0,0.05)', borderRadius: '8px', border: '1px solid rgba(255,68,0,0.15)', fontSize: '0.78rem', color: '#666', lineHeight: '1.6' }}>
                  💡 <span style={{ color: '#888' }}>Pro tip — control each section's style using brackets:</span><br/>
                  <span style={{ color: '#555', fontStyle: 'italic' }}>
                    A song about heaven and earth<br/>
                    [Verse 1: monastery chanting, heavenly feel]<br/>
                    [Chorus: electronic, both worlds colliding]<br/>
                    [Bridge: trap beat, the breaking point]
                  </span>
                </div>
              )}
              {(mode === 'topic' || mode === 'own') && (
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ ...S.label, fontSize: '0.78rem' }}>Track Length</label>
                  <div style={S.btnWrap}>
                    {lengthOptions.map(l => (
                      <button key={l} onClick={() => setSongLength(l)} style={S.lengthBtn(songLength === l)}>{l}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {mode !== 'haiku' && (
              <div style={S.card}>
                <label style={S.label}>{isPoemOrHaiku ? 'Pick a style' : 'Pick up to 3 genres'}</label>
                <span style={S.sublabel}>
                  {mode === 'poem' ? 'Influences the tone and rhythm of the poem' : genresSelected.length === 3 ? '✅ 3 selected — deselect one to change' : `${genresSelected.length} selected`}
                </span>
                <div style={S.btnWrap}>
                  {genres.map(g => (
                    <button key={g} onClick={() => toggleGenre(g)} style={S.genreBtn(genresSelected.includes(g), maxGenres)}>{g}</button>
                  ))}
                </div>
              </div>
            )}

            <div style={S.card}>
              <label style={S.label}>Pick a language</label>
              <div style={S.btnWrap}>
                {languages.map(l => (
                  <button key={l} onClick={() => setLanguage(l)} style={S.langBtn(language === l)}>{l}</button>
                ))}
              </div>
            </div>

            {!isPoemOrHaiku && (
              <div style={S.card}>
                <label style={S.label}>Artist or band style <span style={{ color: '#555' }}>— optional</span></label>
                <input type="text" style={S.input} placeholder="e.g. Korn, Harry Styles, Johnny Cash, Billie Eilish..." value={artist} onChange={e => setArtist(e.target.value)} />
              </div>
            )}

            {status && <div style={{ maxWidth: '600px', margin: '-1rem auto 1rem', color: '#aa00ff', fontSize: '0.85rem', textAlign: 'center' }}>⚡ {status}</div>}

            <div style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
              <button onClick={handleGenerate} disabled={isGenerating || !prompt} style={S.primaryBtn(isGenerating || !prompt)}>
                {generateLabel()}
              </button>
            </div>

            {showLyrics && (
              <div style={{ maxWidth: '600px', margin: '0 auto 1rem', background: 'rgba(255,68,0,0.05)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,68,0,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ background: 'linear-gradient(135deg,#ff4400,#aa00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '2px', textTransform: 'uppercase' }}>{outputLabel()}</div>
                  <button onClick={handleCopy} style={{ background: copied ? 'rgba(0,200,100,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${copied ? 'rgba(0,200,100,0.4)' : 'rgba(255,68,0,0.3)'}`, color: copied ? '#00cc66' : '#aaa', borderRadius: '6px', padding: '0.4rem 0.9rem', fontSize: '0.8rem', cursor: 'pointer', letterSpacing: '1px' }}>
                    {copied ? '✅ Copied!' : '📋 Copy'}
                  </button>
                </div>
                <pre style={{ whiteSpace: 'pre-wrap', color: '#e5e7eb', lineHeight: '1.8', margin: 0 }}>{lyrics}</pre>
              </div>
            )}

            {showLyrics && step === 'lyrics' && (
              <div style={{ maxWidth: '600px', margin: '0 auto 1.5rem', padding: '0.9rem 1.25rem', background: 'rgba(255,200,0,0.06)', border: '1px solid rgba(255,200,0,0.25)', borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>✏️</span>
                <p style={{ margin: 0, color: '#bba', fontSize: '0.88rem', lineHeight: '1.6' }}>
                  <strong style={{ color: '#ffcc44' }}>Before you continue —</strong> please double-check your lyrics. If you'd like to make changes, copy them into the <strong style={{ color: '#ffcc44' }}>✏️ My own lyrics</strong> mode above and edit before generating your song.
                </p>
              </div>
            )}

            {showPaywall && (
              <div style={{ maxWidth: '600px', margin: '0 auto 2rem', background: 'rgba(0,0,0,0.35)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(170,0,255,0.3)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎵</div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.4rem' }}>Generate &amp; Download Your Song</div>
                <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                  Pay <span style={{ color: '#ff4400', fontWeight: 'bold' }}>{DOWNLOAD_PRICE} LCAI</span> to generate the music and unlock the download.
                </div>
                {!walletAddress && <div style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem' }}>👆 Connect your wallet above first</div>}
                <button onClick={() => handlePay(false)} disabled={!walletAddress} style={S.primaryBtn(!walletAddress)}>
                  {walletAddress ? `💎 Pay ${DOWNLOAD_PRICE} LCAI & Generate Song` : '🔒 Connect Wallet to Continue'}
                </button>
                {payError && <div style={{ color: '#ff4444', fontSize: '0.85rem', marginTop: '0.75rem' }}>❌ {payError}</div>}
              </div>
            )}

            {showPaying && (
              <div style={{ maxWidth: '600px', margin: '0 auto 2rem', textAlign: 'center', color: '#aa00ff', fontSize: '0.95rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎸</div>
                {status || 'Processing payment...'}
              </div>
            )}

            {showMusic && (
              <div style={{ maxWidth: '600px', margin: '0 auto', background: 'rgba(255,68,0,0.05)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,68,0,0.3)' }}>
                <div style={{ color: '#aa00ff', fontWeight: 'bold', marginBottom: '1rem', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '1.1rem' }}>🎸 Your Song</div>
                <audio controls style={{ width: '100%', marginBottom: '1.25rem' }}><source src={music.audio_url} type="audio/mpeg" /></audio>
                <button onClick={() => handleDownload()} style={S.greenBtn}>⬇️ Download Song (MP3)</button>
                <a href="https://lighttunes.win" target="_blank" rel="noopener noreferrer" style={S.purpleLinkBtn}>🌍 Publish on LightTunes</a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}