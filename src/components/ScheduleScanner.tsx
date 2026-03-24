import React, { useState } from 'react';
import { Upload, Calendar, Loader2, CheckCircle2, Type as TypeIcon, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { translations, Language } from '../i18n';

interface ScheduleScannerProps {
  uid: string;
  lang: Language;
}

export default function ScheduleScanner({ uid, lang }: ScheduleScannerProps) {
  const [inputType, setInputType] = useState<'image' | 'text'>('image');
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const t = translations[lang];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setSuccess(false);
      setErrorMsg(null);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value);
    setSuccess(false);
    setErrorMsg(null);
  };

  const processWithAI = async (parts: any[]) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(t.errorMissingKey || 'API key missing');
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-preview',
      contents: {
        parts: [
          ...parts,
          {
            text: 'Extract the work schedule from this input. Return a JSON array of objects with "date" (YYYY-MM-DD), "startTime" (HH:mm), and "endTime" (HH:mm). If a day is off, do not include it. Only return the JSON array.',
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              startTime: { type: Type.STRING },
              endTime: { type: Type.STRING },
            },
            required: ['date', 'startTime', 'endTime']
          }
        }
      }
    });

    let jsonStr = response.text || '';
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const shifts = JSON.parse(jsonStr);
    
    // Save to Firestore
    for (const shift of shifts) {
      if (!shift.date || !shift.startTime || !shift.endTime) continue;
      const shiftId = `${uid}_${shift.date}`;
      await setDoc(doc(db, 'shifts', shiftId), {
        uid,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        createdAt: new Date().toISOString()
      });
    }
  };

  const handleScan = async () => {
    if (inputType === 'image' && !file) return;
    if (inputType === 'text' && !textInput.trim()) return;
    
    setIsScanning(true);
    setSuccess(false);
    setErrorMsg(null);

    try {
      if (inputType === 'image' && file) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1];
            const mimeType = file.type;
            await processWithAI([{ inlineData: { data: base64Data, mimeType } }]);
            setSuccess(true);
            setIsScanning(false);
          } catch (err: any) {
            console.error('Error scanning schedule:', err);
            setErrorMsg(err.message || t.errorParsing);
            setIsScanning(false);
          }
        };
        reader.onerror = () => {
          setErrorMsg(t.errorParsing);
          setIsScanning(false);
        };
      } else if (inputType === 'text' && textInput.trim()) {
        await processWithAI([{ text: textInput }]);
        setSuccess(true);
        setIsScanning(false);
      }
    } catch (error: any) {
      console.error('Error scanning schedule:', error);
      setErrorMsg(error.message || t.errorParsing);
      setIsScanning(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-6 sm:p-8 mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-500" />
          {t.scheduleScanner}
        </h2>
        
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => { setInputType('image'); setSuccess(false); setErrorMsg(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${inputType === 'image' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ImageIcon className="w-4 h-4" />
            {t.imageInput || 'Slika'}
          </button>
          <button
            onClick={() => { setInputType('text'); setSuccess(false); setErrorMsg(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${inputType === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <TypeIcon className="w-4 h-4" />
            {t.textInput || 'Tekst'}
          </button>
        </div>
      </div>
      
      {errorMsg && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{errorMsg}</p>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row items-start sm:items-stretch gap-4">
        <div className="flex-1 w-full">
          {inputType === 'image' ? (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-3 text-slate-400" />
                <p className="mb-2 text-sm text-slate-500">
                  <span className="font-semibold">{t.uploadExcel}</span>
                </p>
                {file && <p className="text-xs text-indigo-600 font-medium">{file.name}</p>}
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
          ) : (
            <textarea
              value={textInput}
              onChange={handleTextChange}
              placeholder={t.pasteSchedule || 'Zalijepite raspored ovdje...'}
              className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none resize-none"
            />
          )}
        </div>
        
        <button
          onClick={handleScan}
          disabled={(inputType === 'image' ? !file : !textInput.trim()) || isScanning}
          className="w-full sm:w-auto h-32 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors flex flex-col items-center justify-center gap-2"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">{t.scanning}</span>
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="w-6 h-6" />
              <span className="text-sm">{t.shiftsSaved}</span>
            </>
          ) : (
            <>
              {inputType === 'image' ? <ImageIcon className="w-6 h-6" /> : <TypeIcon className="w-6 h-6" />}
              <span className="text-sm">{inputType === 'image' ? t.scanBtn : (t.scanTextBtn || 'Skeniraj')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
