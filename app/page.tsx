"use client";

import React, { useState, useEffect, useRef } from "react";
import { getSupabase } from "../lib/supabase";
import {
  Folder,
  Plus,
  LogOut,
  User,
  Lock,
  Search,
  Pin,
  FileText,
  ChevronLeft,
  ChevronRight,
  Bold,
  Italic,
  List,
  Sparkles,
  Trash2,
  Download,
  Upload,
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  isPinned: boolean;
  updatedAt: string;
}

interface FolderItem {
  id: string;
  name: string;
}

const DEFAULT_FOLDERS: FolderItem[] = [
  { id: "work", name: "仕事・プロジェクト" },
  { id: "personal", name: "プライベート" },
  { id: "ideas", name: "アイデアノート" },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  const [folders, setFolders] = useState<FolderItem[]>(DEFAULT_FOLDERS);
  const [newFolderName, setNewFolderName] = useState("");
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>("work");

  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [mobileView, setMobileView] = useState<"folders" | "list" | "editor">("list");
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // iOS ソフトウェアキーボード検知
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const handleResize = () => {
      if (!window.visualViewport) return;
      setIsKeyboardOpen(window.visualViewport.height < window.innerHeight * 0.75);
    };
    window.visualViewport.addEventListener("resize", handleResize);
    return () => window.visualViewport?.removeEventListener("resize", handleResize);
  }, []);

  // 認証チェック
  useEffect(() => {
    if (!mounted) return;
    try {
      const supabase = getSupabase();
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    } catch (e: any) {
      console.error(e);
      setAuthError(e.message || "Supabase初期化エラー");
    }
  }, [mounted]);

  // データ同期
  useEffect(() => {
    if (!mounted || !user) return;
    const fetchData = async () => {
      try {
        const supabase = getSupabase();
        
        // フォルダ取得
        const { data: fData } = await supabase.from("folders").select("*");
        if (fData && fData.length > 0) {
          setFolders(fData.map(f => ({ id: f.id, name: f.name })));
        }

        // メモ取得
        const { data: nData } = await supabase.from("notes").select("*").order("updated_at", { ascending: false });
        if (nData) {
          const mapped = nData.map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            folderId: n.folder_id,
            isPinned: n.is_pinned || false,
            updatedAt: n.updated_at,
          }));
          setNotes(mapped);
          if (mapped.length > 0 && !activeNoteId) setActiveNoteId(mapped[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, [mounted, user]);

  const activeNote = notes.find((n) => n.id === activeNoteId);

  useEffect(() => {
    if (editorRef.current && activeNote) {
      if (editorRef.current.innerHTML !== activeNote.content) {
        editorRef.current.innerHTML = activeNote.content;
      }
    }
  }, [activeNoteId]);

  if (!mounted) {
    return (
      <div className="h-[100dvh] w-full bg-slate-950 flex items-center justify-center text-slate-400 font-sans text-sm">
        <div className="flex items-center gap-2 animate-pulse">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>SmartHub 起動中...</span>
        </div>
      </div>
    );
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);

    try {
      const supabase = getSupabase();
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
        if (error) setAuthError(error.message);
        else if (data.user && !data.session) alert("登録確認メールをご確認ください。");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) setAuthError("メールアドレスまたはパスワードが正しくありません。");
      }
    } catch (err: any) {
      setAuthError(err.message || "認証エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch (e) {}
    setUser(null);
  };

  // --- フォルダ操作 ---
  const createFolder = async () => {
    if (!newFolderName.trim() || !user) return;
    const newFolder: FolderItem = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
    };
    const updated = [...folders, newFolder];
    setFolders(updated);
    setSelectedFolder(newFolder.id);
    setNewFolderName("");
    setShowFolderInput(false);

    const supabase = getSupabase();
    await supabase.from("folders").insert({
      id: newFolder.id,
      user_id: user.id,
      name: newFolder.name,
    });
  };

  const deleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (folders.length <= 1) {
      alert("最後のフォルダは削除できません。");
      return;
    }
    if (!confirm("このフォルダを削除しますか？（中のメモも削除されます）")) return;

    const updated = folders.filter((f) => f.id !== folderId);
    setFolders(updated);
    if (selectedFolder === folderId) setSelectedFolder(updated[0].id);

    const supabase = getSupabase();
    await supabase.from("folders").delete().eq("id", folderId);
    await supabase.from("notes").delete().eq("folder_id", folderId);
    setNotes(notes.filter((n) => n.folderId !== folderId));
  };

  // --- メモ操作 ---
  const createNewNote = async () => {
    if (!user) return;
    const supabase = getSupabase();
    const newNote: Note = {
      id: Date.now().toString(),
      title: "新規メモ",
      content: "",
      folderId: selectedFolder,
      isPinned: false,
      updatedAt: new Date().toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setMobileView("editor");

    await supabase.from("notes").insert({
      id: newNote.id,
      user_id: user.id,
      folder_id: newNote.folderId,
      title: newNote.title,
      content: newNote.content,
      is_pinned: newNote.isPinned,
      updated_at: newNote.updatedAt,
    });
  };

  const updateActiveNote = async (fields: Partial<Note>) => {
    if (!activeNoteId || !user) return;
    const supabase = getSupabase();
    const updatedAt = new Date().toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

    setNotes((prev) =>
      prev.map((n) => (n.id === activeNoteId ? { ...n, ...fields, updatedAt } : n))
    );

    await supabase.from("notes").update({
      title: fields.title !== undefined ? fields.title : activeNote?.title,
      content: fields.content !== undefined ? fields.content : activeNote?.content,
      folder_id: fields.folderId !== undefined ? fields.folderId : activeNote?.folderId,
      is_pinned: fields.isPinned !== undefined ? fields.isPinned : activeNote?.isPinned,
      updated_at: updatedAt,
    }).eq("id", activeNoteId);
  };

  const deleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !confirm("このメモを削除してもよろしいですか？")) return;
    const supabase = getSupabase();
    setNotes(notes.filter((n) => n.id !== id));
    if (activeNoteId === id) setActiveNoteId(null);
    await supabase.from("notes").delete().eq("id", id);
  };

  // --- エクスポート & インポート ---
  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ folders, notes }, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `SmartHub_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.folders && parsed.notes && user) {
            setFolders(parsed.folders);
            setNotes(parsed.notes);
            alert("バックアップデータを正常に復元・読み込みました！");
          } else {
            alert("無効なバックアップファイルフォーマットです。");
          }
        } catch (err) {
          alert("ファイルの読み込み中にエラーが発生しました。");
        }
      };
    }
  };

  const formatExec = (cmd: string) => {
    document.execCommand(cmd, false, "");
    if (editorRef.current) updateActiveNote({ content: editorRef.current.innerHTML });
  };

  const filteredNotes = notes
    .filter((n) => n.folderId === selectedFolder)
    .filter((n) => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  if (!user) {
    return (
      <div className="h-[100dvh] w-full bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 max-w-md w-full shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-2">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-wider text-white">SmartHub</h1>
            <p className="text-xs text-slate-400">スマホ・PCでリアルタイム同期する至高のメモ帳</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authError && (
              <div className="text-xs bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl break-words text-center">
                {authError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 ml-1">メールアドレス</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 ml-1">パスワード (6文字以上)</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? "処理中..." : isSignUp ? "新規アカウント作成" : "ログイン"}
            </button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setAuthError(""); }}
              className="text-xs text-slate-400 hover:text-amber-400 transition"
            >
              {isSignUp ? "アカウントをお持ちの方（ログイン）" : "初めての方（新規登録）"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-hidden select-none">
      
      {/* メインコンテンツエリア */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* サイドバー（フォルダ管理・データ入出力） */}
        <aside className={`w-full md:w-64 bg-slate-900 border-r border-slate-800 flex-col shrink-0 ${mobileView === 'folders' ? 'flex' : 'hidden md:flex'}`}>
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-bold tracking-wide text-white">SmartHub</span>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition" title="ログアウト">
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 flex-1 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">フォルダ</span>
              <button
                onClick={() => setShowFolderInput(!showFolderInput)}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> 追加
              </button>
            </div>

            {showFolderInput && (
              <div className="flex gap-2 px-1">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="フォルダ名"
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  onClick={createFolder}
                  className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400 transition"
                >
                  保存
                </button>
              </div>
            )}

            <div className="space-y-1">
              {folders.map((f) => (
                <div
                  key={f.id}
                  onClick={() => { setSelectedFolder(f.id); setMobileView('list'); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition cursor-pointer group ${
                    selectedFolder === f.id
                      ? "bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium"
                      : "hover:bg-slate-800 text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Folder className="w-4 h-4 shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </div>
                  <button
                    onClick={(e) => deleteFolder(f.id, e)}
                    className="opacity-100 md:opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition"
                    title="フォルダ削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* バックアップ・インポート / エクスポート */}
          <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-900">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1">データ管理</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={exportData}
                className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                <Download className="w-3.5 h-3.5" /> 保存
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                <Upload className="w-3.5 h-3.5" /> 復元
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={importData}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>
        </aside>

        {/* メモ一覧カラム */}
        <section className={`w-full md:w-80 bg-slate-900/60 border-r border-slate-800 flex-col shrink-0 ${mobileView === 'list' ? 'flex' : 'hidden md:flex'}`}>
          <div className="md:hidden p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
            <button onClick={() => setMobileView('folders')} className="flex items-center gap-1 text-xs text-amber-400 font-medium">
              <ChevronLeft className="w-4 h-4" /> フォルダ
            </button>
            <span className="text-xs font-bold text-white">{folders.find(f => f.id === selectedFolder)?.name}</span>
            <div className="w-12"></div>
          </div>

          <div className="p-3 border-b border-slate-800 space-y-2 bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 hidden md:inline">
                {folders.find(f => f.id === selectedFolder)?.name} ({filteredNotes.length})
              </span>
              <button
                onClick={createNewNote}
                className="w-full md:w-auto flex items-center justify-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-2 md:py-1.5 rounded-xl shadow-md transition active:scale-95"
              >
                <Plus className="w-4 h-4" /> 新規メモ作成
              </button>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="メモを検索..."
                className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
            {filteredNotes.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">メモがありません</div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => { setActiveNoteId(note.id); setMobileView('editor'); }}
                  className={`p-3.5 cursor-pointer transition group relative ${
                    activeNoteId === note.id ? "bg-amber-500/10 border-l-2 border-amber-400" : "hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-semibold text-white truncate flex-1">{note.title || "無題のメモ"}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); updateActiveNote({ isPinned: !note.isPinned }); }}
                        className={`p-1 rounded hover:bg-slate-700 ${note.isPinned ? 'text-amber-400' : 'text-slate-600'}`}
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => deleteNote(note.id, e)}
                        className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-slate-700 opacity-100 md:opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {note.content.replace(/<[^>]*>/g, "") || "内容なし"}
                  </p>
                  <div className="text-[9px] text-slate-500 mt-2">{note.updatedAt}</div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* エディタメイン領域 */}
        <main className={`flex-1 bg-slate-950 flex-col h-full overflow-hidden ${mobileView === 'editor' ? 'flex' : 'hidden md:flex'}`}>
          {activeNote ? (
            <>
              <div className="md:hidden p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                <button onClick={() => setMobileView('list')} className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                  <ChevronLeft className="w-4 h-4" /> メモ一覧
                </button>
                <span className="text-xs text-slate-400 truncate max-w-[150px]">{activeNote.title || "無題のメモ"}</span>
                <div className="w-8"></div>
              </div>

              <div className="p-2 md:p-3 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-900">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => formatExec("bold")}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="太字"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatExec("italic")}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="斜体"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatExec("insertUnorderedList")}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="箇条書き"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-[10px] md:text-xs text-slate-500">{activeNote.updatedAt}</div>
              </div>

              <div className="flex-1 p-4 md:p-8 overflow-y-auto max-w-3xl mx-auto w-full space-y-4 pb-20 md:pb-8">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => updateActiveNote({ title: e.target.value })}
                  className="w-full bg-transparent text-xl md:text-2xl font-bold text-white border-none focus:outline-none placeholder-slate-600"
                  placeholder="タイトルを入力..."
                />
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={() => editorRef.current && updateActiveNote({ content: editorRef.current.innerHTML })}
                  className="w-full min-h-[300px] text-sm md:text-base text-slate-200 leading-relaxed border-none focus:outline-none select-text"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
              <FileText className="w-8 h-8 stroke-1 text-slate-600" />
              <span>メモを選択するか、新規作成してください</span>
            </div>
          )}
        </main>

      </div>

      {/* iPhone用ボトムナビゲーション */}
      {!isKeyboardOpen && (
        <nav className="md:hidden bg-slate-900 border-t border-slate-800 flex items-center justify-around py-2 px-4 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => setMobileView('folders')}
            className={`flex flex-col items-center gap-1 text-[10px] ${mobileView === 'folders' ? 'text-amber-400 font-bold' : 'text-slate-400'}`}
          >
            <Folder className="w-4 h-4" />
            <span>フォルダ</span>
          </button>
          <button
            onClick={() => setMobileView('list')}
            className={`flex flex-col items-center gap-1 text-[10px] ${mobileView === 'list' ? 'text-amber-400 font-bold' : 'text-slate-400'}`}
          >
            <FileText className="w-4 h-4" />
            <span>メモ一覧</span>
          </button>
          <button
            onClick={() => {
              if (!activeNote) createNewNote();
              setMobileView('editor');
            }}
            className={`flex flex-col items-center gap-1 text-[10px] ${mobileView === 'editor' ? 'text-amber-400 font-bold' : 'text-slate-400'}`}
          >
            <Sparkles className="w-4 h-4" />
            <span>エディタ</span>
          </button>
        </nav>
      )}

    </div>
  );
}
