package com.smartwaste.repository;

import com.smartwaste.entity.WasteDetection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WasteDetectionRepository extends JpaRepository<WasteDetection, Long> {
    List<WasteDetection> findByUserIdOrderByCreatedAtDesc(Long userId);
}
