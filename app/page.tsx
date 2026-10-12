"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useRef } from "react";
import { getSupabase } from "../lib/supabase";
import {
  Folder,
  CheckSquare,
  FileText,
  Plus,
  Trash2,
  Star,
  Search,
  Share2,
  Image as ImageIcon,
  Check,
  Tag,
  Menu,
  X,
  ArrowLeft,
  FolderPlus,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Edit2,
  Bold,
  Italic,
  Strikethrough,
  Palette,
  List,
  ListOrdered,
  Square,
  Circle,
  Highlighter,
  Undo,
  Redo,
  Table,
  LogOut,
  User,
  Lock,
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  isPinned: boolean;
  images: string[];
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
  sort_order?: number;
}

const DEFAULT_FOLDERS: FolderItem[] = [
  { id: "work", name: "仕事" },
  { id: "personal", name: "プライベート" },
  { id: "ideas", name: "アイデア" },
];

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState("");

  const [folders, setFolders] = useState<FolderItem[]>(DEFAULT_FOLDERS);
  const [selectedFolder, setSelectedFolder] = useState<string>("work");

  const [notes, setNotes] = useState<Note[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  // ブラウザ上（クライアントサイド）でのみ初期化
  useEffect(() => {
    if (typeof window === "undefined") return;

    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // クラウド同期
  useEffect(() => {
    if (!user || typeof window === "undefined") return;

    const supabase = getSupabase();

    const fetchData = async () => {
      try {
        const { data: fData } = await supabase.from("folders").select("*").order("sort_order", { ascending: true });
        if (fData && fData.length > 0) setFolders(fData);

        const { data: nData } = await supabase.from("notes").select("*").order("updated_at", { ascending: false });
        if (nData) {
          const mappedNotes = nData.map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            folderId: n.folder_id,
            isPinned: n.is_pinned,
            images: n.images || [],
            updatedAt: n.updated_at,
          }));
          setNotes(mappedNotes);
          if (mappedNotes.length > 0) setActiveNoteId(mappedNotes[0].id);
        }

        const { data: tData } = await supabase.from("todos").select("*").order("created_at", { ascending: false });
        if (tData) {
          setTodos(tData.map((t) => ({ id: t.id, text: t.text, category: t.category, completed: t.completed, createdAt: t.created_at })));
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchData();
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const supabase = getSupabase();

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      if (error) setAuthError(error.message);
      else alert("登録完了メールを送信しました。メール内のリンクをご確認ください。");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) setAuthError("メールアドレスまたはパスワードが正しくありません。");
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    setUser(null);
  };

  const activeNote = notes.find((n) => n.id === activeNoteId);

  useEffect(() => {
    if (editorRef.current && activeNote) {
      if (editorRef.current.innerHTML !== activeNote.content) {
        editorRef.current.innerHTML = activeNote.content || "";
      }
    }
  }, [activeNoteId]);

  const createNewNote = async () => {
    if (!user) return;
    const supabase = getSupabase();
    const newNote: Note = {
      id: Date.now().toString(),
      title: "無題のメモ",
      content: "",
      folderId: selectedFolder,
      isPinned: false,
      images: [],
      updatedAt: new Date().toLocaleString("ja-JP"),
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);

    await supabase.from("notes").insert({
      id: newNote.id,
      user_id: user.id,
      folder_id: newNote.folderId,
      title: newNote.title,
      content: newNote.content,
      is_pinned: newNote.isPinned,
      images: newNote.images,
      updated_at: newNote.updatedAt,
    });
  };

  const updateActiveNote = async (fields: Partial<Note>) => {
    if (!activeNoteId || !user) return;
    const supabase = getSupabase();
    const updatedAt = new Date().toLocaleString("ja-JP");
    setNotes((prev) =>
      prev.map((n) => (n.id === activeNoteId ? { ...n, ...fields, updatedAt } : n))
    );

    await supabase.from("notes").update({
      title: fields.title,
      content: fields.content,
      folder_id: fields.folderId,
      is_pinned: fields.isPinned,
      images: fields.images,
      updated_at: updatedAt,
    }).eq("id", activeNoteId);
  };

  const filteredNotes = notes.filter((n) => n.folderId === selectedFolder);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">SmartHub</h1>
            <p className="text-xs text-slate-500 mt-1">スマホとPCでリアルタイム同期メモ帳</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authError && <div className="text-xs bg-red-50 text-red-600 p-2.5 rounded-lg">{authError}</div>}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">メールアドレス</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">パスワード</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition">
              {isSignUp ? "新規アカウント登録" : "ログイン (自動ログイン)"}
            </button>
          </form>

          <div className="text-center">
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-xs text-indigo-600 hover:underline">
              {isSignUp ? "アカウントをお持ちの方はこちら (ログイン)" : "初めての方はこちら (アカウント作成)"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-100 text-slate-800 font-sans overflow-hidden">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">SmartHub</h1>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 p-1" title="ログアウト">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 p-3 overflow-y-auto space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase px-2 mb-2">フォルダ</div>
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFolder(f.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                selectedFolder === f.id ? "bg-slate-800 text-indigo-400" : "hover:bg-slate-800/50 text-slate-400"
              }`}
            >
              <Folder className="w-4 h-4" /> {f.name}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex bg-white overflow-hidden">
        <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
          <div className="p-3 border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500">メモ一覧 ({filteredNotes.length})</span>
            <button onClick={createNewNote} className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-md">
              <Plus className="w-3.5 h-3.5" /> 新規
            </button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={`p-3 cursor-pointer ${activeNoteId === note.id ? "bg-indigo-50/60 border-l-4 border-indigo-600" : ""}`}
              >
                <h3 className="text-sm font-semibold text-slate-800 truncate">{note.title || "無題のメモ"}</h3>
                <p className="text-xs text-slate-500 line-clamp-1 mt-1">{note.content.replace(/<[^>]*>/g, "") || "内容なし"}</p>
              </div>
            ))}
          </div>
        </div>

        {activeNote ? (
          <div className="flex-1 flex flex-col overflow-y-auto p-6 max-w-4xl mx-auto w-full">
            <input
              type="text"
              value={activeNote.title}
              onChange={(e) => updateActiveNote({ title: e.target.value })}
              className="text-2xl font-bold border-none focus:outline-none mb-4"
              placeholder="タイトルを入力..."
            />
            <div
              ref={editorRef}
              contentEditable
              onInput={() => editorRef.current && updateActiveNote({ content: editorRef.current.innerHTML })}
              className="flex-1 w-full border-none focus:outline-none text-slate-700 leading-relaxed min-h-[300px]"
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">メモを選択してください。</div>
        )}
      </main>
    </div>
  );
}
