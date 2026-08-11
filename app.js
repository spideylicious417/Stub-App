// ================== DATA LAYER ==================
function loadData() {
  const raw = localStorage.getItem('stub-data');
  return raw ? JSON.parse(raw) : {};
}
function saveData() {
  localStorage.setItem('stub-data', JSON.stringify(data));
}
let data = loadData();
let currentListId = null;

let pendingAddBtn = null;
let pendingMovie = null; // movie waiting to be added once a list is chosen

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ================== TMDB CONFIG ==================
const TMDB_API_KEY = '6a8f310a833ad89dec9620e8198ea598';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w300';

const movieGrid = document.getElementById('movie-grid');
const discoverSearch = document.getElementById('discover-search');

async function fetchPopularMovies() {
  const url = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&page=1`;
  const res = await fetch(url);
  const json = await res.json();
  renderMovieGrid(json.results);
}
async function searchTMDB(query) {
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  const json = await res.json();
  renderMovieGrid(json.results);
}

function renderMovieGrid(movies) {
  movieGrid.innerHTML = '';
  movies.forEach(movie => {
    const year = movie.release_date ? movie.release_date.slice(0, 4) : '—';
    const poster = movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : '';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '—';

    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
      <div class="poster-wrap">${poster ? `<img src="${poster}" alt="${escapeHtml(movie.title)}">` : ''}</div>
      <div class="info-panel">
        <div class="info-panel-inner">
          <h3>${escapeHtml(movie.title)}</h3>
          <div class="meta">${year} · ⭐ ${rating}</div>
          <div class="overview">${escapeHtml(movie.overview || '')}</div>
          <button class="add-btn">+ Add</button>
        </div>
      </div>`;

    card.querySelector('.poster-wrap').addEventListener('click', () => {
      const wasOpen = card.classList.contains('open');
      document.querySelectorAll('.movie-card.open').forEach(c => c.classList.remove('open'));
      if (!wasOpen) card.classList.add('open');
    });

    card.querySelector('.add-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      pendingMovie = {
        text: `${movie.title}${year !== '—' ? ` (${year})` : ''}`,
        poster,
        overview: movie.overview || '',
      };
      pendingAddBtn = e.target;
      pushView('chooseList');
    });
    movieGrid.appendChild(card);
  });
}

let searchTimer;
discoverSearch.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = discoverSearch.value.trim();
  searchTimer = setTimeout(() => (q ? searchTMDB(q) : fetchPopularMovies()), 400);
});

// ================== LIST COLORS ==================
const LIST_COLORS = [
  { hex: '#b5222b' }, { hex: '#c9a227' }, { hex: '#2f9e6f' },
  { hex: '#3b6fd6' }, { hex: '#9b59b6' }, { hex: '#6b7280' },
];
let selectedColor = LIST_COLORS[0].hex;

// ================== ELEMENT REFS ==================
const overlay = document.getElementById('overlay');
const newListModal = document.getElementById('new-list-modal');
const profilePanel = document.getElementById('profile-panel');
const historyPanel = document.getElementById('history-panel');
const topBar = document.getElementById('top-bar');
const itemsScreen = document.getElementById('items-screen');
const itemsContainer = document.getElementById('items-container');
const currentListTitle = document.getElementById('current-list-title');
const progressRing = document.getElementById('progress-ring');
const progressFraction = document.getElementById('progress-fraction');
const historyContainer = document.getElementById('history-container');

