package com.meditrack.config;

import com.meditrack.entity.*;
import com.meditrack.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final MedicineRepository medicineRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedUsers();
        seedMedicines();
    }

    private void seedUsers() {
        if (userRepository.count() > 0) return;

        log.info("Seeding default users...");

        userRepository.save(User.builder()
                .username("admin")
                .email("admin@meditrack.com")
                .fullName("Admin User")
                .password(passwordEncoder.encode("admin123"))
                .role(User.Role.ADMIN)
                .active(true)
                .build());

        userRepository.save(User.builder()
                .username("staff")
                .email("staff@meditrack.com")
                .fullName("Staff User")
                .password(passwordEncoder.encode("staff123"))
                .role(User.Role.STAFF)
                .active(true)
                .build());

        log.info("Default users seeded: admin/admin123, staff/staff123");
    }

    private void seedMedicines() {
        if (medicineRepository.count() > 0) return;

        log.info("Seeding sample medicines...");

        LocalDate today = LocalDate.now();
        User adminUser = userRepository.findByUsername("admin").orElse(null);

        Medicine[] medicines = {
            // Healthy stock
            createMedicine("Paracetamol 500mg", "Acetaminophen", "Analgesics",
                    "Sun Pharma", "BATCH-PAR-001", "ABC Distributors",
                    150, 20, new BigDecimal("2.50"), new BigDecimal("5.00"),
                    today.plusMonths(18), today.minusMonths(6)),

            createMedicine("Amoxicillin 250mg", "Amoxicillin Trihydrate", "Antibiotics",
                    "Cipla Ltd", "BATCH-AMX-001", "MedLine Supplies",
                    80, 15, new BigDecimal("8.00"), new BigDecimal("15.00"),
                    today.plusMonths(12), today.minusMonths(3)),

            createMedicine("Cetirizine 10mg", "Cetirizine HCl", "Antihistamines",
                    "Dr. Reddy's", "BATCH-CTZ-001", "PharmaCo",
                    200, 25, new BigDecimal("1.50"), new BigDecimal("4.00"),
                    today.plusMonths(24), today.minusMonths(12)),

            createMedicine("Azithromycin 500mg", "Azithromycin", "Antibiotics",
                    "Zydus Cadila", "BATCH-AZM-001", "ABC Distributors",
                    60, 10, new BigDecimal("25.00"), new BigDecimal("45.00"),
                    today.plusMonths(15), today.minusMonths(2)),

            createMedicine("Metformin 500mg", "Metformin HCl", "Antidiabetics",
                    "Sun Pharma", "BATCH-MET-001", "MedLine Supplies",
                    120, 20, new BigDecimal("3.00"), new BigDecimal("6.50"),
                    today.plusMonths(20), today.minusMonths(8)),

            createMedicine("Atorvastatin 10mg", "Atorvastatin Calcium", "Cardiovascular",
                    "Pfizer India", "BATCH-ATV-001", "PharmaCo",
                    90, 15, new BigDecimal("12.00"), new BigDecimal("22.00"),
                    today.plusMonths(18), today.minusMonths(4)),

            // Low stock
            createMedicine("Omeprazole 20mg", "Omeprazole", "Gastrointestinal",
                    "AstraZeneca", "BATCH-OMP-001", "ABC Distributors",
                    8, 20, new BigDecimal("5.00"), new BigDecimal("10.00"),
                    today.plusMonths(16), today.minusMonths(5)),

            createMedicine("Losartan 50mg", "Losartan Potassium", "Cardiovascular",
                    "Merck India", "BATCH-LST-001", "MedLine Supplies",
                    5, 15, new BigDecimal("18.00"), new BigDecimal("30.00"),
                    today.plusMonths(22), today.minusMonths(9)),

            // Expiring soon
            createMedicine("Ibuprofen 400mg", "Ibuprofen", "Analgesics",
                    "Abbott India", "BATCH-IBU-001", "PharmaCo",
                    45, 10, new BigDecimal("4.00"), new BigDecimal("8.00"),
                    today.plusDays(6), today.minusMonths(23)),

            createMedicine("Doxycycline 100mg", "Doxycycline Hyclate", "Antibiotics",
                    "Cipla Ltd", "BATCH-DOX-001", "ABC Distributors",
                    30, 10, new BigDecimal("15.00"), new BigDecimal("28.00"),
                    today.plusDays(12), today.minusMonths(22)),

            createMedicine("Ranitidine 150mg", "Ranitidine HCl", "Gastrointestinal",
                    "GSK India", "BATCH-RAN-001", "MedLine Supplies",
                    25, 10, new BigDecimal("3.50"), new BigDecimal("7.00"),
                    today.plusDays(25), today.minusMonths(21)),

            // Expired
            createMedicine("Aspirin 75mg", "Acetylsalicylic Acid", "Cardiovascular",
                    "Bayer India", "BATCH-ASP-OLD", "PharmaCo",
                    50, 10, new BigDecimal("1.00"), new BigDecimal("3.00"),
                    today.minusDays(10), today.minusMonths(25)),

            createMedicine("Cough Syrup 100ml", "Dextromethorphan", "Respiratory",
                    "Pfizer India", "BATCH-CGH-OLD", "ABC Distributors",
                    20, 5, new BigDecimal("35.00"), new BigDecimal("60.00"),
                    today.minusDays(5), today.minusMonths(13)),
        };

        for (Medicine medicine : medicines) {
            Medicine saved = medicineRepository.save(medicine);
            if (saved.getQuantity() > 0 && adminUser != null) {
                inventoryTransactionRepository.save(InventoryTransaction.builder()
                        .medicine(saved)
                        .type(InventoryTransaction.TransactionType.STOCK_IN)
                        .quantity(saved.getQuantity())
                        .previousQuantity(0)
                        .newQuantity(saved.getQuantity())
                        .notes("Initial stock - seeded data")
                        .performedBy(adminUser)
                        .build());
            }
        }

        log.info("Sample medicines seeded successfully");
    }

    private Medicine createMedicine(String name, String genericName, String category,
                                     String manufacturer, String batchNumber, String supplier,
                                     int quantity, int minStock,
                                     BigDecimal purchasePrice, BigDecimal sellingPrice,
                                     LocalDate expiryDate, LocalDate mfgDate) {
        return Medicine.builder()
                .name(name)
                .genericName(genericName)
                .category(category)
                .manufacturer(manufacturer)
                .batchNumber(batchNumber)
                .supplier(supplier)
                .quantity(quantity)
                .minimumStockLevel(minStock)
                .purchasePrice(purchasePrice)
                .sellingPrice(sellingPrice)
                .expiryDate(expiryDate)
                .manufacturingDate(mfgDate)
                .build();
    }
}
