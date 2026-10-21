package com.smartwaste.repository;

import com.smartwaste.entity.CollectionTask;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CollectionTaskRepository extends JpaRepository<CollectionTask, Long> {
}
