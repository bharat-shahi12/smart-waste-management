package com.smartwaste.repository;

import com.smartwaste.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findByResponderIdOrderByCreatedAtDesc(Long responderId);
    List<Assignment> findByResponderIdAndStatusInOrderByCreatedAtDesc(Long responderId, List<String> statuses);
    long countByResponderIdAndStatus(Long responderId, String status);
}
