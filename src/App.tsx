import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  BookOpen, 
  History, 
  Plus, 
  Trash2, 
  Printer, 
  ChevronRight, 
  Loader2, 
  RefreshCw, 
  Save,
  CheckCircle2,
  Sparkles,
  Heart,
  Star,
  Smile
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { geminiService } from './services/gemini';
import { QuestionRecord, OCRResult, Question } from './types';
import { cn } from './lib/utils';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type Page = 'recognize' | 'bank';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('recognize');
  const [records, setRecords] = useState<QuestionRecord[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [similarQuestions, setSimilarQuestions] = useState<Question[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('wrong-questions');
    if (saved) {
      setRecords(JSON.parse(saved));
    }
  }, []);

  const saveRecords = (newRecords: QuestionRecord[]) => {
    setRecords(newRecords);
    localStorage.setItem('wrong-questions', JSON.stringify(newRecords));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
      setIsScanning(true);
      setOcrResult(null);
      setSimilarQuestions([]);
      
      try {
        const result = await geminiService.recognizeQuestion(base64);
        setOcrResult(result);
      } catch (error) {
        console.error('OCR failed:', error);
        alert('哎呀，识别失败了，再试一次吧~');
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const generateSimilar = async () => {
    if (!ocrResult) return;
    setIsGenerating(true);
    try {
      const questions = await geminiService.generateSimilarQuestions(
        ocrResult.text,
        ocrResult.knowledgePoint
      );
      setSimilarQuestions(questions);
    } catch (error) {
      console.error('Generation failed:', error);
      alert('生成失败了，小助手正在努力修复中...');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToBank = () => {
    if (!ocrResult || similarQuestions.length === 0) return;

    const newRecord: QuestionRecord = {
      id: Date.now().toString(),
      originalImage: selectedImage || undefined,
      originalQuestion: {
        text: ocrResult.text,
        options: ocrResult.options,
        answer: ocrResult.standardAnswer || '',
        explanation: '原题'
      },
      knowledgePoint: ocrResult.knowledgePoint,
      similarQuestions: similarQuestions,
      createdAt: Date.now()
    };

    saveRecords([newRecord, ...records]);
    alert('成功存入错题本啦！✨');
    setOcrResult(null);
    setSimilarQuestions([]);
    setSelectedImage(null);
  };

  const deleteRecord = (id: string) => {
    saveRecords(records.filter(r => r.id !== id));
  };

  const toggleSelect = (id: string) => {
    setSelectedRecords(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePrint = async () => {
    if (selectedRecords.length === 0) return;
    setIsPrinting(true);
    
    setTimeout(async () => {
      const element = printRef.current;
      if (!element) return;

      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('我的可爱错题集.pdf');
      } catch (error) {
        console.error('PDF generation failed:', error);
      } finally {
        setIsPrinting(false);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#fffcf2] text-slate-900 font-sans pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#fffcf2]/80 backdrop-blur-md border-b-4 border-slate-900 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div 
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="bg-cute-pink p-2 rounded-2xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <Smile className="w-6 h-6 text-white" />
          </motion.div>
          <h1 className="font-bold text-xl tracking-tight font-cute text-slate-900">错题打印机 🖨️</h1>
        </div>
        {activePage === 'bank' && records.length > 0 && (
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              disabled={selectedRecords.length === 0 || isPrinting}
              className="cute-button bg-cute-yellow text-slate-900 px-4 py-2 text-sm"
            >
              {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              打印 ({selectedRecords.length})
            </button>
          </div>
        )}
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {activePage === 'recognize' ? (
            <motion.div 
              key="recognize"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              {/* Upload Area */}
              {!selectedImage ? (
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video bg-white border-4 border-dashed border-slate-900 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 cursor-pointer hover:bg-cute-pink/5 transition-all group shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                >
                  <div className="w-20 h-20 bg-cute-pink-light rounded-full flex items-center justify-center border-2 border-slate-900 group-hover:rotate-12 transition-transform">
                    <Camera className="w-10 h-10 text-cute-pink" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-xl text-slate-800">点我拍照或上传错题</p>
                    <p className="text-sm text-slate-500 mt-1">支持 JPG, PNG 格式哦~</p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </motion.div>
              ) : (
                <div className="cute-card overflow-hidden">
                  <div className="relative">
                    <img src={selectedImage} alt="Selected" className="w-full max-h-96 object-contain bg-slate-50" />
                    <button 
                      onClick={() => {
                        setSelectedImage(null);
                        setOcrResult(null);
                        setSimilarQuestions([]);
                      }}
                      className="absolute top-4 right-4 w-10 h-10 bg-white border-2 border-slate-900 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </button>
                  </div>
                </div>
              )}

              {/* OCR Result */}
              {isScanning && (
                <div className="cute-card p-10 flex flex-col items-center justify-center gap-6 bg-cute-blue/10">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  >
                    <Sparkles className="w-12 h-12 text-cute-blue" />
                  </motion.div>
                  <p className="text-slate-700 font-bold text-lg">正在努力识别中，请稍等喵...</p>
                </div>
              )}

              {ocrResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <div className="cute-card p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                        <Star className="w-6 h-6 text-cute-yellow fill-cute-yellow" />
                        识别结果
                      </h3>
                      <span className="px-4 py-1.5 bg-cute-purple text-white text-sm font-bold rounded-full border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        {ocrResult.knowledgePoint}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-slate-500">题目内容</label>
                      <textarea 
                        value={ocrResult.text}
                        onChange={(e) => setOcrResult({...ocrResult, text: e.target.value})}
                        className="cute-input min-h-[120px] text-base"
                      />
                    </div>

                    <div className="flex gap-4 pt-2">
                      <button 
                        onClick={generateSimilar}
                        disabled={isGenerating}
                        className="flex-1 cute-button bg-cute-pink text-white text-lg py-4"
                      >
                        {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <RefreshCw className="w-6 h-6" />}
                        生成举一反三
                      </button>
                    </div>
                  </div>

                  {/* Similar Questions */}
                  {isGenerating && (
                    <div className="cute-card p-10 flex flex-col items-center justify-center gap-6 bg-cute-purple/10">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <Heart className="w-12 h-12 text-cute-pink fill-cute-pink" />
                      </motion.div>
                      <p className="text-slate-700 font-bold text-lg">正在为你准备变式题哦~</p>
                    </div>
                  )}

                  {similarQuestions.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-4">
                        <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                          <Sparkles className="w-6 h-6 text-cute-pink" />
                          举一反三练习
                        </h3>
                        <button 
                          onClick={generateSimilar}
                          className="cute-button bg-white px-4 py-2 text-sm"
                        >
                          <RefreshCw className="w-4 h-4" /> 换一批
                        </button>
                      </div>
                      
                      {similarQuestions.map((q, idx) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          key={idx} 
                          className="cute-card p-8 space-y-6"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 bg-cute-blue text-white border-2 border-slate-900 rounded-2xl flex items-center justify-center font-bold text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                              {idx + 1}
                            </span>
                            <h4 className="font-bold text-lg text-slate-700">变式练习</h4>
                          </div>
                          <div className="prose prose-slate prose-lg max-w-none font-medium">
                            <ReactMarkdown>{q.text}</ReactMarkdown>
                          </div>
                          <div className="bg-cute-yellow/20 p-6 rounded-[1.5rem] border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <p className="text-sm font-bold text-slate-600 uppercase mb-2 flex items-center gap-2">
                              <Star className="w-4 h-4 fill-cute-yellow" /> 解析与易错点
                            </p>
                            <div className="text-base text-slate-800">
                              <span className="font-bold text-cute-pink">答案：</span>{q.answer}
                              <div className="mt-3 text-slate-700 leading-relaxed">
                                <ReactMarkdown>{q.explanation}</ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}

                      <button 
                        onClick={saveToBank}
                        className="w-full cute-button bg-cute-green text-slate-900 text-xl py-5"
                      >
                        <Save className="w-6 h-6" />
                        保存到错题本 ✨
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="bank"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-6"
            >
              {records.length === 0 ? (
                <div className="py-32 flex flex-col items-center justify-center gap-6 text-slate-400">
                  <div className="w-24 h-24 bg-slate-100 rounded-[2rem] flex items-center justify-center border-4 border-dashed border-slate-300">
                    <History className="w-12 h-12 opacity-30" />
                  </div>
                  <p className="font-bold text-xl">还没有错题记录呢，快去识别吧~</p>
                  <button 
                    onClick={() => setActivePage('recognize')}
                    className="cute-button bg-cute-pink text-white"
                  >
                    去识别错题
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {records.map((record) => (
                    <motion.div 
                      layout
                      key={record.id}
                      className={cn(
                        "cute-card transition-all overflow-hidden group cursor-pointer",
                        selectedRecords.includes(record.id) ? "bg-cute-blue/5 border-cute-blue ring-4 ring-cute-blue/20" : "bg-white"
                      )}
                      onClick={() => toggleSelect(record.id)}
                    >
                      <div className="p-6 flex items-start gap-6">
                        <div 
                          className={cn(
                            "mt-1 w-8 h-8 rounded-xl border-2 border-slate-900 flex items-center justify-center transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                            selectedRecords.includes(record.id) ? "bg-cute-pink" : "bg-white"
                          )}
                        >
                          {selectedRecords.includes(record.id) && <CheckCircle2 className="w-5 h-5 text-white" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                              📅 {new Date(record.createdAt).toLocaleDateString()}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteRecord(record.id);
                              }}
                              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                          <h4 className="font-bold text-xl text-slate-800 line-clamp-1 mb-3">{record.originalQuestion.text}</h4>
                          <div className="flex items-center gap-3">
                            <span className="px-4 py-1 bg-cute-purple text-white text-xs font-bold rounded-full border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                              {record.knowledgePoint}
                            </span>
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border-2 border-slate-900">
                              {record.similarQuestions.length} 道变式题
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-slate-300 mt-4" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Hidden Print Content */}
      <div className="fixed -left-[9999px] top-0">
        <div ref={printRef} className="w-[210mm] p-10 bg-white text-black font-serif">
          <h1 className="text-3xl font-bold text-center mb-10 border-b-4 border-black pb-6">我的可爱错题练习集 ✨</h1>
          {records.filter(r => selectedRecords.includes(r.id)).map((record, idx) => (
            <div key={record.id} className="mb-16 break-inside-avoid">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-2xl font-bold bg-black text-white px-4 py-1 rounded-lg">Q{idx + 1}</span>
                <span className="text-lg font-bold border-2 border-black px-4 py-1 rounded-full">知识点：{record.knowledgePoint}</span>
              </div>
              
              <div className="mb-8 p-6 border-4 border-black rounded-[2rem]">
                <p className="font-bold text-xl mb-4 underline decoration-cute-pink decoration-4">【原题回顾】</p>
                <div className="text-xl leading-relaxed">
                  <p>{record.originalQuestion.text}</p>
                  {record.originalQuestion.options && (
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      {record.originalQuestion.options.map((o, i) => <p key={i} className="border-2 border-slate-200 p-2 rounded-xl">{o}</p>)}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-10">
                {record.similarQuestions.map((q, qIdx) => (
                  <div key={qIdx} className="pl-6 border-l-8 border-cute-blue">
                    <p className="font-bold text-xl mb-4">【变式挑战 {qIdx + 1}】</p>
                    <p className="text-xl mb-6 leading-relaxed">{q.text}</p>
                    {q.options && (
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        {q.options.map((o, i) => <p key={i} className="border-2 border-slate-200 p-2 rounded-xl">{o}</p>)}
                      </div>
                    )}
                    <div className="bg-slate-50 p-6 rounded-[1.5rem] border-2 border-black">
                      <p className="text-lg font-bold text-cute-pink">答案：{q.answer}</p>
                      <p className="text-lg mt-2 leading-relaxed"><span className="font-bold">解析：</span>{q.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
              {idx < selectedRecords.length - 1 && <div className="mt-16 border-t-4 border-dotted border-slate-300" />}
            </div>
          ))}
          <footer className="mt-12 text-center text-sm font-bold text-slate-400">
            生成时间：{new Date().toLocaleString()} | 错题打印机 🖨️
          </footer>
        </div>
      </div>

      {/* Navigation */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white border-4 border-slate-900 rounded-[2.5rem] px-8 py-4 flex items-center gap-12 z-40 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <button 
          onClick={() => setActivePage('recognize')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activePage === 'recognize' ? "text-cute-pink scale-125" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Camera className="w-7 h-7" />
          <span className="text-[10px] font-bold uppercase tracking-widest">识别</span>
        </button>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-16 h-16 bg-cute-yellow text-slate-900 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-110 active:scale-95 transition-all"
        >
          <Plus className="w-10 h-10" />
        </button>

        <button 
          onClick={() => setActivePage('bank')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activePage === 'bank' ? "text-cute-pink scale-125" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <History className="w-7 h-7" />
          <span className="text-[10px] font-bold uppercase tracking-widest">记录</span>
        </button>
      </nav>
    </div>
  );
}