const fabBtn = document.getElementById('fab-btn');
const profileBtn = document.getElementById('profile-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelListBtn = document.getElementById('cancel-list-btn');
const closePanelBtn = document.getElementById('close-panel-btn');
const createListBtn = document.getElementById('create-list-btn');
const panelNewListBtn = document.getElementById('panel-new-list-btn');
const backBtn = document.getElementById('back-btn');
const historyBtn = document.getElementById('history-btn');
const closeHistoryBtn = document.getElementById('close-history-btn');

const listNameInput = document.getElementById('list-name-input');
const listDescInput = document.getElementById('list-desc-input');
const colorPicker = document.getElementById('color-picker');
const modalListsPreview = document.getElementById('modal-lists-preview');
const panelListsContainer = document.getElementById('panel-lists-container');

const chooseListModal = document.getElementById('choose-list-modal');
const chooseListOptions = document.getElementById('choose-list-options');
const closeChooseBtn = document.getElementById('close-choose-btn');
const chooseNewListBtn = document.getElementById('choose-new-list-btn');

// add near your other element refs
const confirmDeleteModal = document.getElementById('confirm-delete-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

const confirmDeletePoster = document.getElementById('confirm-delete-poster');
const confirmDeleteTitle = document.getElementById('confirm-delete-title');

let pendingDeleteIndex = null;

// build color swatches
LIST_COLORS.forEach((c, i) => {
  const dot = document.createElement('div');
  dot.className = 'color-dot' + (i === 0 ? ' selected' : '');
  dot.style.background = c.hex;
  dot.textContent = i === 0 ? '✓' : '';
  dot.addEventListener('click', () => {
    selectedColor = c.hex;
    document.querySelectorAll('.color-dot').forEach(d => { d.classList.remove('selected'); d.textContent = ''; });
    dot.classList.add('selected');
    dot.textContent = '✓';
  });
  colorPicker.appendChild(dot);
});

// ================== NAVIGATION (History API) ==================
function applyState(state) {
  const view = (state && state.view) || 'home';

  overlay.hidden = true;
  newListModal.hidden = true;
  chooseListModal.hidden = true;
  profilePanel.hidden = true;
  historyPanel.hidden = true;
  itemsScreen.hidden = true;
  topBar.hidden = false;
  movieGrid.hidden = false;
  confirmDeleteModal.hidden = true;

  if (view === 'profile') {
    overlay.hidden = false;
    profilePanel.hidden = false;
    renderPanelLists();
  } else if (view === 'modal') {
    overlay.hidden = false;
    newListModal.hidden = false;
    renderModalListsPreview();
  } else if (view === 'chooseList') {
    overlay.hidden = false;
    chooseListModal.hidden = false;
    renderChooseListOptions();
  } else if (view === 'items') {
    topBar.hidden = true;
    movieGrid.hidden = true;
    itemsScreen.hidden = false;
    currentListId = state.id;
    renderItems();
  } else if (view === 'confirmDelete') {
    confirmDeletePoster.innerHTML = state.poster ? `<img src="${state.poster}" alt="">` : '';
    confirmDeleteTitle.textContent = state.title || '';
    overlay.hidden = false;
    confirmDeleteModal.hidden = false;
    topBar.hidden = true;
    movieGrid.hidden = true;
    itemsScreen.hidden = false;
    currentListId = state.id;
    renderItems();
    if (state.fromHistory) {
      historyPanel.hidden = false;
      renderHistory();
    }
  } else if (view === 'history') {
    topBar.hidden = true;
    movieGrid.hidden = true;
    itemsScreen.hidden = false; // dim behind the panel
    currentListId = state.id;
    renderItems();
    overlay.hidden = false;
    historyPanel.hidden = false;
    renderHistory();
  }
}

function pushView(view, extra = {}) {
  const state = { view, ...extra };
  history.pushState(state, '');
  applyState(state);
}

window.addEventListener('popstate', (e) => applyState(e.state));

// ================== EVENTS ==================
fabBtn.addEventListener('click', () => pushView('modal'));
profileBtn.addEventListener('click', () => pushView('profile'));
closeModalBtn.addEventListener('click', () => history.back());
cancelListBtn.addEventListener('click', () => history.back());
closePanelBtn.addEventListener('click', () => history.back());
overlay.addEventListener('click', () => history.back());
panelNewListBtn.addEventListener('click', () => pushView('modal'));
backBtn.addEventListener('click', () => history.back());
historyBtn.addEventListener('click', () => pushView('history', { id: currentListId }));
closeHistoryBtn.addEventListener('click', () => history.back());
closeChooseBtn.addEventListener('click', () => { pendingMovie = null; history.back(); });
chooseNewListBtn.addEventListener('click', () => pushView('modal'));

// ================== LIST CRUD ==================
function createList(title, description, color) {
  const id = crypto.randomUUID();
  data[id] = { title, description: description || '', color, items: [] };
  saveData();
  return id;
}

createListBtn.addEventListener('click', () => {
  const title = listNameInput.value.trim();
  if (!title) { listNameInput.focus(); return; }
  const newId = createList(title, listDescInput.value.trim(), selectedColor);
  listNameInput.value = '';
  listDescInput.value = '';

  if (pendingMovie) {
    addItemToList(newId, pendingMovie);
    if (pendingAddBtn) { pendingAddBtn.textContent = '✓ Added'; pendingAddBtn.classList.add('added'); }
    pendingMovie = null;
    pendingAddBtn = null;
    history.go(-2); // skip past the chooseList sheet back to the grid
  } else {
    history.back();
  }
});

function buildTicketCard(id) {
  const list = data[id];
  const count = list.items.length;
  const seatNum = String(Object.keys(data).indexOf(id) + 1).padStart(3, '0');

  const card = document.createElement('div');
  card.className = 'ticket-list-card';
  card.innerHTML = `
    <div class="ticket-list-main">
      <div class="ticket-list-icon" style="background:${list.color}33; color:${list.color}">🎬</div>
      <div class="ticket-list-info">
        <div class="name">${escapeHtml(list.title)}</div>
        ${list.description ? `<div class="desc">${escapeHtml(list.description)}</div>` : ''}
      </div>
      <div class="ticket-list-count">${count}</div>
    </div>
    <div class="ticket-list-footer">SEAT ${seatNum} · SCREEN 01</div>`;

  card.querySelector('.ticket-list-main').addEventListener('click', () => {
    pushView('items', { id });
  });
  return card;
}

function renderPanelLists() {
  panelListsContainer.innerHTML = '';
  const ids = Object.keys(data);
  if (ids.length === 0) { panelListsContainer.innerHTML = '<p class="empty">No lists yet.</p>'; return; }
  ids.forEach(id => panelListsContainer.appendChild(buildTicketCard(id)));
}

function renderModalListsPreview() {
  modalListsPreview.innerHTML = '';
  const ids = Object.keys(data);
  if (ids.length === 0) { modalListsPreview.innerHTML = '<p class="empty">No lists yet.</p>'; return; }
  ids.forEach(id => modalListsPreview.appendChild(buildTicketCard(id)));
}

function renderChooseListOptions() {
  chooseListOptions.innerHTML = '';
  const ids = Object.keys(data);

  if (ids.length === 0) {
    chooseListOptions.innerHTML = '<p class="empty">No lists yet — create one below.</p>';
    return;
  }

  ids.forEach(id => {
    const list = data[id];
    const row = document.createElement('div');
    row.className = 'choose-list-option';
    row.innerHTML = `
      <div class="icon" style="background:${list.color}33; color:${list.color}">🎬</div>
      <div class="name">${escapeHtml(list.title)}</div>
      <div class="count">${list.items.length}</div>`;

    row.addEventListener('click', () => {
      addItemToList(id, pendingMovie);
      if (pendingAddBtn) { pendingAddBtn.textContent = '✓ Added'; pendingAddBtn.classList.add('added'); }
      pendingMovie = null;
      pendingAddBtn = null;
      history.back();
    });

    chooseListOptions.appendChild(row);
  });
}

// ================== ITEM CRUD ==================
function addItemToList(listId, movie) {
  data[listId].items.push({
    text: movie.text,
    poster: movie.poster || '',
    overview: movie.overview || '',
    done: false,
  });
  saveData();
}

function buildMovieItemCard(item, index) {
  const row = document.createElement('div');
  row.className = 'movie-item-card';
  row.innerHTML = `
    <div class="swipe-area">
      <button class="delete-btn" aria-label="Delete">🗑</button>
      <div class="stub-body">
        <div class="movie-item-poster">${item.poster ? `<img src="${item.poster}" alt="">` : ''}</div>
        <div class="stub-tear"><span class="tear-label">ADMIT ONE</span></div>
        <div class="movie-item-info">
          <div class="movie-item-title">${escapeHtml(item.text)}</div>
          <div class="movie-item-desc">${escapeHtml(item.overview || '')}</div>
        </div>
      </div>
    </div>
    <button class="check-circle ${item.done ? 'checked' : ''}">${item.done ? '✓' : ''}</button>`;

  row.querySelector('.stub-body').addEventListener('click', () => {
    const wasOpen = row.classList.contains('menu-open');
    document.querySelectorAll('.movie-item-card.menu-open').forEach(c => c.classList.remove('menu-open'));
    if (!wasOpen) row.classList.add('menu-open');
  });

  row.querySelector('.check-circle').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleItem(index);
  });

  row.querySelector('.delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    pendingDeleteIndex = index;
    pushView('confirmDelete', {
      id: currentListId,
      fromHistory: !historyPanel.hidden,
      poster: item.poster,
      title: item.text,
    });
  });
  return row;
}

