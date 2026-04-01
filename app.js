const STORAGE_KEY = "work-kanban-tasks-v1";

const form = document.getElementById("task-form");
const idInput = document.getElementById("task-id");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const priorityInput = document.getElementById("priority");
const statusInput = document.getElementById("status");
const dueDateInput = document.getElementById("due-date");
const resetBtn = document.getElementById("reset-btn");
const board = document.getElementById("board");
const singleListPanel = document.getElementById("single-list-panel");
const allList = document.getElementById("all-list");
const countAll = document.getElementById("count-all");
const filterViewInput = document.getElementById("filter-view");
const filterStatusInput = document.getElementById("filter-status");
const filterPriorityInput = document.getElementById("filter-priority");
const filterDateInput = document.getElementById("filter-date");

const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const logoutWrap = document.getElementById("logout-wrap");
const authInputArea = document.getElementById("auth-input-area");
const welcomeMessage = document.getElementById("welcome-message");
const authStatus = document.getElementById("auth-status");

const lists = {
  todo: document.getElementById("todo-list"),
  doing: document.getElementById("doing-list"),
  done: document.getElementById("done-list")
};

const counts = {
  todo: document.getElementById("count-todo"),
  doing: document.getElementById("count-doing"),
  done: document.getElementById("count-done")
};

const template = document.getElementById("task-template");

let tasks = [];
let filters = {
  view: "board",
  status: "all",
  priority: "all",
  date: "newest"
};
let activeTouchDrag = null;

let firebaseReady = false;
let auth = null;
let db = null;
let currentUser = null;
let unsubscribeTasks = null;

function loadTasksFromLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveTasksToLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function setAuthStatus(message, isError = false) {
  const text = message || "";
  authStatus.textContent = text;
  authStatus.classList.toggle("error", isError);
  authStatus.classList.toggle("hidden", text.length === 0);
}

function setTaskFormEnabled(enabled) {
  const controls = form.querySelectorAll("input, textarea, select, button");
  controls.forEach((control) => {
    control.disabled = !enabled;
  });
}

function getPriorityOrder(priority) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

function priorityLabel(priority) {
  if (priority === "high") return "높음";
  if (priority === "medium") return "보통";
  return "낮음";
}

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function resetForm() {
  idInput.value = "";
  titleInput.value = "";
  descriptionInput.value = "";
  priorityInput.value = "medium";
  statusInput.value = "todo";
  dueDateInput.value = "";
  titleInput.focus();
}

function getDueInfo(task) {
  if (!task.dueDate) return { state: "none", label: "" };

  const end = new Date(`${task.dueDate}T23:59:59`);
  if (Number.isNaN(end.getTime())) return { state: "none", label: "" };

  const dayMs = 24 * 60 * 60 * 1000;
  const now = new Date();
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / dayMs);

  if (task.status === "done") {
    return { state: "normal", label: `완료 (${task.dueDate})` };
  }

  if (daysLeft < 0) {
    return { state: "overdue", label: `기한지남 D+${Math.abs(daysLeft)} (${task.dueDate})` };
  }

  if (daysLeft <= 2) {
    return { state: "soon", label: `임박 D-${daysLeft} (${task.dueDate})` };
  }

  return { state: "normal", label: `마감 D-${daysLeft} (${task.dueDate})` };
}

