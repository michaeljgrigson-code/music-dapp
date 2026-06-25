import React, { useState, useEffect } from 'react';
import { BrowserProvider, parseUnits } from 'ethers';
import frankenLogo from './frankenlabs_logo.png';

const RECEIVING_WALLET = '0x7FE522ab4F456cFc41FE7a7a0C94F28801CCA8fc';
const DOWNLOAD_PRICE   = '5';
const SERVER_URL       = 'https://music-dapp.onrender.com';

const genres = [
  'Rock', 'Metal', 'Big Band', 'Jazz', 'Hip Hop', 'Rap', 'Drill', 'Trap',
  'Country', 'Pop', 'Blues', 'Electronic', 'R&B', 'Punk', 'Folk', 'Classical',
  'Reggae', 'Afrobeats', 'Gospel', 'Ambient', 'Soundtrack', 'Indie', 'Emo',
  'Grunge', 'Latin', 'Dancehall', 'Soul', 'Throat Singing', 'Monastery Chanting',
];

const languages = [
  'English', 'Spanish', 'French', 'German', 'Italian',
  'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Arabic',
  'Hindi', 'Russian', 'Dutch', 'Swedish', 'Polish',
];

const modes = [
  { id: 'topic', label: '💡 Song topic' },
  { id: 'own', label: '✏️ My own lyrics' },
  { id: 'poem', label: '📜 Poem' },
  { id: 'haiku', label: '🌸 Haiku' },
];

