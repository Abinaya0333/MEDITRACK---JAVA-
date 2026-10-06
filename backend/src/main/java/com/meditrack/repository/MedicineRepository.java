package com.meditrack.repository;

import com.meditrack.entity.Medicine;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, Long> {

    @Query("""
        SELECT m FROM Medicine m
        WHERE (:search IS NULL OR :search = '' OR
               LOWER(m.name) LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(m.genericName) LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(m.batchNumber) LIKE LOWER(CONCAT('%', :search, '%')))
        AND (:category IS NULL OR :category = '' OR m.category = :category)
        AND m.status = 'ACTIVE'
    """)
    Page<Medicine> searchMedicines(@Param("search") String search,
                                   @Param("category") String category,
                                   Pageable pageable);

    @Query(value = """
        SELECT * FROM medicines 
        WHERE quantity <= minimum_stock_level AND status = 'ACTIVE'
    """, nativeQuery = true)
    List<Medicine> findLowStockMedicines();

    @Query(value = """
        SELECT * FROM medicines 
        WHERE expiry_date < :today AND status = 'ACTIVE'
    """, nativeQuery = true)
    List<Medicine> findExpiredMedicines(@Param("today") LocalDate today);

    @Query(value = """
        SELECT * FROM medicines 
        WHERE expiry_date BETWEEN :today AND :endDate AND status = 'ACTIVE' 
        ORDER BY expiry_date ASC
    """, nativeQuery = true)
    List<Medicine> findExpiringSoon(@Param("today") LocalDate today, @Param("endDate") LocalDate endDate);

    @Query(value = """
        SELECT * FROM medicines 
        WHERE expiry_date BETWEEN :today AND :endDate AND status = 'ACTIVE' 
        ORDER BY expiry_date ASC
    """, nativeQuery = true)
    List<Medicine> findExpiringWithinDays(@Param("today") LocalDate today, @Param("endDate") LocalDate endDate);

    long countByStatus(Medicine.MedicineStatus status);

    @Query("SELECT SUM(m.quantity) FROM Medicine m WHERE m.status = 'ACTIVE'")
    Long sumTotalStock();

    @Query(value = """
        SELECT COUNT(*) FROM medicines 
        WHERE quantity <= minimum_stock_level AND status = 'ACTIVE'
    """, nativeQuery = true)
    long countLowStockMedicines();

    @Query(value = """
        SELECT COUNT(*) FROM medicines 
        WHERE expiry_date < :today AND status = 'ACTIVE'
    """, nativeQuery = true)
    long countExpiredMedicines(@Param("today") LocalDate today);

    @Query(value = """
        SELECT COUNT(*) FROM medicines 
        WHERE expiry_date BETWEEN :today AND :endDate AND status = 'ACTIVE'
    """, nativeQuery = true)
    long countExpiringSoon(@Param("today") LocalDate today, @Param("endDate") LocalDate endDate);

    Optional<Medicine> findByNameIgnoreCaseAndBatchNumberIgnoreCase(String name, String batchNumber);

    @Query("""
        SELECT DISTINCT m.category FROM Medicine m
        WHERE m.category IS NOT NULL AND m.category <> ''
        ORDER BY m.category
    """)
    List<String> findDistinctCategories();
}
