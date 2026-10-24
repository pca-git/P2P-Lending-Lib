import { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import LOGO_DATA_URL from "./assets/logo.png";


const DEFAULT_GENRES = [
  "Fiction", "Non-fiction", "Mystery", "Sci-Fi", "Fantasy",
  "Biography", "Poetry", "History", "Children's", "Cookbook",
];
const DEFAULT_LANGUAGES = [
  "English", "French", "Spanish", "German", "Urdu", "Punjabi",
  "Arabic", "Polish", "Mandarin", "Bengali", "Gujarati", "Portuguese",
];
const BOOKS_KEY = "books";
const LENDERS_KEY = "lenders";
const ADMIN_KEY = "admin";
const GENRES_LIST_KEY = "genres";
const LANGUAGES_LIST_KEY = "languages";
function genId(prefix) {
  return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

async function hashKey(key) {
  const enc = new TextEncoder().encode(key);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function waLink(whatsapp, message) {
  const digits = (whatsapp || "").replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function downloadCSV(filename, csvString) {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function StaticPage({ title, eyebrow, children, onBack }) {
  return (
    <div className="static-page">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {children}
      <button className="btn-ghost" onClick={onBack} style={{ marginTop: 20 }}>Back to catalogue</button>
    </div>
  );
}

function LenderAuthPanel({ lenders, onLogin, onRegister, onClose }) {
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false);

  const [loginName, setLoginName] = useState("");
  const [loginKey, setLoginKey] = useState("");

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [postcode, setPostcode] = useState("");
  const [key, setKey] = useState("");
  const [confirmKey, setConfirmKey] = useState("");

  async function submitLogin(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const nameMatches = lenders.filter((l) => l.name.trim().toLowerCase() === loginName.trim().toLowerCase());
      if (nameMatches.length === 0) {
        setError("No lender found with that name.");
        return;
      }
      const enteredHash = await hashKey(loginKey);
      const match = nameMatches.find((l) => l.keyHash === enteredHash);
      if (!match) {
        setError("That name and password don't match. Double check and try again.");
        return;
      }
      onLogin(match);
    } finally {
      setBusy(false);
    }
  }

  async function submitRegister(e) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !whatsapp.trim() || !postcode.trim() || !key.trim()) {
      setError("Name, WhatsApp number, postcode, and a password are all needed.");
      return;
    }
    if (key.length < 4) {
      setError("Choose a password of at least 4 characters.");
      return;
    }
    if (key !== confirmKey) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const keyHash = await hashKey(key);
      await onRegister({
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        postcode: postcode.trim(),
        keyHash,
      });
      setRegistered(true);
    } catch (err) {
      setError("Couldn't register right now. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (registered) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <span className="eyebrow">Registered</span>
            <h2>You're on the shelf list</h2>
          </div>
          <p className="success-text">
            You can log in anytime with your name and the password you just chose. Keep it somewhere safe — if you ever forget it, the admin can reset it for you.
          </p>
          <div className="modal-actions">
            <button className="btn-primary" onClick={onClose}>Continue to the library</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="auth-tabs">
          <button className={`auth-tab ${mode === "login" ? "auth-tab-active" : ""}`} onClick={() => { setMode("login"); setError(""); }}>Log in</button>
          <button className={`auth-tab ${mode === "register" ? "auth-tab-active" : ""}`} onClick={() => { setMode("register"); setError(""); }}>Become a lender</button>
        </div>

        {mode === "login" ? (
          <form onSubmit={submitLogin}>
            <label className="field">
              <span>Your name</span>
              <input value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="As you registered it" />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="password" value={loginKey} onChange={(e) => setLoginKey(e.target.value)} />
            </label>
            {error && <p className="form-error">{error}</p>}
            <p className="field-hint" style={{ margin: "-4px 0 10px" }}>
              Forgot your password? Contact the admin to reset it.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={busy}>Log in</button>
            </div>
          </form>
        ) : (
          <form onSubmit={submitRegister}>
            <label className="field">
              <span>Your name *</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              <span>WhatsApp number *</span>
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+44 7911 123456" />
            </label>
            <label className="field">
              <span>Postcode (approximate) *</span>
              <input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="e.g. SW1A" />
            </label>
            <label className="field">
              <span>Choose a password *</span>
              <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="At least 4 characters" />
            </label>
            <label className="field">
              <span>Confirm password *</span>
              <input type="password" value={confirmKey} onChange={(e) => setConfirmKey(e.target.value)} />
            </label>
            <p className="field-hint">
              You'll log back in with your name plus this password — no separate code to remember. This isn't a bank-grade login, so pick something you'll remember. If you ever forget it, the admin can reset it for you.
            </p>
            {error && <p className="form-error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={busy}>Register</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ChangePasswordPanel({ lender, onChange, onClose }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!current || !next) {
      setError("Enter your current password and a new one.");
      return;
    }
    if (next.length < 4) {
      setError("Choose a new password of at least 4 characters.");
      return;
    }
    if (next !== confirm) {
      setError("The two new passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const currentHash = await hashKey(current);
      if (currentHash !== lender.keyHash) {
        setError("Your current password isn't right.");
        return;
      }
      const newHash = await hashKey(next);
      await onChange(newHash);
      setDone(true);
    } catch (err) {
      setError("Couldn't save the new password. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <span className="eyebrow">Done</span>
            <h2>Password changed</h2>
          </div>
          <p className="success-text">Use your new password the next time you log in.</p>
          <div className="modal-actions">
            <button className="btn-primary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="eyebrow">Account</span>
          <h2>Change my password</h2>
        </div>
        <form onSubmit={submit}>
          <label className="field">
            <span>Current password</span>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </label>
          <label className="field">
            <span>New password</span>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="At least 4 characters" />
          </label>
          <label className="field">
            <span>Confirm new password</span>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy}>Change password</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminAuthPanel({ adminRecord, onSetup, onLogin, onClose }) {
  const [key, setKey] = useState("");
  const [confirmKey, setConfirmKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const configured = !!adminRecord;

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!configured) {
      if (key.length < 6) {
        setError("Choose an admin password of at least 6 characters.");
        return;
      }
      if (key !== confirmKey) {
        setError("The two passwords don't match.");
        return;
      }
    }
    setBusy(true);
    try {
      if (configured) {
        const enteredHash = await hashKey(key);
        if (enteredHash !== adminRecord.keyHash) {
          setError("That password doesn't match.");
          return;
        }
        onLogin();
      } else {
        const keyHash = await hashKey(key);
        await onSetup(keyHash);
      }
    } catch (err) {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="eyebrow">{configured ? "Admin" : "First-time setup"}</span>
          <h2>{configured ? "Admin login" : "Set up admin access"}</h2>
        </div>
        {!configured && (
          <p className="field-hint">
            No admin password has been set for this library yet. Whoever sets one first becomes the admin — do this before sharing the link widely.
          </p>
        )}
        <form onSubmit={submit}>
          <label className="field">
            <span>{configured ? "Admin password" : "Choose an admin password"}</span>
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={configured ? "" : "At least 6 characters"} />
          </label>
          {!configured && (
            <label className="field">
              <span>Confirm admin password</span>
              <input type="password" value={confirmKey} onChange={(e) => setConfirmKey(e.target.value)} />
            </label>
          )}
          {error && <p className="form-error">{error}</p>}
          {configured && (
            <p className="field-hint" style={{ margin: "-4px 0 10px" }}>
              Forgot the admin password? Unlike lender passwords, there's no in-app way to reset it — it would need to be set again from outside the app.
            </p>
          )}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy}>{configured ? "Log in" : "Set admin password"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BookForm({ initial, genresList, languagesList, onSubmit, onCancel }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [author, setAuthor] = useState(initial?.author || "");
  const [language, setLanguage] = useState(initial?.language || "");
  const [genres, setGenres] = useState(initial?.genres || []);
  const [customGenre, setCustomGenre] = useState("");
  const [year, setYear] = useState(initial?.year || "");
  const [touched, setTouched] = useState(false);

  const valid = title.trim() && author.trim() && language.trim();

  function toggleGenre(g) {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function addCustomGenre() {
    const g = customGenre.trim();
    if (g && !genres.includes(g)) setGenres((prev) => [...prev, g]);
    setCustomGenre("");
  }

  function submit(e) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    onSubmit({
      title: title.trim(),
      author: author.trim(),
      language: language.trim(),
      genres,
      year: year ? String(year).trim() : "",
    });
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-header">
          <span className="eyebrow">{initial ? "Edit entry" : "New accession"}</span>
          <h2>{initial ? "Edit this book" : "Add a book to the shelf"}</h2>
        </div>

        <label className="field">
          <span>Title *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The Left Hand of Darkness" />
        </label>
        <label className="field">
          <span>Author *</span>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Ursula K. Le Guin" />
        </label>
        <label className="field">
          <span>Language *</span>
          <input list="language-options" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="English" />
          <datalist id="language-options">
            {languagesList.map((l) => <option key={l} value={l} />)}
          </datalist>
        </label>

        <div className="field">
          <span>Genre (optional, pick any that fit)</span>
          <div className="genre-chips">
            {genresList.map((g) => (
              <button type="button" key={g} className={`genre-chip ${genres.includes(g) ? "genre-chip-active" : ""}`} onClick={() => toggleGenre(g)}>
                {g}
              </button>
            ))}
            {genres.filter((g) => !genresList.includes(g)).map((g) => (
              <button type="button" key={g} className="genre-chip genre-chip-active" onClick={() => toggleGenre(g)}>
                {g} ×
              </button>
            ))}
          </div>
          <div className="genre-add-row">
            <input value={customGenre} onChange={(e) => setCustomGenre(e.target.value)} placeholder="Add another genre" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomGenre(); } }} />
            <button type="button" className="btn-ghost btn-small" onClick={addCustomGenre}>Add</button>
          </div>
        </div>

        <label className="field">
          <span>Year of publication (optional)</span>
          <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 1969" inputMode="numeric" />
        </label>

        {touched && !valid && <p className="form-error">Title, author, and language are needed before this can go on the shelf.</p>}

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary">{initial ? "Save changes" : "Add to catalogue"}</button>
        </div>
      </form>
    </div>
  );
}

function LoanForm({ book, onSubmit, onCancel }) {
  const [borrowedBy, setBorrowedBy] = useState("");
  const [dateBorrowed, setDateBorrowed] = useState(todayISO());
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [touched, setTouched] = useState(false);

  const valid = borrowedBy.trim() && dateBorrowed && expectedReturnDate;

  function submit(e) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    onSubmit({ borrowedBy: borrowedBy.trim(), dateBorrowed, expectedReturnDate });
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-header">
          <span className="eyebrow">Record a loan</span>
          <h2>Who's borrowing "{book.title}"?</h2>
        </div>
        <label className="field">
          <span>Borrower's name *</span>
          <input value={borrowedBy} onChange={(e) => setBorrowedBy(e.target.value)} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Date borrowed *</span>
            <input type="date" value={dateBorrowed} onChange={(e) => setDateBorrowed(e.target.value)} />
          </label>
          <label className="field">
            <span>Expected return *</span>
            <input type="date" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} min={dateBorrowed} />
          </label>
        </div>
        {touched && !valid && <p className="form-error">Borrower name, loan date, and expected return date are all needed.</p>}
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary">Mark as on loan</button>
        </div>
      </form>
    </div>
  );
}

function BookCard({ book, lender, expanded, onToggle, isOwner, onEdit, onMarkLoan, onMarkReturned, onDelete, confirmingDelete, onConfirmDelete, onCancelDelete }) {
  const isBorrowed = book.status === "onloan";

  return (
    <article className="card">
      <button className="card-face" onClick={onToggle} aria-expanded={expanded}>
        <span className="card-hole" aria-hidden="true" />
        <span className={`stamp ${isBorrowed ? "stamp-out" : "stamp-in"}`}>
          {isBorrowed ? "ON LOAN" : "AVAILABLE"}
        </span>
        <div className="card-title">{book.title}</div>
        <div className="card-author">{book.author}</div>
        <div className="card-tags">
          <span className="tag">{book.language}</span>
          {(book.genres || []).map((g) => <span className="tag tag-genre" key={g}>{g}</span>)}
          {book.year && <span className="tag">{book.year}</span>}
        </div>
        <div className="card-owner">
          Shelved by {lender ? lender.name : "a member"}
          {lender && lender.postcode ? <> · {lender.postcode} area</> : null}
        </div>
      </button>

      {expanded && (
        <div className="card-slip">
          {isBorrowed ? (
            <div className="slip-status">
              <p>Checked out by <strong>{book.borrowedBy}</strong></p>
              <p className="slip-date">Since {formatDate(book.dateBorrowed)} · due back {formatDate(book.expectedReturnDate)}</p>
            </div>
          ) : (
            <p className="slip-status-available">Ready to borrow.</p>
          )}

          {isOwner ? (
            <div className="card-manage">
              {isBorrowed ? (
                <button className="btn-primary btn-small" onClick={() => onMarkReturned(book.id)}>Mark as returned</button>
              ) : (
                <button className="btn-primary btn-small" onClick={() => onMarkLoan(book)}>Mark as on loan</button>
              )}
              <button className="btn-text" onClick={() => onEdit(book)}>Edit</button>
              {confirmingDelete ? (
                <span className="confirm-delete">
                  Remove this book?
                  <button className="btn-text danger" onClick={() => onDelete(book.id)}>Yes, remove</button>
                  <button className="btn-text" onClick={onCancelDelete}>Cancel</button>
                </span>
              ) : (
                <button className="btn-text danger" onClick={() => onConfirmDelete(book.id)}>Remove</button>
              )}
            </div>
          ) : (
            lender && (
              <a
                className="btn-primary btn-small wa-link"
                href={waLink(lender.whatsapp, `Hi ${lender.name}, I'm interested in borrowing "${book.title}" from the EDI P2P Lending Library.`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Contact {lender.name} on WhatsApp
              </a>
            )
          )}
        </div>
      )}
    </article>
  );
}

function AdminPanel({ books, lenders, genresList, languagesList, onAddGenre, onRemoveGenre, onAddLanguage, onRemoveLanguage, onReplaceBooks, onUpdateLenders, onResetLenderPassword, onBack }) {
  const [genreInput, setGenreInput] = useState("");
  const [languageInput, setLanguageInput] = useState("");

  const [booksFile, setBooksFile] = useState(null);
  const [booksImportError, setBooksImportError] = useState("");
  const [booksImportBusy, setBooksImportBusy] = useState(false);

  const [lendersFile, setLendersFile] = useState(null);
  const [lendersImportError, setLendersImportError] = useState("");
  const [lendersImportBusy, setLendersImportBusy] = useState(false);

  const [resetLenderId, setResetLenderId] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  async function submitPasswordReset(e) {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");
    if (!resetLenderId) {
      setResetError("Choose which lender you're resetting the password for.");
      return;
    }
    if (resetPassword.length < 4) {
      setResetError("Choose a new password of at least 4 characters.");
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      setResetError("The two passwords don't match.");
      return;
    }
    setResetBusy(true);
    try {
      const keyHash = await hashKey(resetPassword);
      await onResetLenderPassword(resetLenderId, keyHash);
      const lender = lenders.find((l) => l.id === resetLenderId);
      setResetSuccess(`Password reset for ${lender ? lender.name : "that lender"}. Let them know their new password directly — it won't be shown here again.`);
      setResetPassword("");
      setResetConfirmPassword("");
      setResetLenderId("");
    } catch (err) {
      setResetError("Couldn't save the new password. Check your connection and try again.");
    } finally {
      setResetBusy(false);
    }
  }

  function downloadBooksCSV() {
    const rows = books.map((b) => ({
      id: b.id,
      lenderId: b.lenderId || "",
      title: b.title,
      author: b.author,
      language: b.language,
      genres: (b.genres || []).join("; "),
      year: b.year || "",
      status: b.status,
      borrowedBy: b.borrowedBy || "",
      dateBorrowed: b.dateBorrowed || "",
      expectedReturnDate: b.expectedReturnDate || "",
      dateAdded: b.dateAdded || "",
    }));
    downloadCSV("books.csv", Papa.unparse(rows));
  }

  function downloadLendersCSV() {
    const rows = lenders.map((l) => ({
      id: l.id,
      name: l.name,
      whatsapp: l.whatsapp,
      postcode: l.postcode,
      dateJoined: l.dateJoined || "",
    }));
    downloadCSV("lenders.csv", Papa.unparse(rows));
  }

  function handleBooksFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setBooksImportError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = Papa.parse(reader.result, { header: true, skipEmptyLines: true });
        let skipped = 0;
        const parsed = [];
        result.data.forEach((row) => {
          const title = (row.title || "").trim();
          const author = (row.author || "").trim();
          const language = (row.language || "").trim();
          if (!title || !author || !language) {
            skipped += 1;
            return;
          }
          const status = row.status === "onloan" ? "onloan" : "available";
          parsed.push({
            id: row.id && row.id.trim() ? row.id.trim() : genId("book"),
            lenderId: (row.lenderId || "").trim(),
            title,
            author,
            language,
            genres: (row.genres || "").split(";").map((g) => g.trim()).filter(Boolean),
            year: (row.year || "").trim(),
            status,
            borrowedBy: status === "onloan" ? ((row.borrowedBy || "").trim() || null) : null,
            dateBorrowed: status === "onloan" ? ((row.dateBorrowed || "").trim() || null) : null,
            expectedReturnDate: status === "onloan" ? ((row.expectedReturnDate || "").trim() || null) : null,
            dateAdded: (row.dateAdded || "").trim() || new Date().toISOString(),
          });
        });
        setBooksFile({ rows: parsed, skipped });
      } catch (err) {
        setBooksImportError("Couldn't read that file. Make sure it's a CSV exported from this tool.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function confirmBooksImport() {
    if (!booksFile) return;
    setBooksImportBusy(true);
    try {
      await onReplaceBooks(booksFile.rows);
      setBooksFile(null);
    } catch (err) {
      setBooksImportError("Couldn't save the replacement data. Check your connection and try again.");
    } finally {
      setBooksImportBusy(false);
    }
  }

  function handleLendersFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLendersImportError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = Papa.parse(reader.result, { header: true, skipEmptyLines: true });
        const byId = {};
        result.data.forEach((row) => {
          const id = (row.id || "").trim();
          if (id) byId[id] = row;
        });
        const updates = [];
        const removals = [];
        lenders.forEach((l) => {
          const row = byId[l.id];
          if (row) {
            updates.push({
              ...l,
              name: (row.name || l.name).trim(),
              whatsapp: (row.whatsapp || l.whatsapp).trim(),
              postcode: (row.postcode || l.postcode).trim(),
            });
          } else {
            removals.push(l);
          }
        });
        const recognizedIds = new Set(lenders.map((l) => l.id));
        const skipped = Object.keys(byId).filter((id) => !recognizedIds.has(id)).length;

        setLendersFile({ updates, removals, skipped });
      } catch (err) {
        setLendersImportError("Couldn't read that file. Make sure it's a CSV exported from this tool.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function confirmLendersImport() {
    if (!lendersFile) return;
    setLendersImportBusy(true);
    try {
      await onUpdateLenders(lendersFile.updates);
      setLendersFile(null);
    } catch (err) {
      setLendersImportError("Couldn't save the changes. Check your connection and try again.");
    } finally {
      setLendersImportBusy(false);
    }
  }

  return (
    <div className="static-page admin-page">
      <span className="eyebrow">Admin</span>
      <h2>Library administration</h2>
      <p className="admin-stats">{books.length} book{books.length === 1 ? "" : "s"} · {lenders.length} lender{lenders.length === 1 ? "" : "s"}</p>

      <section className="admin-section">
        <h3>Genres</h3>
        <p className="field-hint">Quick-pick options shown when adding a book. Removing one here won't change genres already saved on existing books.</p>
        <div className="genre-chips">
          {genresList.map((g) => (
            <button type="button" key={g} className="genre-chip genre-chip-active" onClick={() => onRemoveGenre(g)}>{g} ×</button>
          ))}
        </div>
        <div className="genre-add-row">
          <input value={genreInput} onChange={(e) => setGenreInput(e.target.value)} placeholder="Add a genre" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (genreInput.trim()) { onAddGenre(genreInput.trim()); setGenreInput(""); } } }} />
          <button type="button" className="btn-ghost btn-small" onClick={() => { if (genreInput.trim()) { onAddGenre(genreInput.trim()); setGenreInput(""); } }}>Add</button>
        </div>
      </section>

      <section className="admin-section">
        <h3>Languages</h3>
        <p className="field-hint">Suggested options in the language field. Lenders can still type any language.</p>
        <div className="genre-chips">
          {languagesList.map((l) => (
            <button type="button" key={l} className="genre-chip genre-chip-active" onClick={() => onRemoveLanguage(l)}>{l} ×</button>
          ))}
        </div>
        <div className="genre-add-row">
          <input value={languageInput} onChange={(e) => setLanguageInput(e.target.value)} placeholder="Add a language" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (languageInput.trim()) { onAddLanguage(languageInput.trim()); setLanguageInput(""); } } }} />
          <button type="button" className="btn-ghost btn-small" onClick={() => { if (languageInput.trim()) { onAddLanguage(languageInput.trim()); setLanguageInput(""); } }}>Add</button>
        </div>
      </section>

      <section className="admin-section">
        <h3>Books data</h3>
        <p className="field-hint">Download the current catalogue, fix anything in a spreadsheet, then upload it here to replace the whole books list. Keep the "id" column as-is for existing rows; leave it blank for new ones. Separate multiple genres with a semicolon.</p>
        <div className="admin-actions-row">
          <button className="btn-ghost btn-small" onClick={downloadBooksCSV}>Download books.csv</button>
          <label className="btn-ghost btn-small file-label">
            Upload replacement CSV
            <input type="file" accept=".csv" onChange={handleBooksFileChange} style={{ display: "none" }} />
          </label>
        </div>
        {booksImportError && <p className="form-error">{booksImportError}</p>}
        {booksFile && (
          <div className="import-preview">
            <p>
              This file has <strong>{booksFile.rows.length}</strong> valid book{booksFile.rows.length === 1 ? "" : "s"}
              {booksFile.skipped > 0 ? ` (${booksFile.skipped} row${booksFile.skipped === 1 ? "" : "s"} skipped — missing title, author, or language)` : ""}.
            </p>
            <p>This will replace all <strong>{books.length}</strong> book{books.length === 1 ? "" : "s"} currently in the catalogue. This can't be undone from within the app.</p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setBooksFile(null)}>Cancel</button>
              <button className="btn-primary" onClick={confirmBooksImport} disabled={booksImportBusy}>Replace books</button>
            </div>
          </div>
        )}
      </section>

      <section className="admin-section">
        <h3>Lenders data</h3>
        <p className="field-hint">Download the current lender list to fix names, WhatsApp numbers, or postcodes, then upload it here. Rows missing from the file will be removed. New lenders can't be created this way — they need to register normally, since passwords can't be set from a spreadsheet. To reset a lender's password, use the password reset tool below instead.</p>
        <div className="admin-actions-row">
          <button className="btn-ghost btn-small" onClick={downloadLendersCSV}>Download lenders.csv</button>
          <label className="btn-ghost btn-small file-label">
            Upload updated CSV
            <input type="file" accept=".csv" onChange={handleLendersFileChange} style={{ display: "none" }} />
          </label>
        </div>
        {lendersImportError && <p className="form-error">{lendersImportError}</p>}
        {lendersFile && (
          <div className="import-preview">
            <p><strong>{lendersFile.updates.length}</strong> lender{lendersFile.updates.length === 1 ? "" : "s"} will be updated.</p>
            {lendersFile.removals.length > 0 && (
              <p><strong>{lendersFile.removals.length}</strong> lender{lendersFile.removals.length === 1 ? "" : "s"} not in this file will be removed: {lendersFile.removals.map((l) => l.name).join(", ")}.</p>
            )}
            {lendersFile.skipped > 0 && <p>{lendersFile.skipped} row{lendersFile.skipped === 1 ? "" : "s"} skipped (unrecognized id).</p>}
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setLendersFile(null)}>Cancel</button>
              <button className="btn-primary" onClick={confirmLendersImport} disabled={lendersImportBusy}>Save changes</button>
            </div>
          </div>
        )}
      </section>

      <section className="admin-section">
        <h3>Reset a lender's password</h3>
        <p className="field-hint">If a lender forgets their password, set a new one here and pass it on to them yourself (WhatsApp works well). They'll need to use it the next time they log in.</p>
        <form onSubmit={submitPasswordReset}>
          <label className="field">
            <span>Lender</span>
            <select value={resetLenderId} onChange={(e) => { setResetLenderId(e.target.value); setResetError(""); setResetSuccess(""); }}>
              <option value="">Choose a lender…</option>
              {[...lenders].sort((a, b) => a.name.localeCompare(b.name)).map((l) => (
                <option key={l.id} value={l.id}>{l.name} — {l.postcode}{l.whatsapp ? ` — ${l.whatsapp}` : ""}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>New password</span>
            <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="At least 4 characters" />
          </label>
          <label className="field">
            <span>Confirm new password</span>
            <input type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} />
          </label>
          {resetError && <p className="form-error">{resetError}</p>}
          {resetSuccess && <p className="success-text" style={{ margin: "-4px 0 10px" }}>{resetSuccess}</p>}
          <div className="modal-actions" style={{ justifyContent: "flex-start" }}>
            <button type="submit" className="btn-primary" disabled={resetBusy}>Set new password</button>
          </div>
        </form>
      </section>

      <button className="btn-ghost" onClick={onBack} style={{ marginTop: 10 }}>Back to catalogue</button>
    </div>
  );
}

export default function LendingLibraryApp() {
  const [view, setView] = useState("catalogue");
  const [books, setBooks] = useState(null);
  const [lenders, setLenders] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [mineOnly, setMineOnly] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const [showAuth, setShowAuth] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [loggedInLender, setLoggedInLender] = useState(null);

  const [genresList, setGenresList] = useState(null);
  const [languagesList, setLanguagesList] = useState(null);
  const [adminRecord, setAdminRecord] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminAuth, setShowAdminAuth] = useState(false);

  const [showBookForm, setShowBookForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [loanFormBook, setLoanFormBook] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoadError(null);
    try {
      const [booksResult, lendersResult, adminResult, genresResult, languagesResult] = await Promise.all([
        window.storage.get(BOOKS_KEY, true).catch(() => null),
        window.storage.get(LENDERS_KEY, true).catch(() => null),
        window.storage.get(ADMIN_KEY, true).catch(() => null),
        window.storage.get(GENRES_LIST_KEY, true).catch(() => null),
        window.storage.get(LANGUAGES_LIST_KEY, true).catch(() => null),
      ]);
      const parsedBooks = booksResult && booksResult.value ? JSON.parse(booksResult.value) : [];
      const parsedLenders = lendersResult && lendersResult.value ? JSON.parse(lendersResult.value) : [];
      setBooks(Array.isArray(parsedBooks) ? parsedBooks : []);
      setLenders(Array.isArray(parsedLenders) ? parsedLenders : []);
      setAdminRecord(adminResult && adminResult.value ? JSON.parse(adminResult.value) : null);

      let parsedGenres = genresResult && genresResult.value ? JSON.parse(genresResult.value) : null;
      if (!parsedGenres || !Array.isArray(parsedGenres) || parsedGenres.length === 0) {
        parsedGenres = DEFAULT_GENRES;
        window.storage.set(GENRES_LIST_KEY, JSON.stringify(parsedGenres), true).catch(() => {});
      }
      setGenresList(parsedGenres);

      let parsedLanguages = languagesResult && languagesResult.value ? JSON.parse(languagesResult.value) : null;
      if (!parsedLanguages || !Array.isArray(parsedLanguages) || parsedLanguages.length === 0) {
        parsedLanguages = DEFAULT_LANGUAGES;
        window.storage.set(LANGUAGES_LIST_KEY, JSON.stringify(parsedLanguages), true).catch(() => {});
      }
      setLanguagesList(parsedLanguages);
    } catch (err) {
      setBooks([]);
      setLenders([]);
      setAdminRecord(null);
      setGenresList(DEFAULT_GENRES);
      setLanguagesList(DEFAULT_LANGUAGES);
      setLoadError("Couldn't reach the shared catalogue. Check your connection and try again.");
    }
  }

  async function persistBooks(next) {
    try {
      const result = await window.storage.set(BOOKS_KEY, JSON.stringify(next), true);
      if (!result) throw new Error("write failed");
      setBooks(next);
      setLoadError(null);
    } catch (err) {
      setLoadError("Couldn't save to the shared catalogue. Check your connection and try again.");
    }
  }

  async function persistLenders(next) {
    const result = await window.storage.set(LENDERS_KEY, JSON.stringify(next), true);
    if (!result) throw new Error("write failed");
    setLenders(next);
    setLoadError(null);
  }

  async function withLatestBooks(mutator) {
    let current = books || [];
    try {
      const result = await window.storage.get(BOOKS_KEY, true);
      current = result && result.value ? JSON.parse(result.value) : [];
    } catch (err) {
      current = books || [];
    }
    await persistBooks(mutator(current));
  }

  async function handleRegister({ name, whatsapp, postcode, keyHash }) {
    let current = lenders || [];
    try {
      const result = await window.storage.get(LENDERS_KEY, true);
      current = result && result.value ? JSON.parse(result.value) : [];
    } catch (err) {
      current = lenders || [];
    }
    const newLender = { id: genId("lender"), name, whatsapp, postcode, keyHash, dateJoined: new Date().toISOString() };
    const next = [...current, newLender];
    await persistLenders(next);
    setLoggedInLender(newLender);
  }

  function handleLogin(lender) {
    setLoggedInLender(lender);
    setShowAuth(false);
  }

  function handleLogout() {
    setLoggedInLender(null);
    setMineOnly(false);
  }

  function handleAddOrEditBook(formData) {
    if (editingBook) {
      withLatestBooks((current) => current.map((b) => (b.id === editingBook.id ? { ...b, ...formData } : b)));
    } else {
      const newBook = {
        id: genId("book"),
        lenderId: loggedInLender.id,
        ...formData,
        status: "available",
        borrowedBy: null,
        dateBorrowed: null,
        expectedReturnDate: null,
        dateAdded: new Date().toISOString(),
      };
      withLatestBooks((current) => [newBook, ...current]);
    }
    setShowBookForm(false);
    setEditingBook(null);
  }

  function handleMarkLoan(loanData) {
    const bookId = loanFormBook.id;
    withLatestBooks((current) =>
      current.map((b) => (b.id === bookId ? { ...b, status: "onloan", ...loanData } : b))
    );
    setLoanFormBook(null);
  }

  function handleMarkReturned(id) {
    withLatestBooks((current) =>
      current.map((b) => (b.id === id ? { ...b, status: "available", borrowedBy: null, dateBorrowed: null, expectedReturnDate: null } : b))
    );
  }

  function handleDeleteBook(id) {
    withLatestBooks((current) => current.filter((b) => b.id !== id));
    setConfirmDeleteId(null);
    setExpandedId(null);
  }

  async function updateGenresList(next) {
    try {
      const result = await window.storage.set(GENRES_LIST_KEY, JSON.stringify(next), true);
      if (!result) throw new Error("write failed");
      setGenresList(next);
    } catch (err) {
      setLoadError("Couldn't update the genre list. Check your connection and try again.");
    }
  }

  async function updateLanguagesList(next) {
    try {
      const result = await window.storage.set(LANGUAGES_LIST_KEY, JSON.stringify(next), true);
      if (!result) throw new Error("write failed");
      setLanguagesList(next);
    } catch (err) {
      setLoadError("Couldn't update the language list. Check your connection and try again.");
    }
  }

  function handleAddGenre(g) {
    const list = genresList || DEFAULT_GENRES;
    if (!list.includes(g)) updateGenresList([...list, g]);
  }
  function handleRemoveGenre(g) {
    const list = genresList || DEFAULT_GENRES;
    updateGenresList(list.filter((x) => x !== g));
  }
  function handleAddLanguage(l) {
    const list = languagesList || DEFAULT_LANGUAGES;
    if (!list.includes(l)) updateLanguagesList([...list, l]);
  }
  function handleRemoveLanguage(l) {
    const list = languagesList || DEFAULT_LANGUAGES;
    updateLanguagesList(list.filter((x) => x !== l));
  }

  async function handleAdminSetup(keyHash) {
    const record = { keyHash, dateSet: new Date().toISOString() };
    const result = await window.storage.set(ADMIN_KEY, JSON.stringify(record), true);
    if (!result) throw new Error("write failed");
    setAdminRecord(record);
    setIsAdmin(true);
    setShowAdminAuth(false);
  }

  function handleAdminLogin() {
    setIsAdmin(true);
    setShowAdminAuth(false);
  }

  function handleAdminLogout() {
    setIsAdmin(false);
    if (view === "admin") setView("catalogue");
  }

  async function handleReplaceBooksFromCSV(rows) {
    await persistBooks(rows);
  }

  async function handleUpdateLendersFromCSV(updatedLenders) {
    await persistLenders(updatedLenders);
  }

  async function handleResetLenderPassword(lenderId, keyHash) {
    let current = lenders || [];
    try {
      const result = await window.storage.get(LENDERS_KEY, true);
      current = result && result.value ? JSON.parse(result.value) : [];
    } catch (err) {
      current = lenders || [];
    }
    const next = current.map((l) => (l.id === lenderId ? { ...l, keyHash } : l));
    await persistLenders(next);
  }

  async function handleChangeOwnPassword(keyHash) {
    await handleResetLenderPassword(loggedInLender.id, keyHash);
    setLoggedInLender((prev) => (prev ? { ...prev, keyHash } : prev));
  }

  const lenderById = useMemo(() => {
    const map = {};
    (lenders || []).forEach((l) => { map[l.id] = l; });
    return map;
  }, [lenders]);

  const genres = useMemo(() => {
    if (!books) return [];
    const set = new Set();
    books.forEach((b) => (b.genres || []).forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [books]);

  const filtered = useMemo(() => {
    if (!books) return [];
    const q = query.trim().toLowerCase();
    return books.filter((b) => {
      const matchesQuery =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        (b.language || "").toLowerCase().includes(q) ||
        (b.genres || []).some((g) => g.toLowerCase().includes(q));
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      const matchesGenre = genreFilter === "all" || (b.genres || []).includes(genreFilter);
      const matchesMine = !mineOnly || (loggedInLender && b.lenderId === loggedInLender.id);
      return matchesQuery && matchesStatus && matchesGenre && matchesMine;
    });
  }, [books, query, statusFilter, genreFilter, mineOnly, loggedInLender]);

  const availableCount = books ? books.filter((b) => b.status === "available").length : 0;

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Special+Elite&family=Inter:wght@400;500;600&display=swap');
        :root {
          --paper: #EFEADC; --card: #FBF9F2; --ink: #2A251F; --ink-soft: #6B6152;
          --rule: #CDBF9F; --brass: #9C7A2E; --green: #3B6142; --green-bg: #E4ECDE;
          --red: #8B3A34; --red-bg: #F1E1DD; --radius: 3px;
        }
        * { box-sizing: border-box; }
        .app { background: var(--paper); min-height: 100vh; padding: 28px 20px 64px; font-family: 'Inter', sans-serif; color: var(--ink); }
        .topnav { max-width: 960px; margin: 0 auto 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
        .topnav-left { display: flex; gap: 4px; flex-wrap: wrap; }
        .navlink { font-family: 'Inter', sans-serif; font-size: 13px; padding: 6px 12px; border: none; background: none; color: var(--ink-soft); cursor: pointer; border-radius: var(--radius); }
        .navlink-active { background: var(--ink); color: var(--card); }
        .lender-status { font-size: 13px; color: var(--ink-soft); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .logo { display: block; margin: 0 auto 10px; width: 200px; height: auto; }
        .header { max-width: 960px; margin: 0 auto 28px; text-align: center; }
        .tab { display: inline-block; font-family: 'Special Elite', monospace; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; background: var(--brass); color: var(--card); padding: 5px 16px; border-radius: 2px 2px 0 0; margin-bottom: -1px; }
        .header h1 { font-family: 'Fraunces', serif; font-weight: 600; font-size: clamp(26px, 4vw, 40px); margin: 8px 0 4px; border-top: 2px solid var(--ink); border-bottom: 2px solid var(--ink); padding: 10px 0; }
        .subhead { font-family: 'Special Elite', monospace; font-size: 13px; color: var(--ink-soft); letter-spacing: 0.04em; }
        .toolbar { max-width: 960px; margin: 0 auto 28px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
        .search { flex: 1 1 220px; padding: 10px 14px; border: 1px solid var(--rule); border-radius: var(--radius); background: var(--card); font-family: 'Inter', sans-serif; font-size: 14px; color: var(--ink); }
        .search:focus, input:focus, select:focus, textarea:focus, button:focus-visible, a:focus-visible { outline: 2px solid var(--brass); outline-offset: 2px; }
        .filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .chip-group { display: flex; gap: 6px; flex-wrap: wrap; }
        .chip { font-family: 'Inter', sans-serif; font-size: 13px; padding: 7px 13px; border: 1px solid var(--rule); border-radius: 999px; background: var(--card); color: var(--ink-soft); cursor: pointer; }
        .chip-active { background: var(--ink); color: var(--card); border-color: var(--ink); }
        .genre-select { padding: 8px 10px; border: 1px solid var(--rule); border-radius: var(--radius); background: var(--card); font-size: 13px; color: var(--ink); }
        .btn-primary, .btn-ghost { text-decoration: none; display: inline-block; }
        .btn-primary { font-family: 'Inter', sans-serif; font-weight: 600; font-size: 14px; padding: 10px 18px; background: var(--ink); color: var(--card); border: none; border-radius: var(--radius); cursor: pointer; }
        .btn-primary:hover { background: var(--brass); }
        .btn-primary:disabled { opacity: 0.6; cursor: default; }
        .btn-small { padding: 7px 14px; font-size: 13px; }
        .btn-ghost { background: transparent; border: 1px solid var(--rule); padding: 10px 18px; border-radius: var(--radius); cursor: pointer; font-family: 'Inter', sans-serif; color: var(--ink-soft); }
        .btn-text { background: none; border: none; text-decoration: underline; cursor: pointer; color: var(--ink-soft); font-family: 'Inter', sans-serif; font-size: 13px; padding: 2px 4px; }
        .btn-text.danger { color: var(--red); }
        .error-banner { max-width: 960px; margin: 0 auto 20px; background: var(--red-bg); color: var(--red); padding: 10px 16px; border-radius: var(--radius); font-size: 14px; text-align: center; }
        .grid { max-width: 960px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
        .card { background: var(--card); border: 1px solid var(--rule); border-radius: var(--radius); box-shadow: 0 1px 0 var(--rule), 0 6px 14px -10px rgba(0,0,0,0.25); overflow: hidden; text-align: left; transition: transform 0.15s ease; }
        .card:hover { transform: translateY(-2px); }
        .card-face { width: 100%; background: none; border: none; padding: 20px 16px 14px; text-align: left; cursor: pointer; font-family: inherit; color: inherit; position: relative; display: block; }
        .card-hole { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; border-radius: 50%; background: var(--paper); border: 1px solid var(--rule); }
        .stamp { position: absolute; top: 14px; right: 12px; font-family: 'Special Elite', monospace; font-size: 10px; letter-spacing: 0.06em; padding: 3px 8px; border-radius: 2px; transform: rotate(-4deg); border: 1px solid currentColor; }
        .stamp-in { color: var(--green); background: var(--green-bg); }
        .stamp-out { color: var(--red); background: var(--red-bg); }
        .card-title { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 600; margin: 10px 0 2px; line-height: 1.25; }
        .card-author { font-size: 13px; color: var(--ink-soft); margin: 0 0 10px; }
        .card-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
        .tag { font-size: 11px; padding: 3px 8px; border-radius: 999px; background: var(--paper); border: 1px solid var(--rule); color: var(--ink-soft); }
        .card-owner { font-size: 12px; color: var(--ink-soft); font-style: italic; }
        .card-slip { border-top: 1px dashed var(--rule); padding: 14px 16px 16px; background: var(--paper); animation: slide-down 0.18s ease; }
        @keyframes slide-down { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .card-slip { animation: none; } .card:hover { transform: none; } }
        .slip-status p { margin: 0 0 4px; font-size: 14px; }
        .slip-status-available { font-size: 13px; color: var(--ink-soft); margin: 0 0 10px; }
        .slip-date { font-size: 12px !important; color: var(--ink-soft); font-family: 'Special Elite', monospace; }
        .card-manage { display: flex; gap: 12px; align-items: center; margin-top: 10px; flex-wrap: wrap; }
        .confirm-delete { font-size: 13px; color: var(--ink-soft); display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .wa-link { margin-top: 4px; }
        .empty-state { max-width: 480px; margin: 60px auto; text-align: center; color: var(--ink-soft); }
        .empty-state p:first-child { font-family: 'Fraunces', serif; font-size: 20px; color: var(--ink); margin-bottom: 4px; }
        .skeleton { height: 200px; background: linear-gradient(90deg, var(--card) 25%, var(--paper) 50%, var(--card) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: var(--radius); border: 1px solid var(--rule); }
        @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
        .modal-backdrop { position: fixed; inset: 0; background: rgba(42, 37, 31, 0.5); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 50; overflow-y: auto; }
        .modal-card { background: var(--card); border-radius: var(--radius); padding: 26px 24px; width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto; border: 1px solid var(--rule); }
        .modal-header { margin-bottom: 16px; }
        .eyebrow { font-family: 'Special Elite', monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--brass); }
        .modal-header h2 { font-family: 'Fraunces', serif; font-size: 22px; margin: 4px 0 0; }
        .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; font-size: 13px; color: var(--ink-soft); }
        .field input, .field select, .field textarea { padding: 9px 11px; border: 1px solid var(--rule); border-radius: var(--radius); font-family: 'Inter', sans-serif; font-size: 14px; color: var(--ink); background: var(--paper); }
        .field-row { display: flex; gap: 12px; }
        .field-row .field { flex: 1; }
        .field-hint { font-size: 12px; color: var(--ink-soft); margin: -6px 0 10px; line-height: 1.4; }
        .form-error { color: var(--red); font-size: 12px; margin: -4px 0 10px; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
        .auth-tabs { display: flex; gap: 4px; margin-bottom: 18px; border-bottom: 1px solid var(--rule); }
        .auth-tab { flex: 1; padding: 10px; background: none; border: none; font-family: 'Inter', sans-serif; font-size: 14px; color: var(--ink-soft); cursor: pointer; border-bottom: 2px solid transparent; }
        .auth-tab-active { color: var(--ink); border-bottom-color: var(--brass); font-weight: 600; }
        .success-text { font-size: 14px; color: var(--ink-soft); margin: 0 0 10px; line-height: 1.5; }
        .success-code { font-family: 'Special Elite', monospace; font-size: 26px; letter-spacing: 0.12em; text-align: center; background: var(--paper); border: 1px dashed var(--rule); padding: 12px; border-radius: var(--radius); margin: 0 0 16px; }
        .genre-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 8px; }
        .genre-chip { font-size: 12px; padding: 5px 10px; border-radius: 999px; border: 1px solid var(--rule); background: var(--paper); color: var(--ink-soft); cursor: pointer; }
        .genre-chip-active { background: var(--ink); color: var(--card); border-color: var(--ink); }
        .genre-add-row { display: flex; gap: 8px; }
        .genre-add-row input { flex: 1; padding: 7px 10px; border: 1px solid var(--rule); border-radius: var(--radius); font-size: 13px; }
        .static-page { max-width: 640px; margin: 40px auto; background: var(--card); border: 1px solid var(--rule); border-radius: var(--radius); padding: 32px 28px; }
        .static-page h2 { font-family: 'Fraunces', serif; font-size: 26px; margin: 6px 0 16px; }
        .static-page p { color: var(--ink-soft); line-height: 1.6; }
        .static-page h3 { font-family: 'Fraunces', serif; font-size: 17px; margin: 22px 0 6px; }
        .static-page ul, .static-page ol { color: var(--ink-soft); line-height: 1.6; padding-left: 22px; margin: 0 0 8px; }
        .static-page li { margin-bottom: 4px; }
        .admin-page { max-width: 720px; }
        .admin-stats { font-family: 'Special Elite', monospace; font-size: 13px; color: var(--ink-soft); margin: -8px 0 20px; }
        .admin-section { border-top: 1px solid var(--rule); padding-top: 18px; margin-top: 18px; }
        .admin-section h3 { font-family: 'Fraunces', serif; font-size: 17px; margin: 0 0 6px; }
        .admin-actions-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
        .file-label { cursor: pointer; }
        .import-preview { background: var(--paper); border: 1px dashed var(--rule); border-radius: var(--radius); padding: 14px 16px; margin-top: 12px; }
        .import-preview p { font-size: 13px; color: var(--ink-soft); margin: 0 0 8px; }
        .footer { max-width: 960px; margin: 48px auto 0; text-align: center; font-size: 12px; color: var(--ink-soft); font-family: 'Special Elite', monospace; }
        @media (max-width: 480px) { .toolbar { flex-direction: column; align-items: stretch; } .field-row { flex-direction: column; } .topnav { justify-content: center; text-align: center; } }
      `}</style>

      <nav className="topnav">
        <div className="topnav-left">
          <button className={`navlink ${view === "catalogue" ? "navlink-active" : ""}`} onClick={() => setView("catalogue")}>Catalogue</button>
          <button className={`navlink ${view === "conditions" ? "navlink-active" : ""}`} onClick={() => setView("conditions")}>Conditions</button>
          <button className={`navlink ${view === "gdpr" ? "navlink-active" : ""}`} onClick={() => setView("gdpr")}>Privacy & GDPR</button>
        </div>
        <div className="topnav-right">
          {isAdmin && (
            <span className="lender-status">
              <strong>Admin mode</strong>
              <button className="btn-text" onClick={() => setView("admin")}>Admin panel</button>
              <button className="btn-text" onClick={handleAdminLogout}>Log out</button>
            </span>
          )}
          {loggedInLender ? (
            <span className="lender-status">
              Signed in as <strong>{loggedInLender.name}</strong>
              <button className="btn-text" onClick={() => setShowChangePassword(true)}>Change password</button>
              <button className="btn-text" onClick={handleLogout}>Log out</button>
            </span>
          ) : (
            <button className="btn-ghost btn-small" onClick={() => setShowAuth(true)}>Lender login</button>
          )}
        </div>
      </nav>

      {view === "catalogue" && (
        <>
          <header className="header">
            <img className="logo" src={LOGO_DATA_URL} alt="Progressive People's Forum — Kairali United Kingdom" />
            <h1>Community P2P Lending Library</h1>
            <p className="subhead">
              {books ? `${books.length} title${books.length === 1 ? "" : "s"} · ${availableCount} available` : "Loading the shelves…"}
            </p>
          </header>

          <div className="toolbar">
            <input className="search" type="text" placeholder="Search by title, author, language, or genre" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="filters">
              <div className="chip-group">
                {["all", "available", "onloan"].map((s) => (
                  <button key={s} className={`chip ${statusFilter === s ? "chip-active" : ""}`} onClick={() => setStatusFilter(s)}>
                    {s === "all" ? "All" : s === "available" ? "Available" : "On loan"}
                  </button>
                ))}
                {loggedInLender && (
                  <button className={`chip ${mineOnly ? "chip-active" : ""}`} onClick={() => setMineOnly((m) => !m)}>My books</button>
                )}
              </div>
              {genres.length > 0 && (
                <select className="genre-select" value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)}>
                  <option value="all">All genres</option>
                  {genres.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              )}
            </div>
            {loggedInLender ? (
              <button className="btn-primary" onClick={() => { setEditingBook(null); setShowBookForm(true); }}>+ Add a book</button>
            ) : (
              <button className="btn-ghost" onClick={() => setShowAuth(true)}>Log in to add a book</button>
            )}
          </div>

          {loadError && (
            <div className="error-banner">{loadError} <button className="btn-text" onClick={loadAll}>Retry</button></div>
          )}

          {books === null ? (
            <div className="grid">{[...Array(6)].map((_, i) => <div key={i} className="skeleton" />)}</div>
          ) : books.length === 0 ? (
            <div className="empty-state">
              <p>The shelves are empty.</p>
              <p>{loggedInLender ? "Add the first book to get the library started." : "Log in as a lender to add the first book."}</p>
              {loggedInLender ? (
                <button className="btn-primary" onClick={() => setShowBookForm(true)} style={{ marginTop: 14 }}>+ Add a book</button>
              ) : (
                <button className="btn-primary" onClick={() => setShowAuth(true)} style={{ marginTop: 14 }}>Lender login</button>
              )}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p>No books match your search.</p>
              <button className="btn-text" onClick={() => { setQuery(""); setStatusFilter("all"); setGenreFilter("all"); setMineOnly(false); }}>Clear filters</button>
            </div>
          ) : (
            <div className="grid">
              {filtered.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  lender={lenderById[book.lenderId]}
                  expanded={expandedId === book.id}
                  onToggle={() => setExpandedId(expandedId === book.id ? null : book.id)}
                  isOwner={!!loggedInLender && loggedInLender.id === book.lenderId}
                  onEdit={(b) => { setEditingBook(b); setShowBookForm(true); }}
                  onMarkLoan={(b) => setLoanFormBook(b)}
                  onMarkReturned={handleMarkReturned}
                  onDelete={handleDeleteBook}
                  confirmingDelete={confirmDeleteId === book.id}
                  onConfirmDelete={setConfirmDeleteId}
                  onCancelDelete={() => setConfirmDeleteId(null)}
                />
              ))}
            </div>
          )}

          <footer className="footer">
            <p style={{ margin: "0 0 6px" }}>
              Loan records are visible to everyone. Lender contact details are only shared when you choose to reach out.
              {!isAdmin && <> · <button className="btn-text admin-link" onClick={() => setShowAdminAuth(true)}>Admin</button></>}
            </p>
          </footer>
        </>
      )}

      {view === "conditions" && (
        <StaticPage title="Conditions of use" eyebrow="Terms" onBack={() => setView("catalogue")}>
          <p>The EDI P2P Lending Library is a community catalogue where people lend books to each other. Please read how it works and the conditions below before you use it.</p>

          <h3>How to register as a lender</h3>
          <p>You do not need an account to browse or borrow. You only register if you want to lend books.</p>
          <ol>
            <li>Click <strong>Lender login</strong> at the top right, then choose the <strong>Become a lender</strong> tab.</li>
            <li>Enter your name, your WhatsApp number and an approximate postcode. The first part of your postcode, such as EH1, is enough.</li>
            <li>Choose a password of at least 4 characters, enter it twice, and click <strong>Register</strong>.</li>
            <li>Next time, log in with the same name and password. If you forget your password, contact the admin to reset it. Once you are signed in you can change it with <strong>Change password</strong>.</li>
          </ol>

          <h3>How to add a book to the library</h3>
          <ol>
            <li>Log in as a lender and click <strong>+ Add a book</strong>.</li>
            <li>Enter the title, author and language. These three are required. Genre and year of publication are optional.</li>
            <li>Click <strong>Add to catalogue</strong>. The book appears on the shelf straight away.</li>
            <li>Use the <strong>My books</strong> filter to see only your own books. Open a book's card to edit its details or remove it.</li>
            <li>When you lend a book, open its card and click <strong>Mark as on loan</strong>. Enter who has it, the date borrowed and the expected return date. When it comes back, click <strong>Mark as returned</strong>. Loan details are visible to everyone while the book is out.</li>
          </ol>

          <h3>How to borrow a book</h3>
          <ol>
            <li>Browse the catalogue, or search by title, author, language or genre. The filters show only available books or books on loan.</li>
            <li>Click a book's card to open it. Books marked ON LOAN show the expected return date.</li>
            <li>For an available book, click the button with the lender's name, <strong>Contact … on WhatsApp</strong>. A message to the lender is prepared for you to send.</li>
            <li>Agree with the lender whether the book can be lent, where and when you will collect it, and when you will return it.</li>
            <li>The lender records the loan in the library. Return the book by the agreed date.</li>
          </ol>

          <h3>Conditions of use</h3>
          <ol>
            <li><strong>This is a meeting place only.</strong> The library is a platform where lenders and borrowers can find each other. The organisers and the admin do not own, hold, check or insure any book, and are not a party to any loan.</li>
            <li><strong>Lending is the lender's choice.</strong> It is up to each lender whether to lend a book to any individual. A lender can say no without giving a reason.</li>
            <li><strong>Lenders are responsible for their books.</strong> A lender takes responsibility for the books they list, including the details they enter, deciding who to lend to, and arranging collection and return.</li>
            <li><strong>Borrowers look after what they borrow.</strong> Handle borrowed books with care and return them by the agreed date. Agree any other arrangements directly with the lender.</li>
            <li><strong>Meet sensibly.</strong> Arrange handovers in a way that you and the other person are comfortable with.</li>
            <li><strong>Be respectful.</strong> List only books you are happy to lend, and treat other members with courtesy. The admin may remove a listing or a lender who breaks these conditions.</li>
            <li><strong>Report serious issues to the admin.</strong> If a book is lost or damaged, a dispute cannot be settled between you, or someone behaves inappropriately, tell the admin.</li>
          </ol>
          <p>How your details are stored and used is explained on the Privacy &amp; GDPR page.</p>
        </StaticPage>
      )}

      {view === "gdpr" && (
        <StaticPage title="Privacy & GDPR" eyebrow="Data protection" onBack={() => setView("catalogue")}>
          <p>This page explains what the Community P2P Lending Library keeps about people, who can see it, and what your rights are. Last updated October 2026.</p>

          <h3>What the library stores</h3>
          <ul>
            <li><strong>Lenders:</strong> name, WhatsApp number, approximate postcode, and a password. The password is stored only as a one-way scrambled value (a hash), never in readable form.</li>
            <li><strong>Books:</strong> title, author, language, optional genres and year, and which lender owns the book.</li>
            <li><strong>Loans:</strong> when a lender records a loan, the borrower's name, the date borrowed and the expected return date. These are cleared when the book is marked as returned.</li>
          </ul>

          <h3>Who can see it</h3>
          <ul>
            <li>Anyone who visits the site can see the catalogue, lender names, approximate postcodes, and current loan records (borrower name and dates).</li>
            <li>A lender's WhatsApp number is used so that borrowers can message them, and is only used when someone chooses to make contact.</li>
            <li>The site keeps its data in a shared online database that does not sit behind individual logins, so someone with technical skill could read the stored details. Please give only an approximate postcode, use a password you do not use anywhere else, and enter only a borrower name that the borrower is happy to have shown.</li>
          </ul>

          <h3>Why the library holds this information</h3>
          <p>To let lenders list books, let borrowers find books and contact lenders, and keep track of what is on loan. You give your details voluntarily when you register as a lender, and the library cannot work without them.</p>

          <h3>Where it is processed</h3>
          <p>Data is stored with Google Firebase (Firestore) and the site is hosted on GitHub Pages. Fonts are loaded from Google Fonts, so your browser contacts Google when a page loads. Messages to lenders go through WhatsApp, which has its own privacy policy. These providers may process data outside the UK. The site does not use advertising or tracking cookies.</p>

          <h3>How long it is kept</h3>
          <p>Lender details and books are kept until the lender removes them or asks the admin to remove them. Loan details are cleared when a book is returned.</p>

          <h3>Your rights</h3>
          <p>Under UK GDPR you can ask to see the information held about you, have it corrected or deleted, restrict or object to its use, and withdraw your consent at any time. Lenders can edit or remove their own books and change their password while signed in. For anything else, such as removing your account or getting a copy of your details, contact the admin. If you are unhappy with how your data is handled, you can complain to the Information Commissioner's Office at ico.org.uk.</p>
        </StaticPage>
      )}

      {view === "admin" && isAdmin && (
        <AdminPanel
          books={books || []}
          lenders={lenders || []}
          genresList={genresList || DEFAULT_GENRES}
          languagesList={languagesList || DEFAULT_LANGUAGES}
          onAddGenre={handleAddGenre}
          onRemoveGenre={handleRemoveGenre}
          onAddLanguage={handleAddLanguage}
          onRemoveLanguage={handleRemoveLanguage}
          onReplaceBooks={handleReplaceBooksFromCSV}
          onUpdateLenders={handleUpdateLendersFromCSV}
          onResetLenderPassword={handleResetLenderPassword}
          onBack={() => setView("catalogue")}
        />
      )}

      {showAuth && (
        <LenderAuthPanel lenders={lenders || []} onLogin={handleLogin} onRegister={handleRegister} onClose={() => setShowAuth(false)} />
      )}

      {showChangePassword && loggedInLender && (
        <ChangePasswordPanel
          lender={lenderById[loggedInLender.id] || loggedInLender}
          onChange={handleChangeOwnPassword}
          onClose={() => setShowChangePassword(false)}
        />
      )}

      {showAdminAuth && (
        <AdminAuthPanel adminRecord={adminRecord} onSetup={handleAdminSetup} onLogin={handleAdminLogin} onClose={() => setShowAdminAuth(false)} />
      )}

      {showBookForm && (
        <BookForm
          initial={editingBook}
          genresList={genresList || DEFAULT_GENRES}
          languagesList={languagesList || DEFAULT_LANGUAGES}
          onSubmit={handleAddOrEditBook}
          onCancel={() => { setShowBookForm(false); setEditingBook(null); }}
        />
      )}

      {loanFormBook && (
        <LoanForm book={loanFormBook} onSubmit={handleMarkLoan} onCancel={() => setLoanFormBook(null)} />
      )}
    </div>
  );
}
