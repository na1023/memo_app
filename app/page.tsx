'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Clipboard, FileText, Folder, Image as ImageIcon, ListTodo, Pin, Plus, Search, Share2, Sparkles, Star, WandSparkles } from 'lucide-react'

type Note = { id: number; title: string; body: string; folder: string; date: string; pinned: boolean }
type Todo = { id: number; text: string; category: string }

const initialNotes: Note[] = [
  { id: 1, title: '週末のカフェ巡り', body: '気になっていたカフェを3つピックアップ。\n\n土曜日は朝の静かな時間に読書をしたい。窓際の席があるお店を中心に、写真も撮って記録しておく。', folder: 'プライベート', date: '今日 09:42', pinned: true },
  { id: 2, title: 'Q3 プロジェクト計画', body: 'プロジェクトのゴールとマイルストーンを整理する。\n\n・ユーザーインタビューの実施\n・プロトタイプの検証\n・チームへの共有', folder: '仕事', date: '昨日', pinned: false },
  { id: 3, title: '新しいアイデア', body: '毎日の小さな気づきを、あとから振り返れるようにする仕組み。', folder: 'アイデア', date: '6月18日', pinned: false },
]
const initialTodos: Todo[] = [
  { id: 1, text: '週次ミーティングの資料を準備する', category: '重要' },
  { id: 2, text: '牛乳と季節の野菜を買う', category: '買い物' },
  { id: 3, text: 'メールの返信をする', category: '日常' },
]

