import escontol from '../assets/projects/escontol.webp';
import facilid from '../assets/projects/facilid.png';
import forbee from '../assets/projects/forbee.png';
import hmaisBrasil from '../assets/projects/hmais-brasil.webp';
import imersaoTurbo from '../assets/projects/imersao-turbo.webp';
import paperNova from '../assets/projects/paper-nova.webp';
import rapEngenharia from '../assets/projects/rap-engenharia.webp';
import soTemBraba from '../assets/projects/so-tem-braba.webp';
import yoloCatering from '../assets/projects/yolo-catering.png';

// Contatos e conteúdo editável. Use somente informações fornecidas pelo Matheus.

export const contact = {
  // Número com DDI e DDD, só dígitos. Se for null, o botão final abre o e-mail.
  whatsapp: '5531991454893' as string | null,
  whatsappMessage: 'Olá, Matheus! Vim pelo site e quero conversar sobre um projeto.',
  email: 'matheuslipcontato@gmail.com',
  instagram: 'matheuslipdsgn',
  behance: 'https://www.behance.net/matheuslipdesigner',
};

export const whatsappUrl = contact.whatsapp
  ? `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(contact.whatsappMessage)}`
  : null;

export const emailUrl = `mailto:${contact.email}`;
export const instagramUrl = `https://www.instagram.com/${contact.instagram}/`;

export const nav = [
  { href: '#sobre', label: 'Sobre' },
  { href: '#servicos', label: 'Serviços' },
  { href: '#projetos', label: 'Projetos' },
  { href: '#processo', label: 'Processo' },
];

export const services = [
  {
    name: 'Landing Pages',
    description:
      'Páginas estratégicas para apresentar ofertas, captar contatos e gerar oportunidades comerciais.',
    benefits: [
      'Uma oferta clara, sem distrações',
      'Caminho direto até o contato',
      'Pensada primeiro para o celular',
    ],
  },
  {
    name: 'Sites Institucionais',
    description:
      'Presença digital profissional para apresentar seus serviços, fortalecer sua marca e transmitir credibilidade.',
    benefits: [
      'Serviços fáceis de encontrar',
      'Marca consistente em cada página',
      'Confiança para quem pesquisa antes de contratar',
    ],
  },
  {
    name: 'Manutenção e Evolução',
    description:
      'Atualizações, ajustes, melhorias e suporte contínuo para manter o site funcionando e atualizado.',
    benefits: [
      'Conteúdo sempre em dia',
      'Melhorias sem refazer o site',
      'Suporte de quem conhece o projeto',
    ],
  },
];

// Projetos reais do Behance, um por cliente. O detalhe de cada um fica no próprio Behance.
export const projects: {
  name: string;
  category: string;
  image: ImageMetadata;
  alt: string;
  url: string;
}[] = [
  {
    name: 'Forbee Engenharia',
    category: 'Landing page',
    image: forbee,
    alt: 'Landing page da Forbee Engenharia sobre inspeção predial, com um prédio ao fundo',
    url: 'https://www.behance.net/gallery/197727429/Landign-Page-Forbee',
  },
  {
    name: 'Facilid',
    category: 'Landing page',
    image: facilid,
    alt: 'Landing page da Facilid sobre certificação digital, com formulário sobre fundo azul',
    url: 'https://www.behance.net/gallery/197727765/Lading-Page-Facilid',
  },
  {
    name: 'Yolo Catering',
    category: 'Landing page',
    image: yoloCatering,
    alt: 'Landing page da Yolo Catering com a foto de um casal sobre fundo preto',
    url: 'https://www.behance.net/gallery/152694565/Landing-Page-Yolo-Catering-Criativo',
  },
  {
    name: 'Turbo Academy',
    category: 'Landing page',
    image: imersaoTurbo,
    alt: 'Landing page da Imersão Turbo, com tópicos numerados e um palestrante de camiseta preta',
    url: 'https://www.behance.net/gallery/221803101/LP-Imersao-Turbo-(Turbo-Academy)',
  },
  {
    name: 'Só Tem Braba',
    category: 'E-commerce',
    image: soTemBraba,
    alt: 'Banner da Só Tem Braba com a frase Seja única e um tênis dourado sobre fundo escuro',
    url: 'https://www.behance.net/gallery/197727183/E-commerce-So-Tem-Braba',
  },
  {
    name: 'Paper Nova',
    category: 'Identidade visual',
    image: paperNova,
    alt: 'Peças da identidade da Paper Nova em roxo e verde, com folhas timbradas e adesivos',
    url: 'https://www.behance.net/gallery/202401325/Identidade-Visual-Paper-Nova-Papelaria',
  },
  {
    name: 'Rap Engenharia',
    category: 'Identidade visual',
    image: rapEngenharia,
    alt: 'Capacete azul com o símbolo da Rap Engenharia sobre um padrão de formas geométricas',
    url: 'https://www.behance.net/gallery/203718703/Identidade-Visual-Rap-Engenharia',
  },
  {
    name: 'Escontol',
    category: 'Identidade visual',
    image: escontol,
    alt: 'Peças em azul e branco da Escontol dispostas em diagonal',
    url: 'https://www.behance.net/gallery/161535881/Identidade-Visual-Escontol',
  },
  {
    name: 'Hmais Brasil',
    category: 'Identidade visual',
    image: hmaisBrasil,
    alt: 'Crachá da Hmais Brasil com fita dourada sobre fundo azul-escuro',
    url: 'https://www.behance.net/gallery/163433951/Identidade-Visual-Hmais-Brasil',
  },
];

export const steps = [
  {
    title: 'Conversa inicial',
    text: 'Entendemos sua necessidade, seu público e o que o site precisa resolver.',
  },
  {
    title: 'Planejamento',
    text: 'Definimos a estrutura e o conteúdo de cada parte da página.',
  },
  {
    title: 'Direção visual e desenvolvimento',
    text: 'Você vê a direção visual e acompanha o site ganhar forma.',
  },
  {
    title: 'Revisão, testes e publicação',
    text: 'Revisamos juntos, testamos em diferentes telas e colocamos no ar.',
  },
];

export const differentials = [
  { title: 'Design estratégico', text: 'Cada decisão visual responde a um objetivo do projeto.' },
  { title: 'Experiência visual consistente', text: 'A mesma linguagem do primeiro ao último contato.' },
  { title: 'Desenvolvimento responsivo', text: 'Composição pensada para cada tamanho de tela.' },
  { title: 'Foco na experiência do usuário', text: 'Quem visita entende rápido e sabe o que fazer.' },
  { title: 'Comunicação clara', text: 'Você sabe o que está sendo feito e por quê.' },
  { title: 'Atenção aos detalhes', text: 'Alinhamentos, contrastes e estados revisados um a um.' },
  { title: 'Organização e acompanhamento', text: 'Etapas definidas do início à publicação.' },
];
