const STORAGE_KEY = "work-kanban-tasks-v1";

const form = document.getElementById("task-form");
const idInput = document.getElementById("task-id");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const priorityInput = document.getElementById("priority");
const statusInput = document.getElementById("status");
const resetBtn = document.getElementById("reset-btn");
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
  status: "all",
  priority: "all",
  date: "newest"
};

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

function render() {
  Object.values(lists).forEach((list) => {
    list.innerHTML = "";
  });

  const filtered = tasks.filter((task) => {
    const statusMatch = filters.status === "all" || task.status === filters.status;
    const priorityMatch = filters.priority === "all" || task.priority === filters.priority;
    return statusMatch && priorityMatch;
  });

  const ordered = [...filtered].sort((a, b) => {
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

  ordered.forEach((task) => {
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

    lists[task.status].appendChild(node);
  });

  counts.todo.textContent = String(filtered.filter((task) => task.status === "todo").length);
  counts.doing.textContent = String(filtered.filter((task) => task.status === "doing").length);
  counts.done.textContent = String(filtered.filter((task) => task.status === "done").length);
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
  });
});

render();
