package com.meditrack.repository;

import com.meditrack.entity.Sale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {

    Page<Sale> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query(value = "SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE created_at >= :since", nativeQuery = true)
    BigDecimal sumRevenueAfter(@Param("since") LocalDateTime since);

    @Query(value = "SELECT COUNT(*) FROM sales WHERE DATE(created_at) = CURRENT_DATE", nativeQuery = true)
    long countTodaySales();

    @Query(value = "SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE DATE(created_at) = CURRENT_DATE", nativeQuery = true)
    BigDecimal sumTodayRevenue();
}
