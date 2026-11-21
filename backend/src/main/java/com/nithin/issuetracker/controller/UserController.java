package com.nithin.issuetracker.controller;

import com.nithin.issuetracker.dto.Dtos.RoleUpdateRequest;
import com.nithin.issuetracker.dto.Dtos.UserDto;
import com.nithin.issuetracker.security.AppUserDetails;
import com.nithin.issuetracker.service.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@Tag(name = "Users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/users/me")
    public UserDto me(@AuthenticationPrincipal AppUserDetails me) {
        return userService.me(me);
    }

    /** Search by name or email (max 20 results) - used by member and assignee pickers. */
    @GetMapping("/users")
    public List<UserDto> search(@RequestParam(required = false) String q) {
        return userService.search(q);
    }

    @GetMapping("/admin/users")
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserDto> listAll() {
        return userService.listAll();
    }

    @PatchMapping("/admin/users/{userId}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public UserDto changeRole(@PathVariable Long userId,
                              @Valid @RequestBody RoleUpdateRequest req,
                              @AuthenticationPrincipal AppUserDetails me) {
        return userService.changeRole(userId, req.role(), me);
    }
}
