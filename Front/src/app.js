import { categories, initialPosts, articles, filterPosts, setVote } from './data.js';
import { registrationView, bindRegistration } from './registration.js';

const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 3v3m6-3v3m-6 12v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  up: '<path d="m6 14 6-6 6 6"/>',
  down: '<path d="m6 10 6 6 6-6"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0Z"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4V3Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/>',
  trophy: '<path d="M7 3h10v6a5 5 0 0 1-10 0V3Zm0 2H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4m-5 2v7m-5 0h10"/>',
  book: '<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z"/>',
  gpu: '<rect x="3" y="5" width="18" height="12" rx="2"/><circle cx="13" cy="11" r="4"/><path d="M6 9h2m-2 4h2m-1 4v3m4-3v3m4-3v3m4-3v3"/>',
  memory: '<rect x="2" y="7" width="20" height="10" rx="1"/><path d="M6 10v4m4-4v4m4-4v4m4-4v4M6 17v3m4-3v3m4-3v3m4-3v3"/>',
  drive: '<rect x="4" y="3" width="16" height="18" rx="3"/><circle cx="12" cy="10" r="4"/><path d="m12 10 5 5M8 18h1m3 0h4"/>',
  wifi: '<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-11 4a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r="1"/>',
  mouse: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v7M6 10h12"/>',
  box: '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5ZM3 7l9 5 9-5m-9 5v10"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  logout: '<path d="M9 3H4v18h5m5-14 5 5-5 5m-6-5h13"/>',
  fan: '<circle cx="12" cy="12" r="2"/><path d="M10 10C2 8 4 2 9 3c3 0 3 4 3 7m2 0c2-8 8-6 7-1 0 3-4 3-7 3m0 2c8 2 6 8 1 7-3 0-3-4-3-7m-2 0c-2 8-8 6-7 1 0-3 4-3 7-3"/>'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.cpu}</svg>`;
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rich = value => escape(value).replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
function restore() { try { const data = JSON.parse(localStorage.getItem('circuito-v1')); return data?.version === 1 && Array.isArray(data.posts) ? data : null; } catch { return null; } }
const restored = restore();
const state = { posts: restored?.posts || structuredClone(initialPosts), user: restored?.user || null, page: 'feed', category: categories[0][0], status: 'all', query: '', sort: 'recent', unread: true, storageWarning: false };
const pages = new Set(['feed', 'mine', 'saved', 'members', 'articles', 'profile', 'register']);
const initialPage = location.hash.slice(1);
if (pages.has(initialPage)) state.page = initialPage;
let demoBackup;
const app = document.querySelector('#app');
const modal = document.querySelector('#modal');
let returnFocus;
let toastTimer;
function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 4000); }
function persist() { try { localStorage.setItem('circuito-v1', JSON.stringify({ version: 1, posts: state.posts, user: state.user })); } catch { toast('Armazenamento indisponível ou cheio. As alterações duram apenas nesta sessão.'); } }
const avatar = (name, color = 'mint', large = false) => `<span class="avatar ${color} ${large ? 'large' : ''}" aria-hidden="true">${escape(name.split(' ').map(x => x[0]).slice(0, 2).join(''))}</span>`;
const navItem = (page, label, glyph, extra = '') => `<button class="nav-item ${state.page === page ? 'active' : ''}" data-page="${page}" ${state.page === page ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${label}</span>${extra}</button>`;

function render() {
  if (location.hash !== '#' + state.page) history.pushState(null, '', '#' + state.page);
  document.title = state.page === 'register' ? 'Crie seu perfil — Circuito' : 'Circuito — Comunidade de hardware';
  if (state.page === 'register') {
    app.innerHTML = registrationView({ icon, escape, user: state.user });
    bindRegistration(user => {
      state.user = user;
      persist();
      state.page = 'profile';
      render();
      window.scrollTo(0, 0);
      document.querySelector('#main')?.focus({ preventScroll: true });
      toast('Perfil criado! Seu conhecimento já faz parte do Circuito.');
    });
    return;
  }
  app.innerHTML = `<aside class="sidebar" id="sidebar" aria-label="Navegação principal">
    <a href="#feed" class="brand" aria-label="Circuito, início"><span class="brand-mark">${icon('cpu')}</span>circuito<span class="brand-dot">.</span></a>
    <div class="workspace-label">COMUNIDADE DE HARDWARE</div>
    <nav>${navItem('feed', 'Feed da comunidade', 'grid')}${navItem('mine', 'Minhas publicações', 'chat')}${navItem('saved', 'Itens salvos', 'bookmark')}${navItem('members', 'Membros', 'users')}${navItem('articles', 'Base de conhecimento', 'book')}</nav>
    <div class="sidebar-label">EXPLORE POR CATEGORIA</div>
    <nav class="category-nav">${categories.slice(1).map(([label, glyph]) => `<button class="nav-item ${state.category === label ? 'selected' : ''}" data-category="${label}">${icon(glyph)}<span>${label}</span><span class="category-dot"></span></button>`).join('')}</nav>
    <div class="sidebar-invite"><span class="invite-icon">${icon('bolt')}</span><strong>Conhecimento que conecta.</strong><p>Uma boa resposta pode transformar o dia de alguém.</p><button data-action="new">Compartilhe o que sabe ${icon('arrow')}</button></div>
    <div class="sidebar-bottom"><span class="online-dot"></span> Feito para quem resolve.</div>
  </aside>
  <div class="main-shell"><header class="topbar"><button class="icon-button mobile-menu" data-action="menu" aria-label="Abrir navegação" aria-expanded="false">${icon('menu')}</button><span class="breadcrumb">Comunidade <span>/</span> <strong>${pageTitle()}</strong></span><div class="header-actions"><span class="demo-label">Demonstração local</span><button class="icon-button notification-button" data-action="notifications" aria-label="Notificações${state.unread ? ', novas notificações' : ''}">${icon('bell')}${state.unread ? '<i></i>' : ''}</button><span class="header-divider"></span><button class="user-button" data-action="profile" aria-label="Abrir meu perfil ou entrar na comunidade">${avatar(state.user?.name || 'Visitante')}<span>${escape(state.user?.name || 'Visitante')}<small>${state.user ? 'Meu perfil' : 'Entrar na comunidade'}</small></span>${icon('down')}</button></div></header>
    <main id="main" tabindex="-1"><div class="page-heading"><div><div class="eyebrow">JUNTOS, A GENTE RESOLVE</div><h1>${pageTitle()}</h1><p>${state.page === 'feed' ? 'Conecte ideias. Compartilhe soluções. Evolua seu hardware.' : pageDescription()}</p></div><button class="button primary" data-action="new">${icon('plus')} Nova publicação</button></div>
    ${state.page === 'feed' ? hero() : ''}
    <div class="content-grid"><section class="feed-column" aria-label="${pageTitle()}">${mainContent()}</section>${rightRail()}</div>
    <footer class="page-footer"><span>© ${new Date().getFullYear()} Circuito · Conhecimento compartilhado, problemas resolvidos.</span><button data-action="about">Sobre a comunidade</button></footer></main></div>`;
  bindFeed();
}
window.addEventListener('hashchange', () => {
  const page = location.hash.slice(1);
  if (pages.has(page)) { state.page = page; modal.close(); render(); }
});
function pageTitle() { return ({ feed: 'Feed da comunidade', mine: 'Minhas publicações', saved: 'Itens salvos', members: 'Nossa comunidade', articles: 'Base de conhecimento', profile: 'Meu perfil' })[state.page] || 'Feed da comunidade'; }
function pageDescription() { return ({ mine: 'Suas dúvidas, descobertas e soluções em um só lugar.', saved: 'Aquele conhecimento que vale guardar para depois.', members: 'Pessoas que fazem o conhecimento circular.', articles: 'Guias práticos para entender, cuidar e evoluir seu setup.', profile: 'Cada contribuição faz a comunidade ir mais longe.' })[state.page]; }
function hero() { return `<section class="hero"><div class="hero-copy"><span class="hero-tag"><span></span> SEU PRÓXIMO INSIGHT ESTÁ AQUI</span><h2>Todo problema tem uma solução.<br>Vamos encontrar a sua?</h2><p>Da primeira montagem ao diagnóstico mais complexo,<br>tem uma comunidade inteira com você.</p><button data-action="new">Faça sua pergunta ${icon('arrow')}</button></div><div class="circuit-art" aria-hidden="true"><span class="circuit-line line-one"></span><span class="circuit-line line-two"></span><span class="circuit-line line-three"></span><div class="chip-outline"><div class="chip">${icon('cpu')}<span>CONNECT. SOLVE. EVOLVE.</span></div></div><span class="art-node node-one">${icon('bolt')}</span><span class="art-node node-two">${icon('chat')}</span><span class="art-node node-three">${icon('check')}</span></div></section>`; }
function postCard(p) { return `<article class="post-card"><div class="post-author">${avatar(p.author, p.color)}<div><button class="author-name" data-author="${escape(p.author)}">${escape(p.author)}</button><div class="author-meta">${escape(p.role)} <span>·</span> ${escape(p.time)}</div></div><span class="status ${p.status === 'resolved' ? 'resolved' : ''}">${p.status === 'resolved' ? icon('check') + ' Resolvido' : '<span class="status-dot"></span> Em aberto'}</span></div><button class="post-title" data-post="${p.id}"><h2>${escape(p.title)}</h2></button><p class="post-excerpt">${escape(p.description.replace(/\*\*/g, ''))}</p>${p.image ? `<button class="post-image-button" data-post="${p.id}"><img class="post-image" src="${safeImage(p.image)}" alt="Componente de hardware anexado por ${escape(p.author)}" loading="lazy"></button>` : ''}<div class="post-tags"><button class="tag category-tag" data-category="${escape(p.category)}">${icon(categories.find(c => c[0] === p.category)?.[1])}${escape(p.category)}</button>${p.tags.map(t => `<span class="tag">${escape(t)}</span>`).join('')}</div><div class="post-footer"><div class="engagement"><div class="vote-group"><button class="${p.myVote === 1 ? 'voted' : ''}" data-vote="${p.id}" data-direction="1" aria-label="Votar positivamente" aria-pressed="${p.myVote === 1}">${icon('up')}</button><strong>${p.votes}</strong><button class="${p.myVote === -1 ? 'voted' : ''}" data-vote="${p.id}" data-direction="-1" aria-label="Votar negativamente" aria-pressed="${p.myVote === -1}">${icon('down')}</button></div><button class="reply-link" data-post="${p.id}">${icon('chat')} ${p.replies.length} <span>${p.replies.length === 1 ? 'resposta' : 'respostas'}</span></button><span class="views">${icon('eye')} ${p.views}</span></div><button class="save-button ${p.saved ? 'saved' : ''}" data-save="${p.id}" aria-label="${p.saved ? 'Remover dos salvos' : 'Salvar publicação'}" aria-pressed="${!!p.saved}">${icon('bookmark')}</button></div></article>`; }
function safeImage(image) { return /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(image) ? image : ''; }
function mainContent() {
  if (state.page === 'members') return `<div class="section-heading"><h2>Quem faz acontecer</h2><span>Comunidade demonstrativa</span></div><div class="member-grid">${['Rafael Costa', 'Mariana Oliveira', 'Lucas Mendes', 'Beatriz Santos', 'Pedro Henrique'].map((name, i) => `<button class="member-card" data-author="${name}">${avatar(name, ['mint', 'purple', 'peach', 'rose', 'blue'][i], true)}<h2>${name}</h2><span>${i < 2 ? 'Especialista' : 'Entusiasta'}</span><p>${[2450, 1820, 1250, 980, 760][i].toLocaleString('pt-BR')} pontos de reputação</p><span class="member-badge">${icon('trophy')} ${i < 2 ? 'Mestre do hardware' : 'Sempre por perto'}</span></button>`).join('')}</div>`;
  if (state.page === 'articles') return `<div class="article-list">${articles.map((a, i) => `<button class="knowledge-card" data-article="${i}"><span class="knowledge-icon">${icon(a.icon)}</span><span class="eyebrow">${a.label}</span><h2>${a.title}</h2><p>${a.body}</p><span class="text-link">Ler guia completo ${icon('arrow')}</span></button>`).join('')}</div>`;
  if (state.page === 'profile') return profileContent(state.user?.name || 'Visitante');
  return `<div class="composer"><span>${avatar(state.user?.name || 'Você')}</span><button data-action="new">Qual é o desafio do seu hardware hoje?</button><button class="icon-button" data-action="new" aria-label="Criar publicação com imagem">${icon('image')}</button></div><div class="feed-toolbar"><div class="feed-tabs" role="group" aria-label="Status das publicações">${[['all', 'Todas'], ['open', 'Em aberto'], ['resolved', 'Resolvidas'], ['unanswered', 'Sem resposta']].map(([key, label]) => `<button class="${state.status === key ? 'active' : ''}" data-status="${key}" aria-pressed="${state.status === key}">${label}</button>`).join('')}</div><label class="sort-control"><span class="sr-only">Ordenar publicações</span><select id="sort"><option value="recent" ${state.sort === 'recent' ? 'selected' : ''}>Mais recentes</option><option value="popular" ${state.sort === 'popular' ? 'selected' : ''}>Mais votadas</option></select></label></div><div class="filter-row"><label class="search-field">${icon('search')}<input id="search" type="search" placeholder="Buscar dúvidas, peças ou soluções..." aria-label="Buscar publicações" value="${escape(state.query)}"></label><label class="category-select"><span class="sr-only">Filtrar por categoria</span><select id="category">${categories.map(([name]) => `<option ${state.category === name ? 'selected' : ''}>${name}</option>`).join('')}</select></label></div><div id="posts" aria-live="polite">${postsContent()}</div>`;
}
function postsContent() { const posts = filterPosts(state.posts, { ...state, user: state.user?.name }); return `<div class="results-heading"><span>${state.category === categories[0][0] ? 'Conversas que conectam' : escape(state.category)}</span><span>${posts.length} ${posts.length === 1 ? 'publicação' : 'publicações'}</span></div>${posts.length ? posts.map(postCard).join('') : `<div class="empty-state">${icon('search')}<h2>${state.page === 'saved' ? 'Seu próximo aprendizado fica aqui' : 'Nenhuma publicação por aqui'}</h2><p>${state.page === 'saved' ? 'Toque no marcador de uma publicação para guardá-la.' : 'Experimente outros filtros ou comece uma nova conversa.'}</p><button class="button secondary" data-action="${state.page === 'saved' ? 'feed' : 'clear'}">${state.page === 'saved' ? 'Explorar a comunidade' : 'Limpar filtros'}</button></div>`}`; }
function rightRail() { return `<aside class="right-rail" aria-label="Destaques da comunidade"><section class="rail-card community-card"><div class="rail-heading"><h2>${icon('users')} Nosso circuito</h2><span class="live-pill"><i></i> Local</span></div><p>Gente que compartilha. Hardware que evolui.</p><div class="community-stats"><div><strong>${state.posts.length}</strong><span>publicações</span></div><div><strong>${state.posts.filter(p => p.status === 'resolved').length}</strong><span>resolvidas</span></div><div><strong>${new Set(state.posts.map(p => p.author)).size}</strong><span>membros</span></div></div><div class="community-note"><span class="online-dot"></span> Explore nossa comunidade de demonstração</div></section><section class="rail-card"><div class="rail-heading"><h2>${icon('bolt')} Em alta por aqui</h2></div><div class="trending">${[['01', 'Montando meu primeiro PC', 'Processadores'], ['02', 'De olho nas temperaturas', 'Placa de vídeo'], ['03', 'Mais velocidade, menos espera', 'Armazenamento']].map(([n, title, category]) => `<button data-category="${category}"><span>${n}</span><div><strong>${title}</strong><small>${category}</small></div>${icon('arrow')}</button>`).join('')}</div></section><section class="rail-card"><div class="rail-heading"><h2>${icon('trophy')} Quem faz a diferença</h2><span class="tiny-label">DESTAQUES</span></div>${[['Rafael Costa', 'mint', '2.450'], ['Mariana Oliveira', 'purple', '1.820'], ['Lucas Mendes', 'peach', '1.250']].map(([name, color, points], i) => `<button class="leader-row" data-author="${name}"><span class="rank">${i + 1}</span>${avatar(name, color)}<span><strong>${name}</strong><small>${points} pontos</small></span>${i === 0 ? '<span class="gold">' + icon('trophy') + '</span>' : ''}</button>`).join('')}<button class="rail-link" data-page="members">Conheça a comunidade ${icon('arrow')}</button></section><section class="tip-card"><div class="tip-art">${icon('fan')}<span>DICA DO CIRCUITO</span></div><div class="tip-content"><h2>Seu setup está<br>respirando bem?</h2><p>Pequenos ajustes no airflow fazem uma grande diferença.</p><button data-article="0">Confira o guia ${icon('arrow')}</button></div></section><div class="rail-bottom">Um espaço para aprender e ajudar.<br><span>Respeito é parte do nosso circuito.</span></div></aside>`; }
function bindFeed() {
  document.querySelector('#search')?.addEventListener('input', e => { state.query = e.target.value; document.querySelector('#posts').innerHTML = postsContent(); });
  document.querySelector('#sort')?.addEventListener('change', e => { state.sort = e.target.value; document.querySelector('#posts').innerHTML = postsContent(); });
  document.querySelector('#category')?.addEventListener('change', e => { state.category = e.target.value; render(); });
}
function showModal(content) { returnFocus = document.activeElement; modal.innerHTML = `<button class="modal-close icon-button" data-action="close" aria-label="Fechar janela">${icon('close')}</button>${content}`; if (!modal.open) modal.showModal(); }
modal.addEventListener('close', () => { if (returnFocus?.isConnected) returnFocus.focus(); });
modal.addEventListener('click', e => { if (e.target === modal) { const bounds = modal.getBoundingClientRect(); if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) modal.close(); } });
function auth(mode = 'login') {
  if (mode === 'register') {
    modal.close();
    state.page = 'register';
    render();
    window.scrollTo(0, 0);
    document.querySelector('#main')?.focus({ preventScroll: true });
    return;
  }
  showModal(`<div class="modal-eyebrow">BEM-VINDO AO CIRCUITO</div><h2 id="modal-title">${mode === 'login' ? 'Bom ter você por aqui.' : 'Faça parte da conversa.'}</h2><p class="muted">Perfil demonstrativo, salvo apenas neste navegador. A API ainda não possui autenticação.</p><form id="auth-form" class="form-stack"><label>Seu nome<input name="name" autocomplete="name" placeholder="Como podemos chamar você?" required minlength="2" maxlength="70"></label><label>E-mail<input type="email" name="email" autocomplete="email" placeholder="voce@exemplo.com" required maxlength="120"></label><button class="button primary" type="submit">${mode === 'login' ? 'Entrar na demonstração' : 'Criar perfil de demonstração'} ${icon('arrow')}</button></form><button class="auth-switch" data-auth="${mode === 'login' ? 'register' : 'login'}">${mode === 'login' ? 'Primeira vez aqui? Crie seu perfil' : 'Já tem um perfil? Entrar'}</button>`);
  document.querySelector('#auth-form').onsubmit = e => { e.preventDefault(); const data = new FormData(e.target); const name = data.get('name').trim(); if (name.length < 2) return; state.user = { name, email: data.get('email').trim() }; persist(); modal.close(); render(); toast('Seu perfil de demonstração está pronto!'); };
}
function requireUser() { if (state.user) return true; auth(); return false; }
function newPost() {
  if (!requireUser()) return;
  showModal(`<div class="modal-eyebrow">CONHECIMENTO COMEÇA COM UMA PERGUNTA</div><h2 id="modal-title">O que está acontecendo?</h2><p class="muted">Conte os detalhes. A comunidade ajuda a conectar as peças.</p><form class="form-stack" id="post-form"><label>Título da publicação<input name="title" placeholder="Ex.: Meu computador liga, mas não dá vídeo" required minlength="10" maxlength="160"></label><label>Categoria<select name="category">${categories.slice(1).map(([name]) => `<option>${name}</option>`).join('')}</select></label><label for="post-description">Descreva seu problema ou compartilhe uma solução<span class="editor-toolbar"><button type="button" data-format="bold" aria-label="Inserir texto em negrito"><strong>B</strong></button><button type="button" data-format="code" aria-label="Inserir código">&lt;/&gt;</button><span>**negrito** e &#96;código&#96;</span></span><textarea id="post-description" aria-label="Descreva seu problema ou compartilhe uma solução" name="description" rows="6" placeholder="Inclua seu setup, o que aconteceu e o que você já tentou..." required minlength="20" maxlength="10000"></textarea></label><label>Tags <span class="muted">(separadas por vírgula, até 4)</span><input name="tags" placeholder="Ex.: BIOS, RTX 4060, Windows" maxlength="120"></label><label class="upload-label">${icon('image')} Adicionar foto do hardware <small>PNG, JPG, WebP ou GIF · até 2 MB</small><input type="file" name="image" accept="image/png,image/jpeg,image/webp,image/gif"></label><div id="image-preview"></div><p id="form-error" class="form-error" role="alert"></p><div class="form-footer"><span>Publicação salva neste navegador</span><button type="submit" class="button primary">Publicar ${icon('arrow')}</button></div></form>`);
  let attachment = ''; let reading = false;
  document.querySelector('[name=image]').onchange = async e => {
    const file = e.target.files[0]; attachment = ''; document.querySelector('#image-preview').innerHTML = ''; document.querySelector('#form-error').textContent = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 2 * 1024 * 1024) { e.target.value = ''; document.querySelector('#form-error').textContent = 'Escolha uma imagem PNG, JPG, WebP ou GIF com até 2 MB.'; return; }
    reading = true;
    try { attachment = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); if (modal.open && document.querySelector('#image-preview')) document.querySelector('#image-preview').innerHTML = `<img src="${safeImage(attachment)}" alt="Prévia do anexo"><button type="button" id="remove-image">Remover imagem</button>`; document.querySelector('#remove-image')?.addEventListener('click', () => { attachment = ''; document.querySelector('[name=image]').value = ''; document.querySelector('#image-preview').innerHTML = ''; }); }
    catch { document.querySelector('#form-error').textContent = 'Não foi possível ler a imagem. Tente outro arquivo.'; } finally { reading = false; }
  };
  document.querySelector('#post-form').onsubmit = e => { e.preventDefault(); if (reading) { document.querySelector('#form-error').textContent = 'Aguarde a imagem terminar de carregar.'; return; } const data = new FormData(e.target); if (data.get('title').trim().length < 10 || data.get('description').trim().length < 20) { document.querySelector('#form-error').textContent = 'Escreva pelo menos 10 caracteres no título e 20 na descrição.'; return; } state.posts.unshift({ id: crypto.randomUUID(), author: state.user.name, color: 'mint', role: 'Membro', time: 'agora', title: data.get('title').trim(), description: data.get('description').trim(), category: data.get('category'), tags: data.get('tags').split(',').map(t => t.trim()).filter(Boolean).slice(0, 4), image: attachment, votes: 0, views: 0, status: 'open', created: Date.now(), replies: [] }); persist(); state.page = 'feed'; state.category = categories[0][0]; state.status = 'all'; state.query = ''; modal.close(); render(); toast('Publicação criada. Vamos conectar soluções!'); };
}
function detail(id) {
  const p = state.posts.find(p => p.id === id); if (!p) return;
  showModal(`<div class="modal-eyebrow">${escape(p.category)} · ${p.status === 'resolved' ? 'RESOLVIDO' : 'EM ABERTO'}</div><h2 id="modal-title">${escape(p.title)}</h2><div class="detail-author">${avatar(p.author, p.color)}<span><strong>${escape(p.author)}</strong><small>${escape(p.time)}</small></span></div><div class="detail-body">${rich(p.description)}</div>${p.image ? `<img class="detail-image" src="${safeImage(p.image)}" alt="Hardware anexado à publicação">` : ''}<div class="answers-heading"><h3>${p.replies.length} ${p.replies.length === 1 ? 'resposta' : 'respostas'}</h3><span>Ajude com respeito e clareza.</span></div>${p.replies.map(r => `<article class="answer ${r.accepted ? 'accepted' : ''}"><div class="answer-author">${avatar(r.author)}<strong>${escape(r.author)}</strong>${r.accepted ? '<span class="accepted-label">' + icon('check') + ' Solução aceita</span>' : ''}</div><p>${rich(r.body)}</p><div class="answer-actions"><button data-reply-vote="${r.id}" data-post-id="${p.id}" data-direction="1" aria-label="Votar positivamente na resposta" aria-pressed="${r.myVote === 1}" class="${r.myVote === 1 ? 'voted' : ''}">${icon('up')} ${r.votes}</button><button data-reply-vote="${r.id}" data-post-id="${p.id}" data-direction="-1" aria-label="Votar negativamente na resposta" aria-pressed="${r.myVote === -1}">${icon('down')}</button>${state.user?.name === p.author ? `<button data-accept="${r.id}" data-post-id="${p.id}">${icon('check')}${r.accepted ? 'Desmarcar solução' : 'Aceitar solução'}</button>` : ''}</div></article>`).join('') || '<p class="muted">Esta conversa está esperando a primeira contribuição. Que tal ajudar?</p>'}<form id="reply-form" class="form-stack"><label for="reply-body">Sua contribuição<textarea id="reply-body" name="body" rows="3" placeholder="Compartilhe uma ideia ou os próximos passos do diagnóstico..." required minlength="10" maxlength="5000"></textarea></label><button class="button primary" type="submit">${icon('chat')} Enviar resposta</button></form>`);
  document.querySelector('#reply-form').onsubmit = e => { e.preventDefault(); if (!requireUser()) return; const body = new FormData(e.target).get('body').trim(); if (body.length < 10) { toast('Escreva uma resposta com pelo menos 10 caracteres.'); return; } p.replies.push({ id: crypto.randomUUID(), author: state.user.name, body, votes: 0 }); persist(); render(); detail(id); toast('Resposta publicada. Obrigado por contribuir!'); };
}
function profileContent(name) {
  const own = state.posts.filter(p => p.author === name); const replies = state.posts.flatMap(p => p.replies).filter(r => r.author === name); const accepted = replies.filter(r => r.accepted).length;
  return `<section class="profile-card">${avatar(name, 'mint', true)}<h2>${escape(name)}</h2><p>${escape(state.user?.name === name && state.user.level ? state.user.level : 'Membro da comunidade Circuito')}</p>${state.user?.name === name && state.user.interests?.length ? `<div class="profile-interests">${state.user.interests.map(interest => `<span>${escape(interest)}</span>`).join('')}</div>` : ''}<div class="profile-stats"><div><strong>${own.length}</strong>publicações</div><div><strong>${replies.length}</strong>respostas</div><div><strong>${accepted}</strong>soluções aceitas</div></div><div class="profile-badges"><span>${icon('users')} Conectado à comunidade</span>${replies.length ? `<span>${icon('bolt')} Conhecimento compartilhado</span>` : ''}${accepted ? `<span>${icon('trophy')} Resolveu o circuito</span>` : ''}</div>${state.user?.name === name ? '<button class="button secondary" data-action="logout">Sair do perfil de demonstração</button>' : ''}</section><h3 class="history-title">Últimas contribuições</h3>${own.map(postCard).join('') || '<div class="empty-state"><p>As publicações deste membro aparecerão aqui.</p></div>'}${replies.length ? `<h3 class="history-title">Respostas compartilhadas</h3>${state.posts.filter(p => p.replies.some(r => r.author === name)).map(p => `<button class="history-answer" data-post="${p.id}"><strong>${escape(p.title)}</strong><p>${escape(p.replies.find(r => r.author === name).body)}</p><span class="text-link">Ver conversa ${icon('arrow')}</span></button>`).join('')}` : ''}`;
}
document.addEventListener('click', e => {
  const button = e.target.closest('button, a.brand'); if (!button) return;
  if (button.matches('a.brand')) { e.preventDefault(); state.page = 'feed'; render(); return; }
  const d = button.dataset;
  if (d.page) { state.page = d.page; state.query = ''; state.category = categories[0][0]; state.status = 'all'; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (d.category) { state.category = d.category; state.page = 'feed'; render(); return; }
  if (d.status) { state.status = d.status; render(); return; }
  if (d.post) { detail(d.post); return; }
  if (d.save) { const p = state.posts.find(p => p.id === d.save); p.saved = !p.saved; persist(); render(); toast(p.saved ? 'Publicação guardada nos seus itens salvos.' : 'Publicação removida dos salvos.'); return; }
  if (d.vote) { if (!requireUser()) return; setVote(state.posts.find(p => p.id === d.vote), Number(d.direction)); persist(); render(); return; }
  if (d.replyVote) { if (!requireUser()) return; const p = state.posts.find(p => p.id === d.postId); setVote(p.replies.find(r => r.id === d.replyVote), Number(d.direction)); persist(); render(); detail(p.id); return; }
  if (d.accept) { const p = state.posts.find(p => p.id === d.postId); if (state.user?.name !== p.author) return; const answer = p.replies.find(r => r.id === d.accept); const accepted = !answer.accepted; p.replies.forEach(r => r.accepted = false); answer.accepted = accepted; p.status = accepted ? 'resolved' : 'open'; persist(); render(); detail(p.id); return; }
  if (d.author) { showModal(`<h2 id="modal-title">Perfil da comunidade</h2>${profileContent(d.author)}`); return; }
  if (d.article !== undefined) { const a = articles[Number(d.article)]; showModal(`<div class="modal-eyebrow">${a.label}</div><h2 id="modal-title">${a.title}</h2><div class="article-hero">${icon(a.icon)}</div><p class="detail-body">${a.body}</p><p class="muted">Guia introdutório da comunidade Circuito. Consulte sempre a documentação dos seus componentes.</p>`); return; }
  if (d.auth) { auth(d.auth); return; }
  if (d.format) { const textarea = document.querySelector('[name=description]'); const marker = d.format === 'bold' ? '**' : '`'; const start = textarea.selectionStart; const end = textarea.selectionEnd; textarea.setRangeText(marker + (textarea.value.slice(start, end) || 'seu texto') + marker, start, end, 'select'); textarea.focus(); return; }
  switch (d.action) {
    case 'new': newPost(); break;
    case 'close': modal.close(); break;
    case 'menu': { const open = document.querySelector('#sidebar').classList.toggle('mobile-open'); button.setAttribute('aria-expanded', String(open)); break; }
    case 'profile': if (!requireUser()) return; state.page = 'profile'; render(); break;
    case 'logout': state.user = null; persist(); modal.close(); state.page = 'feed'; render(); toast('Você saiu do perfil de demonstração.'); break;
    case 'clear': state.query = ''; state.status = 'all'; state.category = categories[0][0]; render(); break;
    case 'feed': state.page = 'feed'; render(); break;
    case 'notifications': state.unread = false; render(); showModal(`<div class="modal-eyebrow">ACOMPANHE AS CONEXÕES</div><h2 id="modal-title">Suas notificações</h2><div class="notification-item">${icon('users')}<div><strong>Bem-vindo ao Circuito!</strong><p>Explore as conversas, salve conteúdos e compartilhe seu conhecimento.</p><small>Mensagem de boas-vindas da demonstração</small></div></div><p class="muted">Notificações de respostas e votos em tempo real estarão disponíveis com a integração do backend.</p>`); break;
    case 'about': showModal('<div class="modal-eyebrow">CONECTE. RESOLVA. EVOLUA.</div><h2 id="modal-title">Hardware se aprende em comunidade.</h2><p class="detail-body">O Circuito é um espaço para tirar dúvidas, compartilhar diagnósticos e encontrar soluções com outras pessoas. Seja gentil, explique seus testes e valorize quem ajuda.</p><p class="muted">Esta versão usa dados demonstrativos e armazenamento local. Os perfis não autenticam usuários, e as interações não são compartilhadas entre dispositivos.</p><button class="button secondary" data-action="reset-demo">Restaurar demonstração</button>' + (demoBackup ? '<button class="button secondary" data-action="undo-reset">Desfazer restauração</button>' : '')); break;
    case 'reset-demo': demoBackup = { posts: structuredClone(state.posts), user: state.user }; state.posts = structuredClone(initialPosts); state.user = null; state.page = 'feed'; state.category = categories[0][0]; state.query = ''; state.status = 'all'; persist(); modal.close(); render(); toast('Demonstração restaurada. Você pode desfazer em Sobre a comunidade até recarregar a página.'); break;
    case 'undo-reset': if (demoBackup) { state.posts = demoBackup.posts; state.user = demoBackup.user; demoBackup = null; persist(); modal.close(); render(); toast('Seus dados foram recuperados.'); } break;
  }
});
render();
