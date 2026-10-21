package com.smartwaste.repository;

import com.smartwaste.entity.UserSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserSuggestionRepository extends JpaRepository<UserSuggestion, Long> {
    List<UserSuggestion> findByUserIdAndIsDismissedFalseOrderByCreatedAtDesc(Long userId);
    Optional<UserSuggestion> findByUserIdAndReferenceKey(Long userId, String referenceKey);
}