function normalizeTask(raw) {
  return {
    id: raw.id,
    title: raw.title || "",
    description: raw.description || "",
    priority: raw.priority || "medium",
    status: raw.status || "todo",
    dueDate: raw.dueDate || "",
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

function getFilteredOrderedTasks() {
  const filtered = tasks.filter((task) => {
    const statusMatch = filters.status === "all" || task.status === filters.status;
    const priorityMatch = filters.priority === "all" || task.priority === filters.priority;
    return statusMatch && priorityMatch;
  });

  return [...filtered].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();

    if (filters.date === "oldest") {
      if (dateA !== dateB) return dateA - dateB;
    } else if (dateA !== dateB) {
      return dateB - dateA;
    }

    const p = getPriorityOrder(a.priority) - getPriorityOrder(b.priority);
    if (p !== 0) return p;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
}

function createTaskNode(task) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.dataset.id = task.id;
  node.dataset.priority = task.priority;

  node.querySelector(".task-title").textContent = task.title;
  node.querySelector(".task-desc").textContent = task.description || "설명 없음";
  node.querySelector(".priority").textContent = `우선순위: ${priorityLabel(task.priority)}`;
  node.querySelector(".timestamp").textContent = `수정 ${formatDate(task.updatedAt)}`;

  const dueChip = node.querySelector(".due-chip");
  const dueInfo = getDueInfo(task);
  if (dueInfo.state === "none") {
    dueChip.classList.add("hidden");
    node.dataset.due = "none";
  } else {
    dueChip.classList.remove("hidden");
    dueChip.textContent = dueInfo.label;
    dueChip.classList.remove("due-soon", "due-overdue", "due-normal");
    dueChip.classList.add(`due-${dueInfo.state}`);
    node.dataset.due = dueInfo.state;
  }

  node.querySelector(".edit").addEventListener("click", () => {
    idInput.value = task.id;
    titleInput.value = task.title;
    descriptionInput.value = task.description;
    priorityInput.value = task.priority;
    statusInput.value = task.status;
    dueDateInput.value = task.dueDate || "";
    titleInput.focus();
  });

  node.querySelector(".delete").addEventListener("click", () => {
    void deleteTask(task.id);
  });

  node.addEventListener("dragstart", (event) => {
    event.dataTransfer.setData("text/plain", task.id);
    event.dataTransfer.effectAllowed = "move";
  });

  node.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") return;
    if (event.target.closest("button")) return;
    startTouchDrag(event, node, task.id);
  });

  return node;
}

function render() {
  Object.values(lists).forEach((list) => {
    list.innerHTML = "";
  });
  allList.innerHTML = "";

  const ordered = getFilteredOrderedTasks();

  ordered.forEach((task) => {
    const node = createTaskNode(task);
    if (filters.view === "list") {
      allList.appendChild(node);
    } else {
      lists[task.status].appendChild(node);
    }
  });

  counts.todo.textContent = String(ordered.filter((task) => task.status === "todo").length);
  counts.doing.textContent = String(ordered.filter((task) => task.status === "doing").length);
  counts.done.textContent = String(ordered.filter((task) => task.status === "done").length);
  countAll.textContent = String(ordered.length);

  if (filters.view === "list") {
    board.classList.add("hidden");
    singleListPanel.classList.remove("hidden");
  } else {
    board.classList.remove("hidden");
    singleListPanel.classList.add("hidden");
  }
}

function clearTouchDragState() {
  if (!activeTouchDrag) return;
  if (activeTouchDrag.ghost?.parentNode) {
    activeTouchDrag.ghost.parentNode.removeChild(activeTouchDrag.ghost);
  }
  if (activeTouchDrag.currentZone) {
    activeTouchDrag.currentZone.classList.remove("drag-over");
  }
  activeTouchDrag = null;
}

