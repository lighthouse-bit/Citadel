// server/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.admin.upsert({
    where: { email: 'admin@citadel-art.com' },
    update: {},
    create: {
      email: 'admin@citadel-art.com',
      password: hashedPassword,
      name: 'Admin',
    },
  });

  // Create site settings
  await prisma.siteSettings.upsert({
    where: { id: 'settings' },
    update: {},
    create: {
      siteName: 'Citadel',
      artistName: 'Your Name',
      artistBio: 'Fine artist specializing in portraits and landscapes.',
      contactEmail: 'contact@citadel-art.com',
      commissionOpen: true,
      commissionWaitTime: '2-4 weeks',
    },
  });

  // Create sample tags
  const tags = ['Portrait', 'Landscape', 'Abstract', 'Nature', 'Urban'];
  for (const name of tags) {
    await prisma.tag.upsert({
      where: { name },
      update: {},
      create: {
        name,
        slug: name.toLowerCase(),
      },
    });
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });