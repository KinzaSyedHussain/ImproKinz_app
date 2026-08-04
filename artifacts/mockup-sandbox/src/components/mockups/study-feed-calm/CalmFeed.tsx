import "./_group.css";

import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Code2,
  FileText,
  Heart,
  Home,
  Lightbulb,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

type PostType = "note" | "poll" | "code";

type FeedPost = {
  id: string;
  type: PostType;
  author: string;
  initials: string;
  time: string;
  subject: string;
  title: string;
  body?: string;
  likes: number;
  comments: number;
  saved: boolean;
  liked: boolean;
  code?: string;
  language?: string;
  poll?: {
    question: string;
    options: { label: string; votes: number }[];
    selected?: number;
  };
};

const initialPosts: FeedPost[] = [
  {
    id: "limits",
    type: "note",
    author: "Mina Park",
    initials: "MP",
    time: "18 min ago",
    subject: "Calculus",
    title: "A better way to think about limits",
    body: "A limit is less about reaching a value and more about describing the pattern as we get close. I keep this three-step check beside my practice set.",
    likes: 24,
    comments: 6,
    saved: true,
    liked: false,
  },
  {
    id: "poll",
    type: "poll",
    author: "Jon Bell",
    initials: "JB",
    time: "42 min ago",
    subject: "Study habits",
    title: "Quick check-in",
    body: "What helps you return to a difficult problem?",
    likes: 13,
    comments: 4,
    saved: false,
    liked: true,
    poll: {
      question: "What helps you return to a difficult problem?",
      options: [
        { label: "Write down what I know", votes: 18 },
        { label: "Take a short walk", votes: 11 },
        { label: "Ask for a hint", votes: 8 },
      ],
    },
  },
  {
    id: "python",
    type: "code",
    author: "Leah Okafor",
    initials: "LO",
    time: "1 hr ago",
    subject: "Python",
    title: "Why does this list stay unchanged?",
    body: "I expected the loop to update the original list. Is the slice creating a copy here?",
    likes: 9,
    comments: 3,
    saved: false,
    liked: false,
    language: "python",
    code: "scores = [72, 84, 91]\\nfor score in scores[:]:\\n    score += 5\\n\\nprint(scores)",
  },
];

const typeMeta: Record<PostType, { label: string; icon: typeof FileText; className: string }> = {
  note: { label: "Note", icon: FileText, className: "note" },
  poll: { label: "Poll", icon: Check, className: "poll" },
  code: { label: "Question", icon: CircleHelp, className: "question" },
};

function Avatar({ initials, tone = "teal" }: { initials: string; tone?: "teal" | "coral" | "gold" }) {
  return <span className={`calm-avatar calm-avatar-${tone}`}>{initials}</span>;
}

function TypeMark({ type }: { type: PostType }) {
  const meta = typeMeta[type];
  const Icon = meta.icon;
  return (
    <span className={`calm-type-mark calm-type-${meta.className}`}>
      <Icon size={13} strokeWidth={2} />
      {meta.label}
    </span>
  );
}

function ActionButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`calm-action ${active ? "is-active" : ""}`}
      type="button"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PostCard({
  post,
  index,
  onChange,
}: {
  post: FeedPost;
  index: number;
  onChange: (post: FeedPost) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const totalVotes = post.poll?.options.reduce((sum, option) => sum + option.votes, 0) ?? 0;
  const tone = index % 3 === 1 ? "coral" : index % 3 === 2 ? "gold" : "teal";

  const toggleLike = () => onChange({ ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) });
  const toggleSave = () => onChange({ ...post, saved: !post.saved });

  const vote = (optionIndex: number) => {
    if (!post.poll || post.poll.selected === optionIndex) return;
    const previous = post.poll.selected;
    const options = post.poll.options.map((option, currentIndex) => ({
      ...option,
      votes: option.votes + (currentIndex === optionIndex ? 1 : currentIndex === previous ? -1 : 0),
    }));
    onChange({ ...post, poll: { ...post.poll, options, selected: optionIndex } });
  };

  return (
    <article className="calm-post soft-enter-delay">
      <header className="calm-post-header">
        <div className="calm-author">
          <Avatar initials={post.initials} tone={tone} />
          <div>
            <div className="calm-author-line">
              <strong>{post.author}</strong>
              <span className="calm-dot">·</span>
              <span>{post.time}</span>
            </div>
            <span className="calm-subject">{post.subject}</span>
          </div>
        </div>
        <div className="calm-post-menu">
          <button className="calm-icon-button" type="button" aria-label="More post options" onClick={() => setMenuOpen(!menuOpen)}>
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <div className="calm-menu">
              <button type="button" onClick={() => setMenuOpen(false)}>Mute this subject</button>
              <button type="button" onClick={() => setMenuOpen(false)}>Report post</button>
            </div>
          )}
        </div>
      </header>

      <div className="calm-post-body">
        <TypeMark type={post.type} />
        <h2>{post.title}</h2>
        {post.body && <p>{post.body}</p>}

        {post.type === "note" && (
          <div className="calm-note-panel">
            <div className="calm-note-line"><span>01</span><b>Name the target value</b></div>
            <div className="calm-note-line"><span>02</span><b>Check both sides</b></div>
            <div className="calm-note-line"><span>03</span><b>Explain the pattern</b></div>
          </div>
        )}

        {post.type === "poll" && post.poll && (
          <div className="calm-poll">
            <p className="calm-poll-question">{post.poll.question}</p>
            {post.poll.options.map((option, optionIndex) => {
              const percent = Math.round((option.votes / totalVotes) * 100);
              const selected = post.poll?.selected === optionIndex;
              return (
                <button
                  className={`calm-poll-option ${selected ? "is-selected" : ""}`}
                  type="button"
                  key={option.label}
                  onClick={() => vote(optionIndex)}
                >
                  <span className="calm-poll-track" style={{ width: `${percent}%` }} />
                  <span className="calm-poll-label">{selected && <Check size={13} />}{option.label}</span>
                  <span className="calm-poll-percent">{percent}%</span>
                </button>
              );
            })}
            <span className="calm-poll-total">{totalVotes} responses · select one</span>
          </div>
        )}

        {post.type === "code" && post.code && (
          <div className="calm-code-panel">
            <div className="calm-code-header"><span>{post.language}</span><Code2 size={14} /></div>
            <pre><code>{post.code}</code></pre>
          </div>
        )}
      </div>

      <footer className="calm-post-footer">
        <div className="calm-actions">
          <ActionButton label={post.liked ? "Unlike post" : "Like post"} active={post.liked} onClick={toggleLike}>
            <Heart size={17} fill={post.liked ? "currentColor" : "none"} />
            <span>{post.likes}</span>
          </ActionButton>
          <ActionButton label="View comments" onClick={() => setExpanded(!expanded)}>
            <MessageCircle size={17} />
            <span>{post.comments}</span>
          </ActionButton>
          <ActionButton label={post.saved ? "Remove from saved" : "Save post"} active={post.saved} onClick={toggleSave}>
            <Bookmark size={17} fill={post.saved ? "currentColor" : "none"} />
          </ActionButton>
        </div>
        <button className="calm-read-button" type="button" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Close" : "Open"} <ChevronRight size={15} />
        </button>
      </footer>
      {expanded && (
        <div className="calm-comment-row">
          <Avatar initials="AS" tone="teal" />
          <span>Join the discussion with a thoughtful reply.</span>
          <button type="button" aria-label="Write a comment" onClick={() => setExpanded(false)}><Send size={15} /></button>
        </div>
      )}
    </article>
  );
}

