import { createProduct } from './src/models/Inventory';

async function testAddProduct() {
    try {
        console.log('Attempting to add product...');
        const id = await createProduct({
            name: 'Test Drill ' + Date.now(),
            price: 150000,
            stock: 10,
            category_id: 1 // Assuming category 1 exists
        });
        console.log('Product added with ID:', id);
    } catch (error) {
        console.error('Failed to add product:', error);
    }
}

testAddProduct();
