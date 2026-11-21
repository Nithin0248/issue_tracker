package com.nithin.issuetracker.repository;

import com.nithin.issuetracker.entity.ProjectMember;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {

    Optional<ProjectMember> findByProjectIdAndUserId(Long projectId, Long userId);

    boolean existsByProjectIdAndUserId(Long projectId, Long userId);

    long countByProjectId(Long projectId);

    @EntityGraph(attributePaths = {"user"})
    List<ProjectMember> findByProjectIdOrderByJoinedAtAsc(Long projectId);
}
