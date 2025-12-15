import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const productCategories = [
  'Electronics',
  'Clothing',
  'Home & Kitchen',
  'Sports & Outdoors',
  'Books',
  'Toys & Games',
  'Health & Beauty',
  'Automotive',
];

const productAdjectives = [
  'Premium',
  'Professional',
  'Deluxe',
  'Essential',
  'Advanced',
  'Classic',
  'Modern',
  'Compact',
  'Ultra',
  'Smart',
  'Eco-Friendly',
  'Portable',
];

const productNouns = [
  'Device',
  'Kit',
  'Set',
  'Bundle',
  'Collection',
  'System',
  'Tool',
  'Accessory',
  'Solution',
  'Package',
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateProductName(): string {
  const category = getRandomElement(productCategories);
  const adjective = getRandomElement(productAdjectives);
  const noun = getRandomElement(productNouns);
  return `${adjective} ${category} ${noun}`;
}

function generateDescription(): string {
  const descriptions = [
    'High-quality product designed for everyday use.',
    'Perfect for both professionals and enthusiasts.',
    'Innovative design meets exceptional functionality.',
    'Built to last with premium materials.',
    'Experience the difference with this outstanding product.',
    'Carefully crafted to meet your needs.',
    'The perfect addition to your collection.',
    'Engineered for performance and reliability.',
    'Exceptional value for money.',
    'Trusted by thousands of satisfied customers.',
  ];
  return getRandomElement(descriptions);
}

function generatePrice(): number {
  return Math.floor(Math.random() * 99900) / 100 + 10; // Between $10.00 and $999.99
}

async function main() {
  console.log('Starting seed...');

  // Clear existing products (optional - comment out if you want to keep existing data)
  await prisma.product.deleteMany({});
  console.log('Cleared existing products');

  const products: { name: string; description: string; price: number }[] = [];
  for (let i = 1; i <= 200; i++) {
    products.push({
      name: generateProductName(),
      description: generateDescription(),
      price: generatePrice(),
    });
  }

  // Insert products in batches for better performance
  const batchSize = 50;
  let createdCount = 0;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    await prisma.product.createMany({
      data: batch,
    });
    createdCount += batch.length;
    console.log(`Created ${createdCount} products...`);
  }

  console.log(`✅ Successfully seeded ${createdCount} products!`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
