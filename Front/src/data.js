export const categories = [
  ['Todas as categorias', 'grid'], ['Placa de vídeo', 'gpu'], ['Processadores', 'cpu'], ['Memória RAM', 'memory'], ['Armazenamento', 'drive'], ['Redes', 'wifi'], ['Periféricos', 'mouse'], ['Outros', 'box']
];
export const initialPosts = [
  { id: 'p1', author: 'Lucas Mendes', initials: 'LM', color: 'peach', role: 'Entusiasta', time: 'há 12 minutos', title: 'RTX 4060 com temperatura alta em jogos. É normal?', description: 'Fala, pessoal! Minha RTX 4060 está chegando a 85 °C jogando Cyberpunk 2077. Já limpei o gabinete e conferi as ventoinhas, mas a temperatura continua alta. Alguém já passou por isso?', category: 'Placa de vídeo', tags: ['RTX 4060', 'Temperatura', 'NVIDIA'], votes: 24, views: 128, status: 'open', created: 6, replies: [ { id: 'r1', author: 'Rafael Costa', body: 'Confira o fluxo de ar do gabinete e a curva das ventoinhas. Compare a temperatura com a tampa lateral aberta; isso ajuda a identificar restrição de ventilação.', votes: 8 } ] },
  { id: 'p2', author: 'Mariana Oliveira', initials: 'MO', color: 'purple', role: 'Especialista', time: 'há 38 minutos', title: 'Resolvido: PC não reconhecia o SSD NVMe após atualização da BIOS', description: 'Compartilhando a solução para quem estiver com o mesmo problema: após atualizar a BIOS da B550, meu SSD simplesmente sumiu. O ajuste estava no modo de configuração do armazenamento.', category: 'Armazenamento', tags: ['SSD NVMe', 'BIOS', 'B550'], votes: 42, views: 246, status: 'resolved', created: 5, replies: [ { id: 'r2', author: 'Mariana Oliveira', body: 'No meu caso, restaurar a configuração anterior do controlador na BIOS resolveu. Anote as configurações antes de atualizar e consulte o manual da placa-mãe; mudar o modo do controlador pode impedir a inicialização do sistema.', votes: 19, accepted: true } ] },
  { id: 'p3', author: 'Pedro Henrique', initials: 'PH', color: 'blue', role: 'Membro', time: 'há 1 hora', title: 'Ryzen 7 5700X ou Ryzen 5 7600 para um upgrade?', description: 'Quero atualizar meu setup para trabalhar com edição e jogar no tempo livre. Vale aproveitar minha placa AM4 ou investir na plataforma AM5? Meu orçamento é de R$ 2.500 para o kit.', category: 'Processadores', tags: ['AMD', 'Upgrade', 'AM4 vs AM5'], votes: 16, views: 94, status: 'open', created: 4, replies: [] },
  { id: 'p4', author: 'Beatriz Santos', initials: 'BS', color: 'rose', role: 'Entusiasta', time: 'há 2 horas', title: 'Wi-Fi desconecta apenas no notebook, mesmo perto do roteador', description: 'Os outros dispositivos funcionam normalmente. Já reinstalei o driver e reiniciei o roteador. O notebook perde a conexão a cada 20 minutos. O que mais posso testar?', category: 'Redes', tags: ['Wi-Fi', 'Notebook', 'Drivers'], votes: 9, views: 63, status: 'open', created: 3, replies: [] },
  { id: 'p5', author: 'Rafael Costa', initials: 'RC', color: 'mint', role: 'Especialista', time: 'há 3 horas', title: 'Checklist: como diagnosticar problemas de memória RAM', description: 'Antes de trocar os pentes, teste um módulo de cada vez, consulte os slots recomendados no manual e execute um diagnóstico de memória. Deixei o passo a passo nas respostas.', category: 'Memória RAM', tags: ['Diagnóstico', 'RAM', 'Dica'], votes: 35, views: 312, status: 'resolved', created: 2, replies: [ { id: 'r3', author: 'Rafael Costa', body: 'Desligue o computador e desconecte a energia antes de manusear componentes. Teste um módulo por vez com as configurações padrão da BIOS, usando a ferramenta de diagnóstico de memória do sistema.', votes: 12, accepted: true } ] }
];
export const articles = [
  { title: 'Seu setup está respirando bem?', label: 'GUIA RÁPIDO', icon: 'fan', body: 'Mantenha entradas e saídas de ar livres, retire a poeira com o equipamento desligado e consulte as temperaturas de operação indicadas pelo fabricante. Compare as temperaturas antes e depois de cada ajuste para identificar o que realmente ajuda.' },
  { title: 'Antes do upgrade, confira estes 5 pontos', label: 'HARDWARE SEM MISTÉRIO', icon: 'cpu', body: 'Confira o soquete do processador, a compatibilidade da BIOS, o padrão da memória, os conectores e a potência recomendada da fonte, além do espaço físico do gabinete. Use os manuais dos fabricantes para validar as peças do seu setup.' },
  { title: 'SSD SATA ou NVMe: entenda a diferença', label: 'APRENDA EM 3 MINUTOS', icon: 'drive', body: 'SATA e NVMe usam interfaces diferentes. Nem todo slot M.2 aceita os dois padrões: confira o manual da placa-mãe, o tamanho do módulo e o protocolo suportado antes de instalar. A escolha também depende do seu uso e da compatibilidade do equipamento.' }
];
export function filterPosts(posts, { query = '', category = 'Todas as categorias', status = 'all', page = 'feed', user = '', sort = 'recent' } = {}) {
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return posts.filter(p => (category === 'Todas as categorias' || p.category === category)
    && (status === 'all' || (status === 'unanswered' ? p.replies.length === 0 : p.status === status))
    && (page !== 'saved' || p.saved) && (page !== 'mine' || p.author === user)
    && normalize([p.title, p.description, ...p.tags].join(' ')).includes(normalize(query)))
    .sort((a, b) => sort === 'popular' ? b.votes - a.votes : b.created - a.created);
}
export function setVote(item, direction) {
  const previous = item.myVote || 0;
  item.myVote = previous === direction ? 0 : direction;
  item.votes += item.myVote - previous;
}
