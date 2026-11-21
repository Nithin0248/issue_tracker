package com.nithin.issuetracker.controller;

import com.nithin.issuetracker.dto.Dtos.AssignRequest;
import com.nithin.issuetracker.dto.Dtos.BoardDto;
import com.nithin.issuetracker.dto.Dtos.MoveRequest;
import com.nithin.issuetracker.dto.Dtos.PageResponse;
import com.nithin.issuetracker.dto.Dtos.TicketDto;
import com.nithin.issuetracker.dto.Dtos.TicketFilter;
import com.nithin.issuetracker.dto.Dtos.TicketRequest;
import com.nithin.issuetracker.enums.Priority;
import com.nithin.issuetracker.enums.TicketStatus;
import com.nithin.issuetracker.enums.TicketType;
import com.nithin.issuetracker.security.AppUserDetails;
import com.nithin.issuetracker.service.TicketService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@Tag(name = "Tickets")
public class TicketController {

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @PostMapping("/projects/{projectId}/tickets")
    @ResponseStatus(HttpStatus.CREATED)
    public TicketDto create(@PathVariable Long projectId, @Valid @RequestBody TicketRequest req,
                            @AuthenticationPrincipal AppUserDetails me) {
        return ticketService.create(projectId, req, me);
    }

    /**
     * Filter + search + paginate. Examples:
     * /api/projects/1/tickets?status=TODO&priority=HIGH&q=login&page=0&size=20&sort=updatedAt,desc
     */
    @GetMapping("/projects/{projectId}/tickets")
    public PageResponse<TicketDto> search(
            @PathVariable Long projectId,
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) TicketType type,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Boolean unassigned,
            @RequestParam(required = false) Long reporterId,
            @RequestParam(required = false) String q,
            @ParameterObject @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal AppUserDetails me) {
        TicketFilter filter = new TicketFilter(status, priority, type, assigneeId, unassigned, reporterId, q);
        return ticketService.search(projectId, filter, pageable, me);
    }

    /** Whole project grouped by Kanban column (To Do / In Progress / Done), cards ordered by position. */
    @GetMapping("/projects/{projectId}/board")
    public BoardDto board(
            @PathVariable Long projectId,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) TicketType type,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Boolean unassigned,
            @RequestParam(required = false) String q,
            @AuthenticationPrincipal AppUserDetails me) {
        TicketFilter filter = new TicketFilter(null, priority, type, assigneeId, unassigned, null, q);
        return ticketService.board(projectId, filter, me);
    }

    @GetMapping("/tickets/assigned-to-me")
    public List<TicketDto> assignedToMe(@RequestParam(required = false) TicketStatus status,
                                        @AuthenticationPrincipal AppUserDetails me) {
        return ticketService.assignedToMe(status, me);
    }

    @GetMapping("/tickets/{ticketId}")
    public TicketDto get(@PathVariable Long ticketId, @AuthenticationPrincipal AppUserDetails me) {
        return ticketService.get(ticketId, me);
    }

    @PutMapping("/tickets/{ticketId}")
    public TicketDto update(@PathVariable Long ticketId, @Valid @RequestBody TicketRequest req,
                            @AuthenticationPrincipal AppUserDetails me) {
        return ticketService.update(ticketId, req, me);
    }

    /** Kanban drag & drop. */
    @PatchMapping("/tickets/{ticketId}/status")
    public TicketDto move(@PathVariable Long ticketId, @Valid @RequestBody MoveRequest req,
                          @AuthenticationPrincipal AppUserDetails me) {
        return ticketService.move(ticketId, req.status(), req.position(), me);
    }

    /** assigneeId = null unassigns the ticket. */
    @PatchMapping("/tickets/{ticketId}/assignee")
    public TicketDto assign(@PathVariable Long ticketId, @RequestBody AssignRequest req,
                            @AuthenticationPrincipal AppUserDetails me) {
        return ticketService.assign(ticketId, req.assigneeId(), me);
    }

    @DeleteMapping("/tickets/{ticketId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long ticketId, @AuthenticationPrincipal AppUserDetails me) {
        ticketService.delete(ticketId, me);
    }
}
