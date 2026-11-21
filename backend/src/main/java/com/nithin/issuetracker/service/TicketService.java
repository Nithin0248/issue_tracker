package com.nithin.issuetracker.service;

import com.nithin.issuetracker.dto.Dtos.BoardDto;
import com.nithin.issuetracker.dto.Dtos.PageResponse;
import com.nithin.issuetracker.dto.Dtos.TicketDto;
import com.nithin.issuetracker.dto.Dtos.TicketFilter;
import com.nithin.issuetracker.dto.Dtos.TicketRequest;
import com.nithin.issuetracker.dto.Mapper;
import com.nithin.issuetracker.entity.Attachment;
import com.nithin.issuetracker.entity.Project;
import com.nithin.issuetracker.entity.Ticket;
import com.nithin.issuetracker.entity.User;
import com.nithin.issuetracker.enums.TicketStatus;
import com.nithin.issuetracker.event.ProjectEvent;
import com.nithin.issuetracker.exception.BadRequestException;
import com.nithin.issuetracker.exception.ForbiddenException;
import com.nithin.issuetracker.exception.ResourceNotFoundException;
import com.nithin.issuetracker.repository.ProjectMemberRepository;
import com.nithin.issuetracker.repository.ProjectRepository;
import com.nithin.issuetracker.repository.TicketRepository;
import com.nithin.issuetracker.repository.UserRepository;
import com.nithin.issuetracker.security.AppUserDetails;
import com.nithin.issuetracker.service.AccessService.ProjectAccess;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class TicketService {

    private static final double GAP = 1000d;
    private static final Set<String> SORTABLE =
            Set.of("createdAt", "updatedAt", "priority", "status", "title", "number", "sortOrder", "dueDate");

    private final TicketRepository ticketRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final AccessService access;
    private final FileStorageService storage;
    private final ApplicationEventPublisher events;

    public TicketService(TicketRepository ticketRepository, ProjectRepository projectRepository,
                         ProjectMemberRepository memberRepository, UserRepository userRepository,
                         AccessService access, FileStorageService storage, ApplicationEventPublisher events) {
        this.ticketRepository = ticketRepository;
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.access = access;
        this.storage = storage;
        this.events = events;
    }

    // ---------------------------------------------------------------- create

    @Transactional
    public TicketDto create(Long projectId, TicketRequest req, AppUserDetails actor) {
        access.requireView(projectId, actor);

        // Lock the project row so concurrent creates can't produce duplicate ticket numbers.
        Project project = projectRepository.findByIdForUpdate(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        User reporter = userRepository.findById(actor.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        project.setTicketCounter(project.getTicketCounter() + 1);

        Ticket t = new Ticket();
        t.setProject(project);
        t.setNumber(project.getTicketCounter());
        t.setTitle(req.title().trim());
        t.setDescription(blankToNull(req.description()));
        if (req.type() != null) t.setType(req.type());
        if (req.priority() != null) t.setPriority(req.priority());
        t.setDueDate(req.dueDate());
        t.setReporter(reporter);
        t.setAssignee(resolveAssignee(projectId, req.assigneeId()));
        TicketStatus status = req.status() != null ? req.status() : TicketStatus.TODO;
        t.setStatus(status);
        t.setSortOrder(nextSortOrder(projectId, status));
        ticketRepository.save(t);

        publish(projectId, "TICKET_CREATED", t.getId(), actor);
        return Mapper.ticket(t);
    }

    // ---------------------------------------------------------------- read / search

    @Transactional(readOnly = true)
    public PageResponse<TicketDto> search(Long projectId, TicketFilter filter, Pageable pageable, AppUserDetails actor) {
        access.requireView(projectId, actor);
        validateSort(pageable);
        Page<Ticket> page = ticketRepository.findAll(TicketSpecs.filter(projectId, filter), pageable);
        return PageResponse.of(page.map(Mapper::ticket));
    }

    /** All tickets of a project grouped by column, ordered by card position. Used by the Kanban board. */
    @Transactional(readOnly = true)
    public BoardDto board(Long projectId, TicketFilter filter, AppUserDetails actor) {
        access.requireView(projectId, actor);
        Pageable p = PageRequest.of(0, 1000, Sort.by(Sort.Direction.ASC, "sortOrder"));
        List<Ticket> tickets = ticketRepository.findAll(TicketSpecs.filter(projectId, filter), p).getContent();

        List<TicketDto> todo = new ArrayList<>();
        List<TicketDto> inProgress = new ArrayList<>();
        List<TicketDto> done = new ArrayList<>();
        for (Ticket t : tickets) {
            TicketDto dto = Mapper.ticket(t);
            switch (t.getStatus()) {
                case TODO -> todo.add(dto);
                case IN_PROGRESS -> inProgress.add(dto);
                case DONE -> done.add(dto);
            }
        }
        return new BoardDto(todo, inProgress, done);
    }

    @Transactional(readOnly = true)
    public TicketDto get(Long ticketId, AppUserDetails actor) {
        Ticket t = find(ticketId);
        access.requireView(t.getProject().getId(), actor);
        return Mapper.ticket(t);
    }

    @Transactional(readOnly = true)
    public List<TicketDto> assignedToMe(TicketStatus status, AppUserDetails actor) {
        TicketFilter f = new TicketFilter(status, null, null, actor.getId(), false, null, null);
        Pageable p = PageRequest.of(0, 100, Sort.by(Sort.Direction.DESC, "updatedAt"));
        return ticketRepository.findAll(TicketSpecs.filter(null, f), p).map(Mapper::ticket).getContent();
    }

    // ---------------------------------------------------------------- update

    @Transactional
    public TicketDto update(Long ticketId, TicketRequest req, AppUserDetails actor) {
        Ticket t = find(ticketId);
        Long projectId = t.getProject().getId();
        ProjectAccess a = access.requireView(projectId, actor);
        requireCanEdit(t, a, actor);

        t.setTitle(req.title().trim());
        t.setDescription(blankToNull(req.description()));
        if (req.type() != null) t.setType(req.type());
        if (req.priority() != null) t.setPriority(req.priority());
        t.setDueDate(req.dueDate());
        t.setAssignee(resolveAssignee(projectId, req.assigneeId()));
        if (req.status() != null && req.status() != t.getStatus()) {
            t.setStatus(req.status());
            t.setSortOrder(nextSortOrder(projectId, req.status()));
        }

        publish(projectId, "TICKET_UPDATED", t.getId(), actor);
        return Mapper.ticket(t);
    }

    /** Kanban drag & drop: any project member may move a card. */
    @Transactional
    public TicketDto move(Long ticketId, TicketStatus status, Double position, AppUserDetails actor) {
        Ticket t = find(ticketId);
        Long projectId = t.getProject().getId();
        access.requireView(projectId, actor);

        t.setStatus(status);
        t.setSortOrder(position != null ? position : nextSortOrder(projectId, status));

        publish(projectId, "TICKET_MOVED", t.getId(), actor);
        return Mapper.ticket(t);
    }

    @Transactional
    public TicketDto assign(Long ticketId, Long assigneeId, AppUserDetails actor) {
        Ticket t = find(ticketId);
        Long projectId = t.getProject().getId();
        ProjectAccess a = access.requireView(projectId, actor);
        requireCanEdit(t, a, actor);

        t.setAssignee(resolveAssignee(projectId, assigneeId));

        publish(projectId, "TICKET_UPDATED", t.getId(), actor);
        return Mapper.ticket(t);
    }

    // ---------------------------------------------------------------- delete

    @Transactional
    public void delete(Long ticketId, AppUserDetails actor) {
        Ticket t = find(ticketId);
        Long projectId = t.getProject().getId();
        ProjectAccess a = access.requireView(projectId, actor);
        boolean isReporter = t.getReporter().getId().equals(actor.getId());
        if (!a.canManage() && !isReporter) {
            throw new ForbiddenException("Only the reporter, project managers or admins can delete this ticket");
        }
        List<String> files = new ArrayList<>();
        for (Attachment att : t.getAttachments()) {
            files.add(att.getStoredName());
        }
        ticketRepository.delete(t);
        ticketRepository.flush();
        files.forEach(storage::deleteQuietly);

        publish(projectId, "TICKET_DELETED", ticketId, actor);
    }

    // ---------------------------------------------------------------- helpers

    private Ticket find(Long id) {
        return ticketRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));
    }

    private void requireCanEdit(Ticket t, ProjectAccess a, AppUserDetails actor) {
        boolean isReporter = t.getReporter().getId().equals(actor.getId());
        boolean isAssignee = t.getAssignee() != null && t.getAssignee().getId().equals(actor.getId());
        if (!a.canManage() && !isReporter && !isAssignee) {
            throw new ForbiddenException("Only the reporter, the assignee, project managers or admins can edit this ticket");
        }
    }

    private User resolveAssignee(Long projectId, Long assigneeId) {
        if (assigneeId == null) {
            return null;
        }
        if (!memberRepository.existsByProjectIdAndUserId(projectId, assigneeId)) {
            throw new BadRequestException("Assignee must be a member of the project");
        }
        return userRepository.findById(assigneeId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignee not found"));
    }

    /** Puts a card at the bottom of its column. */
    private double nextSortOrder(Long projectId, TicketStatus status) {
        Double max = ticketRepository.maxSortOrder(projectId, status);
        return (max == null ? 0d : max) + GAP;
    }

    private void validateSort(Pageable pageable) {
        for (Sort.Order o : pageable.getSort()) {
            if (!SORTABLE.contains(o.getProperty())) {
                throw new BadRequestException("Cannot sort by '" + o.getProperty() + "'. Allowed: " + SORTABLE);
            }
        }
    }

    private void publish(Long projectId, String type, Long ticketId, AppUserDetails actor) {
        events.publishEvent(new ProjectEvent(projectId, type, ticketId, actor.getId()));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
