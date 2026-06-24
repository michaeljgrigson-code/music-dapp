const express = require('express');
const cors = require('cors');
const { JsonRpcProvider, Wallet, Contract, Interface, parseEther, hexlify } = require('ethers');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

const RPC     = process.env.REACT_APP_LIGHTCHAIN_RPC;
const GATEWAY = process.env.REACT_APP_LIGHTCHAIN_GATEWAY;
const RELAY   = process.env.REACT_APP_LIGHTCHAIN_RELAY;
const JOB_REG = process.env.REACT_APP_LIGHTCHAIN_JOB_REGISTRY;
const JOB_FEE = parseEther(process.env.REACT_APP_LIGHTCHAIN_JOB_FEE ?? '0.02');

const ABI = [
  'function createSession(bytes32 paramsHash, address worker, bytes encWorkerKey, bytes ephemeralPubKey, bytes initState, uint256 expiry) payable returns (uint256 sessionId)',
  'function submitJob(uint256 sessionId, bytes32 promptHash) payable returns (uint256 jobId)',
  'event SessionCreated(uint256 indexed sessionId, address indexed user, bytes32 indexed paramsHash, address worker, bytes encWorkerKey, bytes ephemeralPubKey)',
  'event JobSubmitted(uint256 indexed jobId, uint256 indexed sessionId, address worker)',
  'event JobCompleted(uint256 indexed jobId, address indexed worker, bytes32 responseHash, bytes32 ciphertextHash)',
];

function decodePubKey(s) {
  if (/^0x[0-9a-fA-F]{130}$/.test(s)) return Buffer.from(s.slice(2), 'hex');
  if (/^[0-9a-fA-F]{130}$/.test(s))   return Buffer.from(s, 'hex');
  const b = Buffer.from(s, 'base64');
  if (b.length !== 65) throw new Error(`pubkey bad length: ${b.length}`);
  return b;
}

function ecdhWrap(sessionKey, peerPub) {
  const e = crypto.createECDH('prime256v1');
  e.generateKeys();
  const ephemPub = e.getPublicKey(null, 'uncompressed');
  const shared   = e.computeSecret(peerPub);
  const nonce    = crypto.randomBytes(12);
  const c        = crypto.createCipheriv('aes-256-gcm', shared, nonce);
  const ct       = Buffer.concat([c.update(sessionKey), c.final()]);
  return Buffer.concat([ephemPub, nonce, ct, c.getAuthTag()]);
}

function aesEncrypt(key, pt) {
  const nonce = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const ct = Buffer.concat([c.update(pt), c.final()]);
  return Buffer.concat([nonce, ct, c.getAuthTag()]);
}

function aesDecrypt(key, blob) {
  const nonce = blob.subarray(0, 12);
  const tag   = blob.subarray(blob.length - 16);
  const ct    = blob.subarray(12, blob.length - 16);
  const d = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}

function parseEvent(logs, iface, name, field) {
  for (const l of logs) {
    try {
      const p = iface.parseLog(l);
      if (p?.name === name) return p.args[field];
    } catch {}
  }
  throw new Error(`${name} event not found`);
}

class Gateway {
  constructor(wallet) {
    this.wallet = wallet;
    this.jwt = null;
  }
  async getToken() {
    if (this.jwt && this.jwt.expMs - Date.now() > 30000) return this.jwt.token;
    const ch = await fetch(
      `${GATEWAY}/api/auth/challenge?address=${this.wallet.address}`,
      { headers: { Accept: 'application/json' } }
    ).then(r => r.json());
    const signature = await this.wallet.signMessage(ch.message);
    const v = await fetch(`${GATEWAY}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: ch.message, signature }),
    }).then(r => r.json());
    if (!v.token) throw new Error('Auth failed');
    this.jwt = { token: v.token, expMs: new Date(v.expiresAt).getTime() };
    return v.token;
  }
  async req(path, init = {}, auth = true) {
    const headers = { Accept: 'application/json' };
    if (init.body) headers['Content-Type'] = 'application/json';
    if (auth) headers.Authorization = `Bearer ${await this.getToken()}`;
    const r = await fetch(`${GATEWAY}${path}`, { ...init, headers });
    const t = await r.text();
    if (!r.ok) throw new Error(`${path} ${r.status}: ${t.slice(0, 200)}`);
    return JSON.parse(t);
  }
  listModels()       { return this.req('/api/models', {}, false); }
  selectSession(mid) { return this.req('/api/sessions/select', { method: 'POST', body: JSON.stringify({ modelId: mid }) }); }
  prepareSession(b)  { return this.req('/api/sessions/prepare', { method: 'POST', body: JSON.stringify(b) }); }
  uploadBlob(b64)    { return this.req('/api/blobs', { method: 'POST', body: JSON.stringify({ data: b64 }) }); }
  async waitForRelayToken(sessionId, timeoutMs = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const r = await fetch(`${GATEWAY}/api/sessions/${sessionId}/token`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${await this.getToken()}` }
      });
      const t = await r.text();
      if (r.status === 200) {
        const p = JSON.parse(t);
        if (p?.token) return p.token;
      }
      await new Promise(res => setTimeout(res, 1000));
    }
    throw new Error('Relay token timeout');
  }
}

