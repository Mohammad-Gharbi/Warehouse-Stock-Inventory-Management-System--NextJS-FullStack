/**
 * Check All Data Script
 * 
 * This script displays all products and categories in the database.
 * 
 * Usage:
 *   npx tsx scripts/check-all-data.ts
 *   or
 *   npm run script:check-all-data
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Main function to check all data
 */
async function checkAllData() {
  try {
    console.log("🔍 Checking all data in database...\n");

    // Get all products
    console.log("📦 Products:");
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
        price: true,
        status: true,
        categoryId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    console.log(`   Total: ${products.length} product(s)`);
    if (products.length > 0) {
      products.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} (SKU: ${product.sku}) - Qty: ${product.quantity}, Price: $${product.price}, Status: ${product.status}`);
        console.log(`      Category ID: ${product.categoryId || 'N/A'}`);
        console.log(`      Created: ${product.createdAt.toLocaleDateString()}`);
      });
    } else {
      console.log("   (No products found)");
    }
    console.log();

    // Get all categories
    console.log("📁 Categories:");
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        description: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    console.log(`   Total: ${categories.length} category(ies)`);
    if (categories.length > 0) {
      categories.forEach((category, index) => {
        console.log(`   ${index + 1}. ${category.name} - Status: ${category.status ? 'Active' : 'Inactive'}`);
        console.log(`      ID: ${category.id}`);
        if (category.description) {
          console.log(`      Description: ${category.description.substring(0, 50)}${category.description.length > 50 ? '...' : ''}`);
        }
        if (category.notes) {
          console.log(`      Notes: ${category.notes.substring(0, 50)}${category.notes.length > 50 ? '...' : ''}`);
        }
        console.log(`      Created: ${category.createdAt.toLocaleDateString()}`);
        if (category.updatedAt) {
          console.log(`      Updated: ${category.updatedAt.toLocaleDateString()}`);
        }
      });
    } else {
      console.log("   (No categories found)");
    }
    console.log();

    // Summary
    console.log("📊 Summary:");
    console.log(`   Products: ${products.length}`);
    console.log(`   Categories: ${categories.length}`);
    console.log(`   Total Records: ${products.length + categories.length}`);

    // Check for orphaned references
    console.log("\n🔗 Reference Check:");
    const productsWithInvalidCategory = products.filter(p => p.categoryId && !categories.find(c => c.id === p.categoryId));

    if (productsWithInvalidCategory.length > 0) {
      console.log(`   ⚠️  ${productsWithInvalidCategory.length} product(s) reference non-existent categories`);
    }
    if (productsWithInvalidCategory.length === 0 && products.length > 0) {
      console.log("   ✓ All product references are valid");
    }

  } catch (error) {
    console.error("❌ Error checking data:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkAllData();

