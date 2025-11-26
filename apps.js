// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(createServiceWorkerBlob()).then(() => {
        console.log('Service Worker registered');
    });
}

function createServiceWorkerBlob() {
    const swCode = `
        const CACHE_NAME = 'mindora-v1';
        const urlsToCache = ['/'];
        
        self.addEventListener('install', event => {
            event.waitUntil(
                caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
            );
        });
        
        self.addEventListener('fetch', event => {
            event.respondWith(
                caches.match(event.request).then(response => response || fetch(event.request))
            );
        });
    `;
    const blob = new Blob([swCode], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
}

// Manifest
const manifestData = {
    name: 'Mindora - Skincare Task Manager',
    short_name: 'Mindora',
    start_url: '.',
    display: 'standalone',
    background_color: '#FFF0F5',
    theme_color: '#FFB6C1',
    description: 'Aplikasi manajemen task skincare',
    icons: [{
        src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23FFB6C1" width="100" height="100" rx="20"/><text y="70" x="50" text-anchor="middle" font-size="60">🧴</text></svg>',
        sizes: '512x512',
        type: 'image/svg+xml'
    }]
};

const manifestBlob = new Blob([JSON.stringify(manifestData)], { type: 'application/json' });
const manifestURL = URL.createObjectURL(manifestBlob);
document.getElementById('manifest-placeholder').setAttribute('href', manifestURL);

// PWA Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installPrompt').classList.remove('d-none');
});

document.getElementById('installButton').addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        document.getElementById('installPrompt').classList.add('d-none');
    }
});

// Task Manager Logic
class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentFilter = 'all';
        this.editingId = null;
        this.init();
    }

    init() {
        this.renderTasks();
        this.attachEventListeners();
    }

    loadTasks() {
        const tasks = localStorage.getItem('mindoraTasks');
        return tasks ? JSON.parse(tasks) : [];
    }

    saveTasks() {
        localStorage.setItem('mindoraTasks', JSON.stringify(this.tasks));
    }

    addTask(title, description) {
        const task = {
            id: Date.now(),
            title,
            description,
            status: 'active',
            createdAt: new Date().toISOString()
        };
        this.tasks.unshift(task);
        this.saveTasks();
        this.renderTasks();
    }

    updateTask(id, title, description) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.title = title;
            task.description = description;
            this.saveTasks();
            this.renderTasks();
        }
    }

    deleteTask(id) {
        if (confirm('Yakin ingin menghapus task ini?')) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveTasks();
            this.renderTasks();
        }
    }

    changeStatus(id, status) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.status = status;
            this.saveTasks();
            this.renderTasks();
        }
    }

    filterTasks() {
        if (this.currentFilter === 'all') return this.tasks;
        return this.tasks.filter(t => t.status === this.currentFilter);
    }

    renderTasks() {
        const taskList = document.getElementById('taskList');
        const filteredTasks = this.filterTasks();

        if (filteredTasks.length === 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <div class="skincare-icon" style="font-size: 4rem; opacity: 0.3;">🧴</div>
                    <p>Belum ada task skincare</p>
                    <small>Tambahkan task untuk memulai rutinitas skincare Anda!</small>
                </div>
            `;
            return;
        }

        taskList.innerHTML = filteredTasks.map(task => `
            <div class="task-item ${task.status === 'completed' ? 'task-completed' : ''}">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${task.title}</h6>
                        <p class="mb-2 text-muted small">${task.description || 'Tidak ada deskripsi'}</p>
                    </div>
                    <span class="status-badge status-${task.status}">${this.getStatusText(task.status)}</span>
                </div>
                <div class="task-actions">
                    ${task.status === 'active' ? `<button class="btn btn-sm btn-success" onclick="taskManager.changeStatus(${task.id}, 'completed')">✓ Selesai</button>` : ''}
                    ${task.status === 'completed' ? `
                        <button class="btn btn-sm btn-warning" onclick="taskManager.changeStatus(${task.id}, 'archived')">📦 Arsip</button>
                        <button class="btn btn-sm btn-secondary" onclick="taskManager.changeStatus(${task.id}, 'active')">↻ Aktifkan</button>
                    ` : ''}
                    ${task.status === 'archived' ? `<button class="btn btn-sm btn-secondary" onclick="taskManager.changeStatus(${task.id}, 'active')">↻ Aktifkan</button>` : ''}
                    <button class="btn btn-sm btn-pink" onclick="taskManager.editTask(${task.id})">✏️ Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="taskManager.deleteTask(${task.id})">🗑️ Hapus</button>
                </div>
            </div>
        `).join('');
    }

    getStatusText(status) {
        const map = {
            active: 'Aktif',
            completed: 'Selesai',
            archived: 'Arsip'
        };
        return map[status] || status;
    }

    editTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDesc').value = task.description;
            document.getElementById('formButtonText').textContent = '💾 Update Task';
            document.getElementById('cancelEdit').classList.remove('d-none');
            this.editingId = id;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    cancelEdit() {
        document.getElementById('taskForm').reset();
        document.getElementById('formButtonText').textContent = '➕ Tambah Task';
        document.getElementById('cancelEdit').classList.add('d-none');
        this.editingId = null;
    }

    attachEventListeners() {
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('taskTitle').value.trim();
            const description = document.getElementById('taskDesc').value.trim();

            if (this.editingId) {
                this.updateTask(this.editingId, title, description);
                this.cancelEdit();
            } else {
                this.addTask(title, description);
            }
            e.target.reset();
        });

        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.cancelEdit();
        });

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.renderTasks();
            });
        });
    }
}

const taskManager = new TaskManager();
