package com.smartwaste.repository;

import com.smartwaste.entity.SensorReading;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SensorReadingRepository extends JpaRepository<SensorReading, Long> {
    List<SensorReading> findTop100ByDustbinIdOrderByRecordedAtDesc(Long dustbinId);
    List<SensorReading> findByDustbinIdOrderByRecordedAtDesc(Long dustbinId);
}

