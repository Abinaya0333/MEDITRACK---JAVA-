package com.meditrack.repository;

import com.meditrack.entity.SaleItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {

    @Query(value = """
        SELECT si.* FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.created_at >= :since
        ORDER BY s.created_at DESC
    """, nativeQuery = true)
    List<SaleItem> findSaleItemsAfter(@Param("since") LocalDateTime since);
}
