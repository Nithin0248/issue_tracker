package com.nithin.issuetracker.repository;

import com.nithin.issuetracker.entity.Attachment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {

    @EntityGraph(attributePaths = {"uploader"})
    List<Attachment> findByTicketIdOrderByCreatedAtAsc(Long ticketId);
}