export function CalmFeed() {
  const [posts, setPosts] = useState(initialPosts);
  const [filter, setFilter] = useState("For you");
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const visiblePosts = useMemo(() => {
    if (filter === "Saved") return posts.filter((post) => post.saved);
    if (filter === "Questions") return posts.filter((post) => post.type === "code");
    return posts;
  }, [filter, posts]);

  const addPost = () => {
    if (!draft.trim()) return;
    const newPost: FeedPost = {
      id: `draft-${Date.now()}`,
      type: "note",
      author: "Ari Singh",
      initials: "AS",
      time: "just now",
      subject: "General study",
      title: draft.trim(),
      body: "A new note from your study desk. Add a detail or question so others can build on it.",
      likes: 0,
      comments: 0,
      saved: false,
      liked: false,
    };
    setPosts([newPost, ...posts]);
    setDraft("");
    setComposerOpen(false);
  };

  return (
    <main className="calm-feed-shell">
      <div className="calm-mobile-frame">
        <div className="calm-topbar">
          <button className="calm-icon-button" type="button" aria-label="Open navigation" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="calm-wordmark"><span className="calm-wordmark-mark"><Sparkles size={13} /></span><span>StudySpace</span></div>
          <button className="calm-icon-button" type="button" aria-label="Search study posts" onClick={() => setSearchOpen(!searchOpen)}>
            <Search size={19} />
          </button>
        </div>

        {menuOpen && (
          <div className="calm-drawer soft-enter">
            <span className="calm-kicker">Your study room</span>
            <button type="button" onClick={() => setMenuOpen(false)}><Home size={16} /> Home</button>
            <button type="button" onClick={() => { setFilter("Saved"); setMenuOpen(false); }}><Bookmark size={16} /> Saved notes</button>
            <button type="button" onClick={() => setMenuOpen(false)}><Lightbulb size={16} /> Study preferences</button>
          </div>
        )}

        {searchOpen && (
          <div className="calm-search soft-enter">
            <Search size={16} />
            <input autoFocus placeholder="Search notes, subjects, questions" aria-label="Search study posts" />
            <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)}><X size={16} /></button>
          </div>
        )}

        <div className="calm-content feed-scroll">
          <section className="calm-intro">
            <div>
              <span className="calm-kicker">Tuesday · focused feed</span>
              <h1>Make room<br /><em>to understand.</em></h1>
            </div>
            <div className="calm-streak" aria-label="Study progress">
              <span className="calm-streak-number">4</span>
              <span>sessions<br />this week</span>
            </div>
          </section>

          <section className="calm-context">
            <div className="calm-context-label"><span className="calm-context-dot" /> Your learning space</div>
            <button type="button" className="calm-context-select" onClick={() => setFilter(filter === "Calculus" ? "For you" : "Calculus")}>
              <span>{filter === "Calculus" ? "Calculus" : "All subjects"}</span><ChevronDown size={15} />
            </button>
          </section>

          <nav className="calm-filters" aria-label="Feed filters">
            {["For you", "Questions", "Saved"].map((item) => (
              <button key={item} type="button" className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)}>
                {item}
              </button>
            ))}
          </nav>

          <section className={`calm-composer ${composerOpen ? "is-open" : ""}`}>
            <div className="calm-composer-row">
              <Avatar initials="AS" />
              {composerOpen ? (
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="What became clearer today?" aria-label="New study note" autoFocus />
              ) : (
                <button type="button" className="calm-composer-prompt" onClick={() => setComposerOpen(true)}>Share a note, question, or small win...</button>
              )}
            </div>
            {composerOpen ? (
              <div className="calm-composer-actions">
                <span>Visible to your study room</span>
                <div><button type="button" className="calm-cancel" onClick={() => { setComposerOpen(false); setDraft(""); }}>Cancel</button><button type="button" className="calm-post-button" disabled={!draft.trim()} onClick={addPost}>Post note</button></div>
              </div>
            ) : (
              <div className="calm-composer-types"><span><FileText size={14} /> Note</span><span><CircleHelp size={14} /> Question</span><span><BarChartIcon /> Poll</span><button type="button" aria-label="Create a post" onClick={() => setComposerOpen(true)}><Plus size={16} /></button></div>
            )}
          </section>

          <div className="calm-feed-heading"><span>{filter === "For you" ? "A quiet place to learn" : filter}</span><span className="calm-feed-count">{visiblePosts.length} posts</span></div>
          {visiblePosts.length ? visiblePosts.map((post, index) => (
            <PostCard key={post.id} post={post} index={index} onChange={(next) => setPosts(posts.map((item) => item.id === next.id ? next : item))} />
          )) : (
            <div className="calm-empty"><Bookmark size={22} /><strong>Nothing saved here yet.</strong><span>Keep the notes you want to return to close.</span></div>
          )}
          <div className="calm-end-note"><span className="calm-end-rule" /><span>End of your focused feed</span><span className="calm-end-rule" /></div>
        </div>

        <div className="calm-bottom-nav">
          <button type="button" className="is-active" aria-label="Home"><Home size={19} /><span>Home</span></button>
          <button type="button" aria-label="Search"><Search size={19} /><span>Explore</span></button>
          <button type="button" className="calm-bottom-add" aria-label="Create post" onClick={() => setComposerOpen(true)}><Plus size={21} /></button>
          <button type="button" aria-label="Saved posts" onClick={() => setFilter("Saved")}><Bookmark size={19} /><span>Saved</span></button>
          <button type="button" aria-label="Study profile"><Avatar initials="AS" /><span>Profile</span></button>
        </div>
      </div>
    </main>
  );
}

function BarChartIcon() {
  return <span className="calm-bar-chart" aria-hidden="true"><i /><i /><i /></span>;
}

export default CalmFeed;