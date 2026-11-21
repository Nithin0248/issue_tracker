package com.nithin.issuetracker.service;

import com.nithin.issuetracker.enums.ProjectRole;
import com.nithin.issuetracker.exception.ForbiddenException;
import com.nithin.issuetracker.exception.ResourceNotFoundException;
import com.nithin.issuetracker.entity.ProjectMember;
import com.nithin.issuetracker.repository.ProjectMemberRepository;
import com.nithin.issuetracker.repository.ProjectRepository;
import com.nithin.issuetracker.security.AppUserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Central place for "who can do what" rules, so controllers/services never repeat them.
 *
 * <pre>
 *  ADMIN (global)          -> can view and manage every project
 *  project MANAGER         -> can manage members, edit/delete any ticket/comment in that project
 *  project DEVELOPER       -> can view, create tickets, move cards, comment; edit own/assigned tickets
 *  not a member            -> 403
 * </pre>
 */
@Service
@Transactional(readOnly = true)
public class AccessService {

    public record ProjectAccess(boolean admin, ProjectRole role) {
        public boolean canView() {
            return admin || role != null;
        }

        public boolean canManage() {
            return admin || role == ProjectRole.MANAGER;
        }

        /** Label shown in the UI: the member role, or ADMIN for admins who are not members. */
        public String label() {
            if (role != null) return role.name();
            return admin ? "ADMIN" : null;
        }
    }

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;

    public AccessService(ProjectRepository projectRepository, ProjectMemberRepository memberRepository) {
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
    }

    public ProjectAccess access(Long projectId, AppUserDetails user) {
        ProjectRole role = memberRepository.findByProjectIdAndUserId(projectId, user.getId())
                .map(ProjectMember::getProjectRole)
                .orElse(null);
        return new ProjectAccess(user.isAdmin(), role);
    }

    public ProjectAccess requireView(Long projectId, AppUserDetails user) {
        if (!projectRepository.existsById(projectId)) {
            throw new ResourceNotFoundException("Project not found");
        }
        ProjectAccess a = access(projectId, user);
        if (!a.canView()) {
            throw new ForbiddenException("You are not a member of this project");
        }
        return a;
    }

    public ProjectAccess requireManage(Long projectId, AppUserDetails user) {
        ProjectAccess a = requireView(projectId, user);
        if (!a.canManage()) {
            throw new ForbiddenException("Only project managers or admins can do this");
        }
        return a;
    }
}
