"use strict";

const config = require("./config");

const SEED_EMAIL_DOMAIN = "seed.circuito.example";

const MEMBERS = [
  { name: "Lucas Mendes", role: "Entusiasta", color: "peach", level: "Entusiasta de hardware" },
  { name: "Mariana Oliveira", role: "Especialista", color: "purple", level: "Trabalho com tecnologia" },
  { name: "Pedro Henrique", role: "Membro", color: "blue", level: "Estou começando" },
  { name: "Beatriz Santos", role: "Entusiasta", color: "rose", level: "Entusiasta de hardware" },
  { name: "Rafael Costa", role: "Especialista", color: "mint", level: "Trabalho com tecnologia" },
].map((member) => ({
  ...member,
  email: `${member.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, ".")}@${SEED_EMAIL_DOMAIN}`,
  interests: [],
}));

const CATEGORIES = [
  ["Placa de vídeo", "gpu"], ["Processadores", "cpu"], ["Memória RAM", "memory"], ["Armazenamento", "drive"],
  ["Redes", "wifi"], ["Periféricos", "mouse"], ["Outros", "box"],
].map(([name, icon]) => ({ name, icon, description: `Conversas sobre ${name.toLowerCase()}.` }));

const ARTICLES = [
  { title: "Seu setup está respirando bem?", label: "GUIA RÁPIDO", icon: "fan", body: "Mantenha entradas e saídas de ar livres, retire a poeira com o equipamento desligado e consulte as temperaturas de operação indicadas pelo fabricante. Compare as temperaturas antes e depois de cada ajuste para identificar o que realmente ajuda." },
  { title: "Antes do upgrade, confira estes 5 pontos", label: "HARDWARE SEM MISTÉRIO", icon: "cpu", body: "Confira o soquete do processador, a compatibilidade da BIOS, o padrão da memória, os conectores e a potência recomendada da fonte, além do espaço físico do gabinete. Use os manuais dos fabricantes para validar as peças do seu setup." },
  { title: "SSD SATA ou NVMe: entenda a diferença", label: "APRENDA EM 3 MINUTOS", icon: "drive", body: "SATA e NVMe usam interfaces diferentes. Nem todo slot M.2 aceita os dois padrões: confira o manual da placa-mãe, o tamanho do módulo e o protocolo suportado antes de instalar. A escolha também depende do seu uso e da compatibilidade do equipamento." },
];

// Publicações exibidas na demonstração do front (mesmo conteúdo do protótipo local).
// minutesAgo posiciona as datas relativamente ao momento do primeiro seed.
const CURATED_POSTS = [
  { author: "Lucas Mendes", category: "Placa de vídeo", minutesAgo: 12, score: 24, views: 128, tags: ["RTX 4060", "Temperatura", "NVIDIA"],
    title: "RTX 4060 com temperatura alta em jogos. É normal?",
    description: "Fala, pessoal! Minha RTX 4060 está chegando a 85 °C jogando Cyberpunk 2077. Já limpei o gabinete e conferi as ventoinhas, mas a temperatura continua alta. Alguém já passou por isso?",
    replies: [{ author: "Rafael Costa", score: 8, accepted: false, body: "Confira o fluxo de ar do gabinete e a curva das ventoinhas. Compare a temperatura com a tampa lateral aberta; isso ajuda a identificar restrição de ventilação." }] },
  { author: "Mariana Oliveira", category: "Armazenamento", minutesAgo: 38, score: 42, views: 246, tags: ["SSD NVMe", "BIOS", "B550"],
    title: "Resolvido: PC não reconhecia o SSD NVMe após atualização da BIOS",
    description: "Compartilhando a solução para quem estiver com o mesmo problema: após atualizar a BIOS da B550, meu SSD simplesmente sumiu. O ajuste estava no modo de configuração do armazenamento.",
    replies: [{ author: "Mariana Oliveira", score: 19, accepted: true, body: "No meu caso, restaurar a configuração anterior do controlador na BIOS resolveu. Anote as configurações antes de atualizar e consulte o manual da placa-mãe; mudar o modo do controlador pode impedir a inicialização do sistema." }] },
  { author: "Pedro Henrique", category: "Processadores", minutesAgo: 60, score: 16, views: 94, tags: ["AMD", "Upgrade", "AM4 vs AM5"],
    title: "Ryzen 7 5700X ou Ryzen 5 7600 para um upgrade?",
    description: "Quero atualizar meu setup para trabalhar com edição e jogar no tempo livre. Vale aproveitar minha placa AM4 ou investir na plataforma AM5? Meu orçamento é de R$ 2.500 para o kit.",
    replies: [] },
  { author: "Beatriz Santos", category: "Redes", minutesAgo: 120, score: 9, views: 63, tags: ["Wi-Fi", "Notebook", "Drivers"],
    title: "Wi-Fi desconecta apenas no notebook, mesmo perto do roteador",
    description: "Os outros dispositivos funcionam normalmente. Já reinstalei o driver e reiniciei o roteador. O notebook perde a conexão a cada 20 minutos. O que mais posso testar?",
    replies: [] },
  { author: "Rafael Costa", category: "Memória RAM", minutesAgo: 180, score: 35, views: 312, tags: ["Diagnóstico", "RAM", "Dica"],
    title: "Checklist: como diagnosticar problemas de memória RAM",
    description: "Antes de trocar os pentes, teste um módulo de cada vez, consulte os slots recomendados no manual e execute um diagnóstico de memória. Deixei o passo a passo nas respostas.",
    replies: [{ author: "Rafael Costa", score: 12, accepted: true, body: "Desligue o computador e desconecte a energia antes de manusear componentes. Teste um módulo por vez com as configurações padrão da BIOS, usando a ferramenta de diagnóstico de memória do sistema." }] },
];