async function generateMusic(lyrics, genre, artist, language) {
  const langStyle = language && language !== 'English' ? `, sung in ${language}` : '';
const style = artist ? `${genre}, ${artist} style${langStyle}` : `${genre}${langStyle}`;
  console.log(`🎵 Starting music generation - Genre: ${genre} | Artist: ${artist || 'None'} | Language: ${language}`);

  const formattedLyrics = lyrics.substring(0, 3000);

  let generationId;
  try {
    const submitRes = await fetch('https://api.aimlapi.com/v2/generate/audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_AIML_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'minimax/music-2.0',
        prompt: style,
        lyrics: formattedLyrics,
      }),
    });

    console.log(`🎵 Submit status: ${submitRes.status}`);
    const submitData = await submitRes.json();
    console.log('🎵 Submit response:', JSON.stringify(submitData, null, 2));

    if (!submitRes.ok) { console.error('❌ Music submit failed:', submitData); return null; }

    generationId = submitData.id;
    if (!generationId) { console.error('❌ No generation ID returned'); return null; }
    console.log(`🎵 Generation ID: ${generationId}`);
  } catch (err) {
    console.error('❌ Music submit crashed:', err.message);
    return null;
  }

  const maxAttempts = 36;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const pollRes = await fetch(
        `https://api.aimlapi.com/v2/generate/audio?generation_id=${encodeURIComponent(generationId)}`,
        { headers: { 'Authorization': `Bearer ${process.env.REACT_APP_AIML_API_KEY}`, 'Accept': 'application/json' } }
      );
      const pollData = await pollRes.json();
      console.log(`🎵 Poll attempt ${i + 1} | Status: ${pollData.status}`);

      if (pollData.status === 'completed' || pollData.status === 'success') {
        const audioUrl = pollData.audio_file?.url || pollData.audio_url || pollData.url || null;
        if (audioUrl) { console.log('✅ Music ready →', audioUrl); return { audio_url: audioUrl }; }
        return null;
      }
      if (pollData.status === 'failed' || pollData.status === 'error') { return null; }
    } catch (err) {
      console.error(`❌ Poll attempt ${i + 1} crashed:`, err.message);
    }
  }
  return null;
}

