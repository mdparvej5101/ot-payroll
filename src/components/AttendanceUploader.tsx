/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet, Clipboard, RefreshCw, Layers, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { UnmatchedLog } from '../types';

interface AttendanceUploaderProps {
  onDataParsed: (rawData: any[]) => void;
  fileName: string;
  setFileName: (name: string) => void;
  unmatchedLogs: UnmatchedLog[];
  hasData: boolean;
}

export default function AttendanceUploader({
  onDataParsed,
  fileName,
  setFileName,
  unmatchedLogs,
  hasData
}: AttendanceUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger Excel file processing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setErrorText(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Grab first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        if (!jsonData || jsonData.length === 0) {
          throw new Error("No readable rows found in the spreadsheet worksheet.");
        }

        onDataParsed(jsonData);
      } catch (err: any) {
        console.error(err);
        setErrorText(err.message || "Failed to process XLS file. Make sure file is not corrupted and matches the schema.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Convert pasted text (E.G. copied Excel cells) to standard JSON objects
  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    setErrorText(null);

    try {
      const lines = pasteText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length < 2) {
        throw new Error("Copy-paste must include at least two rows: a header row and data rows.");
      }

      // Detect separator: Tab is standard for Excel copies, fallback to Comma
      const tabCount = lines[0].split('\t').length;
      const commaCount = lines[0].split(',').length;
      const separator = tabCount >= commaCount ? '\t' : ',';

      const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
      const parsedRows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
        const rowObj: any = {};
        
        headers.forEach((header, index) => {
          rowObj[header] = columns[index] !== undefined ? columns[index] : '';
        });

        parsedRows.push(rowObj);
      }

      onDataParsed(parsedRows);
      setFileName("Pasted Data Clip");
      setShowPasteArea(false);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Failed parsing clip. Ensure you copy-pasted both header and body values.");
    }
  };

  const triggerBrowse = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="attendance-parser-panel">
      {/* Upload Methods Card */}
      <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">1. Input Attendance Sheet Logs</h3>
              <p className="text-xs text-slate-500">Upload your physical XLS sheet or copy-paste cells</p>
            </div>
          </div>

          {/* Drag & Drop Area */}
          <div
            id="drag-drop-zone"
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerBrowse}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-8 hover:bg-slate-50 border-slate-300 hover:border-indigo-400 text-center transition-all ${
              isDragActive ? 'border-indigo-500 bg-indigo-50/50' : 'bg-white'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center">
              <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Drag & Drop attendance sheet file</p>
              <p className="text-xs text-slate-400 mt-1">Accepts standard .xls, .xlsx or .csv files</p>
              <div className="mt-4 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold inline-block">
                Browse Files
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={() => setShowPasteArea(!showPasteArea)}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors cursor-pointer"
            >
              <Clipboard className="w-4 h-4" />
              {showPasteArea ? 'Hide Clipboard Paste' : 'Alternative: Quick Cell Copy-Paste'}
            </button>
          </div>

          {/* Paste Clipboard Text Box */}
          {showPasteArea && (
            <div className="mt-4 p-4 border border-slate-200 bg-slate-50 rounded-lg animate-fadeIn">
              <p className="text-xs text-slate-600 mb-2 font-medium">
                📋 Paste database rows including columns (Department, Name, No., Date/Time):
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={5}
                placeholder="Department&#9;Name&#9;No.&#9;Date/Time&#10;OUR COMPANY&#9;MAHBUB&#9;6&#9;01/03/2026 11:51:44&#10;OUR COMPANY&#9;MAHBUB&#9;6&#9;01/03/2026 21:03:33"
                className="w-full text-xs p-3 font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setShowPasteArea(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasteSubmit}
                  className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Parse Clips
                </button>
              </div>
            </div>
          )}

          {errorText && (
            <div className="mt-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Parsing Error Occurred</p>
                <p>{errorText}</p>
              </div>
            </div>
          )}
        </div>

        {/* Loaded state bar */}
        {hasData && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-xs font-semibold text-slate-800">Active Logs Active</p>
                <p className="text-[10px] text-slate-500 font-mono italic max-w-[200px] truncate">{fileName || 'Spreadsheet file'}</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                onDataParsed([]);
                setFileName('');
              }}
              className="text-xs text-red-600 hover:text-red-800 font-semibold"
            >
              Clear Records
            </button>
          </div>
        )}
      </div>

      {/* Guide/Mapping & Unmatched Warns */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-slate-800 text-sm">Target Column Schema</h4>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            Our intelligent calculator automatically maps spreadsheet columns. Ensure your Excel contains these headers (exact or similar casing):
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs mb-4">
            <span className="p-1 px-2.5 bg-white border border-slate-200 rounded text-slate-700 font-semibold text-center">Name</span>
            <span className="p-1 px-2.5 bg-white border border-slate-200 rounded text-slate-700 font-semibold text-center">No. / Punch Code</span>
            <span className="p-1 px-2.5 bg-white border border-slate-200 rounded text-slate-700 font-semibold text-center">Date/Time</span>
            <span className="p-1 px-2.5 bg-white border border-slate-200 rounded text-slate-700 font-semibold text-center">Department</span>
          </div>

          {/* Unmatched Warn Warning Panels */}
          {unmatchedLogs.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[11px]  overflow-y-auto max-h-[140px]">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Roster Miss Matches ({unmatchedLogs.length})</span>
              </div>
              <p className="mb-2 text-slate-600">The sheet contains codes missing from the master roster database:</p>
              <ul className="space-y-1 font-mono">
                {unmatchedLogs.map(log => (
                  <li key={log.excelKey} className="flex justify-between border-b border-amber-100 pb-0.5">
                    <span className="font-semibold">{log.excelKey}</span>
                    <span className="text-[10px] text-amber-700">({log.totalPunches} punches)</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-indigo-600 font-bold hover:underline cursor-pointer text-center">
                💡 Tip: Add them to the Roster Database below so we can calculate their pay!
              </p>
            </div>
          )}

          {unmatchedLogs.length === 0 && hasData && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>Perfect Match! All punches map to registered employee master IDs in DB.</span>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-400 mt-4 leading-relaxed">
          🔒 Processing is completed client-side. No excel files or personnel payroll details are uploaded to server nodes.
        </div>
      </div>
    </div>
  );
}
