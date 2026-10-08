"use strict";

// Elementos da página
const taskForm = document.querySelector("#taskForm");
const taskTitle = document.querySelector("#taskTitle");
const taskDescription = document.querySelector("#taskDescription");
const taskPriority = document.querySelector("#taskPriority");
const taskDate = document.querySelector("#taskDate");
const taskList = document.querySelector("#taskList");
const searchInput = document.querySelector("#searchInput");
const taskFormTitle = document.querySelector("#formTitle");

const totalCount = document.querySelector("#totalCount");
const pendingCount = document.querySelector("#pendingCount");
const completedCount = document.querySelector("#completedCount");
const listSummary = document.querySelector("#listSummary");

const newTaskButton = document.querySelector("#newTaskButton");
const cancelButton = document.querySelector("#cancelButton");
const clearCompletedButton = document.querySelector("#clearCompleted");

// Estado da aplicação
const STORAGE_KEY = "taskflow-tasks-v1";
let tasks = loadTasks();
let currentFilter = "all";
let editingTaskId = null;

// Utilitários
function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((task) =>
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      typeof task.description === "string" &&
      ["low", "medium", "high"].includes(task.priority) &&
      typeof task.completed === "boolean" &&
      typeof task.createdAt === "string" &&
      (task.dueDate === "" ||
        (typeof task.dueDate === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)))
    );
  } catch (error) {
    console.error("Não foi possível carregar as tarefas:", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Não foi possível salvar as tarefas:", error);
    alert("Não foi possível salvar os dados neste navegador.");
    return false;
  }
}

// Configuração inicial
function initializeApp() {
  document.querySelector("#today").textContent =
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short"
    }).format(new Date()).replace(".", "");

  taskDate.min = localDateString();

  renderTasks();
}

function openForm(task = null) {
  editingTaskId = task ? task.id : null;

  taskFormTitle.textContent = task
    ? "Editar tarefa"
    : "Adicionar tarefa";

  document.querySelector("#saveButton").textContent = task
    ? "Salvar alterações"
    : "Salvar tarefa";

  taskTitle.value = task ? task.title : "";
  taskDescription.value = task ? task.description : "";
  taskPriority.value = task ? task.priority : "medium";
  taskDate.value = task ? task.dueDate : "";

  // Permite alterar prazos antigos ao editar uma tarefa.
  taskDate.min = task?.dueDate || localDateString();

  taskForm.hidden = false;
  taskTitle.focus();
}

function closeForm() {
  taskForm.hidden = true;
  taskForm.reset();
  taskDate.min = localDateString();
  editingTaskId = null;
  taskFormTitle.textContent = "Adicionar tarefa";
  document.querySelector("#saveButton").textContent = "Salvar tarefa";
}

// Criar ou editar tarefas
taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = taskTitle.value.trim();
  const description = taskDescription.value.trim();
  const priority = taskPriority.value;
  const dueDate = taskDate.value;

  if (!title) {
    taskTitle.focus();
    return;
  }

  const previousTasks = tasks;

  if (editingTaskId) {
    tasks = tasks.map((task) =>
      task.id === editingTaskId
        ? { ...task, title, description, priority, dueDate }
        : task
    );
  } else {
    tasks.unshift({
      id: createId(),
      title,
      description,
      priority,
      dueDate,
      completed: false,
      createdAt: new Date().toISOString()
    });
  }

  if (!saveTasks()) {
    tasks = previousTasks;
    return;
  }

  closeForm();
  renderTasks();
});

// Eventos dos botões principais
newTaskButton.addEventListener("click", () => openForm());
cancelButton.addEventListener("click", closeForm);

searchInput.addEventListener("input", renderTasks);

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;

    document.querySelectorAll(".filter-button").forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    renderTasks();
  });
});

// Alterar conclusão de uma tarefa
function toggleTask(id) {
  const previousTasks = tasks;

  tasks = tasks.map((task) =>
    task.id === id
      ? { ...task, completed: !task.completed }
      : task
  );

  if (!saveTasks()) {
    tasks = previousTasks;
  }

  renderTasks();
}

// Excluir uma tarefa
function deleteTask(id) {
  const task = tasks.find((item) => item.id === id);

  if (!task) return;

  const confirmed = confirm(`Deseja excluir a tarefa "${task.title}"?`);

  if (!confirmed) return;

  const previousTasks = tasks;
  tasks = tasks.filter((item) => item.id !== id);

  if (!saveTasks()) {
    tasks = previousTasks;
  }

  renderTasks();
}

