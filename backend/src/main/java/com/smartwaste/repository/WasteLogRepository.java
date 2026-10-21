package com.smartwaste.repository;

import com.smartwaste.entity.WasteLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WasteLogRepository extends JpaRepository<WasteLog, Long> {
    List<WasteLog> findByUserIdOrderByCreatedAtDesc(Long userId);
}
