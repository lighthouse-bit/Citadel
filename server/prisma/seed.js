// server/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create/update an admin only when secure deployment credentials are supplied.
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    await prisma.admin.upsert({
      where: { email },
      update: { password: hashedPassword, name: process.env.ADMIN_NAME || 'Administrator' },
      create: { email, password: hashedPassword, name: process.env.ADMIN_NAME || 'Administrator' },
    });
  } else {
    console.log('Skipping admin seed: set ADMIN_EMAIL and ADMIN_PASSWORD.');
  }

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