function startTouchDrag(event, node, taskId) {
  if (filters.view !== "board") return;
  clearTouchDragState();

  const rect = node.getBoundingClientRect();
  const ghost = node.cloneNode(true);
  ghost.classList.add("touch-ghost");
  ghost.style.width = `${rect.width}px`;
  ghost.style.left = `${event.clientX - rect.width / 2}px`;
  ghost.style.top = `${event.clientY - rect.height / 2}px`;
  document.body.appendChild(ghost);

  activeTouchDrag = {
    taskId,
    ghost,
    pointerId: event.pointerId,
    currentZone: null
  };
  node.setPointerCapture(event.pointerId);

  const onPointerMove = (moveEvent) => {
    if (!activeTouchDrag || moveEvent.pointerId !== activeTouchDrag.pointerId) return;
    moveEvent.preventDefault();

    ghost.style.left = `${moveEvent.clientX - rect.width / 2}px`;
    ghost.style.top = `${moveEvent.clientY - rect.height / 2}px`;

    const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
    const zone = target ? target.closest(".dropzone[data-status]") : null;

    if (activeTouchDrag.currentZone && activeTouchDrag.currentZone !== zone) {
      activeTouchDrag.currentZone.classList.remove("drag-over");
    }
    if (zone) zone.classList.add("drag-over");
    activeTouchDrag.currentZone = zone;
  };

  const onPointerEnd = (endEvent) => {
    if (!activeTouchDrag || endEvent.pointerId !== activeTouchDrag.pointerId) return;
    const zone = activeTouchDrag.currentZone;
    const status = zone ? zone.dataset.status : "";
    clearTouchDragState();

    if (status) {
      void moveTaskToStatus(taskId, status);
    }

    node.removeEventListener("pointermove", onPointerMove);
    node.removeEventListener("pointerup", onPointerEnd);
    node.removeEventListener("pointercancel", onPointerEnd);
  };

  node.addEventListener("pointermove", onPointerMove);
  node.addEventListener("pointerup", onPointerEnd);
  node.addEventListener("pointercancel", onPointerEnd);
}

function getTasksCollection(uid) {
  return db.collection("users").doc(uid).collection("tasks");
}

async function upsertTask(payload, targetId) {
  const now = new Date().toISOString();

  if (firebaseReady) {
    if (!currentUser) {
      setAuthStatus("로그인 후 저장할 수 있습니다.", true);
      return;
    }

    const collection = getTasksCollection(currentUser.uid);

    if (targetId) {
      await collection.doc(targetId).update({
        ...payload,
        updatedAt: now
      });
    } else {
      await collection.add({
        ...payload,
        createdAt: now,
        updatedAt: now
      });
    }
    return;
  }

  if (targetId) {
    tasks = tasks.map((task) => {
      if (task.id !== targetId) return task;
      return { ...task, ...payload, updatedAt: now };
    });
  } else {
    tasks.push({
      id: crypto.randomUUID(),
      ...payload,
      createdAt: now,
      updatedAt: now
    });
  }

  saveTasksToLocal();
  render();
}

async function deleteTask(taskId) {
  if (firebaseReady) {
    if (!currentUser) return;
    await getTasksCollection(currentUser.uid).doc(taskId).delete();
    return;
  }

  tasks = tasks.filter((task) => task.id !== taskId);
  saveTasksToLocal();
  render();
}

async function moveTaskToStatus(taskId, status) {
  if (firebaseReady) {
    if (!currentUser) return;
    await getTasksCollection(currentUser.uid).doc(taskId).update({
      status,
      updatedAt: new Date().toISOString()
    });
    return;
  }

  tasks = tasks.map((task) => {
    if (task.id !== taskId) return task;
    return {
      ...task,
      status,
      updatedAt: new Date().toISOString()
    };
  });
  saveTasksToLocal();
  render();
}

function startTaskSync(uid) {
  if (unsubscribeTasks) {
    unsubscribeTasks();
    unsubscribeTasks = null;
  }

  unsubscribeTasks = getTasksCollection(uid).onSnapshot(
    (snapshot) => {
      tasks = snapshot.docs.map((doc) => {
        return normalizeTask({ id: doc.id, ...doc.data() });
      });
      render();
    },
    () => {
      setAuthStatus("동기화 중 오류가 발생했습니다.", true);
    }
  );
}

function stopTaskSync() {
  if (unsubscribeTasks) {
    unsubscribeTasks();
    unsubscribeTasks = null;
  }
}

function updateAuthUI() {
  if (currentUser) {
    authInputArea.classList.add("hidden");
    welcomeMessage.classList.remove("hidden");
    welcomeMessage.textContent = `${currentUser.email}님 환영합니다!`;
    logoutWrap.classList.remove("hidden");
    setTaskFormEnabled(true);
    authEmailInput.value = currentUser.email || "";
    authPasswordInput.value = "";
    setAuthStatus("");
  } else {
    authInputArea.classList.remove("hidden");
    welcomeMessage.classList.add("hidden");
    welcomeMessage.textContent = "";
    logoutWrap.classList.add("hidden");
    if (firebaseReady) {
      setTaskFormEnabled(false);
      setAuthStatus("로그인 후 사용자별 데이터가 동기화됩니다.");
    } else {
      setTaskFormEnabled(true);
    }
  }
}