// Remover todas as tarefas concluídas
clearCompletedButton.addEventListener("click", () => {
  const completedTasks = tasks.filter((task) => task.completed);

  if (completedTasks.length === 0) {
    alert("Não há tarefas concluídas para limpar.");
    return;
  }

  const confirmed = confirm(
    `Deseja remover ${completedTasks.length} tarefa(s) concluída(s)?`
  );

  if (!confirmed) return;

  const previousTasks = tasks;
  tasks = tasks.filter((task) => !task.completed);

  if (!saveTasks()) {
    tasks = previousTasks;
  }

  renderTasks();
});

// Criar elementos de forma segura
function createElement(tag, className, text = "") {
  const element = document.createElement(tag);

  if (className) element.className = className;
  element.textContent = text;

  return element;
}

function renderTask(task) {
  const item = createElement(
    "article",
    `task-item${task.completed ? " is-completed" : ""}`
  );

  const checkbox = createElement("input", "task-check");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Concluir ${task.title}`);
  checkbox.addEventListener("change", () => toggleTask(task.id));

  const content = createElement("div", "task-content");
  const title = createElement("h3", "task-title", task.title);
  content.append(title);

  if (task.description) {
    content.append(
      createElement("p", "task-description", task.description)
    );
  }

  const meta = createElement("div", "task-meta");

  const priorities = {
    low: { label: "Baixa prioridade", className: "priority-low" },
    medium: { label: "Média prioridade", className: "priority-medium" },
    high: { label: "Alta prioridade", className: "priority-high" }
  };

  const priority = priorities[task.priority];

  meta.append(
    createElement("span", `priority ${priority.className}`, priority.label)
  );

  if (task.completed) {
    meta.append(createElement("span", "status-label", "Concluída"));
  }

  if (task.dueDate) {
    const dueDate = createElement(
      "span",
      "due-date",
      `Prazo: ${formatDate(task.dueDate)}`
    );

    if (!task.completed && task.dueDate < localDateString()) {
      dueDate.classList.add("overdue");
      dueDate.textContent += " · Atrasada";
    }

    meta.append(dueDate);
  }

  content.append(meta);

  const actions = createElement("div", "task-actions");

  const editButton = createElement("button", "icon-button", "✎");
  editButton.type = "button";
  editButton.title = "Editar tarefa";
  editButton.setAttribute("aria-label", `Editar ${task.title}`);
  editButton.addEventListener("click", () => openForm(task));

  const deleteButton = createElement("button", "icon-button delete", "×");
  deleteButton.type = "button";
  deleteButton.title = "Excluir tarefa";
  deleteButton.setAttribute("aria-label", `Excluir ${task.title}`);
  deleteButton.addEventListener("click", () => deleteTask(task.id));

  actions.append(editButton, deleteButton);
  item.append(checkbox, content, actions);

  return item;
}

// Atualizar lista, pesquisa, filtros e indicadores
function renderTasks() {
  const query = searchInput.value.trim().toLocaleLowerCase("pt-BR");

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLocaleLowerCase("pt-BR").includes(query) ||
      task.description.toLocaleLowerCase("pt-BR").includes(query);

    const matchesFilter =
      currentFilter === "all" ||
      (currentFilter === "pending" && !task.completed) ||
      (currentFilter === "completed" && task.completed);

    return matchesSearch && matchesFilter;
  });

  taskList.replaceChildren();

  if (filteredTasks.length === 0) {
    const empty = createElement("div", "empty-state");
    empty.append(createElement("div", "empty-icon", "✦"));

    const heading = createElement(
      "h3",
      "",
      tasks.length === 0
        ? "Vamos começar?"
        : "Nenhuma tarefa encontrada"
    );

    const message = createElement(
      "p",
      "",
      tasks.length === 0
        ? "Adicione sua primeira tarefa e organize seu dia."
        : "Tente mudar o filtro ou pesquisar outro termo."
    );

    empty.append(heading, message);
    taskList.append(empty);
  } else {
    filteredTasks.forEach((task) => {
      taskList.append(renderTask(task));
    });
  }

  const completed = tasks.filter((task) => task.completed).length;
  const pending = tasks.length - completed;

  totalCount.textContent = tasks.length;
  pendingCount.textContent = pending;
  completedCount.textContent = completed;

  listSummary.textContent = `${filteredTasks.length} de ${tasks.length} tarefa(s)`;

  clearCompletedButton.disabled = completed === 0;
  clearCompletedButton.style.opacity = completed === 0 ? "0.5" : "1";
}

// Iniciar a aplicação
initializeApp();
