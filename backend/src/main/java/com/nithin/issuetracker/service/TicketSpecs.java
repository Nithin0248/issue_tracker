package com.nithin.issuetracker.service;

import com.nithin.issuetracker.dto.Dtos.TicketFilter;
import com.nithin.issuetracker.entity.Ticket;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Builds the dynamic WHERE clause for ticket search (filters + free-text). */
public final class TicketSpecs {

    /** Matches "12" or "BUG-12" so people can search by ticket key. */
    private static final Pattern KEY_OR_NUMBER = Pattern.compile("^(?:[A-Za-z][A-Za-z0-9]*-)?(\\d{1,9})$");

    private TicketSpecs() {
    }

    public static Specification<Ticket> filter(Long projectId, TicketFilter f) {
        return (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();

            if (projectId != null) {
                ps.add(cb.equal(root.get("project").get("id"), projectId));
            }
            if (f != null) {
                if (f.status() != null) ps.add(cb.equal(root.get("status"), f.status()));
                if (f.priority() != null) ps.add(cb.equal(root.get("priority"), f.priority()));
                if (f.type() != null) ps.add(cb.equal(root.get("type"), f.type()));
                if (f.reporterId() != null) ps.add(cb.equal(root.get("reporter").get("id"), f.reporterId()));

                if (Boolean.TRUE.equals(f.unassigned())) {
                    ps.add(cb.isNull(root.get("assignee")));
                } else if (f.assigneeId() != null) {
                    ps.add(cb.equal(root.get("assignee").get("id"), f.assigneeId()));
                }

                if (f.q() != null && !f.q().isBlank()) {
                    String text = f.q().trim();
                    String like = "%" + text.toLowerCase() + "%";
                    List<Predicate> any = new ArrayList<>();
                    any.add(cb.like(cb.lower(root.<String>get("title")), like));
                    any.add(cb.like(cb.lower(root.<String>get("description")), like));
                    Matcher m = KEY_OR_NUMBER.matcher(text);
                    if (m.matches()) {
                        any.add(cb.equal(root.get("number"), Integer.parseInt(m.group(1))));
                    }
                    ps.add(cb.or(any.toArray(new Predicate[0])));
                }
            }
            return cb.and(ps.toArray(new Predicate[0]));
        };
    }
}