cancelDeleteBtn.addEventListener('click', () => {
  pendingDeleteIndex = null;
  history.back();
});

confirmDeleteBtn.addEventListener('click', () => {
  data[currentListId].items.splice(pendingDeleteIndex, 1);
  saveData();
  pendingDeleteIndex = null;
  history.back(); // closes the confirm sheet
  renderItems();
  if (!historyPanel.hidden) renderHistory();
});

// close any open delete menu when tapping elsewhere
document.addEventListener('click', (e) => {
  if (!e.target.closest('.movie-item-card')) {
    document.querySelectorAll('.movie-item-card.menu-open').forEach(c => c.classList.remove('menu-open'));
  }
});

// ================== ITEMS SCREEN ==================
function renderItems() {
  const list = data[currentListId];
  currentListTitle.textContent = list.title;
  itemsContainer.innerHTML = '';

  const total = list.items.length;
  const doneCount = list.items.filter(i => i.done).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  progressRing.style.setProperty('--pct', pct);
  progressFraction.textContent = `${doneCount}/${total} watched`;

  if (total === 0) {
    itemsContainer.innerHTML = '<p class="empty">No movies yet — add some from the Movies tab.</p>';
    return;
  }

  // keep original indices, but only show what's NOT watched yet
  const toWatch = list.items
    .map((item, index) => ({ item, index }))
    .filter(entry => !entry.item.done);

  if (toWatch.length === 0) {
    itemsContainer.innerHTML = '<p class="empty">All caught up! Check your Watched history 🕐</p>';
    return;
  }

  toWatch.forEach(({ item, index }) => {
    itemsContainer.appendChild(buildMovieItemCard(item, index));
  });
}

function toggleItem(index) {
  data[currentListId].items[index].done = !data[currentListId].items[index].done;
  saveData();
  renderItems();
  if (!historyPanel.hidden) renderHistory();
}

// ================== HISTORY PANEL ==================
function renderHistory() {
  const list = data[currentListId];
  historyContainer.innerHTML = '';
  const watched = list.items.filter(i => i.done);

  if (watched.length === 0) {
    historyContainer.innerHTML = '<p class="empty">Nothing watched yet.</p>';
    return;
  }

  watched.forEach((item) => {
    const realIndex = list.items.indexOf(item);
    historyContainer.appendChild(buildMovieItemCard(item, realIndex));
  });
}

// ================== INIT ==================
history.replaceState({ view: 'home' }, '');
fetchPopularMovies();