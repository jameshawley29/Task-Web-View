// Task Web View Application

class TaskApp {
  constructor() {
    this.tasks = [];
    this.init();
  }

  init() {
    this.cacheElements();
    this.bindEvents();
    this.initTheme();
    this.fetchTasks();
  }

  cacheElements() {
    this.taskList = document.getElementById('taskList');
    this.taskInput = document.getElementById('taskInput');
    this.dueDateInput = document.getElementById('dueDateInput');
    this.addTaskForm = document.getElementById('addTaskForm');
    this.loading = document.getElementById('loading');
    this.emptyState = document.getElementById('emptyState');
    this.errorState = document.getElementById('errorState');
    this.errorMessage = document.getElementById('errorMessage');
    this.retryBtn = document.getElementById('retryBtn');
    this.themeToggle = document.getElementById('themeToggle');
    this.totalTasks = document.getElementById('totalTasks');
    this.completedTasks = document.getElementById('completedTasks');
    this.taskStats = document.getElementById('taskStats');
  }

  bindEvents() {
    this.addTaskForm.addEventListener('submit', (e) => this.handleAddTask(e));
    this.retryBtn.addEventListener('click', () => this.fetchTasks());
    this.themeToggle.addEventListener('click', () => this.toggleTheme());
  }

  // Theme Management
  initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (prefersDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  }

  // API Methods
  async fetchTasks() {
    this.showLoading();

    try {
      const response = await fetch('/api/tasks');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.tasks = await response.json();
      this.renderTasks();
    } catch (error) {
      console.error('Error fetching tasks:', error);
      this.showError(error.message);
    }
  }

  async addTask(name, dueDate) {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, dueDate: dueDate || null })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      this.showToast('Task added successfully', 'success');
      this.fetchTasks(); // Refresh the list

      return result;
    } catch (error) {
      console.error('Error adding task:', error);
      this.showToast('Failed to add task', 'error');
      throw error;
    }
  }

  async updateTask(id, status) {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update local state
      const task = this.tasks.find(t => t.id === id);
      if (task) {
        task.status = status;
        this.updateStats();
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating task:', error);
      this.showToast('Failed to update task', 'error');
      // Revert UI change
      this.fetchTasks();
      throw error;
    }
  }

  async deleteTask(id) {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.showToast('Task deleted', 'success');
      this.fetchTasks(); // Refresh the list

      return await response.json();
    } catch (error) {
      console.error('Error deleting task:', error);
      this.showToast('Failed to delete task', 'error');
      throw error;
    }
  }

  // Event Handlers
  handleAddTask(e) {
    e.preventDefault();

    const name = this.taskInput.value.trim();
    const dueDate = this.dueDateInput.value || null;

    if (!name) return;

    this.addTask(name, dueDate);
    this.taskInput.value = '';
    this.dueDateInput.value = '';
    this.taskInput.focus();
  }

  handleToggleTask(id, currentStatus) {
    const taskElement = document.querySelector(`[data-task-id="${id}"]`);

    // Optimistic UI update
    if (taskElement) {
      taskElement.classList.toggle('completed', !currentStatus);
      const checkbox = taskElement.querySelector('.task-checkbox');
      if (checkbox) checkbox.checked = !currentStatus;
    }

    this.updateTask(id, !currentStatus);
  }

  handleDeleteTask(id) {
    const taskElement = document.querySelector(`[data-task-id="${id}"]`);

    // Animate removal
    if (taskElement) {
      taskElement.style.opacity = '0';
      taskElement.style.transform = 'translateX(20px)';
      setTimeout(() => {
        this.deleteTask(id);
      }, 200);
    } else {
      this.deleteTask(id);
    }
  }

  // Rendering Methods
  renderTasks() {
    this.hideLoading();
    this.hideError();

    if (this.tasks.length === 0) {
      this.showEmptyState();
      this.taskStats.style.display = 'none';
      return;
    }

    this.hideEmptyState();
    this.taskStats.style.display = 'flex';

    // Sort: incomplete first, then by due date
    const sortedTasks = [...this.tasks].sort((a, b) => {
      // Completed tasks go to bottom
      if (a.status !== b.status) {
        return a.status ? 1 : -1;
      }
      // Sort by due date (tasks with due dates first)
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      return 0;
    });

    this.taskList.innerHTML = sortedTasks.map(task => this.renderTaskItem(task)).join('');

    // Bind events to task items
    this.bindTaskEvents();
    this.updateStats();
  }

  renderTaskItem(task) {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.status;
    const dueDateFormatted = task.dueDate ? this.formatDate(task.dueDate) : null;
    const hasMetadata = dueDateFormatted || task.priority || task.taskType;

    return `
      <div class="task-item ${task.status ? 'completed' : ''}" data-task-id="${task.id}">
        <input
          type="checkbox"
          class="task-checkbox"
          ${task.status ? 'checked' : ''}
          aria-label="Mark task as ${task.status ? 'incomplete' : 'complete'}"
        >
        <div class="task-content">
          <span class="task-name">${this.escapeHtml(task.name)}</span>
          ${hasMetadata ? `
            <div class="task-meta">
              ${dueDateFormatted ? `
                <span class="task-due ${isOverdue ? 'overdue' : ''}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  ${dueDateFormatted}
                </span>
              ` : ''}
              ${task.taskType ? `
                <span class="task-type ${task.taskType.toLowerCase()}">${task.taskType}</span>
              ` : ''}
              ${task.priority ? `
                <span class="task-priority ${task.priority.toLowerCase()}">${task.priority}</span>
              ` : ''}
            </div>
          ` : ''}
        </div>
        <button class="delete-btn" aria-label="Delete task">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;
  }

  bindTaskEvents() {
    // Checkbox toggle
    this.taskList.querySelectorAll('.task-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const taskId = e.target.closest('.task-item').dataset.taskId;
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
          this.handleToggleTask(taskId, task.status);
        }
      });
    });

    // Delete button
    this.taskList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const taskId = e.target.closest('.task-item').dataset.taskId;
        this.handleDeleteTask(taskId);
      });
    });
  }

  updateStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.status).length;

    this.totalTasks.textContent = total;
    this.completedTasks.textContent = completed;
  }

  // UI State Methods
  showLoading() {
    this.loading.style.display = 'flex';
    this.hideEmptyState();
    this.hideError();
    // Clear task list items but keep loading
    const taskItems = this.taskList.querySelectorAll('.task-item');
    taskItems.forEach(item => item.remove());
  }

  hideLoading() {
    this.loading.style.display = 'none';
  }

  showEmptyState() {
    this.emptyState.style.display = 'flex';
  }

  hideEmptyState() {
    this.emptyState.style.display = 'none';
  }

  showError(message) {
    this.hideLoading();
    this.errorState.style.display = 'flex';
    this.errorMessage.textContent = message || 'Please check your connection';
  }

  hideError() {
    this.errorState.style.display = 'none';
  }

  // Toast Notifications
  showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${type === 'success'
          ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
          : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
        }
      </svg>
      ${message}
    `;

    container.appendChild(toast);

    // Remove after delay
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(24px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Utility Methods
  formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reset time for comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  new TaskApp();
});
