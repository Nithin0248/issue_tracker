package com.nithin.issuetracker.dto;

import com.nithin.issuetracker.enums.Priority;
import com.nithin.issuetracker.enums.ProjectRole;
import com.nithin.issuetracker.enums.Role;
import com.nithin.issuetracker.enums.TicketStatus;
import com.nithin.issuetracker.enums.TicketType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** All request/response payloads, grouped in one file to keep the package small. */
public final class Dtos {

    private Dtos() {
    }

    // ---------- Auth / users ----------

    public record RegisterRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Email @Size(max = 150) String email,
            @NotBlank @Size(min = 8, max = 100, message = "Password must be 8-100 characters") String password) {
    }

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password) {
    }

    public record UserDto(Long id, String name, String email, Role role) {
    }

    public record AuthResponse(String token, String tokenType, UserDto user) {
    }

    public record RoleUpdateRequest(@NotNull Role role) {
    }

    // ---------- Projects ----------

    public record ProjectRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Pattern(regexp = "^[A-Za-z][A-Za-z0-9]{1,9}$",
                    message = "Key must be 2-10 letters/digits and start with a letter") String key,
            @Size(max = 2000) String description) {
    }

    public record ProjectUpdateRequest(
            @NotBlank @Size(max = 120) String name,
            @Size(max = 2000) String description) {
    }

    public record ProjectDto(Long id, String name, String key, String description, UserDto owner,
                             long memberCount, long ticketCount, String myRole, Instant createdAt) {
    }

    public record MemberDto(Long userId, String name, String email, Role globalRole,
                            ProjectRole projectRole, boolean owner) {
    }

    public record AddMemberRequest(@NotBlank @Email String email, ProjectRole projectRole) {
    }

    public record MemberRoleRequest(@NotNull ProjectRole projectRole) {
    }

    // ---------- Tickets ----------

    /**
     * Used for create and update. On update this is a full replacement of the editable fields:
     * a null assigneeId means "unassigned"; null type/priority/status keep their current value.
     */
    public record TicketRequest(
            @NotBlank @Size(max = 200) String title,
            @Size(max = 10000) String description,
            TicketType type,
            Priority priority,
            TicketStatus status,
            Long assigneeId,
            LocalDate dueDate) {
    }

    public record MoveRequest(@NotNull TicketStatus status, Double position) {
    }

    public record AssignRequest(Long assigneeId) {
    }

    public record TicketDto(Long id, String key, int number, String title, String description,
                            TicketType type, Priority priority, TicketStatus status, double position,
                            Long projectId, String projectKey, UserDto reporter, UserDto assignee,
                            LocalDate dueDate, Instant createdAt, Instant updatedAt) {
    }

    public record BoardDto(List<TicketDto> todo, List<TicketDto> inProgress, List<TicketDto> done) {
    }

    /** Query-string filters for ticket search. All fields optional. */
    public record TicketFilter(TicketStatus status, Priority priority, TicketType type,
                               Long assigneeId, Boolean unassigned, Long reporterId, String q) {
    }

    // ---------- Comments / attachments ----------

    public record CommentRequest(@NotBlank @Size(max = 4000) String text) {
    }

    public record CommentDto(Long id, Long ticketId, UserDto author, String text,
                             Instant createdAt, Instant updatedAt) {
    }

    public record AttachmentDto(Long id, Long ticketId, String fileName, String contentType, long size,
                                UserDto uploader, Instant createdAt) {
    }

    // ---------- Misc ----------

    public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {
        public static <T> PageResponse<T> of(Page<T> p) {
            return new PageResponse<>(p.getContent(), p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
        }
    }

    public record DashboardDto(long projectCount, Map<String, Long> assignedByStatus,
                               long reportedByMe, List<TicketDto> recentAssigned) {
    }

    public record ErrorResponse(Instant timestamp, int status, String error, String message,
                                Map<String, String> fieldErrors) {
    }
}
