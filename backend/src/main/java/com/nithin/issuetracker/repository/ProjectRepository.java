package com.nithin.issuetracker.repository;

import com.nithin.issuetracker.entity.Project;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    boolean existsByProjectKey(String projectKey);

    @Query("select p from Project p where exists " +
            "(select 1 from ProjectMember m where m.project = p and m.user.id = :userId) order by p.name")
    List<Project> findAllForUser(@Param("userId") Long userId);

    @Query("select count(m) from ProjectMember m where m.user.id = :userId")
    long countForUser(@Param("userId") Long userId);

    /** Row lock so two simultaneous "create ticket" calls never get the same ticket number. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Project p where p.id = :id")
    Optional<Project> findByIdForUpdate(@Param("id") Long id);
}
