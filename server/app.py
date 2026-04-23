from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
from pathlib import Path
import os

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret")

FRONTEND_URL = os.environ.get("FRONTEND_URL", "").strip()
IS_PRODUCTION = bool(FRONTEND_URL and not FRONTEND_URL.startswith("http://localhost"))

app.config["SESSION_COOKIE_SAMESITE"] = "None" if IS_PRODUCTION else "Lax"
app.config["SESSION_COOKIE_SECURE"] = IS_PRODUCTION
app.config["SESSION_COOKIE_HTTPONLY"] = True

allowed_origins = ["http://localhost:5173"]
if FRONTEND_URL:
    allowed_origins.append(FRONTEND_URL)

CORS(
    app,
    supports_credentials=True,
    origins=allowed_origins,
)

DB_PATH = Path(__file__).parent / "edutrack.db"

ADMIN_USERNAME = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASS", "123456")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def current_user_id():
    return session.get("user_id")


def require_auth():
    user_id = current_user_id()
    if not user_id:
        return None, (jsonify({"error": "Unauthorized"}), 401)
    return user_id, None


def require_admin():
    if not session.get("is_admin"):
        return jsonify({"error": "Admin unauthorized"}), 401
    return None


def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            custom_id TEXT DEFAULT ''
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            teacher TEXT NOT NULL,
            credits INTEGER NOT NULL,
            progress INTEGER NOT NULL DEFAULT 0
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS grades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            subject TEXT NOT NULL,
            score REAL NOT NULL,
            max REAL NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            due TEXT NOT NULL,
            done INTEGER NOT NULL DEFAULT 0
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS schedule_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            day TEXT NOT NULL,
            title TEXT NOT NULL,
            time TEXT NOT NULL
        )
    """)

    cur.execute("PRAGMA table_info(users)")
    columns = [row["name"] for row in cur.fetchall()]
    if "custom_id" not in columns:
        cur.execute("ALTER TABLE users ADD COLUMN custom_id TEXT DEFAULT ''")

    cur.execute("SELECT * FROM users WHERE username = ?", ("osama",))
    user = cur.fetchone()
    if not user:
        cur.execute(
            "INSERT INTO users (username, password, name, custom_id) VALUES (?, ?, ?, ?)",
            (
                "osama",
                generate_password_hash("123456"),
                "Osama Mohamed",
                "AI-001",
            ),
        )

    conn.commit()
    conn.close()


init_db()


@app.route("/api/health")
def health():
    return jsonify({"ok": True})


@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json() or {}

    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    name = (data.get("name") or "").strip()

    if not username or not password or not name:
        return jsonify({"error": "Name, username, and password are required"}), 400

    conn = get_db()
    existing = conn.execute(
        "SELECT id FROM users WHERE username = ?",
        (username,),
    ).fetchone()

    if existing:
        conn.close()
        return jsonify({"error": "Username already exists"}), 409

    password_hash = generate_password_hash(password)

    cur = conn.cursor()
    cur.execute(
        "INSERT INTO users (username, password, name, custom_id) VALUES (?, ?, ?, ?)",
        (username, password_hash, name, ""),
    )
    user_id = cur.lastrowid
    conn.commit()
    conn.close()

    session["user_id"] = user_id
    session["username"] = username
    session["name"] = name
    session.pop("is_admin", None)

    return jsonify({
        "message": "Register successful",
        "user": {
            "id": user_id,
            "username": username,
            "name": name,
            "custom_id": ""
        }
    }), 201


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    username = data.get("username") or ""
    password = data.get("password") or ""

    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE username = ?",
        (username,),
    ).fetchone()
    conn.close()

    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    session["name"] = user["name"]
    session.pop("is_admin", None)

    return jsonify({
        "message": "Login successful",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "name": user["name"],
            "custom_id": user["custom_id"] or ""
        }
    })


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})


@app.route("/api/me")
def me():
    if "user_id" not in session:
        return jsonify({"authenticated": False}), 401

    conn = get_db()
    user = conn.execute(
        "SELECT id, username, name, custom_id FROM users WHERE id = ?",
        (session["user_id"],),
    ).fetchone()
    conn.close()

    return jsonify({
        "authenticated": True,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "name": user["name"],
            "custom_id": user["custom_id"] or ""
        }
    })


@app.route("/api/profile", methods=["GET", "PUT"])
def profile():
    user_id, error = require_auth()
    if error:
        return error

    conn = get_db()

    if request.method == "GET":
        user = conn.execute(
            "SELECT id, username, name, custom_id FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        conn.close()
        return jsonify(dict(user))

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    custom_id = (data.get("custom_id") or "").strip()

    if not name:
        conn.close()
        return jsonify({"error": "Name is required"}), 400

    conn.execute(
        "UPDATE users SET name = ?, custom_id = ? WHERE id = ?",
        (name, custom_id, user_id),
    )
    conn.commit()

    user = conn.execute(
        "SELECT id, username, name, custom_id FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    conn.close()

    session["name"] = user["name"]

    return jsonify({
        "message": "Profile updated",
        "user": dict(user)
    })


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json() or {}
    username = data.get("username") or ""
    password = data.get("password") or ""

    if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
        return jsonify({"error": "Invalid admin credentials"}), 401

    session["is_admin"] = True
    return jsonify({"message": "Admin login successful"})


@app.route("/api/admin/logout", methods=["POST"])
def admin_logout():
    session.pop("is_admin", None)
    return jsonify({"message": "Admin logged out"})


@app.route("/api/admin/users", methods=["GET"])
def admin_users():
    error = require_admin()
    if error:
        return error

    conn = get_db()
    rows = conn.execute("""
        SELECT
            u.id,
            u.username,
            u.name,
            u.custom_id,
            COUNT(DISTINCT s.id) AS subjects_count,
            COUNT(DISTINCT g.id) AS grades_count,
            COUNT(DISTINCT t.id) AS tasks_count,
            COUNT(DISTINCT sc.id) AS schedule_count
        FROM users u
        LEFT JOIN subjects s ON s.user_id = u.id
        LEFT JOIN grades g ON g.user_id = u.id
        LEFT JOIN tasks t ON t.user_id = u.id
        LEFT JOIN schedule_items sc ON sc.user_id = u.id
        GROUP BY u.id, u.username, u.name, u.custom_id
        ORDER BY u.id DESC
    """).fetchall()
    conn.close()

    return jsonify([dict(row) for row in rows])


@app.route("/api/admin/users/<int:user_id>", methods=["GET"])
def admin_user_details(user_id):
    error = require_admin()
    if error:
        return error

    conn = get_db()

    user = conn.execute(
        "SELECT id, username, name, custom_id FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()

    if not user:
        conn.close()
        return jsonify({"error": "User not found"}), 404

    subjects = conn.execute(
        "SELECT * FROM subjects WHERE user_id = ? ORDER BY id DESC",
        (user_id,),
    ).fetchall()

    grades = conn.execute(
        "SELECT * FROM grades WHERE user_id = ? ORDER BY id DESC",
        (user_id,),
    ).fetchall()

    tasks = conn.execute(
        "SELECT * FROM tasks WHERE user_id = ? ORDER BY id DESC",
        (user_id,),
    ).fetchall()

    schedule = conn.execute(
        "SELECT * FROM schedule_items WHERE user_id = ? ORDER BY day, time",
        (user_id,),
    ).fetchall()

    conn.close()

    return jsonify({
        "user": dict(user),
        "subjects": [dict(x) for x in subjects],
        "grades": [dict(x) for x in grades],
        "tasks": [dict(x) for x in tasks],
        "schedule": [dict(x) for x in schedule],
    })


@app.route("/api/admin/users/<int:user_id>/reset", methods=["DELETE"])
def admin_reset_user(user_id):
    error = require_admin()
    if error:
        return error

    conn = get_db()
    user = conn.execute(
        "SELECT id FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()

    if not user:
        conn.close()
        return jsonify({"error": "User not found"}), 404

    conn.execute("DELETE FROM subjects WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM grades WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM tasks WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM schedule_items WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

    return jsonify({"message": "User data reset"})


@app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
def admin_delete_user(user_id):
    error = require_admin()
    if error:
        return error

    conn = get_db()
    user = conn.execute(
        "SELECT id, username FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()

    if not user:
        conn.close()
        return jsonify({"error": "User not found"}), 404

    if user["username"] == "osama":
        conn.close()
        return jsonify({"error": "Cannot delete demo user"}), 400

    conn.execute("DELETE FROM subjects WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM grades WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM tasks WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM schedule_items WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()

    return jsonify({"message": "User deleted"})


@app.route("/api/subjects", methods=["GET", "POST"])
def subjects():
    user_id, error = require_auth()
    if error:
        return error

    conn = get_db()

    if request.method == "GET":
        rows = conn.execute(
            "SELECT * FROM subjects WHERE user_id = ? ORDER BY id DESC",
            (user_id,),
        ).fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])

    data = request.get_json() or {}
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO subjects (user_id, name, teacher, credits, progress) VALUES (?, ?, ?, ?, ?)",
        (
            user_id,
            data["name"],
            data["teacher"],
            data["credits"],
            data.get("progress", 0),
        ),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return jsonify({
        "id": new_id,
        "user_id": user_id,
        **data
    }), 201


@app.route("/api/subjects/<int:item_id>", methods=["PUT", "DELETE"])
def subject_item(item_id):
    user_id, error = require_auth()
    if error:
        return error

    conn = get_db()
    row = conn.execute(
        "SELECT * FROM subjects WHERE id = ? AND user_id = ?",
        (item_id, user_id),
    ).fetchone()

    if not row:
        conn.close()
        return jsonify({"error": "Subject not found"}), 404

    if request.method == "PUT":
        data = request.get_json() or {}
        conn.execute(
            "UPDATE subjects SET name=?, teacher=?, credits=?, progress=? WHERE id=? AND user_id=?",
            (
                data["name"],
                data["teacher"],
                data["credits"],
                data.get("progress", 0),
                item_id,
                user_id,
            ),
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Updated"})

    conn.execute(
        "DELETE FROM subjects WHERE id=? AND user_id=?",
        (item_id, user_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Deleted"})


@app.route("/api/grades", methods=["GET", "POST"])
def grades():
    user_id, error = require_auth()
    if error:
        return error

    conn = get_db()

    if request.method == "GET":
        rows = conn.execute(
            "SELECT * FROM grades WHERE user_id = ? ORDER BY id DESC",
            (user_id,),
        ).fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])

    data = request.get_json() or {}
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO grades (user_id, subject, score, max) VALUES (?, ?, ?, ?)",
        (user_id, data["subject"], data["score"], data["max"]),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return jsonify({
        "id": new_id,
        "user_id": user_id,
        **data
    }), 201


@app.route("/api/grades/<int:item_id>", methods=["PUT", "DELETE"])
def grade_item(item_id):
    user_id, error = require_auth()
    if error:
        return error

    conn = get_db()
    row = conn.execute(
        "SELECT * FROM grades WHERE id = ? AND user_id = ?",
        (item_id, user_id),
    ).fetchone()

    if not row:
        conn.close()
        return jsonify({"error": "Grade not found"}), 404

    if request.method == "PUT":
        data = request.get_json() or {}
        conn.execute(
            "UPDATE grades SET subject=?, score=?, max=? WHERE id=? AND user_id=?",
            (data["subject"], data["score"], data["max"], item_id, user_id),
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Updated"})

    conn.execute(
        "DELETE FROM grades WHERE id=? AND user_id=?",
        (item_id, user_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Deleted"})


@app.route("/api/tasks", methods=["GET", "POST"])
def tasks():
    user_id, error = require_auth()
    if error:
        return error

    conn = get_db()

    if request.method == "GET":
        rows = conn.execute(
            "SELECT * FROM tasks WHERE user_id = ? ORDER BY id DESC",
            (user_id,),
        ).fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])

    data = request.get_json() or {}
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO tasks (user_id, title, due, done) VALUES (?, ?, ?, ?)",
        (user_id, data["title"], data["due"], int(data.get("done", False))),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return jsonify({
        "id": new_id,
        "user_id": user_id,
        **data
    }), 201


@app.route("/api/tasks/<int:item_id>", methods=["PUT", "DELETE"])
def task_item(item_id):
    user_id, error = require_auth()
    if error:
        return error

    conn = get_db()
    row = conn.execute(
        "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
        (item_id, user_id),
    ).fetchone()

    if not row:
        conn.close()
        return jsonify({"error": "Task not found"}), 404

    if request.method == "PUT":
        data = request.get_json() or {}
        conn.execute(
            "UPDATE tasks SET title=?, due=?, done=? WHERE id=? AND user_id=?",
            (data["title"], data["due"], int(data.get("done", False)), item_id, user_id),
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Updated"})

    conn.execute(
        "DELETE FROM tasks WHERE id=? AND user_id=?",
        (item_id, user_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Deleted"})


@app.route("/api/schedule", methods=["GET", "POST"])
def schedule():
    user_id, error = require_auth()
    if error:
        return error

    conn = get_db()

    if request.method == "GET":
        rows = conn.execute(
            "SELECT * FROM schedule_items WHERE user_id = ? ORDER BY day, time",
            (user_id,),
        ).fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])

    data = request.get_json() or {}
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO schedule_items (user_id, day, title, time) VALUES (?, ?, ?, ?)",
        (user_id, data["day"], data["title"], data["time"]),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return jsonify({
        "id": new_id,
        "user_id": user_id,
        **data
    }), 201


@app.route("/api/schedule/<int:item_id>", methods=["PUT", "DELETE"])
def schedule_item(item_id):
    user_id, error = require_auth()
    if error:
        return error

    conn = get_db()
    row = conn.execute(
        "SELECT * FROM schedule_items WHERE id = ? AND user_id = ?",
        (item_id, user_id),
    ).fetchone()

    if not row:
        conn.close()
        return jsonify({"error": "Schedule item not found"}), 404

    if request.method == "PUT":
        data = request.get_json() or {}
        conn.execute(
            "UPDATE schedule_items SET day=?, title=?, time=? WHERE id=? AND user_id=?",
            (data["day"], data["title"], data["time"], item_id, user_id),
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Updated"})

    conn.execute(
        "DELETE FROM schedule_items WHERE id=? AND user_id=?",
        (item_id, user_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Deleted"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
