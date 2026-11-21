package com.nithin.issuetracker.service;

import com.nithin.issuetracker.dto.Dtos.AddMemberRequest;
import com.nithin.issuetracker.dto.Dtos.MemberDto;
import com.nithin.issuetracker.dto.Dtos.ProjectDto;
import com.nithin.issuetracker.dto.Dtos.ProjectRequest;
import com.nithin.issuetracker.dto.Dtos.ProjectUpdateRequest;
import com.nithin.issuetracker.dto.Mapper;
import com.nithin.issuetracker.entity.Attachment;
import com.nithin.issuetracker.entity.Project;
import com.nithin.issuetracker.entity.ProjectMember;
import com.nithin.issuetracker.entity.Ticket;
import com.nithin.issuetracker.entity.User;
import com.nithin.issuetracker.enums.ProjectRole;
import com.nithin.issuetracker.enums.Role;
import com.nithin.issuetracker.enums.TicketStatus;
import com.nithin.issuetracker.exception.BadRequestException;
import com.nithin.issuetracker.exception.ConflictException;
import com.nithin.issuetracker.exception.ForbiddenException;
import com.nithin.issuetracker.exception.ResourceNotFoundException;
import com.nithin.issuetracker.repository.ProjectMemberRepository;
import com.nithin.issuetracker.repository.ProjectRepository;
import com.nithin.issuetracker.repository.TicketRepository;
import com.nithin.issuetracker.repository.UserRepository;
import com.nithin.issuetracker.security.AppUserDetails;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final TicketRepository ticketRepository;
    private final AccessService access;
    private final FileStorageService storage;

    public ProjectService(ProjectRepository projectRepository, ProjectMemberRepository memberRepository,
                          UserRepository userRepository, TicketRepository ticketRepository,
                          AccessService access, FileStorageService storage) {
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.ticketRepository = ticketRepository;
        this.access = access;
        this.storage = storage;
    }

    // ---------------------------------------------------------------- projects

    @Transactional
    public ProjectDto create(ProjectRequest req, AppUserDetails actor) {
        if (actor.getRole() == Role.DEVELOPER) {
            throw new ForbiddenException("Only admins and managers can create projects");
        }
        String key = req.key().trim().toUpperCase();
        if (projectRepository.existsByProjectKey(key)) {
            throw new ConflictException("Project key '" + key + "' is already in use");
        }
        User owner = findUser(actor.getId());

        Project project = new Project();
        project.setName(req.name().trim());
        project.setProjectKey(key);
        project.setDescription(blankToNull(req.description()));
        project.setOwner(owner);
        projectRepository.save(project);

        // the creator is automatically a MANAGER of the project
        memberRepository.save(new ProjectMember(project, owner, ProjectRole.MANAGER));
        return toDto(project, actor);
    }

    @Transactional(readOnly = true)
    public List<ProjectDto> list(AppUserDetails actor) {
        List<Project> projects = actor.isAdmin()
                ? projectRepository.findAll(Sort.by("name"))
                : projectRepository.findAllForUser(actor.getId());
        return projects.stream().map(p -> toDto(p, actor)).toList();
    }

    @Transactional(readOnly = true)
    public ProjectDto get(Long projectId, AppUserDetails actor) {
        access.requireView(projectId, actor);
        return toDto(findProject(projectId), actor);
    }

    @Transactional
    public ProjectDto update(Long projectId, ProjectUpdateRequest req, AppUserDetails actor) {
        access.requireManage(projectId, actor);
        Project project = findProject(projectId);
        project.setName(req.name().trim());
        project.setDescription(blankToNull(req.description()));
        return toDto(project, actor);
    }

    @Transactional
    public void delete(Long projectId, AppUserDetails actor) {
        access.requireView(projectId, actor);
        Project project = findProject(projectId);
        if (!actor.isAdmin() && !project.getOwner().getId().equals(actor.getId())) {
            throw new ForbiddenException("Only the project owner or an admin can delete a project");
        }
        List<String> files = new ArrayList<>();
        for (Ticket t : ticketRepository.findAllByProjectId(projectId)) {
            for (Attachment a : t.getAttachments()) {
                files.add(a.getStoredName());
            }
        }
        projectRepository.delete(project); // cascades to members, tickets, comments, attachments
        projectRepository.flush();
        files.forEach(storage::deleteQuietly);
    }

    @Transactional(readOnly = true)
    public Map<String, Long> stats(Long projectId, AppUserDetails actor) {
        access.requireView(projectId, actor);
        Map<String, Long> result = new LinkedHashMap<>();
        for (TicketStatus s : TicketStatus.values()) {
            result.put(s.name(), 0L);
        }
        for (Object[] row : ticketRepository.countByStatusForProject(projectId)) {
            result.put(((TicketStatus) row[0]).name(), ((Number) row[1]).longValue());
        }
        return result;
    }

    // ---------------------------------------------------------------- members

    @Transactional(readOnly = true)
    public List<MemberDto> members(Long projectId, AppUserDetails actor) {
        access.requireView(projectId, actor);
        Long ownerId = findProject(projectId).getOwner().getId();
        return memberRepository.findByProjectIdOrderByJoinedAtAsc(projectId).stream()
                .map(m -> Mapper.member(m, ownerId)).toList();
    }

    @Transactional
    public MemberDto addMember(Long projectId, AddMemberRequest req, AppUserDetails actor) {
        access.requireManage(projectId, actor);
        Project project = findProject(projectId);
        User user = userRepository.findByEmail(req.email().trim().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("No registered user with that email"));
        if (memberRepository.existsByProjectIdAndUserId(projectId, user.getId())) {
            throw new ConflictException("That user is already a member of this project");
        }
        ProjectRole role = req.projectRole() != null ? req.projectRole() : ProjectRole.DEVELOPER;
        ProjectMember member = memberRepository.save(new ProjectMember(project, user, role));
        return Mapper.member(member, project.getOwner().getId());
    }

    @Transactional
    public MemberDto changeMemberRole(Long projectId, Long userId, ProjectRole role, AppUserDetails actor) {
        access.requireManage(projectId, actor);
        Project project = findProject(projectId);
        if (project.getOwner().getId().equals(userId)) {
            throw new BadRequestException("The project owner's role cannot be changed");
        }
        ProjectMember member = memberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));
        member.setProjectRole(role);
        return Mapper.member(member, project.getOwner().getId());
    }

    @Transactional
    public void removeMember(Long projectId, Long userId, AppUserDetails actor) {
        access.requireManage(projectId, actor);
        Project project = findProject(projectId);
        if (project.getOwner().getId().equals(userId)) {
            throw new BadRequestException("The project owner cannot be removed");
        }
        ProjectMember member = memberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));
        ticketRepository.unassignUserInProject(projectId, userId); // their open tickets become unassigned
        memberRepository.delete(member);
    }

    // ---------------------------------------------------------------- helpers

    private ProjectDto toDto(Project p, AppUserDetails actor) {
        return Mapper.project(p,
                memberRepository.countByProjectId(p.getId()),
                ticketRepository.countByProjectId(p.getId()),
                access.access(p.getId(), actor).label());
    }

    private Project findProject(Long id) {
        return projectRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Project not found"));
    }

    private User findUser(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
