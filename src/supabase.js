import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey  = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveUser(walletAddress) {
  const { error } = await supabase
    .from('users')
    .upsert({ wallet_address: walletAddress }, { onConflict: 'wallet_address' });
  if (error) console.error('saveUser error:', error);
}

export async function saveSong({ walletAddress, title, genre, artist, language, mode, lyrics, audioUrl }) {
  const { data, error } = await supabase
    .from('songs')
    .insert({
      wallet_address: walletAddress,
      title,
      genre,
      artist,
      language,
      mode,
      lyrics,
      audio_url: audioUrl,
    })
    .select()
    .single();
  if (error) { console.error('saveSong error:', error); return null; }
  return data;
}

export async function getUserSongs(walletAddress) {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: false });
  if (error) { console.error('getUserSongs error:', error); return []; }
  return data;
}

export async function getSongById(id) {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('id', id)
    .single();
  if (error) { console.error('getSongById error:', error); return null; }
  return data;
}