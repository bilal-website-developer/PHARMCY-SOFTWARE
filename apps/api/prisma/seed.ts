import {
  PrismaClient,
  Role,
  DrugClass,
  StorageCondition,
  ProductStatus,
  SupplierStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const passwordSalt = await bcrypt.genSalt(10);

  // 1. Users
  const usersToSeed = [
    {
      username: 'admin',
      fullName: 'System Administrator',
      email: 'admin@pharmacare.pk',
      password: 'Admin@123',
      role: Role.ADMIN,
    },
    {
      username: 'pharmacist',
      fullName: 'Dr. Tariq Khan (Pharmacist)',
      email: 'pharmacist@pharmacare.pk',
      password: 'Pharma@123',
      role: Role.PHARMACIST,
    },
    {
      username: 'cashier',
      fullName: 'Bilal Cashier (POS 1)',
      email: 'cashier@pharmacare.pk',
      password: 'Cashier@123',
      role: Role.CASHIER,
    },
    {
      username: 'inventory',
      fullName: 'Kamran (Inventory Manager)',
      email: 'inventory@pharmacare.pk',
      password: 'Inventory@123',
      role: Role.INVENTORY,
    },
    {
      username: 'accountant',
      fullName: 'Sajid (Head Accountant)',
      email: 'accountant@pharmacare.pk',
      password: 'Account@123',
      role: Role.ACCOUNTANT,
    },
  ];

  for (const u of usersToSeed) {
    const passwordHash = await bcrypt.hash(u.password, passwordSalt);
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {
        fullName: u.fullName,
        email: u.email,
        passwordHash,
        role: u.role,
        isActive: true,
      },
      create: {
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        passwordHash,
        role: u.role,
        isActive: true,
      },
    });
    console.log(`✓ Seeded User: [${user.role}] ${user.username} (${user.fullName})`);
  }

  // 2. Initial System Settings
  const settingsToSeed = [
    { key: 'EXPIRY_WARNING_MONTHS', value: '3', description: 'Months before expiry to trigger alert' },
    { key: 'MAX_DISCOUNT_ADMIN', value: '100', description: 'Max discount percentage allowed for Admin' },
    { key: 'MAX_DISCOUNT_PHARMACIST', value: '15', description: 'Max discount percentage allowed for Pharmacist' },
    { key: 'MAX_DISCOUNT_CASHIER', value: '5', description: 'Max discount percentage allowed for Cashier' },
    { key: 'ALLOW_LOOSE_SELLING', value: 'true', description: 'Global toggle for loose strip/tablet selling' },
    { key: 'PHARMACY_NAME', value: 'PharmaCare Pharmacy & Medical Store', description: 'Shop display name' },
    { key: 'PHARMACY_ADDRESS', value: 'Main Commercial Market, Lahore, Pakistan', description: 'Shop address' },
    { key: 'PHARMACY_PHONE', value: '+92 42 35889900', description: 'Shop contact number' },
    { key: 'PHARMACY_DRUG_LICENSE', value: 'DL-LHR-2024-8849', description: 'Drug Regulatory License' },
  ];

  for (const s of settingsToSeed) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: { key: s.key, value: s.value, description: s.description },
    });
  }
  console.log(`✓ Seeded ${settingsToSeed.length} System Settings.`);

  // 3. Categories
  const categories = [
    { name: 'Antibiotics', slug: 'antibiotics', description: 'Anti-infectives & bactericidals' },
    { name: 'Analgesics & Antipyretics', slug: 'analgesics-antipyretics', description: 'Pain relief & fever reduction' },
    { name: 'Cardiovascular', slug: 'cardiovascular', description: 'Hypertension & cholesterol management' },
    { name: 'Gastrointestinal', slug: 'gastrointestinal', description: 'PPIs, antacids & digestive care' },
    { name: 'Respiratory & Cough', slug: 'respiratory-cough', description: 'Bronchodilators & cough syrups' },
    { name: 'Vitamins & Supplements', slug: 'vitamins-supplements', description: 'Daily multivitamins & minerals' },
  ];

  const catMap: Record<string, string> = {};
  for (const c of categories) {
    const res = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: c,
    });
    catMap[c.slug] = res.id;
  }
  console.log(`✓ Seeded ${categories.length} Categories.`);

  // 4. Companies (Manufacturers)
  const companies = [
    { name: 'GSK Pakistan', code: 'GSK', country: 'Pakistan' },
    { name: 'Getz Pharma', code: 'GETZ', country: 'Pakistan' },
    { name: 'Abbott Laboratories', code: 'ABT', country: 'Pakistan' },
    { name: 'The Searle Company', code: 'SRL', country: 'Pakistan' },
    { name: 'Hilton Pharma', code: 'HLT', country: 'Pakistan' },
  ];

  const compMap: Record<string, string> = {};
  for (const comp of companies) {
    const res = await prisma.company.upsert({
      where: { name: comp.name },
      update: { code: comp.code, country: comp.country },
      create: comp,
    });
    compMap[comp.name] = res.id;
  }
  console.log(`✓ Seeded ${companies.length} Companies.`);

  // 5. Suppliers
  const suppliers = [
    {
      code: 'SUP-MADINA-01',
      name: 'Al-Madina Pharma Distributors',
      contactPerson: 'Haji Muhammad Rizwan',
      phone: '0300-1234567',
      email: 'sales@almadinapharma.pk',
      address: 'Medicine Market, Katchery Road, Lahore',
      taxNumber: 'NTN-4891234-7',
      paymentTermsDays: 30,
      openingBalancePaisa: 5000000, // Rs 50,000.00
      currentBalancePaisa: 12500000, // Rs 125,000.00
      status: SupplierStatus.ACTIVE,
    },
    {
      code: 'SUP-KHYBER-02',
      name: 'Khyber Medicos & Wholesale',
      contactPerson: 'Sardar Farooq Khan',
      phone: '0321-9876543',
      email: 'info@khybermedicos.pk',
      address: 'Namak Mandi, Peshawar',
      taxNumber: 'NTN-2938471-2',
      paymentTermsDays: 15,
      openingBalancePaisa: 0,
      currentBalancePaisa: 4200000,
      status: SupplierStatus.ACTIVE,
    },
    {
      code: 'SUP-SINDH-03',
      name: 'Sindh Healthcare Logistics',
      contactPerson: 'Mr. Asif Memon',
      phone: '0333-5551234',
      email: 'asif@sindhhealth.com',
      address: 'M.A. Jinnah Road, Karachi',
      taxNumber: 'NTN-7654321-9',
      paymentTermsDays: 45,
      openingBalancePaisa: 10000000,
      currentBalancePaisa: 31000000,
      status: SupplierStatus.ACTIVE,
    },
  ];

  const supMap: Record<string, string> = {};
  for (const s of suppliers) {
    const res = await prisma.supplier.upsert({
      where: { code: s.code },
      update: s,
      create: s,
    });
    supMap[s.code] = res.id;
  }
  console.log(`✓ Seeded ${suppliers.length} Suppliers.`);

  // 6. Products with Pack Conversions, Barcodes & Substitutes
  const products = [
    {
      sku: 'MED-PAN-500',
      name: 'Panadol 500mg',
      urduName: 'پیناڈول ۵۰۰ ملی گرام',
      genericName: 'Paracetamol',
      strength: '500mg',
      dosageForm: 'Tablet',
      drugClass: DrugClass.OTC,
      storageCondition: StorageCondition.ROOM_TEMPERATURE,
      categorySlug: 'analgesics-antipyretics',
      companyName: 'GSK Pakistan',
      supplierCode: 'SUP-MADINA-01',
      minStockLevel: 200,
      maxStockLevel: 2000,
      currentStock: 1250,
      rackLocation: 'Rack A-01',
      taxRatePct: 0.0,
      status: ProductStatus.ACTIVE,
      requiresPrescription: false,
      isLooseSellingEnabled: true,
      loosePricePaisa: 350, // Rs 3.50 per tab
      mrpPaisa: 7000,       // Rs 70.00 per pack
      costPricePaisa: 5800, // Rs 58.00 trade
      barcodes: ['8964000123456'],
      units: [
        { unitName: 'Box', conversionFactor: 200, isBaseUnit: false, isDefaultSellingUnit: true },
        { unitName: 'Strip', conversionFactor: 10, isBaseUnit: false, isDefaultSellingUnit: false },
        { unitName: 'Tablet', conversionFactor: 1, isBaseUnit: true, isDefaultSellingUnit: false, pricePaisa: 350 },
      ],
    },
    {
      sku: 'MED-CAL-500',
      name: 'Calpol 500mg',
      urduName: 'کالپول ۵۰۰ ملی گرام',
      genericName: 'Paracetamol', // Exact substitute!
      strength: '500mg',
      dosageForm: 'Tablet',
      drugClass: DrugClass.OTC,
      storageCondition: StorageCondition.ROOM_TEMPERATURE,
      categorySlug: 'analgesics-antipyretics',
      companyName: 'GSK Pakistan',
      supplierCode: 'SUP-MADINA-01',
      minStockLevel: 100,
      maxStockLevel: 1000,
      currentStock: 480,
      rackLocation: 'Rack A-02',
      taxRatePct: 0.0,
      status: ProductStatus.ACTIVE,
      requiresPrescription: false,
      isLooseSellingEnabled: true,
      loosePricePaisa: 350,
      mrpPaisa: 6800,
      costPricePaisa: 5650,
      barcodes: ['8964000123460'],
      units: [
        { unitName: 'Box', conversionFactor: 200, isBaseUnit: false, isDefaultSellingUnit: true },
        { unitName: 'Strip', conversionFactor: 10, isBaseUnit: false, isDefaultSellingUnit: false },
        { unitName: 'Tablet', conversionFactor: 1, isBaseUnit: true, isDefaultSellingUnit: false, pricePaisa: 350 },
      ],
    },
    {
      sku: 'MED-AUG-625',
      name: 'Augmentin 625mg',
      urduName: 'آگمنٹن ۶۲۵ ملی گرام',
      genericName: 'Amoxicillin + Clavulanic Acid',
      strength: '625mg',
      dosageForm: 'Tablet',
      drugClass: DrugClass.RX,
      storageCondition: StorageCondition.ROOM_TEMPERATURE,
      categorySlug: 'antibiotics',
      companyName: 'GSK Pakistan',
      supplierCode: 'SUP-MADINA-01',
      minStockLevel: 50,
      maxStockLevel: 500,
      currentStock: 180,
      rackLocation: 'Rack B-05',
      taxRatePct: 0.0,
      status: ProductStatus.ACTIVE,
      requiresPrescription: true,
      isLooseSellingEnabled: true,
      loosePricePaisa: 3800, // Rs 38.00 / tablet
      mrpPaisa: 22800,       // Rs 228.00 / strip
      costPricePaisa: 19500,
      barcodes: ['8964000222111'],
      units: [
        { unitName: 'Box', conversionFactor: 12, isBaseUnit: false, isDefaultSellingUnit: true },
        { unitName: 'Strip', conversionFactor: 6, isBaseUnit: false, isDefaultSellingUnit: false },
        { unitName: 'Tablet', conversionFactor: 1, isBaseUnit: true, isDefaultSellingUnit: false, pricePaisa: 3800 },
      ],
    },
    {
      sku: 'MED-AMOCLAV-625',
      name: 'Amoclav 625mg',
      urduName: 'اموکلاو ۶۲۵ ملی گرام',
      genericName: 'Amoxicillin + Clavulanic Acid', // Exact substitute!
      strength: '625mg',
      dosageForm: 'Tablet',
      drugClass: DrugClass.RX,
      storageCondition: StorageCondition.ROOM_TEMPERATURE,
      categorySlug: 'antibiotics',
      companyName: 'Getz Pharma',
      supplierCode: 'SUP-KHYBER-02',
      minStockLevel: 30,
      maxStockLevel: 300,
      currentStock: 95,
      rackLocation: 'Rack B-06',
      taxRatePct: 0.0,
      status: ProductStatus.ACTIVE,
      requiresPrescription: true,
      isLooseSellingEnabled: true,
      loosePricePaisa: 3400,
      mrpPaisa: 20400,
      costPricePaisa: 17200,
      barcodes: ['8964000333221'],
      units: [
        { unitName: 'Box', conversionFactor: 12, isBaseUnit: false, isDefaultSellingUnit: true },
        { unitName: 'Strip', conversionFactor: 6, isBaseUnit: false, isDefaultSellingUnit: false },
        { unitName: 'Tablet', conversionFactor: 1, isBaseUnit: true, isDefaultSellingUnit: false, pricePaisa: 3400 },
      ],
    },
  ];

  for (const p of products) {
    const created = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        urduName: p.urduName,
        genericName: p.genericName,
        strength: p.strength,
        dosageForm: p.dosageForm,
        drugClass: p.drugClass,
        storageCondition: p.storageCondition,
        categoryId: catMap[p.categorySlug] || null,
        companyId: compMap[p.companyName] || null,
        primarySupplierId: supMap[p.supplierCode] || null,
        minStockLevel: p.minStockLevel,
        maxStockLevel: p.maxStockLevel,
        currentStock: p.currentStock,
        rackLocation: p.rackLocation,
        taxRatePct: p.taxRatePct,
        status: p.status,
        requiresPrescription: p.requiresPrescription,
        isLooseSellingEnabled: p.isLooseSellingEnabled,
        loosePricePaisa: p.loosePricePaisa,
        mrpPaisa: p.mrpPaisa,
        costPricePaisa: p.costPricePaisa,
      },
      create: {
        sku: p.sku,
        name: p.name,
        urduName: p.urduName,
        genericName: p.genericName,
        strength: p.strength,
        dosageForm: p.dosageForm,
        drugClass: p.drugClass,
        storageCondition: p.storageCondition,
        categoryId: catMap[p.categorySlug] || null,
        companyId: compMap[p.companyName] || null,
        primarySupplierId: supMap[p.supplierCode] || null,
        minStockLevel: p.minStockLevel,
        maxStockLevel: p.maxStockLevel,
        currentStock: p.currentStock,
        rackLocation: p.rackLocation,
        taxRatePct: p.taxRatePct,
        status: p.status,
        requiresPrescription: p.requiresPrescription,
        isLooseSellingEnabled: p.isLooseSellingEnabled,
        loosePricePaisa: p.loosePricePaisa,
        mrpPaisa: p.mrpPaisa,
        costPricePaisa: p.costPricePaisa,
      },
    });

    // Delete existing units and recreate
    await prisma.productUnit.deleteMany({ where: { productId: created.id } });
    for (const u of p.units) {
      await prisma.productUnit.create({
        data: {
          productId: created.id,
          unitName: u.unitName,
          conversionFactor: u.conversionFactor,
          isBaseUnit: u.isBaseUnit,
          isDefaultSellingUnit: u.isDefaultSellingUnit,
          pricePaisa: (u as any).pricePaisa || null,
        },
      });
    }

    // Delete existing barcodes and recreate
    await prisma.productBarcode.deleteMany({ where: { productId: created.id } });
    for (let i = 0; i < p.barcodes.length; i++) {
      await prisma.productBarcode.create({
        data: {
          productId: created.id,
          barcode: p.barcodes[i],
          isPrimary: i === 0,
        },
      });
    }
  }
  console.log(`✓ Seeded ${products.length} Products with Pack Units and Barcodes.`);

  console.log('✅ Phase 1A database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
