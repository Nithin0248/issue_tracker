package com.nithin.issuetracker.dto;

import com.nithin.issuetracker.dto.Dtos.*;
import com.nithin.issuetracker.entity.Attachment;
import com.nithin.issuetracker.entity.Comment;
import com.nithin.issuetracker.entity.Project;
import com.nithin.issuetracker.entity.ProjectMember;
import com.nithin.issuetracker.entity.Ticket;
import com.nithin.issuetracker.entity.User;

/**
 * Entity -> DTO mapping. These methods touch lazy associations, so they must be called from inside
 * a service transaction (open-in-view is disabled).
 */
public final class Mapper {

    private Mapper() {
    }

    public static UserDto user(User u) {
        return u == null ? null : new UserDto(u.getId(), u.getName(), u.getEmail(), u.getRole());
    }

    public static ProjectDto project(Project p, long memberCount, long ticketCount, String myRole) {
        return new ProjectDto(p.getId(), p.getName(), p.getProjectKey(), p.getDescription(),
                user(p.getOwner()), memberCount, ticketCount, myRole, p.getCreatedAt());
    }

    public static MemberDto member(ProjectMember m, Long ownerId) {
        User u = m.getUser();
        return new MemberDto(u.getId(), u.getName(), u.getEmail(), u.getRole(),
                m.getProjectRole(), u.getId().equals(ownerId));
    }

    public static TicketDto ticket(Ticket t) {
        Project p = t.getProject();
        return new TicketDto(t.getId(), p.getProjectKey() + "-" + t.getNumber(), t.getNumber(),
                t.getTitle(), t.getDescription(), t.getType(), t.getPriority(), t.getStatus(),
                t.getSortOrder(), p.getId(), p.getProjectKey(), user(t.getReporter()), user(t.getAssignee()),
                t.getDueDate(), t.getCreatedAt(), t.getUpdatedAt());
    }

    public static CommentDto comment(Comment c) {
        return new CommentDto(c.getId(), c.getTicket().getId(), user(c.getAuthor()), c.getText(),
                c.getCreatedAt(), c.getUpdatedAt());
    }

    public static AttachmentDto attachment(Attachment a) {
        return new AttachmentDto(a.getId(), a.getTicket().getId(), a.getFileName(), a.getContentType(),
                a.getSize(), user(a.getUploader()), a.getCreatedAt());
    }
}
