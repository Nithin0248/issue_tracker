package com.nithin.issuetracker.repository;

import com.nithin.issuetracker.entity.Ticket;
import com.nithin.issuetracker.enums.TicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {

    /**
     * Search/filter query. The entity graph fetches project, reporter and assignee in the same SQL
     * statement, so mapping a page of tickets to DTOs does not trigger N+1 selects.
     */
    @Override
    @EntityGraph(attributePaths = {"project", "reporter", "assignee"})
    Page<Ticket> findAll(Specification<Ticket> spec, Pageable pageable);

    List<Ticket> findAllByProjectId(Long projectId);

    long countByProjectId(Long projectId);

    long countByReporterId(Long reporterId);

    @Query("select t.status, count(t) from Ticket t where t.project.id = :projectId group by t.status")
    List<Object[]> countByStatusForProject(@Param("projectId") Long projectId);

    @Query("select t.status, count(t) from Ticket t where t.assignee.id = :userId group by t.status")
    List<Object[]> countByStatusForAssignee(@Param("userId") Long userId);

    @Query("select max(t.sortOrder) from Ticket t where t.project.id = :projectId and t.status = :status")
    Double maxSortOrder(@Param("projectId") Long projectId, @Param("status") TicketStatus status);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Ticket t set t.assignee = null where t.project.id = :projectId and t.assignee.id = :userId")
    int unassignUserInProject(@Param("projectId") Long projectId, @Param("userId") Long userId);
}
