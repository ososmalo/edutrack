هimport React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCircle2,
  X,
  Eye,
  RotateCcw,
  UserX,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "subjects", label: "Subjects", icon: BookOpen },
  { key: "grades", label: "Grades", icon: GraduationCap },
  { key: "tasks", label: "Tasks", icon: ListTodo },
  { key: "schedule", label: "Schedule", icon: CalendarDays },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "profile", label: "Profile", icon: UserCircle2 },
];

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(data?.error || data?.message || "Request failed");
  }

  return data;
}

function percentageToGpa(p) {
  if (p >= 93) return 4.0;
  if (p >= 89) return 3.7;
  if (p >= 84) return 3.3;
  if (p >= 80) return 3.0;
  if (p >= 76) return 2.7;
  if (p >= 73) return 2.3;
  if (p >= 70) return 2.0;
  if (p >= 67) return 1.7;
  if (p >= 64) return 1.3;
  if (p >= 60) return 1.0;
  return 0;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function cardClass(extra = "") {
  return `rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl ${extra}`;
}

function Card({ className = "", children }) {
  return <div className={cardClass(className)}>{children}</div>;
}

function CardHeader({ className = "", children }) {
  return <div className={`p-5 pb-0 ${className}`}>{children}</div>;
}

function CardTitle({ className = "", children }) {
  return <h3 className={`text-xl font-bold text-white ${className}`}>{children}</h3>;
}

function CardContent({ className = "", children }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

function Button({ className = "", variant = "primary", children, ...props }) {
  const styles =
    variant === "ghost"
      ? "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
      : variant === "danger"
      ? "bg-red-600/90 text-white hover:bg-red-500"
      : variant === "warning"
      ? "bg-amber-600/90 text-white hover:bg-amber-500"
      : "bg-violet-600 text-white shadow-lg shadow-violet-900/30 hover:bg-violet-500";

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={`rounded-2xl px-4 py-3 font-semibold transition ${styles} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30 ${className}`}
    />
  );
}

function Select({ className = "", children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 text-white outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30 ${className}`}
    >
      {children}
    </select>
  );
}

function Progress({ value = 0 }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.5 }}
        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
      />
    </div>
  );
}

function GlowBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-[-8rem] top-[-8rem] h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="absolute right-[-8rem] top-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute bottom-[-10rem] left-1/3 h-80 w-80 rounded-full bg-fuchsia-600/10 blur-3xl" />
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-slate-400">
      <p className="text-lg font-semibold text-slate-200">{title}</p>
      <p className="mt-2 text-sm">{subtitle}</p>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [activeTab, setActiveTab] = useState("dashboard");

  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [scheduleItems, setScheduleItems] = useState([]);

  const [loadingData, setLoadingData] = useState(false);
  const [pageError, setPageError] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");

  const [subjectForm, setSubjectForm] = useState({
    name: "",
    teacher: "",
    credits: "",
    progress: "",
  });

  const [gradeForm, setGradeForm] = useState({
    subject: "",
    score: "",
    max: "100",
  });

  const [taskForm, setTaskForm] = useState({
    title: "",
    due: "",
  });

  const [scheduleForm, setScheduleForm] = useState({
    day: "Sunday",
    title: "",
    time: "",
  });

  const [profileForm, setProfileForm] = useState({
    name: "",
    custom_id: "",
  });

  const [profileSaving, setProfileSaving] = useState(false);

  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [editingGradeId, setEditingGradeId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingScheduleId, setEditingScheduleId] = useState(null);

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    username: "",
    password: "",
  });

  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [adminSession, setAdminSession] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminError, setAdminError] = useState("");
  const [adminForm, setAdminForm] = useState({
    username: "",
    password: "",
  });

  const [adminSelectedUser, setAdminSelectedUser] = useState(null);
  const [adminUserDetails, setAdminUserDetails] = useState(null);
  const [adminDetailsLoading, setAdminDetailsLoading] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (session) loadAllData();
  }, [session]);

  useEffect(() => {
    if (session) {
      setProfileForm({
        name: session.name || "",
        custom_id: session.custom_id || "",
      });
    }
  }, [session]);

  async function checkSession() {
    try {
      const data = await api("/me");
      setSession(data.user);
    } catch {
      setSession(null);
    } finally {
      setAuthLoading(false);
    }
  }

  async function loadAllData() {
    setLoadingData(true);
    setPageError("");
    try {
      const [subjectsData, gradesData, tasksData, scheduleData] = await Promise.all([
        api("/subjects"),
        api("/grades"),
        api("/tasks"),
        api("/schedule"),
      ]);
      setSubjects(subjectsData);
      setGrades(gradesData);
      setTasks(tasksData.map((t) => ({ ...t, done: Boolean(t.done) })));
      setScheduleItems(scheduleData);
    } catch (err) {
      setPageError(err.message);
    } finally {
      setLoadingData(false);
    }
  }

  const filteredSubjects = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.teacher.toLowerCase().includes(q)
    );
  }, [subjects, globalSearch]);

  const filteredGrades = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return grades;
    return grades.filter((g) => g.subject.toLowerCase().includes(q));
  }, [grades, globalSearch]);

  const filteredTasks = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [tasks, globalSearch]);

  const filteredSchedule = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return scheduleItems;
    return scheduleItems.filter(
      (s) =>
        s.day.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.time.toLowerCase().includes(q)
    );
  }, [scheduleItems, globalSearch]);

  const totalCredits = useMemo(
    () => subjects.reduce((sum, s) => sum + Number(s.credits || 0), 0),
    [subjects]
  );

  const averagePercent = useMemo(() => {
    if (!grades.length) return 0;
    const total = grades.reduce((sum, g) => sum + (Number(g.score) / Number(g.max)) * 100, 0);
    return total / grades.length;
  }, [grades]);

  const gpa = useMemo(() => percentageToGpa(averagePercent).toFixed(2), [averagePercent]);

  const completedTasks = useMemo(() => tasks.filter((t) => t.done).length, [tasks]);
  const pendingTasks = tasks.length - completedTasks;

  const upcomingTasks = useMemo(
    () =>
      [...tasks]
        .filter((t) => !t.done)
        .sort((a, b) => new Date(a.due) - new Date(b.due))
        .slice(0, 4),
    [tasks]
  );

  const gradeChartData = useMemo(
    () =>
      grades.map((grade) => ({
        subject: grade.subject,
        percent: Number(((grade.score / grade.max) * 100).toFixed(1)),
      })),
    [grades]
  );

  const taskChartData = useMemo(
    () => [
      { name: "Completed", value: completedTasks },
      { name: "Pending", value: pendingTasks },
    ],
    [completedTasks, pendingTasks]
  );

  const subjectProgressData = useMemo(
    () =>
      subjects.map((s) => ({
        subject: s.name,
        progress: Number(s.progress || 0),
      })),
    [subjects]
  );

  const scheduleByDay = useMemo(() => {
    return weekdays.map((day) => ({
      day,
      items: filteredSchedule.filter((item) => item.day === day),
    }));
  }, [filteredSchedule]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const data = await api("/login", {
        method: "POST",
        body: JSON.stringify(loginForm),
      });
      setSession(data.user);
      setLoginForm({ username: "", password: "" });
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setRegisterError("");
    setRegisterLoading(true);
    try {
      const data = await api("/register", {
        method: "POST",
        body: JSON.stringify(registerForm),
      });
      setSession(data.user);
      setRegisterForm({ name: "", username: "", password: "" });
    } catch (err) {
      setRegisterError(err.message);
    } finally {
      setRegisterLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await api("/logout", { method: "POST" });
    } catch {}
    setSession(null);
    setSubjects([]);
    setGrades([]);
    setTasks([]);
    setScheduleItems([]);
    setAdminSession(false);
    setAdminOpen(false);
  }

  async function saveProfile() {
    setProfileSaving(true);
    setPageError("");
    try {
      const data = await api("/profile", {
        method: "PUT",
        body: JSON.stringify(profileForm),
      });
      setSession((prev) => ({
        ...prev,
        ...data.user,
      }));
    } catch (err) {
      setPageError(err.message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function adminLogin(e) {
    e.preventDefault();
    setAdminError("");
    try {
      await api("/admin/login", {
        method: "POST",
        body: JSON.stringify(adminForm),
      });
      setAdminSession(true);
      const users = await api("/admin/users");
      setAdminUsers(users);
    } catch (err) {
      setAdminError(err.message);
    }
  }

  async function refreshAdminUsers() {
    try {
      const users = await api("/admin/users");
      setAdminUsers(users);
    } catch (err) {
      setAdminError(err.message);
    }
  }

  async function adminLogout() {
    try {
      await api("/admin/logout", { method: "POST" });
    } catch {}
    setAdminSession(false);
    setAdminUsers([]);
    setAdminForm({ username: "", password: "" });
    setAdminSelectedUser(null);
    setAdminUserDetails(null);
    setAdminError("");
  }

  async function openAdminUser(userId) {
    setAdminDetailsLoading(true);
    setAdminSelectedUser(userId);
    try {
      const data = await api(`/admin/users/${userId}`);
      setAdminUserDetails(data);
    } catch (err) {
      setAdminError(err.message);
    } finally {
      setAdminDetailsLoading(false);
    }
  }

  async function resetAdminUser(userId) {
    try {
      await api(`/admin/users/${userId}/reset`, { method: "DELETE" });
      await refreshAdminUsers();
      if (adminSelectedUser === userId) {
        await openAdminUser(userId);
      }
    } catch (err) {
      setAdminError(err.message);
    }
  }

  async function deleteAdminUser(userId) {
    try {
      await api(`/admin/users/${userId}`, { method: "DELETE" });
      await refreshAdminUsers();
      if (adminSelectedUser === userId) {
        setAdminSelectedUser(null);
        setAdminUserDetails(null);
      }
    } catch (err) {
      setAdminError(err.message);
    }
  }

  async function addOrUpdateSubject() {
    if (!subjectForm.name || !subjectForm.teacher || !subjectForm.credits) return;

    const payload = {
      name: subjectForm.name,
      teacher: subjectForm.teacher,
      credits: Number(subjectForm.credits),
      progress: Number(subjectForm.progress || 0),
    };

    try {
      if (editingSubjectId) {
        await api(`/subjects/${editingSubjectId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/subjects", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setSubjectForm({ name: "", teacher: "", credits: "", progress: "" });
      setEditingSubjectId(null);
      await loadAllData();
    } catch (err) {
      setPageError(err.message);
    }
  }

  async function addOrUpdateGrade() {
    if (!gradeForm.subject || !gradeForm.score || !gradeForm.max) return;

    const payload = {
      subject: gradeForm.subject,
      score: Number(gradeForm.score),
      max: Number(gradeForm.max),
    };

    try {
      if (editingGradeId) {
        await api(`/grades/${editingGradeId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/grades", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setGradeForm({ subject: "", score: "", max: "100" });
      setEditingGradeId(null);
      await loadAllData();
    } catch (err) {
      setPageError(err.message);
    }
  }

  async function addOrUpdateTask() {
    if (!taskForm.title || !taskForm.due) return;

    const currentTask = tasks.find((t) => t.id === editingTaskId);

    const payload = {
      title: taskForm.title,
      due: taskForm.due,
      done: currentTask?.done || false,
    };

    try {
      if (editingTaskId) {
        await api(`/tasks/${editingTaskId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/tasks", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setTaskForm({ title: "", due: "" });
      setEditingTaskId(null);
      await loadAllData();
    } catch (err) {
      setPageError(err.message);
    }
  }

  async function addOrUpdateSchedule() {
    if (!scheduleForm.day || !scheduleForm.title || !scheduleForm.time) return;

    const payload = {
      day: scheduleForm.day,
      title: scheduleForm.title,
      time: scheduleForm.time,
    };

    try {
      if (editingScheduleId) {
        await api(`/schedule/${editingScheduleId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/schedule", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setScheduleForm({ day: "Sunday", title: "", time: "" });
      setEditingScheduleId(null);
      await loadAllData();
    } catch (err) {
      setPageError(err.message);
    }
  }

  function editSubject(subject) {
    setEditingSubjectId(subject.id);
    setSubjectForm({
      name: subject.name,
      teacher: subject.teacher,
      credits: String(subject.credits),
      progress: String(subject.progress),
    });
  }

  function editGrade(grade) {
    setEditingGradeId(grade.id);
    setGradeForm({
      subject: grade.subject,
      score: String(grade.score),
      max: String(grade.max),
    });
  }

  function editTask(task) {
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title,
      due: task.due,
    });
  }

  function editSchedule(item) {
    setEditingScheduleId(item.id);
    setScheduleForm({
      day: item.day,
      title: item.title,
      time: item.time,
    });
  }

  function cancelEdit(type) {
    if (type === "subject") {
      setEditingSubjectId(null);
      setSubjectForm({ name: "", teacher: "", credits: "", progress: "" });
    }
    if (type === "grade") {
      setEditingGradeId(null);
      setGradeForm({ subject: "", score: "", max: "100" });
    }
    if (type === "task") {
      setEditingTaskId(null);
      setTaskForm({ title: "", due: "" });
    }
    if (type === "schedule") {
      setEditingScheduleId(null);
      setScheduleForm({ day: "Sunday", title: "", time: "" });
    }
  }

  async function deleteSubject(id) {
    try {
      await api(`/subjects/${id}`, { method: "DELETE" });
      await loadAllData();
    } catch (err) {
      setPageError(err.message);
    }
  }

  async function deleteGrade(id) {
    try {
      await api(`/grades/${id}`, { method: "DELETE" });
      await loadAllData();
    } catch (err) {
      setPageError(err.message);
    }
  }

  async function deleteTask(id) {
    try {
      await api(`/tasks/${id}`, { method: "DELETE" });
      await loadAllData();
    } catch (err) {
      setPageError(err.message);
    }
  }

  async function deleteSchedule(id) {
    try {
      await api(`/schedule/${id}`, { method: "DELETE" });
      await loadAllData();
    } catch (err) {
      setPageError(err.message);
    }
  }

  async function toggleTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    try {
      await api(`/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: task.title,
          due: task.due,
          done: !task.done,
        }),
      });
      await loadAllData();
    } catch (err) {
      setPageError(err.message);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#1e1b4b,transparent_30%),linear-gradient(135deg,#020617,#111827,#0f172a)] text-white">
        <GlowBackground />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <Card className="overflow-hidden border-white/15 bg-white/[0.06]">
              <CardContent className="p-8">
                <div className="mb-6 text-center">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-500/15 text-violet-300"
                  >
                    <ShieldCheck className="h-8 w-8" />
                  </motion.div>
                  <h1 className="text-3xl font-black">
                    {authMode === "login" ? "EduTrack Login" : "Create Account"}
                  </h1>
                  <p className="mt-2 text-slate-400">
                    {authMode === "login" ? (
                      <>
                        Demo account: <span className="text-white">osama / 123456</span>
                      </>
                    ) : (
                      "Register a new student account"
                    )}
                  </p>
                </div>

                <div className="mb-5 grid grid-cols-2 rounded-2xl border border-white/10 bg-white/5 p-1">
                  <button
                    onClick={() => setAuthMode("login")}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                      authMode === "login" ? "bg-violet-600 text-white" : "text-slate-300"
                    }`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setAuthMode("register")}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                      authMode === "register" ? "bg-violet-600 text-white" : "text-slate-300"
                    }`}
                  >
                    Register
                  </button>
                </div>

                {authMode === "login" ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <Input
                      placeholder="Username"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    />
                    {loginError ? <p className="text-sm text-red-400">{loginError}</p> : null}
                    <Button type="submit" className="w-full" disabled={loginLoading}>
                      {loginLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <Input
                      placeholder="Full name"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    />
                    <Input
                      placeholder="Username"
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    />
                    {registerError ? <p className="text-sm text-red-400">{registerError}</p> : null}
                    <Button type="submit" className="w-full" disabled={registerLoading}>
                      {registerLoading ? "Creating account..." : "Register"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, glow }) => (
    <motion.div layout whileHover={{ y: -4 }}>
      <Card className={`relative overflow-hidden ${glow}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent" />
        <CardContent className="relative flex items-start justify-between p-5">
          <div>
            <p className="text-sm text-slate-400">{title}</p>
            <h3 className="mt-2 text-3xl font-bold text-white">{value}</h3>
            <p className="mt-2 text-xs text-slate-400">{subtitle}</p>
          </div>
          <div className="rounded-2xl bg-violet-500/15 p-3 text-violet-300">
            <Icon className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#1e1b4b,transparent_30%),radial-gradient(circle_at_right,#0f172a,transparent_25%),linear-gradient(135deg,#020617,#111827,#0f172a)] text-white">
      <GlowBackground />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[290px_1fr]">
        <aside className="border-r border-white/10 bg-black/20 p-5 backdrop-blur-xl">
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setAdminOpen(true)}
            className="mb-8 w-full rounded-3xl border border-white/10 bg-white/5 p-4 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-wide">EduTrack</h1>
                <p className="mt-1 text-sm text-slate-400">Student dashboard</p>
              </div>
              <Sparkles className="h-5 w-5 text-violet-300" />
            </div>
          </motion.button>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.key;
              return (
                <motion.button
                  key={item.key}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(item.key)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 transition ${
                    active
                      ? "bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                      : "bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </motion.button>
              );
            })}
          </nav>

          <div className="mt-8 space-y-3">
            <Button onClick={loadAllData} variant="ghost" className="w-full">
              <span className="inline-flex items-center gap-2">
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </span>
            </Button>
            <Button onClick={handleLogout} variant="ghost" className="w-full">
              <span className="inline-flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </span>
            </Button>
          </div>
        </aside>

        <main className="p-6 md:p-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-3xl font-black md:text-4xl">
                  Welcome back, {session.name}
                </h2>
                <p className="mt-2 text-slate-400">
                  Track your courses, grades, assignments, and schedule in one place.
                </p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-72 pl-11 pr-10"
                  />
                  {globalSearch ? (
                    <button
                      onClick={() => setGlobalSearch("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                  Semester: <span className="font-semibold text-white">Spring 2026</span>
                </div>
              </div>
            </div>

            {pageError ? (
              <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {pageError}
              </div>
            ) : null}

            {loadingData ? (
              <div className="text-slate-300">Loading data...</div>
            ) : (
              <AnimatePresence mode="wait">
                {activeTab === "dashboard" && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    className="space-y-6"
                  >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <StatCard title="Current GPA" value={gpa} subtitle="Auto-calculated" icon={GraduationCap} glow="shadow-violet-900/20" />
                      <StatCard title="Subjects" value={subjects.length} subtitle={`${totalCredits} credit hours`} icon={BookOpen} glow="shadow-cyan-900/20" />
                      <StatCard title="Pending Tasks" value={pendingTasks} subtitle={`${completedTasks} completed`} icon={ListTodo} glow="shadow-fuchsia-900/20" />
                      <StatCard title="Schedule Items" value={scheduleItems.length} subtitle="This semester" icon={Clock3} glow="shadow-emerald-900/20" />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-3">
                      <Card className="xl:col-span-2">
                        <CardHeader>
                          <CardTitle>Subject Progress</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          {subjects.length ? (
                            subjects.map((subject) => (
                              <motion.div key={subject.id} layout>
                                <div className="mb-2 flex items-center justify-between">
                                  <div>
                                    <p className="font-semibold">{subject.name}</p>
                                    <p className="text-sm text-slate-400">{subject.teacher}</p>
                                  </div>
                                  <span className="text-sm text-slate-300">{subject.progress}%</span>
                                </div>
                                <Progress value={subject.progress} />
                              </motion.div>
                            ))
                          ) : (
                            <EmptyState title="No subjects yet" subtitle="Add your first subject from the Subjects tab." />
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Upcoming Tasks</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {upcomingTasks.length ? (
                            upcomingTasks.map((task) => (
                              <motion.div
                                key={task.id}
                                whileHover={{ scale: 1.02 }}
                                className="rounded-2xl border border-white/10 bg-black/20 p-4"
                              >
                                <p className="font-semibold">{task.title}</p>
                                <p className="mt-1 text-sm text-slate-400">
                                  Due {formatDate(task.due)}
                                </p>
                              </motion.div>
                            ))
                          ) : (
                            <EmptyState title="No pending tasks" subtitle="You’re all caught up." />
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                )}

                {activeTab === "subjects" && (
                  <motion.div
                    key="subjects"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    className="grid gap-6 xl:grid-cols-[1fr_380px]"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Your Subjects</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2">
                        {filteredSubjects.length ? (
                          filteredSubjects.map((subject) => (
                            <motion.div
                              layout
                              whileHover={{ y: -4 }}
                              key={subject.id}
                              className="rounded-3xl border border-white/10 bg-black/20 p-5"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h3 className="text-lg font-bold">{subject.name}</h3>
                                  <p className="mt-1 text-sm text-slate-400">{subject.teacher}</p>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => editSubject(subject)} className="text-slate-300 hover:text-violet-300">
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => deleteSubject(subject.id)} className="text-slate-300 hover:text-red-400">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
                                <span>{subject.credits} credits</span>
                                <span>{subject.progress}% progress</span>
                              </div>
                              <div className="mt-3">
                                <Progress value={subject.progress} />
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <EmptyState title="No matching subjects" subtitle="Try a different search or add a new subject." />
                        )}
                      </CardContent>
                    </Card>

                    <Card className="h-fit">
                      <CardHeader>
                        <CardTitle>{editingSubjectId ? "Edit Subject" : "Add Subject"}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Input placeholder="Subject name" value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} />
                        <Input placeholder="Teacher name" value={subjectForm.teacher} onChange={(e) => setSubjectForm({ ...subjectForm, teacher: e.target.value })} />
                        <Input placeholder="Credit hours" type="number" value={subjectForm.credits} onChange={(e) => setSubjectForm({ ...subjectForm, credits: e.target.value })} />
                        <Input placeholder="Progress %" type="number" value={subjectForm.progress} onChange={(e) => setSubjectForm({ ...subjectForm, progress: e.target.value })} />
                        <div className="flex gap-3">
                          <Button onClick={addOrUpdateSubject} className="flex-1">
                            <span className="inline-flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              {editingSubjectId ? "Save Changes" : "Add Subject"}
                            </span>
                          </Button>
                          {editingSubjectId ? (
                            <Button variant="ghost" onClick={() => cancelEdit("subject")}>
                              Cancel
                            </Button>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {activeTab === "grades" && (
                  <motion.div
                    key="grades"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    className="grid gap-6 xl:grid-cols-[1fr_380px]"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Grades Overview</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {filteredGrades.length ? (
                          filteredGrades.map((grade) => {
                            const percent = ((grade.score / grade.max) * 100).toFixed(1);
                            return (
                              <motion.div
                                layout
                                whileHover={{ x: 4 }}
                                key={grade.id}
                                className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
                              >
                                <div>
                                  <p className="font-semibold">{grade.subject}</p>
                                  <p className="text-sm text-slate-400">
                                    {grade.score} / {grade.max} • {percent}%
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => editGrade(grade)} className="text-slate-300 hover:text-violet-300">
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => deleteGrade(grade.id)} className="text-slate-300 hover:text-red-400">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })
                        ) : (
                          <EmptyState title="No matching grades" subtitle="Add a grade to start tracking performance." />
                        )}
                      </CardContent>
                    </Card>

                    <Card className="h-fit">
                      <CardHeader>
                        <CardTitle>{editingGradeId ? "Edit Grade" : "Add Grade"}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Input placeholder="Subject" value={gradeForm.subject} onChange={(e) => setGradeForm({ ...gradeForm, subject: e.target.value })} />
                        <Input placeholder="Score" type="number" value={gradeForm.score} onChange={(e) => setGradeForm({ ...gradeForm, score: e.target.value })} />
                        <Input placeholder="Max score" type="number" value={gradeForm.max} onChange={(e) => setGradeForm({ ...gradeForm, max: e.target.value })} />
                        <div className="flex gap-3">
                          <Button onClick={addOrUpdateGrade} className="flex-1">
                            <span className="inline-flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              {editingGradeId ? "Save Changes" : "Add Grade"}
                            </span>
                          </Button>
                          {editingGradeId ? (
                            <Button variant="ghost" onClick={() => cancelEdit("grade")}>
                              Cancel
                            </Button>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {activeTab === "tasks" && (
                  <motion.div
                    key="tasks"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    className="grid gap-6 xl:grid-cols-[1fr_380px]"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Assignments & Tasks</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {filteredTasks.length ? (
                          filteredTasks.map((task) => (
                            <motion.div
                              layout
                              whileHover={{ scale: 1.01 }}
                              key={task.id}
                              className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
                            >
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => toggleTask(task.id)}
                                  className={`h-5 w-5 rounded-full border transition ${
                                    task.done ? "border-violet-500 bg-violet-500" : "border-slate-500"
                                  }`}
                                />
                                <div>
                                  <p className={`font-semibold ${task.done ? "text-slate-500 line-through" : ""}`}>
                                    {task.title}
                                  </p>
                                  <p className="text-sm text-slate-400">Due {formatDate(task.due)}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => editTask(task)} className="text-slate-300 hover:text-violet-300">
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-red-400">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <EmptyState title="No matching tasks" subtitle="Create a task and keep your work on track." />
                        )}
                      </CardContent>
                    </Card>

                    <Card className="h-fit">
                      <CardHeader>
                        <CardTitle>{editingTaskId ? "Edit Task" : "Add Task"}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Input placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
                        <Input type="date" value={taskForm.due} onChange={(e) => setTaskForm({ ...taskForm, due: e.target.value })} />
                        <div className="flex gap-3">
                          <Button onClick={addOrUpdateTask} className="flex-1">
                            <span className="inline-flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              {editingTaskId ? "Save Changes" : "Add Task"}
                            </span>
                          </Button>
                          {editingTaskId ? (
                            <Button variant="ghost" onClick={() => cancelEdit("task")}>
                              Cancel
                            </Button>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {activeTab === "schedule" && (
                  <motion.div
                    key="schedule"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    className="grid gap-6 xl:grid-cols-[1fr_380px]"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Your Schedule</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {scheduleByDay.map((dayBlock) => (
                          <motion.div
                            layout
                            whileHover={{ y: -4 }}
                            key={dayBlock.day}
                            className="rounded-3xl border border-white/10 bg-black/20 p-5"
                          >
                            <h3 className="text-lg font-bold">{dayBlock.day}</h3>
                            <div className="mt-4 space-y-2">
                              {dayBlock.items.length ? (
                                dayBlock.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="font-semibold text-slate-100">{item.title}</p>
                                        <p className="text-sm text-slate-300">{item.time}</p>
                                      </div>
                                      <div className="flex gap-2">
                                        <button onClick={() => editSchedule(item)} className="text-slate-300 hover:text-violet-300">
                                          <Pencil className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => deleteSchedule(item.id)} className="text-slate-300 hover:text-red-400">
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-slate-500">No classes</p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="h-fit">
                      <CardHeader>
                        <CardTitle>{editingScheduleId ? "Edit Schedule Item" : "Add Schedule Item"}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Select
                          value={scheduleForm.day}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, day: e.target.value })}
                        >
                          {weekdays.map((day) => (
                            <option key={day} value={day}>
                              {day}
                            </option>
                          ))}
                        </Select>
                        <Input
                          placeholder="Class title"
                          value={scheduleForm.title}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                        />
                        <Input
                          placeholder="Time"
                          value={scheduleForm.time}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                        />
                        <div className="flex gap-3">
                          <Button onClick={addOrUpdateSchedule} className="flex-1">
                            <span className="inline-flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              {editingScheduleId ? "Save Changes" : "Add Item"}
                            </span>
                          </Button>
                          {editingScheduleId ? (
                            <Button variant="ghost" onClick={() => cancelEdit("schedule")}>
                              Cancel
                            </Button>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {activeTab === "analytics" && (
                  <motion.div
                    key="analytics"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    className="grid gap-6 xl:grid-cols-2"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Grades Chart</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        {gradeChartData.length ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={gradeChartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                              <XAxis dataKey="subject" stroke="#cbd5e1" />
                              <YAxis stroke="#cbd5e1" />
                              <Tooltip />
                              <Bar dataKey="percent" radius={[8, 8, 0, 0]} fill="#8b5cf6" />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <EmptyState title="No grade data" subtitle="Add grades to see the chart." />
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Task Status</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        {tasks.length ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={taskChartData} dataKey="value" nameKey="name" outerRadius={110} label>
                                <Cell fill="#8b5cf6" />
                                <Cell fill="#334155" />
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <EmptyState title="No task data" subtitle="Add tasks to see the chart." />
                        )}
                      </CardContent>
                    </Card>

                    <Card className="xl:col-span-2">
                      <CardHeader>
                        <CardTitle>Subject Progress Chart</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        {subjectProgressData.length ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={subjectProgressData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                              <XAxis dataKey="subject" stroke="#cbd5e1" />
                              <YAxis stroke="#cbd5e1" />
                              <Tooltip />
                              <Bar dataKey="progress" radius={[8, 8, 0, 0]} fill="#22c55e" />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <EmptyState title="No subject progress data" subtitle="Add subjects to see the chart." />
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {activeTab === "profile" && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                  >
                    <Card className="max-w-2xl">
                      <CardHeader>
                        <CardTitle>Student Profile</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 text-slate-300">
                        <div className="rounded-3xl border border-white/10 bg-black/20 p-5 space-y-4">
                          <div>
                            <label className="mb-2 block text-sm text-slate-400">Name</label>
                            <Input
                              value={profileForm.name}
                              onChange={(e) =>
                                setProfileForm({ ...profileForm, name: e.target.value })
                              }
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-slate-400">Your ID</label>
                            <Input
                              value={profileForm.custom_id}
                              onChange={(e) =>
                                setProfileForm({ ...profileForm, custom_id: e.target.value })
                              }
                              placeholder="Enter your own ID"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-slate-400">Username</label>
                            <Input value={session.username} disabled className="opacity-70" />
                          </div>

                          <Button onClick={saveProfile} disabled={profileSaving}>
                            {profileSaving ? "Saving..." : "Save Profile"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </motion.div>
        </main>
      </div>

      <AnimatePresence>
        {adminOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-6xl rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-black">Admin Panel</h2>
                <button onClick={() => setAdminOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!adminSession ? (
                <form onSubmit={adminLogin} className="space-y-4">
                  <Input
                    placeholder="Admin username"
                    value={adminForm.username}
                    onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                  />
                  <Input
                    type="password"
                    placeholder="Admin password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  />
                  {adminError ? <p className="text-sm text-red-400">{adminError}</p> : null}
                  <Button type="submit">Open Admin</Button>
                </form>
              ) : (
                <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <Button onClick={refreshAdminUsers} variant="ghost">Refresh Users</Button>
                      <Button onClick={adminLogout} variant="danger">Logout Admin</Button>
                    </div>

                    {adminError ? (
                      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {adminError}
                      </div>
                    ) : null}

                    <div className="overflow-x-auto rounded-2xl border border-white/10">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-slate-300">
                          <tr>
                            <th className="px-4 py-3">DB ID</th>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Username</th>
                            <th className="px-4 py-3">Custom ID</th>
                            <th className="px-4 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminUsers.map((user) => (
                            <tr key={user.id} className="border-t border-white/10">
                              <td className="px-4 py-3">{user.id}</td>
                              <td className="px-4 py-3">{user.name}</td>
                              <td className="px-4 py-3">{user.username}</td>
                              <td className="px-4 py-3">{user.custom_id || "-"}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => openAdminUser(user.id)}
                                    className="rounded-xl bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => resetAdminUser(user.id)}
                                    className="rounded-xl bg-amber-600/20 p-2 text-amber-300 hover:bg-amber-600/30"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteAdminUser(user.id)}
                                    className="rounded-xl bg-red-600/20 p-2 text-red-300 hover:bg-red-600/30"
                                  >
                                    <UserX className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>User Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {adminDetailsLoading ? (
                        <p className="text-slate-400">Loading...</p>
                      ) : adminUserDetails ? (
                        <>
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                            <p><span className="font-semibold text-white">Name:</span> {adminUserDetails.user.name}</p>
                            <p className="mt-2"><span className="font-semibold text-white">Username:</span> {adminUserDetails.user.username}</p>
                            <p className="mt-2"><span className="font-semibold text-white">Custom ID:</span> {adminUserDetails.user.custom_id || "-"}</p>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                              <p className="font-semibold text-white">Subjects</p>
                              <p className="mt-2 text-sm text-slate-400">{adminUserDetails.subjects.length}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                              <p className="font-semibold text-white">Grades</p>
                              <p className="mt-2 text-sm text-slate-400">{adminUserDetails.grades.length}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                              <p className="font-semibold text-white">Tasks</p>
                              <p className="mt-2 text-sm text-slate-400">{adminUserDetails.tasks.length}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                              <p className="font-semibold text-white">Schedule</p>
                              <p className="mt-2 text-sm text-slate-400">{adminUserDetails.schedule.length}</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                              <p className="mb-2 font-semibold text-white">Subjects</p>
                              <div className="space-y-1 text-sm text-slate-300">
                                {adminUserDetails.subjects.length ? adminUserDetails.subjects.map((x) => (
                                  <p key={x.id}>{x.name} - {x.teacher}</p>
                                )) : <p className="text-slate-500">None</p>}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                              <p className="mb-2 font-semibold text-white">Tasks</p>
                              <div className="space-y-1 text-sm text-slate-300">
                                {adminUserDetails.tasks.length ? adminUserDetails.tasks.map((x) => (
                                  <p key={x.id}>{x.title}</p>
                                )) : <p className="text-slate-500">None</p>}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-slate-400">Choose a user to view details.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