// Massa para demonstrar a busca TF-IDF em volume (padrão: 5000 publicações).
const SCENARIOS = [
  ["Placa de vídeo", "Placa de vídeo com temperatura alta durante jogos", "A temperatura da GPU passa de 85 °C e a ventoinha fica no máximo.", "Melhorar o fluxo de ar do gabinete e ajustar a curva das ventoinhas da placa de vídeo.", ["GPU", "Temperatura", "Ventoinhas"]],
  ["Processadores", "Processador reduz o desempenho sob carga pesada", "O clock cai depois de alguns minutos de renderização e o sistema perde desempenho.", "Reaplicar pasta térmica e revisar o cooler do processador para evitar throttling.", ["CPU", "Throttling", "Cooler"]],
  ["Memória RAM", "Computador reinicia depois de trocar os pentes de memória RAM", "Após instalar novos módulos, o computador trava e reinicia sem aviso.", "Testar um módulo por vez, usar os slots do manual e executar o diagnóstico de memória.", ["RAM", "Diagnóstico", "BIOS"]],
  ["Armazenamento", "SSD NVMe não aparece na BIOS depois da atualização", "O disco sumiu da lista de armazenamento e o sistema não inicia.", "Restaurar o modo do controlador de armazenamento na BIOS e conferir o slot M.2.", ["SSD", "NVMe", "BIOS"]],
  ["Redes", "Wi-Fi desconecta a cada poucos minutos no notebook", "O notebook perde a conexão mesmo perto do roteador enquanto outros aparelhos funcionam.", "Atualizar o driver do adaptador Wi-Fi e desativar a economia de energia da placa de rede.", ["Wi-Fi", "Notebook", "Drivers"]],
  ["Periféricos", "Mouse com duplo clique indesejado", "Cada clique é registrado duas vezes e atrapalha jogos e edição de texto.", "Limpar o micro switch, atualizar o firmware do mouse e ajustar a velocidade de clique.", ["Mouse", "Clique", "Firmware"]],
  ["Outros", "Fonte barulhenta ao ligar o computador", "Ruído agudo ao iniciar e oscilação de energia durante o uso.", "Limpar a poeira, conferir os cabos da fonte e substituir o ventilador se o ruído persistir.", ["Fonte", "Ruído", "Energia"]],
].map(([category, title, problem, solution, tags]) => ({ category, title, problem, solution, tags }));

const BULK_MEMBER_COUNT = 20;
const bulkMember = (index) => ({
  name: `Membro Seed ${index}`, email: `membro${index}@${config.fillerEmailDomain}`, role: "Membro", color: "mint", interests: [],
});

function seedCount(value = process.env.SEED_COUNT ?? "5000") {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 1 || count > 100000) throw new Error("SEED_COUNT deve ser um inteiro entre 1 e 100000.");
  return count;
}

const bulkTitle = (index) => `${SCENARIOS[index % SCENARIOS.length].title} (caso ${String(index + 1).padStart(6, "0")})`;

// Dados determinísticos da publicação número `index` (0-based) da massa.
function bulkPostData(index, authors, categoriesByName) {
  const scenario = SCENARIOS[index % SCENARIOS.length];
  const resolved = index % 2 === 0;
  const author = authors[index % authors.length];
  const helper = authors[(index + 1) % authors.length];
  const createdAt = new Date(Date.UTC(2026, 0, 1) + index * 60000);
  const replies = [];
  if (resolved) replies.push({ authorId: helper.id, body: scenario.solution, accepted: true, score: index % 9, createdAt: new Date(createdAt.getTime() + 30000) });
  else if (index % 3 === 1) replies.push({ authorId: helper.id, body: `Tente isolar o problema: ${scenario.problem} Registre o que mudou antes do defeito aparecer.`, accepted: false, score: index % 4, createdAt: new Date(createdAt.getTime() + 30000) });
  return {
    title: bulkTitle(index),
    description: `${scenario.problem} Setup ${index % 20 + 1}, bancada ${index % 12 + 1}. Já tentei reiniciar, atualizar drivers e conferir os cabos, mas queria ouvir a experiência de quem já passou por isso e entender os próximos testes. Ocorrência ${index + 1}.`,
    status: resolved ? "RESOLVED" : "OPEN",
    authorId: author.id, categoryId: categoriesByName.get(scenario.category).id,
    score: index % 17, views: index % 250, createdAt,
    tags: scenario.tags, replies, solution: resolved ? scenario.solution : null,
  };
}

module.exports = {
  SEED_EMAIL_DOMAIN, MEMBERS, CATEGORIES, ARTICLES, CURATED_POSTS, SCENARIOS, BULK_MEMBER_COUNT,
  bulkMember, bulkTitle, seedCount, bulkPostData,
};
