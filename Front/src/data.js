export const categories = [
  ['Todas as categorias', 'grid'], ['Placa de vídeo', 'gpu'], ['Processadores', 'cpu'], ['Memória RAM', 'memory'], ['Armazenamento', 'drive'], ['Redes', 'wifi'], ['Periféricos', 'mouse'], ['Outros', 'box']
];
// Amostra no formato do front, usada apenas pelos testes de regras (filtros e votos).
// Os dados reais da comunidade vêm da API (/api/posts) e passam por toPost().
export const initialPosts = [
  { id: 'p1', author: 'Lucas Mendes', initials: 'LM', color: 'peach', role: 'Entusiasta', time: 'há 12 minutos', title: 'RTX 4060 com temperatura alta em jogos. É normal?', description: 'Fala, pessoal! Minha RTX 4060 está chegando a 85 °C jogando Cyberpunk 2077. Já limpei o gabinete e conferi as ventoinhas, mas a temperatura continua alta. Alguém já passou por isso?', category: 'Placa de vídeo', tags: ['RTX 4060', 'Temperatura', 'NVIDIA'], votes: 24, views: 128, status: 'open', created: 6, replies: [ { id: 'r1', author: 'Rafael Costa', body: 'Confira o fluxo de ar do gabinete e a curva das ventoinhas. Compare a temperatura com a tampa lateral aberta; isso ajuda a identificar restrição de ventilação.', votes: 8 } ] },
  { id: 'p2', author: 'Mariana Oliveira', initials: 'MO', color: 'purple', role: 'Especialista', time: 'há 38 minutos', title: 'Resolvido: PC não reconhecia o SSD NVMe após atualização da BIOS', description: 'Compartilhando a solução para quem estiver com o mesmo problema: após atualizar a BIOS da B550, meu SSD simplesmente sumiu. O ajuste estava no modo de configuração do armazenamento.', category: 'Armazenamento', tags: ['SSD NVMe', 'BIOS', 'B550'], votes: 42, views: 246, status: 'resolved', created: 5, replies: [ { id: 'r2', author: 'Mariana Oliveira', body: 'No meu caso, restaurar a configuração anterior do controlador na BIOS resolveu. Anote as configurações antes de atualizar e consulte o manual da placa-mãe; mudar o modo do controlador pode impedir a inicialização do sistema.', votes: 19, accepted: true } ] },
  { id: 'p3', author: 'Pedro Henrique', initials: 'PH', color: 'blue', role: 'Membro', time: 'há 1 hora', title: 'Ryzen 7 5700X ou Ryzen 5 7600 para um upgrade?', description: 'Quero atualizar meu setup para trabalhar com edição e jogar no tempo livre. Vale aproveitar minha placa AM4 ou investir na plataforma AM5? Meu orçamento é de R$ 2.500 para o kit.', category: 'Processadores', tags: ['AMD', 'Upgrade', 'AM4 vs AM5'], votes: 16, views: 94, status: 'open', created: 4, replies: [] },
  { id: 'p4', author: 'Beatriz Santos', initials: 'BS', color: 'rose', role: 'Entusiasta', time: 'há 2 horas', title: 'Wi-Fi desconecta apenas no notebook, mesmo perto do roteador', description: 'Os outros dispositivos funcionam normalmente. Já reinstalei o driver e reiniciei o roteador. O notebook perde a conexão a cada 20 minutos. O que mais posso testar?', category: 'Redes', tags: ['Wi-Fi', 'Notebook', 'Drivers'], votes: 9, views: 63, status: 'open', created: 3, replies: [] },
  { id: 'p5', author: 'Rafael Costa', initials: 'RC', color: 'mint', role: 'Especialista', time: 'há 3 horas', title: 'Checklist: como diagnosticar problemas de memória RAM', description: 'Antes de trocar os pentes, teste um módulo de cada vez, consulte os slots recomendados no manual e execute um diagnóstico de memória. Deixei o passo a passo nas respostas.', category: 'Memória RAM', tags: ['Diagnóstico', 'RAM', 'Dica'], votes: 35, views: 312, status: 'resolved', created: 2, replies: [ { id: 'r3', author: 'Rafael Costa', body: 'Desligue o computador e desconecte a energia antes de manusear componentes. Teste um módulo por vez com as configurações padrão da BIOS, usando a ferramenta de diagnóstico de memória do sistema.', votes: 12, accepted: true } ] }
];
// `extraIds` reúne resultados da busca TF-IDF da API (ex.: texto da solução aceita)
// que o filtro local por título/descrição/tags não alcança.
export function filterPosts(posts, { query = '', category = 'Todas as categorias', status = 'all', page = 'feed', user = '', userId, sort = 'recent', extraIds } = {}) {
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const mine = p => userId !== undefined && p.authorId !== undefined ? p.authorId === userId : p.author === user;
  return posts.filter(p => (category === 'Todas as categorias' || p.category === category)
    && (status === 'all' || (status === 'unanswered' ? p.replies.length === 0 : p.status === status))
    && (page !== 'saved' || p.saved) && (page !== 'mine' || mine(p))
    && (normalize([p.title, p.description, ...p.tags].join(' ')).includes(normalize(query)) || Boolean(query.trim() && extraIds?.has(p.id))))
    .sort((a, b) => sort === 'popular' ? b.votes - a.votes : b.created - a.created);
}
export function relativeTime(iso, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  const plural = (value, unit) => `há ${value} ${unit}${value === 1 ? '' : 's'}`;
  if (seconds < 60) return 'agora';
  if (seconds < 3600) return plural(Math.floor(seconds / 60), 'minuto');
  if (seconds < 86400) return plural(Math.floor(seconds / 3600), 'hora');
  if (seconds < 2592000) return plural(Math.floor(seconds / 86400), 'dia');
  return new Date(iso).toLocaleDateString('pt-BR');
}
// Converte as respostas da API para o formato usado pelos componentes de renderização.
export function toReply(reply) {
  return { id: reply.id, author: reply.author.name, authorId: reply.author.id, color: reply.author.color, body: reply.body, votes: reply.score, accepted: reply.accepted, myVote: reply.myVote, created: Date.parse(reply.createdAt) };
}
export function toPost(post) {
  return {
    id: post.id, authorId: post.author.id, author: post.author.name, role: post.author.role, color: post.author.color,
    time: relativeTime(post.createdAt), created: Date.parse(post.createdAt), title: post.title, description: post.description,
    category: post.category.name, tags: post.tags, image: post.image || '', votes: post.score, views: post.views,
    status: post.status, saved: post.saved, myVote: post.myVote, replies: post.replies.map(toReply)
  };
}
export function setVote(item, direction) {
  const previous = item.myVote || 0;
  item.myVote = previous === direction ? 0 : direction;
  item.votes += item.myVote - previous;
}
