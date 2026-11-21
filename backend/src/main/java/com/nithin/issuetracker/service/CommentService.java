package com.nithin.issuetracker.service;

import com.nithin.issuetracker.dto.Dtos.CommentDto;
import com.nithin.issuetracker.dto.Dtos.CommentRequest;
import com.nithin.issuetracker.dto.Mapper;
import com.nithin.issuetracker.entity.Comment;
import com.nithin.issuetracker.entity.Ticket;
import com.nithin.issuetracker.event.ProjectEvent;
import com.nithin.issuetracker.exception.ForbiddenException;
import com.nithin.issuetracker.exception.ResourceNotFoundException;
import com.nithin.issuetracker.repository.CommentRepository;
import com.nithin.issuetracker.repository.TicketRepository;
import com.nithin.issuetracker.repository.UserRepository;
import com.nithin.issuetracker.security.AppUserDetails;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final AccessService access;
    private final ApplicationEventPublisher events;

    public CommentService(CommentRepository commentRepository, TicketRepository ticketRepository,
                          UserRepository userRepository, AccessService access, ApplicationEventPublisher events) {
        this.commentRepository = commentRepository;
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.access = access;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<CommentDto> list(Long ticketId, AppUserDetails actor) {
        Ticket t = findTicket(ticketId);
        access.requireView(t.getProject().getId(), actor);
        return commentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId).stream().map(Mapper::comment).toList();
    }

    @Transactional
    public CommentDto add(Long ticketId, CommentRequest req, AppUserDetails actor) {
        Ticket t = findTicket(ticketId);
        Long projectId = t.getProject().getId();
        access.requireView(projectId, actor);

        Comment c = new Comment();
        c.setTicket(t);
        c.setAuthor(userRepository.findById(actor.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found")));
        c.setText(req.text().trim());
        commentRepository.save(c);

        events.publishEvent(new ProjectEvent(projectId, "COMMENT_ADDED", ticketId, actor.getId()));
        return Mapper.comment(c);
    }

    @Transactional
    public CommentDto update(Long commentId, CommentRequest req, AppUserDetails actor) {
        Comment c = findComment(commentId);
        Long projectId = c.getTicket().getProject().getId();
        access.requireView(projectId, actor);
        if (!c.getAuthor().getId().equals(actor.getId())) {
            throw new ForbiddenException("You can only edit your own comments");
        }
        c.setText(req.text().trim());
        c.setUpdatedAt(Instant.now());

        events.publishEvent(new ProjectEvent(projectId, "COMMENT_UPDATED", c.getTicket().getId(), actor.getId()));
        return Mapper.comment(c);
    }

    @Transactional
    public void delete(Long commentId, AppUserDetails actor) {
        Comment c = findComment(commentId);
        Long projectId = c.getTicket().getProject().getId();
        AccessService.ProjectAccess a = access.requireView(projectId, actor);
        boolean isAuthor = c.getAuthor().getId().equals(actor.getId());
        if (!isAuthor && !a.canManage()) {
            throw new ForbiddenException("Only the author, project managers or admins can delete this comment");
        }
        Long ticketId = c.getTicket().getId();
        commentRepository.delete(c);

        events.publishEvent(new ProjectEvent(projectId, "COMMENT_DELETED", ticketId, actor.getId()));
    }

    private Ticket findTicket(Long id) {
        return ticketRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));
    }

    private Comment findComment(Long id) {
        return commentRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
    }
}