export default function Home() {
  const [mode, setMode] = useState<'notes' | 'todos'>('notes')
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const [selectedId, setSelectedId] = useState(1)
  const [query, setQuery] = useState('')
  const [folder, setFolder] = useState('すべて')
  const [newTodo, setNewTodo] = useState('')
  const [category, setCategory] = useState('日常')
  const [toast, setToast] = useState('')
  const selected = notes.find((note) => note.id === selectedId) ?? notes[0]

  useEffect(() => {
    const savedNotes = localStorage.getItem('kiroku-notes')
    const savedTodos = localStorage.getItem('kiroku-todos')
    if (savedNotes) setNotes(JSON.parse(savedNotes))
    if (savedTodos) setTodos(JSON.parse(savedTodos))
  }, [])
  useEffect(() => { localStorage.setItem('kiroku-notes', JSON.stringify(notes)) }, [notes])
  useEffect(() => { localStorage.setItem('kiroku-todos', JSON.stringify(todos)) }, [todos])
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 2200); return () => clearTimeout(timer) } }, [toast])

  const filteredNotes = useMemo(() => notes.filter((note) => (folder === 'すべて' || note.folder === folder) && `${note.title}${note.body}`.toLowerCase().includes(query.toLowerCase())), [notes, folder, query])
  const updateSelected = (key: 'title' | 'body', value: string) => setNotes((items) => items.map((note) => note.id === selectedId ? { ...note, [key]: value } : note))
  const addTodo = () => { if (!newTodo.trim()) return; setTodos((items) => [...items, { id: Date.now(), text: newTodo.trim(), category }]); setNewTodo(''); setToast('ToDoを追加しました') }
  const completeTodo = (id: number) => { setTodos((items) => items.filter((todo) => todo.id !== id)); setToast('完了したToDoを非表示にしました') }
  const showAi = (message: string) => setToast(message)
  const copyNote = async () => { if (selected) { await navigator.clipboard?.writeText(`${selected.title}\n\n${selected.body}`); setToast('メモをコピーしました') } }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">K</div><div><div className="brand-name">Kiroku</div><div className="brand-sub">思考を、軽やかに。</div></div></div>
      <nav className="nav-group"><div className="nav-label">WORKSPACE</div><button className={`nav-button ${mode === 'notes' ? 'active' : ''}`} onClick={() => setMode('notes')}><FileText /><span>メモ</span><span className="nav-count">{notes.length}</span></button><button className={`nav-button ${mode === 'todos' ? 'active' : ''}`} onClick={() => setMode('todos')}><ListTodo /><span>ToDo</span><span className="nav-count">{todos.length}</span></button></nav>
      <nav className="nav-group"><div className="nav-label">FOLDERS</div>{[['すべて', ''], ['仕事', ''], ['プライベート', 'blue'], ['アイデア', 'purple']].map(([name, color]) => <button key={name} className={`nav-button ${folder === name ? 'active' : ''}`} onClick={() => { setFolder(name); setMode('notes') }}><Folder /><span className={`folder-dot ${color}`}></span><span>{name}</span><span className="nav-count">{name === 'すべて' ? notes.length : notes.filter(n => n.folder === name).length}</span></button>)}</nav>
      <div className="sidebar-bottom"><p>今日のメモ習慣</p><span>小さな記録が、明日の自分を助けます。</span></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><p className="eyebrow">{mode === 'notes' ? 'MY NOTES' : 'MY TASKS'} · 6月20日</p><h1>{mode === 'notes' ? 'メモ' : 'ToDoリスト'}</h1></div><div className="top-actions"><button className="icon-button" aria-label="お気に入り"><Star /></button><button className="icon-button" aria-label="検索"><Search /></button>{mode === 'notes' && <button className="primary-button" onClick={() => { const id = Date.now(); setNotes(n => [{ id, title: '新しいメモ', body: '', folder: 'アイデア', date: 'たった今', pinned: false }, ...n]); setSelectedId(id); setToast('新しいメモを作成しました') }}><Plus />新規メモ</button>}</div></header>
      {mode === 'notes' ? <div className="workspace">
        <section className="panel"><div className="panel-head"><p className="panel-title">メモ一覧</p><div className="search"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="メモを検索..." /></div></div><div className="note-list">{filteredNotes.map(note => <div className={`note-row ${note.id === selectedId ? 'selected' : ''}`} key={note.id} onClick={() => setSelectedId(note.id)}><Pin className={`pin ${note.pinned ? 'on' : ''}`} /><div><p className="note-title">{note.title}</p><p className="note-preview">{note.body.slice(0, 54)}{note.body.length > 54 ? '…' : ''}</p></div><span className="note-date">{note.date}</span></div>)}</div></section>
        {selected && <section className="panel editor"><div className="editor-head"><span className="folder-badge">{selected.folder}</span><div className="editor-tools"><button className="tool" onClick={() => setNotes(n => n.map(note => note.id === selectedId ? { ...note, pinned: !note.pinned } : note))}><Pin /> {selected.pinned ? 'ピン留め済み' : 'ピン留め'}</button><button className="tool" onClick={copyNote}><Clipboard />コピー</button><button className="tool" onClick={() => showAi('共有リンクをコピーしました')}><Share2 />共有</button></div></div><div className="editor-content"><input value={selected.title} onChange={e => updateSelected('title', e.target.value)} aria-label="メモのタイトル" /><textarea value={selected.body} onChange={e => updateSelected('body', e.target.value)} aria-label="メモの本文" /><div className="editor-footer"><span>自動保存済み · {selected.date}</span><button className="tool" onClick={() => showAi('画像添付機能を開きました')}><ImageIcon />画像を添付</button></div></div><div className="editor-footer"><div className="ai-actions"><button className="ai-button" onClick={() => showAi('要約しました：週末のカフェ候補と過ごし方を整理')}><Sparkles />AIで要約</button><button className="ai-button" onClick={() => showAi('文章を読みやすく整えました')}><WandSparkles />自動添削</button></div><span>Markdown対応</span></div></section>}
      </div> : <section className="panel todo-panel"><div className="panel-head"><div><p className="panel-title">今日やること</p><span className="panel-meta">残り {todos.length} 件</span></div><span className="folder-badge">すべて未完了</span></div><div className="todo-form"><input value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) addTodo() }} placeholder="新しいタスクを追加..." /><select value={category} onChange={e => setCategory(e.target.value)}><option>日常</option><option>重要</option><option>買い物</option></select><button className="primary-button" onClick={addTodo}><Plus />追加</button></div><div className="todo-list">{todos.map(todo => <label className="todo-item" key={todo.id}><input className="todo-check" type="checkbox" onChange={() => completeTodo(todo.id)} /><span className="todo-text">{todo.text}</span><span className={`todo-category ${todo.category === '重要' ? 'important' : todo.category === '買い物' ? 'shopping' : ''}`}>{todo.category}</span></label>)}{todos.length === 0 && <p className="panel-meta">すべて完了しました。おつかれさまです。</p>}</div></section>}
    </main>{toast && <div className="toast"><Check /> {toast}</div>}
  </div>
}
