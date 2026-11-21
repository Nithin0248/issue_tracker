package com.nithin.issuetracker.service;

import com.nithin.issuetracker.dto.Dtos.DashboardDto;
import com.nithin.issuetracker.dto.Dtos.TicketDto;
import com.nithin.issuetracker.dto.Dtos.TicketFilter;
import com.nithin.issuetracker.dto.Mapper;
import com.nithin.issuetracker.entity.Ticket;
import com.nithin.issuetracker.enums.TicketStatus;
import com.nithin.issuetracker.repository.ProjectRepository;
import com.nithin.issuetracker.repository.TicketRepository;
import com.nithin.issuetracker.security.AppUserDetails;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    private final ProjectRepository projectRepository;
    private final TicketRepository ticketRepository;

    public DashboardService(ProjectRepository projectRepository, TicketRepository ticketRepository) {
        this.projectRepository = projectRepository;
        this.ticketRepository = ticketRepository;
    }

    @Transactional(readOnly = true)
    public DashboardDto summary(AppUserDetails actor) {
        long projects = actor.isAdmin() ? projectRepository.count() : projectRepository.countForUser(actor.getId());

        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (TicketStatus s : TicketStatus.values()) {
            byStatus.put(s.name(), 0L);
        }
        for (Object[] row : ticketRepository.countByStatusForAssignee(actor.getId())) {
            byStatus.put(((TicketStatus) row[0]).name(), ((Number) row[1]).longValue());
        }

        Specification<Ticket> notDone = (root, query, cb) -> cb.notEqual(root.get("status"), TicketStatus.DONE);
        Specification<Ticket> spec = TicketSpecs
                .filter(null, new TicketFilter(null, null, null, actor.getId(), false, null, null))
                .and(notDone);
        List<TicketDto> recent = ticketRepository
                .findAll(spec, PageRequest.of(0, 8, Sort.by(Sort.Direction.DESC, "updatedAt")))
                .map(Mapper::ticket).getContent();

        return new DashboardDto(projects, byStatus, ticketRepository.countByReporterId(actor.getId()), recent);
    }
}
