import React, { useState, useEffect } from 'react';
import { Plane, Clock, Globe, ArrowRight, ArrowLeft, RotateCcw, Heart, Share2, Link as LinkIcon, Download, Loader2, CheckCircle2, AlertCircle, Info, ListOrdered, XCircle, BookOpen, Instagram, Copy, Settings } from 'lucide-react';

const App = () => {
  // --- ESTADOS DO JOGO ---
  const [gameState, setGameState] = useState('menu'); 
  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [feedback, setFeedback] = useState(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadStatus, setLoadStatus] = useState({ type: null, message: "" });
  const [isStudentMode, setIsStudentMode] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [appInitializing, setAppInitializing] = useState(true);

  // --- DESAFIOS PADRÃO (PT-BR) ---
  const defaultLevels = [
    { 
      titulo: "Treinamento: Rumo ao Leste", 
      origemNome: "São Paulo", 
      destinoNome: "Lisboa", 
      dica: "Lisboa está a Leste (+3h de diferença).", 
      origemFuso: -3, 
      destinoFuso: 0, 
      horaPartida: 10, 
      duracaoVoo: 0, 
      tipo: "simples" 
    },
    { 
      titulo: "Treinamento: Voo Longo", 
      origemNome: "Nova York", 
      destinoNome: "Paris", 
      dica: "Some a diferença de fuso (+6h) e depois o tempo de voo.", 
      origemFuso: -5, 
      destinoFuso: 1, 
      horaPartida: 20, 
      duracaoVoo: 7, 
      tipo: "viagem" 
    }
  ];

  // --- LÓGICA DE RESET ---
  const resetGame = () => {
    setGameState('menu');
    setScore(0);
    setLives(3);
    setCurrentLevel(0);
    setUserAnswer("");
    setFeedback(null);
    setLoadStatus({ type: null, message: "" });
  };

  // --- LÓGICA DE FUSO E LINKS ---
  const encodeId = (id) => { 
    try { return btoa(id).replace(/=/g, ''); } catch (e) { return id; } 
  };
  
  const decodeId = (str) => {
    try {
      let decoded = str;
      while (decoded.length % 4 !== 0) decoded += '=';
      return atob(decoded);
    } catch (e) { return str; }
  };

  const calculateCorrectAnswer = (level) => {
    if (!level) return 0;
    const diferencaFuso = level.destinoFuso - level.origemFuso;
    let resultado = (level.horaPartida + diferencaFuso + level.duracaoVoo) % 24;
    while (resultado < 0) resultado += 24;
    return Math.floor(resultado);
  };

  const generateDescription = (level) => {
    if (!level) return "";
    const fusoO = level.origemFuso >= 0 ? `+${level.origemFuso}` : level.origemFuso;
    const fusoD = level.destinoFuso >= 0 ? `+${level.destinoFuso}` : level.destinoFuso;
    const hora = `${level.horaPartida.toString().padStart(2, '0')}:00`;

    if (level.tipo === 'viagem' || level.duracaoVoo > 0) {
      return `Decolagem de ${level.origemNome} (GMT ${fusoO}) às ${hora}. O tempo de voo até ${level.destinoNome} (GMT ${fusoD}) é de ${level.duracaoVoo} horas. Que horas o relógio de ${level.destinoNome} marcará na chegada?`;
    }
    return `Em ${level.origemNome} (GMT ${fusoO}) são ${hora}. Sabendo que ${level.destinoNome} está no fuso GMT ${fusoD}, que horas são lá agora?`;
  };

  const loadFromSheet = async (inputId, silent = false) => {
    if (!inputId) return;
    if (!silent) setIsLoading(true);
    setLoadStatus({ type: null, message: "" });

    try {
      let realId = inputId;
      if (inputId.includes('docs.google.com')) {
        const match = inputId.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) realId = match[1];
      } else {
        realId = decodeId(inputId);
      }

      const url = `https://docs.google.com/spreadsheets/d/${realId}/export?format=csv&gid=0`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error("Planilha não encontrada ou não está 'Pública na Web'.");
      
      const csvText = await response.text();
      const rows = csvText.split(/\r?\n/).filter(r => r.trim() !== "");
      
      if (rows.length < 2) throw new Error("Planilha sem dados de missões.");

      const parsed = rows.slice(1).map((row, index) => {
        const separator = row.includes(';') ? ';' : ',';
        const cols = row.split(new RegExp(`${separator}(?=(?:(?:[^\"\"*\"\"\"]{2})*[^\"\"*\"\"\"]*$))`)).map(c => c.trim().replace(/\"\"/g, ''));
        
        if (cols.length < 7) return null;
        
        return {
          titulo: cols[0] || `Missão ${index + 1}`,
          origemNome: cols[1],
          destinoNome: cols[2],
          dica: cols[3] || "Use o mapa para contar os fusos!",
          origemFuso: parseInt(cols[4]),
          destinoFuso: parseInt(cols[5]),
          horaPartida: parseInt(cols[6]),
          duracaoVoo: parseInt(cols[7]) || 0,
          tipo: parseInt(cols[7]) > 0 ? 'viagem' : 'simples'
        };
      }).filter(e => e && e.origemNome && !isNaN(e.origemFuso));

      if (parsed.length > 0) {
        setLevels(parsed);
        const code = encodeId(realId);
        const baseUrl = window.location.origin + window.location.pathname;
        setGeneratedLink(`${baseUrl}?sid=${code}`);
        
        if (silent) {
          setIsStudentMode(true);
        } else {
          setLoadStatus({ type: 'success', message: `${parsed.length} missões carregadas!` });
        }
      } else {
        throw new Error("Formato de dados inválido.");
      }
    } catch (e) {
      if (!silent) {
        setLoadStatus({ type: 'error', message: e.message });
      } else {
        setLevels(defaultLevels);
        setIsStudentMode(false);
      }
    } finally {
      setIsLoading(false);
      setAppInitializing(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('sid') || params.get('id');
    if (sid) {
      loadFromSheet(sid, true);
    } else {
      setLevels(defaultLevels);
      setAppInitializing(false);
    }
  }, []);

  const handleVerify = () => {
    if (userAnswer === "") return;
    const level = levels[currentLevel];
    if (parseInt(userAnswer) === calculateCorrectAnswer(level)) {
      setFeedback({ type: 'success', text: "Resposta correta!" });
      setScore(s => s + 100);
      setTimeout(() => {
        if (currentLevel < levels.length - 1) { setCurrentLevel(c => c + 1); setUserAnswer(""); setFeedback(null); }
        else setGameState('success');
      }, 1000);
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) setGameState('gameOver');
      else setFeedback({ type: 'error', text: "Horário incorreto. Analise o mapa!" });
    }
  };

  const MapDisplay = ({ origin, target }) => {
    const hours = Array.from({ length: 25 }, (_, i) => i - 12);
    const isSimple = levels[currentLevel]?.tipo === 'simples';

    return (
      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-x-auto my-4 scrollbar-thin scrollbar-thumb-slate-700 shadow-inner">
        <div className="min-w-[800px] flex justify-between items-end h-36 relative pb-10 px-4 pt-16 text-left">
          {hours.map(h => (
            <div key={h} className="flex-1 flex flex-col items-center">
              <div className={`w-px h-10 ${h === 0 ? 'bg-yellow-500 w-0.5' : 'bg-slate-800'} relative`}>
                {h === origin && (
                  <div className="absolute -top-12 -left-3 text-blue-400">
                    <Globe size={24} />
                  </div>
                )}
                {h === target && (
                  <div className={`absolute -top-12 -left-3 ${isSimple ? 'text-emerald-500' : 'text-red-500'} animate-bounce`}>
                    {isSimple ? <Clock size={24} /> : <Plane size={24} className="rotate-45" />}
                  </div>
                )}
              </div>
              <span className={`text-[10px] mt-2 font-mono ${h === 0 ? 'text-yellow-500 font-bold' : 'text-slate-600'}`}>{h}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (appInitializing) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white"><Loader2 className="animate-spin mb-4 text-indigo-500" size={32}/> <p className="font-bold tracking-widest uppercase text-xs opacity-50">Sincronizando Relógios...</p></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-8 px-4 overflow-y-auto">
      <div className="max-w-4xl w-full flex flex-col">
        {/* HEADER */}
        <header className="flex justify-between items-center mb-6 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-4 cursor-pointer" onClick={resetGame}>
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border-2 border-[#84cc16] overflow-hidden">
                <img src="https://i.imgur.com/WsPFkdc.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
                <h1 className="font-black text-lg md:text-xl leading-none uppercase tracking-tighter">Fuso Explorer</h1>
                <p className="text-[10px] text-[#84cc16] font-bold tracking-widest uppercase mt-0.5">by Grok Lab</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex gap-1">{[...Array(3)].map((_, i) => (<Heart key={i} size={18} className={i < lives ? 'fill-red-500 text-red-500' : 'text-slate-800'} />))}</div>
            <div className="bg-slate-800 px-4 py-1.5 rounded-2xl border border-slate-700 font-mono font-black text-indigo-400 text-sm shadow-inner">{score}</div>
          </div>
        </header>

        <main className="relative">
          {gameState === 'menu' && (
            <div className="text-center bg-slate-900 border border-slate-800 rounded-3xl p-10 shadow-2xl relative overflow-hidden animate-in zoom-in duration-300">
              <Globe className="mx-auto mb-6 text-indigo-500" size={64} />
              <h2 className="text-4xl font-black mb-4 italic text-white uppercase tracking-tight leading-tight">Desafio do<br/>Fuso Horário</h2>
              <p className="text-slate-400 text-lg mb-10 max-w-lg mx-auto leading-relaxed italic">
                {isStudentMode ? "Missões recebidas! Pronto para provar que é o mestre do tempo?" : "Navegue pelos fusos horários, calcule tempos de voo e torne-se um mestre do tempo."}
              </p>
              <button onClick={() => setGameState('tutorial')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-16 py-5 rounded-2xl font-black text-xl transition-all shadow-lg active:scale-95 uppercase">
                {isStudentMode ? "INICIAR MISSÕES" : "JOGAR TUTORIAL"}
              </button>
              
              {!isStudentMode && (
                <div className="mt-12 pt-8 border-t border-slate-800 text-left">
                  <h3 className="font-bold text-[#84cc16] mb-4 flex items-center gap-2 uppercase tracking-widest text-xs"><Settings size={18}/> Painel do Professor</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input type="text" placeholder="Cole aqui o link da Planilha Google..." value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" />
                    <button onClick={() => loadFromSheet(sheetUrl)} disabled={isLoading || !sheetUrl} className="bg-white text-slate-950 px-8 py-4 rounded-xl font-bold hover:bg-[#84cc16] hover:text-white transition-all disabled:opacity-50">
                      {isLoading ? <Loader2 className="animate-spin" /> : "CARREGAR"}
                    </button>
                  </div>
                  {loadStatus.message && (
                    <div className={`mt-4 p-4 rounded-xl text-xs font-bold flex items-center gap-3 ${loadStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {loadStatus.type === 'success' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
                      {loadStatus.message}
                    </div>
                  )}
                  {generatedLink && (
                    <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between gap-4">
                      <p className="text-xs font-mono text-indigo-300 truncate flex-1">{generatedLink}</p>
                      <button onClick={() => {navigator.clipboard.writeText(generatedLink); alert("Link copiado!");}} className="p-2 text-indigo-400 hover:text-white"><Copy size={18}/></button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {gameState === 'tutorial' && (
            <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl animate-in fade-in duration-500 text-center">
              <h2 className="text-3xl font-black mb-8 italic uppercase text-white">Instruções</h2>
              <div className="grid md:grid-cols-2 gap-6 mb-10">
                 <div className="bg-orange-500/10 p-6 rounded-2xl border border-orange-500/20 text-center">
                  <ArrowLeft className="text-orange-500 mx-auto mb-3" size={40} />
                  <h3 className="font-bold text-orange-300 mb-2 uppercase text-sm">Oeste (Esquerda)</h3>
                  <p className="text-sm text-slate-400 italic leading-tight">As horas estão <b>atrasadas</b>. Você deve <b>SUBTRAIR</b> horas.</p>
                </div>
                <div className="bg-blue-500/10 p-6 rounded-2xl border border-blue-500/20 text-center">
                  <ArrowRight className="text-blue-500 mx-auto mb-3" size={40} />
                  <h3 className="font-bold text-blue-300 mb-2 uppercase text-sm">Leste (Direita)</h3>
                  <p className="text-sm text-slate-400 italic leading-tight">As horas estão <b>adiantadas</b>. Você deve <b>SOMAR</b> horas.</p>
                </div>
              </div>
              <div className="bg-slate-950/40 p-6 rounded-2xl mb-10 text-left border border-slate-800 shadow-inner">
                <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-4">Legenda do Mapa</h3>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-500/20 p-3 rounded-lg flex items-center justify-center shrink-0 border border-blue-500/30"><Globe className="text-blue-400" size={24}/></div>
                    <div><p className="font-bold text-xs uppercase text-slate-200 leading-none mb-1">Referência</p><p className="text-[14px] text-slate-500 leading-tight">O fuso onde você está.</p></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-green-500/20 p-3 rounded-lg flex items-center justify-center shrink-0 border border-green-500/30"><Clock className="text-green-400" size={24}/></div>
                    <div className="bg-red-500/20 p-3 rounded-lg flex items-center justify-center shrink-0 border border-red-500/30"><Plane className="text-red-400 rotate-45" size={24}/></div>
                    <div><p className="font-bold text-xs uppercase text-slate-200 leading-none mb-1">Objetivo</p><p className="text-[14px] text-slate-500 leading-tight">Onde você deve calcular o horário final.</p></div>
                  </div>
                </div>
              </div>
              <button onClick={() => setGameState('playing')} className="w-full bg-indigo-600 py-5 rounded-2xl font-black text-xl hover:bg-indigo-500 transition-all uppercase">VAMOS COMEÇAR!</button>
            </div>
          )}

          {gameState === 'playing' && levels[currentLevel] && (
            <div className="animate-in slide-in-from-bottom-8 duration-500 w-full text-left">
              <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 bg-indigo-500 h-full"></div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest block mb-1 opacity-70">Missão {currentLevel + 1} de {levels.length}</span>
                    <h2 className="text-xl md:text-2xl font-black uppercase text-white tracking-tight leading-tight truncate max-w-[240px] md:max-w-md">{levels[currentLevel].titulo}</h2>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 shrink-0 shadow-lg">
                    {levels[currentLevel].tipo === 'viagem' ? (
                      <Plane size={24} className="text-amber-500" />
                    ) : (
                      <Clock size={24} className="text-emerald-500" />
                    )}
                  </div>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 mb-6 italic text-slate-200 text-sm md:text-base leading-relaxed shadow-inner font-medium">
                  "{generateDescription(levels[currentLevel])}"
                </div>
                
                <MapDisplay origin={levels[currentLevel].origemFuso} target={levels[currentLevel].destinoFuso} />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-4">
                  
                  <div className="md:col-span-7 flex flex-col space-y-4">
                    <label className="text-[18px] text-slate-500 uppercase font-black ml-1 tracking-widest block text-left">RESPOSTA:</label>
                    <div className="flex items-center gap-4 text-left">
                      <input 
                        type="number" 
                        placeholder="0-23" 
                        value={userAnswer} 
                        onChange={(e) => setUserAnswer(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleVerify()} 
                        className="w-full max-w-[150px] bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 text-2xl font-mono text-center focus:border-indigo-500 outline-none text-white shadow-lg transition-all" 
                      />
                      <button onClick={handleVerify} className="bg-indigo-600 px-12 py-4 rounded-2xl font-black text-xl hover:bg-indigo-500 transition-all shadow-lg active:scale-95 uppercase tracking-tighter shrink-0">OK</button>
                    </div>
                    {feedback && (
                      <div className={`p-4 rounded-xl font-bold text-sm flex items-center gap-3 animate-in slide-in-from-top-2 border ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {feedback.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>} {feedback.text}
                      </div>
                    )}
                  </div>
                  
                  <div className="md:col-span-5 bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 flex flex-col gap-4 shadow-xl">
                    <div className="flex justify-between items-center bg-slate-950/40 p-4 rounded-xl border border-slate-800 shadow-sm text-left">
                      <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">
                        {levels[currentLevel].tipo === 'simples' ? 'Hora do seu local' : 'Decolagem'}
                      </span>
                      <span className="font-mono text-indigo-400 font-bold text-xl">{levels[currentLevel].horaPartida}:00</span>
                    </div>
                    {levels[currentLevel].duracaoVoo > 0 && (
                      <div className="flex justify-between items-center bg-slate-950/40 p-4 rounded-xl border border-slate-800 shadow-sm text-left">
                        <span className="text-[10px] uppercase font-black text-amber-500 tracking-wider">Tempo de voo</span>
                        <span className="font-mono text-amber-500 font-bold text-xl">{levels[currentLevel].duracaoVoo}h</span>
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 italic mt-1 leading-tight flex gap-2 border-t border-slate-700 pt-3 text-left">
                        <Info size={14} className="shrink-0 text-indigo-400"/>
                        <span>Dica: {levels[currentLevel].dica}</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {(gameState === 'success' || gameState === 'gameOver') && (
            <div className="text-center bg-slate-900 border border-slate-800 rounded-[3rem] p-12 shadow-2xl animate-in zoom-in duration-500">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${gameState === 'success' ? 'bg-emerald-500/20 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'bg-red-500/20 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]'}`}>
                {gameState === 'success' ? <CheckCircle2 size={56} /> : <RotateCcw size={56} />}
              </div>
              <h2 className="text-4xl font-black mb-4 uppercase text-white tracking-tight leading-tight italic">
                {gameState === 'success' ? 'Mestre do Tempo!' : 'Fim de Missão'}
              </h2>
              <div className="flex flex-col items-center gap-6 mb-6">
                <div className="text-7xl font-black text-indigo-400 font-mono tracking-tighter uppercase italic drop-shadow-lg text-center">
                  {score}
                </div>
                <div className="text-sm text-slate-600 font-bold tracking-normal uppercase opacity-60">Pontos</div>
              </div>
              <div className="w-full flex justify-center">
                <button onClick={resetGame} className="w-full max-w-sm bg-white text-slate-950 py-5 rounded-2xl font-black text-xl hover:bg-[#84cc16] hover:text-white transition-all uppercase shadow-2xl active:scale-95">RECOMEÇAR</button>
              </div>
            </div>
          )}
        </main>

        <footer className="mt-8 py-4 border-t border-slate-800/50 flex flex-col items-center gap-2 text-center opacity-40">
            <div className="flex items-center gap-2 text-slate-500 text-[12px] font-black uppercase tracking-[0.2em]">
                <span>Este jogo foi criado por</span>
                <a href="https://www.instagram.com/groklab/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-400 hover:text-[#84cc16] transition-colors font-black">
                   <Instagram size={14}/> @groklab
                </a>
            </div>
            
        </footer>
      </div>
    </div>
  );
};

export default App;