const STORAGE_KEY = "work-kanban-tasks-v1";

const form = document.getElementById("task-form");
const idInput = document.getElementById("task-id");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const priorityInput = document.getElementById("priority");
const statusInput = document.getElementById("status");
const resetBtn = document.getElementById("reset-btn");
const board = document.getElementById("board");
const singleListPanel = document.getElementById("single-list-panel");
const allList = document.getElementById("all-list");
const countAll = document.getElementById("count-all");
const filterViewInput = document.getElementById("filter-view");
const filterStatusInput = document.getElementById("filter-status");
const filterPriorityInput = document.getElementById("filter-priority");
const filterDateInput = document.getElementById("filter-date");

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

let tasks = loadTasks();
let filters = {
  view: "board",
  status: "all",
  priority: "all",
  date: "newest"
};
let activeTouchDrag = null;

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
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
  titleInput.focus();
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

  node.querySelector(".edit").addEventListener("click", () => {
    idInput.value = task.id;
    titleInput.value = task.title;
    descriptionInput.value = task.description;
    priorityInput.value = task.priority;
    statusInput.value = task.status;
    titleInput.focus();
  });

  node.querySelector(".delete").addEventListener("click", () => {
    tasks = tasks.filter((t) => t.id !== task.id);
    saveTasks();
    render();
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

function moveTaskToStatus(taskId, status) {
  tasks = tasks.map((task) => {
    if (task.id !== taskId) return task;
    return {
      ...task,
      status,
      updatedAt: new Date().toISOString()
    };
  });
  saveTasks();
  render();
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
      moveTaskToStatus(taskId, status);
    }

    node.removeEventListener("pointermove", onPointerMove);
    node.removeEventListener("pointerup", onPointerEnd);
    node.removeEventListener("pointercancel", onPointerEnd);
  };

  node.addEventListener("pointermove", onPointerMove);
  node.addEventListener("pointerup", onPointerEnd);
  node.addEventListener("pointercancel", onPointerEnd);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  if (!title) return;

  const payload = {
    title,
    description: descriptionInput.value.trim(),
    priority: priorityInput.value,
    status: statusInput.value
  };

  const targetId = idInput.value;
  const now = new Date().toISOString();

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

  saveTasks();
  render();
  resetForm();
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

    moveTaskToStatus(taskId, status);
  });
});

render();