async function runLyricsJob(prompt) {
  const provider = new JsonRpcProvider(RPC);
  const wallet   = new Wallet(process.env.REACT_APP_PRIVATE_KEY, provider);
  const gw       = new Gateway(wallet);
  const reg      = new Contract(JOB_REG, ABI, wallet);
  const iface    = new Interface(ABI);

  const { models } = await gw.listModels();
  const model = models.find(m => m.name === 'llama3-8b') ?? models[0];
  if (!model) throw new Error('No models available');

  const sel = await gw.selectSession(model.id);
  const sessionKey  = crypto.randomBytes(32);
  const encWorker   = ecdhWrap(sessionKey, decodePubKey(sel.workerEncryptionKey));
  const encDisputer = ecdhWrap(sessionKey, decodePubKey(sel.disputerEncryptionKey));

  const prep = await gw.prepareSession({
    modelId: model.id,
    encWorkerKey:   encWorker.toString('base64'),
    encDisputerKey: encDisputer.toString('base64'),
  });

  const tx1 = await reg.createSession(
    model.id, prep.worker,
    hexlify(encWorker), hexlify(encDisputer),
    prep.signature, BigInt(prep.expiry),
    { gasLimit: 1000000n }
  );
  const r1 = await tx1.wait(1);
  if (!r1 || r1.status !== 1) throw new Error('createSession failed');

  const sessionId  = parseEvent(r1.logs, iface, 'SessionCreated', 'sessionId');
  const relayToken = await gw.waitForRelayToken(sessionId);
  const chunks = [];

  await new Promise((resolve, reject) => {
    const ws = new (require('ws'))(`${RELAY}?token=${encodeURIComponent(relayToken)}`);

    ws.on('open', async () => {
      try {
        const cipher = aesEncrypt(sessionKey, Buffer.from(prompt, 'utf8'));
        const { blobHashes } = await gw.uploadBlob(cipher.toString('base64'));
        if (!blobHashes?.length) throw new Error('No blob hash');

        const tx2 = await reg.submitJob(sessionId, blobHashes[0], { value: JOB_FEE, gasLimit: 500000n });
        const r2 = await tx2.wait(1);
        if (!r2 || r2.status !== 1) throw new Error('submitJob failed');

        const jobId  = parseEvent(r2.logs, iface, 'JobSubmitted', 'jobId');
        const topic  = iface.getEvent('JobCompleted').topicHash;
        const jobTop = '0x' + jobId.toString(16).padStart(64, '0');

        let done = null;
        for (let i = 0; i < 60 && !done; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const head = await provider.getBlockNumber();
          const logs = await provider.getLogs({
            address: JOB_REG, fromBlock: r2.blockNumber, toBlock: head,
            topics: [topic, jobTop],
          });
          if (logs.length) done = logs[0];
        }
        if (!done) throw new Error('Timeout waiting for job');

        await new Promise(r => setTimeout(r, 4000));
        ws.close();
        resolve();
      } catch (err) { ws.close(); reject(err); }
    });

    ws.on('message', (data) => {
      let frame;
      try { frame = JSON.parse(data.toString()); } catch { return; }
      if (!frame?.payload) return;
      try { chunks.push(aesDecrypt(sessionKey, Buffer.from(frame.payload, 'base64')).toString('utf8')); } catch {}
    });

    ws.on('error', reject);
  });

  return chunks.join('');
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/lyrics', async (req, res) => {
  const { prompt, genre, artist, language } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

  try {
    const artistLine   = artist ? `in the style of ${artist}` : '';
    const romanizedLanguages = ['Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Russian'];
const languageLine = language && language !== 'English'
  ? romanizedLanguages.includes(language)
    ? `Write the lyrics in ${language} using romanized/latin script only (e.g. pinyin for Chinese, romaji for Japanese, transliteration for Arabic/Hindi/Russian). Do not use any non-latin characters.`
    : `Write the lyrics in ${language}.`
  : '';

    const modeLine = prompt.startsWith('__own__')
      ? `Take these lyrics and restyle them ${artistLine} in the ${genre} genre, keep the meaning intact. ${languageLine}\n\nCRITICAL RULES:\n- Output ONLY the lyrics\n- NO notes, NO disclaimers, NO explanations, NO translations, NO commentary\n- NO text before or after the lyrics\n- If you add any notes, disclaimers or translation reminders you have failed the task\n- Do not add any note about romanization or pinyin\n\nSection labels only: [Verse 1], [Chorus] etc.\n\nLyrics to restyle:\n${prompt.replace('__own__', '')}`
      : `Write original song lyrics ${artistLine} in the ${genre} genre about: ${prompt}. ${languageLine}\n\nCRITICAL RULES:\n- Output ONLY the lyrics\n- NO notes, NO disclaimers, NO explanations, NO translations, NO commentary\n- NO text before or after the lyrics\n- If you add any notes, disclaimers or translation reminders you have failed the task\n- Do not add any note about romanization or pinyin\n\nInclude [Verse 1], [Chorus], [Verse 2] labels only.`;

    const lyrics = await runLyricsJob(modeLine);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
res.end(JSON.stringify({ lyrics }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/music', async (req, res) => {
  const { lyrics, genre, artist, language, txHash } = req.body;
  if (!lyrics) return res.status(400).json({ error: 'No lyrics provided' });
  if (!txHash) return res.status(402).json({ error: 'Payment required' });

  try {
    const provider = new JsonRpcProvider(RPC);
    const receipt  = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      return res.status(402).json({ error: 'Payment transaction not confirmed on chain' });
    }

    const music = await generateMusic(lyrics, genre, artist, language);
    if (!music) return res.status(500).json({ error: 'Music generation failed' });

    res.json({ music });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt provided' });
  try {
    const lyrics = await runLyricsJob(prompt);
    res.json({ lyrics, music: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));