export default function App() {
  const [prompt, setPrompt]         = useState('');
  const [genresSelected, setGenresSelected] = useState(['Rock']);
  const [artist, setArtist]         = useState('');
  const [language, setLanguage]     = useState('English');
  const [mode, setMode]             = useState('topic');
  const [step, setStep]             = useState('idle');
  const [lyrics, setLyrics]         = useState('');
  const [music, setMusic]           = useState(null);
  const [status, setStatus]         = useState('');
  const [copied, setCopied]         = useState(false);
  const [payError, setPayError]     = useState('');
  const [walletAddress, setWalletAddress] = useState(null);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/health`).catch(() => {});
  }, []);

  useEffect(() => {
    if (window.ethereum?.selectedAddress) {
      setWalletAddress(window.ethereum.selectedAddress);
    }
    window.ethereum?.on('accountsChanged', (accounts) => {
      setWalletAddress(accounts[0] || null);
    });
  }, []);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) throw new Error('MetaMask not found');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletAddress(accounts[0]);
    } catch (err) {
      console.error('Wallet connect error:', err.message);
    }
  };

  useEffect(() => {
    setMusic(null);
    setPayError('');
  }, [lyrics]);

  const toggleGenre = (g) => {
    setGenresSelected(prev => {
      if (prev.includes(g)) {
        if (prev.length === 1) return prev;
        return prev.filter(x => x !== g);
      }
      if (prev.length >= 3) return prev;
      return [...prev, g];
    });
  };

  const isPoemOrHaiku = mode === 'poem' || mode === 'haiku';

  const handleGenerate = async () => {
    if (!prompt) return;
    setStep('generatingLyrics');
    setStatus('Connecting to LightChain network...');
    setLyrics('');
    setMusic(null);
    setPayError('');

    try {
      const promptPayload = mode === 'own' ? `__own__${prompt}` : prompt;
      const res = await fetch(`${SERVER_URL}/api/lyrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptPayload,
          genre: genresSelected.join(', '),
          artist,
          language,
          mode,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLyrics(data.lyrics || '');
      setStep('lyrics');
      setStatus('');
    } catch (err) {
      setStatus('Error: ' + err.message);
      setStep('idle');
    }
  };

  const handlePay = async () => {
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

      await handleGenerateMusic(lyrics, receipt.hash);
    } catch (err) {
      setPayError(
        err.message?.includes('user rejected') ? 'Transaction cancelled.'
        : err.message?.includes('insufficient') ? `Insufficient LCAI. You need ${DOWNLOAD_PRICE} LCAI.`
        : err.message || 'Payment failed.'
      );
      setStep('lyrics');
    }
  };

  const handleGenerateMusic = async (lyricsText, txHash) => {
    setStep('generatingMusic');
    setStatus('🎵 Generating your song — this takes 1-3 minutes...');

    try {
      const res = await fetch(`${SERVER_URL}/api/music`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics: lyricsText, genre: genresSelected.join(', '), artist, language, txHash }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMusic(data.music);
      setStep('done');
      setStatus('');
    } catch (err) {
      setStatus('Music generation error: ' + err.message);
      setStep('lyrics');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(lyrics).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = async () => {
    if (!music?.audio_url) return;
    try {
      const res  = await fetch(music.audio_url);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'LyricsAI-song.mp3'; a.click();
      URL.revokeObjectURL(url);
    } catch { window.open(music.audio_url, '_blank'); }
  };

  const S = {
    app: {
      minHeight: '100vh',
      background: `
        radial-gradient(ellipse at 20% 50%, #3a0a0a 0%, transparent 60%),
        radial-gradient(ellipse at 80% 30%, #0a0a3a 0%, transparent 60%),
        radial-gradient(ellipse at 50% 80%, #1a0a2a 0%, transparent 50%),
        #0a0a0a
      `,
      color: 'white', padding: '2rem 2rem 2rem 200px', fontFamily: 'inherit',
    },
    sidebar: {
      position: 'fixed', left: 0, top: 0, height: '100vh', width: '180px',
      background: 'rgba(0,0,0,0.7)', borderRight: '1px solid rgba(51,255,102,0.2)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '1rem', padding: '1.5rem 1rem', zIndex: 100,
    },
    title: {
      textAlign: 'center', fontSize: '3rem', fontWeight: 900, letterSpacing: '4px',
      textTransform: 'uppercase',
      background: 'linear-gradient(135deg,#ff4400,#ff0088,#aa00ff,#ff4400)',
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem',
    },
    sub: {
      textAlign: 'center', color: '#666', letterSpacing: '6px',
      textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: '2.5rem',
    },
    card: {
      maxWidth: '600px', margin: '0 auto 1.5rem',
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,68,0,0.2)',
      borderRadius: '12px', padding: '1.25rem',
    },
    label: {
      display: 'block', color: '#aaa', marginBottom: '0.5rem',
      fontSize: '0.85rem', letterSpacing: '2px', textTransform: 'uppercase',
    },
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
    btnWrap: { display: 'flex', flexWrap: 'wrap', gap: '0.6rem' },
    modeBtn: (active) => ({
      padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
      background: active ? 'linear-gradient(135deg,#ff4400,#aa00ff)' : 'rgba(0,0,0,0.4)',
      border: active ? '1px solid transparent' : '1px solid rgba(255,68,0,0.3)',
      color: active ? 'white' : '#888', fontSize: '0.9rem',
    }),
    genreBtn: (active, maxed) => ({
      padding: '0.4rem 1rem', borderRadius: '999px',
      cursor: maxed && !active ? 'not-allowed' : 'pointer',
      background: active ? 'linear-gradient(135deg,#ff4400,#aa00ff)' : 'transparent',
      border: active ? '1px solid transparent' : '1px solid rgba(255,68,0,0.3)',
      color: active ? 'white' : maxed ? '#444' : '#888',
      fontWeight: active ? 'bold' : 'normal', fontSize: '0.85rem',
      opacity: maxed && !active ? 0.4 : 1,
    }),
    langBtn: (active) => ({
      padding: '0.4rem 1rem', borderRadius: '999px', cursor: 'pointer',
      background: active ? 'linear-gradient(135deg,#0066ff,#aa00ff)' : 'transparent',
      border: active ? '1px solid transparent' : '1px solid rgba(0,100,255,0.3)',
      color: active ? 'white' : '#888', fontWeight: active ? 'bold' : 'normal', fontSize: '0.85rem',
    }),
    primaryBtn: (disabled) => ({
      width: '100%',
      background: disabled ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#ff4400,#ff0088,#aa00ff)',
      color: disabled ? '#444' : 'white', border: 'none', borderRadius: '8px', padding: '1rem',
      fontSize: '1.1rem', fontWeight: 900, letterSpacing: '2px',
      textTransform: 'uppercase', cursor: disabled ? 'default' : 'pointer',
    }),
    greenBtn: {
      width: '100%', background: 'linear-gradient(135deg,#00cc66,#00aa44)',
      color: 'white', border: 'none', borderRadius: '8px', padding: '0.9rem',
      fontSize: '1rem', fontWeight: 900, letterSpacing: '2px',
      textTransform: 'uppercase', cursor: 'pointer',
    },
    purpleBtn: {
      display: 'block', width: '100%',
      background: 'linear-gradient(135deg,#0066ff,#aa00ff)',
      color: 'white', border: 'none', borderRadius: '8px', padding: '0.9rem',
      fontSize: '1rem', fontWeight: 900, letterSpacing: '2px',
      textTransform: 'uppercase', cursor: 'pointer', textAlign: 'center',
      textDecoration: 'none', marginTop: '0.75rem', boxSizing: 'border-box',
    },
  };

  const isGenerating  = step === 'generatingLyrics' || step === 'generatingMusic';
  const showLyrics    = ['lyrics', 'paying', 'generatingMusic', 'done'].includes(step);
  const showPaywall   = step === 'lyrics' && !isPoemOrHaiku;
  const showPaying    = step === 'paying' || step === 'generatingMusic';
  const showMusic     = step === 'done' && music?.audio_url;
  const maxGenres     = genresSelected.length >= 3;

  const generateLabel = () => {
    if (step === 'generatingLyrics') return '✍️ Writing...';
    if (mode === 'poem') return '📜 Generate Poem (Free)';
    if (mode === 'haiku') return '🌸 Generate Haiku (Free)';
    return '🎸 Generate Lyrics (Free)';
  };

  const outputLabel = () => {
    if (mode === 'poem') return 'Your Poem';
    if (mode === 'haiku') return 'Your Haiku';
    return 'Your Lyrics';
  };

  return (
    <div style={S.app}>

      {/* Sidebar */}
      <div style={S.sidebar}>
        <img src={frankenLogo} alt="FrankenLabs"
          style={{ width: '140px', borderRadius: '12px', border: '2px solid rgba(51,255,102,0.4)' }} />
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '0.75rem', fontWeight: '900',
          letterSpacing: '2px', color: '#33ff66', textAlign: 'center', textTransform: 'uppercase' }}>
          FRANKENLABS
        </div>
        <div style={{ color: '#555', fontSize: '0.65rem', letterSpacing: '3px',
          textTransform: 'uppercase', textAlign: 'center' }}>PRESENTS</div>
        <div style={{ marginTop: '1rem', background: 'rgba(51,255,102,0.06)',
          border: '1px solid rgba(51,255,102,0.2)', borderRadius: '8px',
          padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ color: '#33ff66', fontSize: '0.7rem', letterSpacing: '1px', lineHeight: '1.6' }}>All queries cost</div>
          <div style={{ color: '#ff4400', fontWeight: 'bold', fontSize: '1rem' }}>5 LCAI</div>
          <div style={{ color: '#33ff66', fontSize: '0.7rem', letterSpacing: '1px', lineHeight: '1.6' }}>per song</div>
        </div>
      </div>

      {/* Floating notes */}
      {['♪','♫','♩','♬','♭'].map((n, i) => (
        <div key={i} style={{ position: 'fixed', fontSize: '1.5rem', opacity: 0.08,
          top: `${15 + i * 15}%`, left: `${5 + i * 18}%`,
          color: '#ff4400', pointerEvents: 'none', userSelect: 'none' }}>{n}</div>
      ))}

      <h1 style={S.title}>🎵 LyricsAI</h1>
      <p style={S.sub}>Powered by LightChain</p>

      {/* Wallet button */}
      <div style={{ maxWidth: '600px', margin: '0 auto 1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={connectWallet} style={{
          background: walletAddress ? 'rgba(0,200,100,0.15)' : 'linear-gradient(135deg,#ff4400,#aa00ff)',
          border: walletAddress ? '1px solid rgba(0,200,100,0.4)' : 'none',
          color: walletAddress ? '#00cc66' : 'white',
          borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold',
        }}>
          {walletAddress ? `✅ ${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}` : '🔌 Connect Wallet'}
        </button>
      </div>

      {/* Mode selector */}
      <div style={{ maxWidth: '600px', margin: '0 auto 1.5rem' }}>
        <label style={S.label}>What do you want to create?</label>
        <div style={S.btnWrap}>
          {modes.map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setPrompt(''); }}
              style={S.modeBtn(mode === m.id)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt */}
      <div style={S.card}>
        <label style={S.label}>
          {mode === 'topic' && "What's your song about?"}
          {mode === 'own' && 'Paste your lyrics'}
          {mode === 'poem' && "What's your poem about?"}
          {mode === 'haiku' && "What's your haiku about?"}
        </label>
        {mode === 'haiku' && (
          <span style={S.sublabel}>A haiku is 3 lines: 5 syllables, 7 syllables, 5 syllables</span>
        )}
        <textarea
          style={{ ...S.textarea, height: mode === 'own' ? '200px' : mode === 'haiku' ? '80px' : '120px' }}
          placeholder={
            mode === 'topic' ? 'e.g. a trucker who misses home, driving through Nevada at 3am...' :
            mode === 'own' ? "Paste your lyrics here and we'll style them for you..." :
            mode === 'poem' ? 'e.g. the ocean at night, the feeling of being lost...' :
            'e.g. cherry blossoms falling, a quiet morning...'
          }
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
        {mode === 'topic' && (
  <div style={{
    marginTop: '0.75rem',
    padding: '0.75rem',
    background: 'rgba(255,68,0,0.05)',
    borderRadius: '8px',
    border: '1px solid rgba(255,68,0,0.15)',
    fontSize: '0.78rem',
    color: '#666',
    lineHeight: '1.6',
  }}>
    💡 <span style={{color:'#888'}}>Pro tip — control each section's style using brackets:</span>
    <br/>
    <span style={{color:'#555', fontStyle:'italic'}}>
      A song about heaven and earth<br/>
      [Verse 1: monastery chanting, heavenly feel]<br/>
      [Chorus: electronic, both worlds colliding]<br/>
      [Bridge: trap beat, the breaking point]
    </span>
  </div>
)}
      </div>

      {/* Genre — hidden for haiku */}
      {mode !== 'haiku' && (
        <div style={S.card}>
          <label style={S.label}>
            {isPoemOrHaiku ? 'Pick a style' : 'Pick up to 3 genres'}
          </label>
          <span style={S.sublabel}>
            {mode === 'poem' ? 'Influences the tone and rhythm of the poem' :
              genresSelected.length === 3 ? '✅ 3 selected — deselect one to change' :
              `${genresSelected.length} selected`}
          </span>
          <div style={S.btnWrap}>
            {genres.map(g => (
              <button key={g} onClick={() => toggleGenre(g)} style={S.genreBtn(genresSelected.includes(g), maxGenres)}>
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Language */}
      <div style={S.card}>
        <label style={S.label}>Pick a language</label>
        <div style={S.btnWrap}>
          {languages.map(l => (
            <button key={l} onClick={() => setLanguage(l)} style={S.langBtn(language === l)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Artist — hidden for haiku and poem */}
      {!isPoemOrHaiku && (
        <div style={S.card}>
          <label style={S.label}>Artist or band style <span style={{ color: '#555' }}>— optional</span></label>
          <input type="text" style={S.input}
            placeholder="e.g. Korn, Harry Styles, Johnny Cash, Billie Eilish..."
            value={artist} onChange={e => setArtist(e.target.value)} />
        </div>
      )}

      {/* Status */}
      {status && (
        <div style={{ maxWidth: '600px', margin: '-1rem auto 1rem', color: '#aa00ff', fontSize: '0.85rem', textAlign: 'center' }}>
          ⚡ {status}
        </div>
      )}

      {/* Generate button */}
      <div style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
        <button onClick={handleGenerate} disabled={isGenerating || !prompt} style={S.primaryBtn(isGenerating || !prompt)}>
          {generateLabel()}
        </button>
      </div>

      {/* Output box */}
      {showLyrics && (
        <div style={{ maxWidth: '600px', margin: '0 auto 1.5rem', background: 'rgba(255,68,0,0.05)',
          borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,68,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ background: 'linear-gradient(135deg,#ff4400,#aa00ff)', WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent', fontWeight: 'bold', fontSize: '1.1rem',
              letterSpacing: '2px', textTransform: 'uppercase' }}>
              {outputLabel()}
            </div>
            <button onClick={handleCopy} style={{
              background: copied ? 'rgba(0,200,100,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${copied ? 'rgba(0,200,100,0.4)' : 'rgba(255,68,0,0.3)'}`,
              color: copied ? '#00cc66' : '#aaa', borderRadius: '6px', padding: '0.4rem 0.9rem',
              fontSize: '0.8rem', cursor: 'pointer', letterSpacing: '1px',
            }}>
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#e5e7eb', lineHeight: '1.8', margin: 0 }}>
            {lyrics}
          </pre>
        </div>
      )}

      {/* Paywall — only for songs */}
      {showPaywall && (
        <div style={{ maxWidth: '600px', margin: '0 auto 2rem', background: 'rgba(0,0,0,0.35)',
          borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(170,0,255,0.3)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎵</div>
          <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.4rem' }}>
            Generate &amp; Download Your Song
          </div>
          <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Pay <span style={{ color: '#ff4400', fontWeight: 'bold' }}>{DOWNLOAD_PRICE} LCAI</span> to generate the music and unlock the download.
          </div>
          {!walletAddress && (
            <div style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem' }}>
              👆 Connect your wallet above first
            </div>
          )}
          <button onClick={handlePay} disabled={!walletAddress} style={S.primaryBtn(!walletAddress)}>
            {walletAddress ? `💎 Pay ${DOWNLOAD_PRICE} LCAI & Generate Song` : '🔒 Connect Wallet to Continue'}
          </button>
          {payError && (
            <div style={{ color: '#ff4444', fontSize: '0.85rem', marginTop: '0.75rem' }}>❌ {payError}</div>
          )}
        </div>
      )}

      {/* Generating music spinner */}
      {showPaying && (
        <div style={{ maxWidth: '600px', margin: '0 auto 2rem', textAlign: 'center', color: '#aa00ff', fontSize: '0.95rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎸</div>
          {status || 'Processing payment...'}
        </div>
      )}

      {/* Music player + download + lighttunes */}
      {showMusic && (
        <div style={{ maxWidth: '600px', margin: '0 auto', background: 'rgba(255,68,0,0.05)',
          borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,68,0,0.3)' }}>
          <div style={{ color: '#aa00ff', fontWeight: 'bold', marginBottom: '1rem',
            letterSpacing: '2px', textTransform: 'uppercase', fontSize: '1.1rem' }}>
            🎸 Your Song
          </div>
          <audio controls style={{ width: '100%', marginBottom: '1.25rem' }}>
            <source src={music.audio_url} type="audio/mpeg" />
          </audio>
          <button onClick={handleDownload} style={S.greenBtn}>
            ⬇️ Download Song (MP3)
          </button>
          <a href="https://lighttunes.win" target="_blank" rel="noopener noreferrer" style={S.purpleBtn}>
            🌍 Publish on LightTunes
          </a>
        </div>
      )}

    </div>
  );
}