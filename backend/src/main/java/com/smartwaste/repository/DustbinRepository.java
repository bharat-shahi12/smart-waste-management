package com.smartwaste.repository;

import com.smartwaste.entity.Dustbin;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DustbinRepository extends JpaRepository<Dustbin, Long> {
    Optional<Dustbin> findByDeviceId(String deviceId);
    Optional<Dustbin> findByDeviceIdAndApiKey(String deviceId, String apiKey);
}
