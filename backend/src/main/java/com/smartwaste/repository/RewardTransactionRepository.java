package com.smartwaste.repository;

import com.smartwaste.entity.RewardTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RewardTransactionRepository extends JpaRepository<RewardTransaction, Long> {
    List<RewardTransaction> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<RewardTransaction> findByUserIdAndEntityTypeAndEntityId(Long userId, String entityType, String entityId);
}
