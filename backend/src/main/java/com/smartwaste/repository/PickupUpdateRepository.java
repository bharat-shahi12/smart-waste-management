package com.smartwaste.repository;

import com.smartwaste.entity.PickupUpdate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PickupUpdateRepository extends JpaRepository<PickupUpdate, Long> {
    List<PickupUpdate> findByPickupRequestIdOrderByCreatedAtDesc(Long pickupRequestId);
}