function initFirebaseMode() {
  const hasConfig =
    typeof window.FIREBASE_CONFIG === "object" &&
    window.FIREBASE_CONFIG &&
    typeof window.FIREBASE_CONFIG.apiKey === "string";

  if (!window.firebase || !hasConfig) {
    firebaseReady = false;
    tasks = loadTasksFromLocal();
    setTaskFormEnabled(true);
    setAuthStatus("Firebase 설정이 없어 현재 기기 로컬 저장 모드입니다.", true);
    render();
    return;
  }

  try {
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(window.FIREBASE_CONFIG);
    }

    auth = window.firebase.auth();
    db = window.firebase.firestore();
    firebaseReady = true;

    auth.onAuthStateChanged((user) => {
      currentUser = user;
      updateAuthUI();

      if (user) {
        startTaskSync(user.uid);
      } else {
        stopTaskSync();
        tasks = [];
        render();
      }
    });
  } catch {
    firebaseReady = false;
    tasks = loadTasksFromLocal();
    setTaskFormEnabled(true);
    setAuthStatus("Firebase 초기화에 실패해 로컬 저장 모드로 전환했습니다.", true);
    render();
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  if (!title) return;

  const payload = {
    title,
    description: descriptionInput.value.trim(),
    priority: priorityInput.value,
    status: statusInput.value,
    dueDate: dueDateInput.value
  };

  try {
    await upsertTask(payload, idInput.value);
    resetForm();
  } catch {
    setAuthStatus("저장 중 오류가 발생했습니다.", true);
  }
});

resetBtn.addEventListener("click", resetForm);

filterViewInput.addEventListener("change", () => {
  filters.view = filterViewInput.value;
  render();
});

filterStatusInput.addEventListener("change", () => {
  filters.status = filterStatusInput.value;
  render();
});

filterPriorityInput.addEventListener("change", () => {
  filters.priority = filterPriorityInput.value;
  render();
});

filterDateInput.addEventListener("change", () => {
  filters.date = filterDateInput.value;
  render();
});

loginBtn.addEventListener("click", async () => {
  if (!firebaseReady) {
    setAuthStatus("Firebase 설정 후 로그인 기능을 사용할 수 있습니다.", true);
    return;
  }

  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;

  if (!email || !password) {
    setAuthStatus("이메일과 비밀번호를 입력해 주세요.", true);
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch {
    setAuthStatus("로그인에 실패했습니다. 계정을 확인해 주세요.", true);
  }
});

signupBtn.addEventListener("click", async () => {
  if (!firebaseReady) {
    setAuthStatus("Firebase 설정 후 회원가입 기능을 사용할 수 있습니다.", true);
    return;
  }

  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;

  if (!email || !password) {
    setAuthStatus("이메일과 비밀번호를 입력해 주세요.", true);
    return;
  }

  if (password.length < 6) {
    setAuthStatus("비밀번호는 6자 이상이어야 합니다.", true);
    return;
  }

  try {
    await auth.createUserWithEmailAndPassword(email, password);
  } catch {
    setAuthStatus("회원가입에 실패했습니다. 이미 가입된 이메일인지 확인해 주세요.", true);
  }
});

logoutBtn.addEventListener("click", async () => {
  if (!firebaseReady) return;

  try {
    await auth.signOut();
  } catch {
    setAuthStatus("로그아웃 중 오류가 발생했습니다.", true);
  }
});

Object.entries(lists).forEach(([status, zone]) => {
  zone.dataset.status = status;

  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("drag-over");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("drag-over");
  });

  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("drag-over");

    const taskId = event.dataTransfer.getData("text/plain");
    if (!taskId) return;

    void moveTaskToStatus(taskId, status);
  });
});

initFirebaseMode();
