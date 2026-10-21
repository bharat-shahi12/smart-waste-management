package com.smartwaste.repository;

import com.smartwaste.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long> {
    boolean existsByDustbinIdAndAlertTypeAndIsResolvedFalse(Long dustbinId, String alertType);
    List<Alert> findByDustbinIdAndAlertTypeAndIsResolvedFalse(Long dustbinId, String alertType);
    List<Alert> findByDustbinIdAndIsResolvedFalse(Long dustbinId);
}

