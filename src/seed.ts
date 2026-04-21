import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PILLS = [
  { name: 'Carinho surpresa', emoji: '💝', color: '#C4709A', description: 'Surpreenda seu cônjuge com um gesto de carinho inesperado durante a semana.', order: 1 },
  { name: 'Carta do coração', emoji: '💌', color: '#8B3A62', description: 'Escreva uma carta manuscrita expressando seu amor e gratidão ao seu cônjuge.', order: 2 },
  { name: 'Jantar especial', emoji: '🍽️', color: '#E8A87C', description: 'Prepare ou organize um jantar especial, só para os dois, com atenção e cuidado.', order: 3 },
  { name: 'Elogio sincero', emoji: '✨', color: '#9B7BB5', description: 'Diga ao seu cônjuge algo que você admira genuinamente nele/ela — seja específico.', order: 4 },
  { name: 'Toque de amor', emoji: '🤝', color: '#7B9E87', description: 'Pratique toques afetivos e carinhosos durante os dias — abraços longos, beijos, carícias.', order: 5 },
  { name: 'Serviço secreto', emoji: '🤫', color: '#6BA3BE', description: 'Faça algo pela casa ou para o cônjuge sem ser pedido e sem contar — deixe a surpresa.', order: 6 },
  { name: 'Memória especial', emoji: '📸', color: '#D4856A', description: 'Relembre e compartilhe de forma criativa uma memória especial do casal.', order: 7 },
  { name: 'Oração juntos', emoji: '🙏', color: '#8B6A62', description: 'Ore junto com seu cônjuge, ou ore especialmente por ele/ela nesta semana.', order: 8 },
  { name: 'Escuta ativa', emoji: '👂', color: '#6B8ABE', description: 'Dedique tempo para ouvir genuinamente seu cônjuge, sem celular ou distrações.', order: 9 },
  { name: 'Palavra de afirmação', emoji: '💬', color: '#C4709A', description: 'Mande mensagens de afirmação e encorajamento ao longo da semana — seja criativo.', order: 10 },
  { name: 'Tempo de qualidade', emoji: '⏰', color: '#7B9E87', description: 'Reserve e proteja ao menos 1h de tempo de qualidade juntos, sem telas ou interrupções.', order: 11 },
  { name: 'Presente criativo', emoji: '🎁', color: '#E8A87C', description: 'Dê um presente simples mas significativo, com atenção ao que seu cônjuge gosta.', order: 12 },
  { name: 'Mensagem de gratidão', emoji: '🌟', color: '#9B7BB5', description: 'Escreva 5 coisas pelas quais você é grato no seu cônjuge e compartilhe com ele/ela.', order: 13 },
  { name: 'Aventura juntos', emoji: '🗺️', color: '#7B9E87', description: 'Planeje uma pequena aventura ou passeio diferente para fazer juntos nesta semana.', order: 14 },
];

async function main() {
  console.log('🌱 Iniciando seed...');

  // Create admin user
  const adminExists = await prisma.user.findUnique({ where: { email: 'admin@casadosparasempre.com' } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        name: 'Administrador',
        email: 'admin@casadosparasempre.com',
        passwordHash: await bcrypt.hash('Admin@123', 12),
        role: 'HUSBAND',
        isAdmin: true,
      },
    });
    console.log('✅ Admin criado: admin@casadosparasempre.com / Admin@123');
  }

  // Upsert pills
  for (const pill of PILLS) {
    await prisma.pill.upsert({
      where: { id: pill.order },
      update: pill,
      create: pill,
    });
  }
  console.log(`✅ ${PILLS.length} pílulas inseridas`);
  console.log('🎉 Seed concluído!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
