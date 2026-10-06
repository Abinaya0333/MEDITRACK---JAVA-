package com.meditrack.repository;

import com.meditrack.entity.InventoryTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long> {

    Page<InventoryTransaction> findByMedicineIdOrderByCreatedAtDesc(Long medicineId, Pageable pageable);

    List<InventoryTransaction> findTop20ByOrderByCreatedAtDesc();

    @Query(value = "SELECT * FROM inventory_transactions ORDER BY created_at DESC", nativeQuery = true)
    Page<InventoryTransaction> findAllOrderByCreatedAtDesc(Pageable pageable);

    @Query(value = "SELECT * FROM inventory_transactions WHERE created_at >= :since ORDER BY created_at DESC", nativeQuery = true)
    List<InventoryTransaction> findRecentActivity(@Param("since") LocalDateTime since);
}
