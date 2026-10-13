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
  Trash2,
  Download,
  Upload,
  CheckSquare,
  Square,
  X,
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  isPinned: boolean;
  updatedAt: string;
}

interface Todo {
  id: string;
  text: string;
  category: string;
  completed: boolean;
  createdAt: string;
}

interface FolderItem {
  id: string;
  name: string;
}

const DEFAULT_FOLDERS: FolderItem[] = [
  { id: "work", name: "仕事" },
  { id: "personal", name: "プライベート" },
  { id: "ideas", name: "アイデア" },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  // フォルダ
  const [folders, setFolders] = useState<FolderItem[]>(DEFAULT_FOLDERS);
  const [newFolderName, setNewFolderName] = useState("");
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>("work");

  // メモ & ToDo
  const [notes, setNotes] = useState<Note[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoText, setNewTodoText] = useState("");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // メイン画面の表示モード ( 'notes' | 'todos' )
  const [mainTab, setMainTab] = useState<"notes" | "todos">("notes");

  // モバイルでメモ本文を開いているかのフラグ
  const [mobileEditing, setMobileEditing] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // キーボード表示検知
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

  // クラウド同期
  useEffect(() => {
    if (!mounted || !user) return;
    const fetchData = async () => {
      try {
        const supabase = getSupabase();
        
        const { data: fData } = await supabase.from("folders").select("*");
        if (fData && fData.length > 0) {
          setFolders(fData.map(f => ({ id: f.id, name: f.name })));
        }

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

        const { data: tData } = await supabase.from("todos").select("*").order("created_at", { ascending: false });
        if (tData) {
          setTodos(tData.map((t) => ({
            id: t.id,
            text: t.text,
            category: t.category || "work",
            completed: t.completed || false,
            createdAt: t.created_at,
          })));
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
      <div className="h-[100dvh] w-full bg-slate-50 flex items-center justify-center text-slate-500 font-sans text-sm">
        <span>読み込み中...</span>
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
    const newFolder: FolderItem = { id: Date.now().toString(), name: newFolderName.trim() };
    setFolders([...folders, newFolder]);
    setSelectedFolder(newFolder.id);
    setNewFolderName("");
    setShowFolderInput(false);

    const supabase = getSupabase();
    await supabase.from("folders").insert({ id: newFolder.id, user_id: user.id, name: newFolder.name });
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
    setMobileEditing(true);

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

    setNotes((prev) => prev.map((n) => (n.id === activeNoteId ? { ...n, ...fields, updatedAt } : n)));

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

  // --- ToDo操作 ---
  const createTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim() || !user) return;
    const supabase = getSupabase();

    const newTodo: Todo = {
      id: Date.now().toString(),
      text: newTodoText.trim(),
      category: selectedFolder,
      completed: false,
      createdAt: new Date().toLocaleDateString("ja-JP"),
    };

    setTodos([newTodo, ...todos]);
    setNewTodoText("");

    await supabase.from("todos").insert({
      id: newTodo.id,
      user_id: user.id,
      text: newTodo.text,
      category: newTodo.category,
      completed: newTodo.completed,
      created_at: newTodo.createdAt,
    });
  };

  const toggleTodo = async (id: string) => {
    if (!user) return;
    const supabase = getSupabase();
    const target = todos.find((t) => t.id === id);
    if (!target) return;

    const nextCompleted = !target.completed;
    setTodos(todos.map((t) => (t.id === id ? { ...t, completed: nextCompleted } : t)));

    await supabase.from("todos").update({ completed: nextCompleted }).eq("id", id);
  };

  const deleteTodo = async (id: string) => {
    if (!user) return;
    const supabase = getSupabase();
    setTodos(todos.filter((t) => t.id !== id));
    await supabase.from("todos").delete().eq("id", id);
  };

  // --- エクスポート & インポート ---
  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ folders, notes, todos }, null, 2));
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
            if (parsed.todos) setTodos(parsed.todos);
            alert("データを復元しました！");
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

  const filteredTodos = todos.filter((t) => t.category === selectedFolder);

  if (!user) {
    return (
      <div className="h-[100dvh] w-full bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-lg space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SmartHub</h1>
            <p className="text-xs text-slate-500">シンプルで使いやすいクラウド同期メモ帳</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authError && (
              <div className="text-xs bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl break-words text-center">
                {authError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 ml-0.5">メールアドレス</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 ml-0.5">パスワード (6文字以上)</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-sm disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? "処理中..." : isSignUp ? "新規アカウント作成" : "ログイン"}
            </button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setAuthError(""); }}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              {isSignUp ? "アカウントをお持ちの方（ログイン）" : "初めての方（新規登録）"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-slate-50 text-slate-800 font-sans flex flex-col relative overflow-hidden">
      
      {/* メインレイアウト */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* PC・タブレット用サイドバー */}
        <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-slate-900 tracking-tight text-base">SmartHub</span>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition" title="ログアウト">
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 flex-1 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">フォルダ</span>
              <button
                onClick={() => setShowFolderInput(!showFolderInput)}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> 追加
              </button>
            </div>

            {showFolderInput && (
              <div className="flex gap-1.5 px-0.5">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="フォルダ名"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={createFolder}
                  className="px-3 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg hover:bg-blue-700 transition"
                >
                  追加
                </button>
              </div>
            )}

            <div className="space-y-0.5">
              {folders.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedFolder(f.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition cursor-pointer group ${
                    selectedFolder === f.id
                      ? "bg-blue-50 text-blue-600 font-semibold"
                      : "hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Folder className="w-4 h-4 shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </div>
                  <button
                    onClick={(e) => deleteFolder(f.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 border-t border-slate-200 bg-slate-50/50 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">データバックアップ</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={exportData}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> 保存
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium transition shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" /> 復元
              </button>
              <input type="file" ref={fileInputRef} onChange={importData} accept=".json" className="hidden" />
            </div>
          </div>
        </aside>

        {/* --- メインエリア：ToDo表示 --- */}
        {mainTab === "todos" ? (
          <main className="flex-1 bg-white flex flex-col h-full overflow-hidden p-4 md:p-8 max-w-3xl mx-auto w-full">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-blue-600" /> ToDoタスク
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">カテゴリ: {folders.find(f => f.id === selectedFolder)?.name}</p>
              </div>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {filteredTodos.filter(t => t.completed).length} / {filteredTodos.length} 完了
              </span>
            </div>

            <form onSubmit={createTodo} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder="新しいタスクを入力..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition flex items-center gap-1 shrink-0 shadow-sm"
              >
                <Plus className="w-4 h-4" /> 追加
              </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
              {filteredTodos.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">タスクはありません</div>
              ) : (
                filteredTodos.map((todo) => (
                  <div
                    key={todo.id}
                    onClick={() => toggleTodo(todo.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                      todo.completed
                        ? "bg-slate-50 border-slate-200 text-slate-400 line-through"
                        : "bg-white border-slate-200 text-slate-800 hover:border-blue-300 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                      {todo.completed ? (
                        <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                      <span className="text-sm truncate">{todo.text}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </main>
        ) : (
          /* --- メインエリア：メモ表示 --- */
          <>
            {/* メモ一覧 (スマホで編集中の場合は非表示) */}
            <section className={`w-full md:w-80 bg-slate-50/80 border-r border-slate-200 flex-col shrink-0 ${mobileEditing ? 'hidden md:flex' : 'flex'}`}>
              
              {/* スマホ用ヘッダー（フォルダ選択＆ログアウト） */}
              <div className="md:hidden p-3 bg-white border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-[80%]">
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFolder(f.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                        selectedFolder === f.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
                <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-1">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 border-b border-slate-200 space-y-2 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 hidden md:inline">
                    {folders.find(f => f.id === selectedFolder)?.name} ({filteredNotes.length})
                  </span>
                  <button
                    onClick={createNewNote}
                    className="w-full md:w-auto flex items-center justify-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-2 md:py-1.5 rounded-xl transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> 新規メモ作成
                  </button>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="メモを検索..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-200/60 bg-white">
                {filteredNotes.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">メモがありません</div>
                ) : (
                  filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => { setActiveNoteId(note.id); setMobileEditing(true); }}
                      className={`p-3.5 cursor-pointer transition group relative ${
                        activeNoteId === note.id ? "bg-blue-50/70 border-l-3 border-blue-600" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs font-bold text-slate-800 truncate flex-1">{note.title || "無題のメモ"}</h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); updateActiveNote({ isPinned: !note.isPinned }); }}
                            className={`p-1 rounded ${note.isPinned ? 'text-amber-500' : 'text-slate-300 hover:text-slate-500'}`}
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => deleteNote(note.id, e)}
                            className="p-1 text-slate-300 hover:text-red-500 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {note.content.replace(/<[^>]*>/g, "") || "内容なし"}
                      </p>
                      <div className="text-[9px] text-slate-400 mt-2">{note.updatedAt}</div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* エディタ本文（スマホで未選択時は非表示） */}
            <main className={`flex-1 bg-white flex-col h-full overflow-hidden ${mobileEditing ? 'flex' : 'hidden md:flex'}`}>
              {activeNote ? (
                <>
                  {/* スマホ用「＜ メモ一覧へ戻る」バー */}
                  <div className="md:hidden p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <button onClick={() => setMobileEditing(false)} className="flex items-center gap-1 text-xs text-blue-600 font-semibold">
                      <ChevronLeft className="w-4 h-4" /> メモ一覧
                    </button>
                    <span className="text-xs text-slate-500 truncate max-w-[160px] font-medium">{activeNote.title || "無題のメモ"}</span>
                    <div className="w-8"></div>
                  </div>

                  {/* ツールバー */}
                  <div className="p-2 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/50">
                    <div className="flex items-center gap-1">
                      <button onClick={() => formatExec("bold")} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200/60 transition" title="太字">
                        <Bold className="w-4 h-4" />
                      </button>
                      <button onClick={() => formatExec("italic")} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200/60 transition" title="斜体">
                        <Italic className="w-4 h-4" />
                      </button>
                      <button onClick={() => formatExec("insertUnorderedList")} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200/60 transition" title="箇条書き">
                        <List className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-400 pr-2">{activeNote.updatedAt}</div>
                  </div>

                  <div className="flex-1 p-4 md:p-8 overflow-y-auto max-w-3xl mx-auto w-full space-y-4">
                    <input
                      type="text"
                      value={activeNote.title}
                      onChange={(e) => updateActiveNote({ title: e.target.value })}
                      className="w-full bg-transparent text-xl md:text-2xl font-bold text-slate-900 border-none focus:outline-none placeholder-slate-300"
                      placeholder="タイトルを入力..."
                    />
                    <div
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={() => editorRef.current && updateActiveNote({ content: editorRef.current.innerHTML })}
                      className="w-full min-h-[300px] text-sm md:text-base text-slate-700 leading-relaxed border-none focus:outline-none select-text"
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
                  <FileText className="w-8 h-8 stroke-1 text-slate-300" />
                  <span>メモを選択するか、新規作成してください</span>
                </div>
              )}
            </main>
          </>
        )}

      </div>

      {/* スマホ専用 下部シンプル2タブ（「メモ」と「ToDo」のみ） */}
      {!isKeyboardOpen && (
        <nav className="md:hidden bg-white border-t border-slate-200 grid grid-cols-2 py-2 px-6 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg">
          <button
            onClick={() => { setMainTab('notes'); setMobileEditing(false); }}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition ${
              mainTab === 'notes' ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>メモ</span>
          </button>
          <button
            onClick={() => { setMainTab('todos'); setMobileEditing(false); }}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition ${
              mainTab === 'todos' ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            <CheckSquare className="w-5 h-5" />
            <span>ToDo</span>
          </button>
        </nav>
      )}

    </div>
  );
}
