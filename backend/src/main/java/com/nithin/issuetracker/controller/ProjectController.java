package com.nithin.issuetracker.controller;

import com.nithin.issuetracker.dto.Dtos.AddMemberRequest;
import com.nithin.issuetracker.dto.Dtos.MemberDto;
import com.nithin.issuetracker.dto.Dtos.MemberRoleRequest;
import com.nithin.issuetracker.dto.Dtos.ProjectDto;
import com.nithin.issuetracker.dto.Dtos.ProjectRequest;
import com.nithin.issuetracker.dto.Dtos.ProjectUpdateRequest;
import com.nithin.issuetracker.security.AppUserDetails;
import com.nithin.issuetracker.service.ProjectService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
@Tag(name = "Projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectDto create(@Valid @RequestBody ProjectRequest req, @AuthenticationPrincipal AppUserDetails me) {
        return projectService.create(req, me);
    }

    @GetMapping
    public List<ProjectDto> list(@AuthenticationPrincipal AppUserDetails me) {
        return projectService.list(me);
    }

    @GetMapping("/{projectId}")
    public ProjectDto get(@PathVariable Long projectId, @AuthenticationPrincipal AppUserDetails me) {
        return projectService.get(projectId, me);
    }

    @PutMapping("/{projectId}")
    public ProjectDto update(@PathVariable Long projectId, @Valid @RequestBody ProjectUpdateRequest req,
                             @AuthenticationPrincipal AppUserDetails me) {
        return projectService.update(projectId, req, me);
    }

    @DeleteMapping("/{projectId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long projectId, @AuthenticationPrincipal AppUserDetails me) {
        projectService.delete(projectId, me);
    }

    @GetMapping("/{projectId}/stats")
    public Map<String, Long> stats(@PathVariable Long projectId, @AuthenticationPrincipal AppUserDetails me) {
        return projectService.stats(projectId, me);
    }

    // ---- members ----

    @GetMapping("/{projectId}/members")
    public List<MemberDto> members(@PathVariable Long projectId, @AuthenticationPrincipal AppUserDetails me) {
        return projectService.members(projectId, me);
    }

    @PostMapping("/{projectId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public MemberDto addMember(@PathVariable Long projectId, @Valid @RequestBody AddMemberRequest req,
                               @AuthenticationPrincipal AppUserDetails me) {
        return projectService.addMember(projectId, req, me);
    }

    @PatchMapping("/{projectId}/members/{userId}")
    public MemberDto changeMemberRole(@PathVariable Long projectId, @PathVariable Long userId,
                                      @Valid @RequestBody MemberRoleRequest req,
                                      @AuthenticationPrincipal AppUserDetails me) {
        return projectService.changeMemberRole(projectId, userId, req.projectRole(), me);
    }

    @DeleteMapping("/{projectId}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(@PathVariable Long projectId, @PathVariable Long userId,
                             @AuthenticationPrincipal AppUserDetails me) {
        projectService.removeMember(projectId, userId, me);
    }
}
